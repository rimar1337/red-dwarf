import { useQueries } from "@tanstack/react-query";
import { useSetAtom } from "jotai";
import { useEffect } from "react";

import { useAuth } from "~/providers/UnifiedAuthProvider";
import { labelerConfigAtom } from "~/state/moderationAtoms";
import type { LabelerDefinition, LabelPreference, LabelValueDefinition } from "~/types/moderation";
import { useQueryIdentity } from "~/utils/useQuery";
import { useQueryPreferences } from "~/utils/useQuery";

export const BSKY_LABELER_DID = "did:plc:ar7c4by46qjdydhdevvrndac";

// Manual DID document resolution
const fetchDidDocument = async (did: string): Promise<any> => {
  if (did.startsWith("did:plc:")) {
    // For PLC DIDs, fetch from plc.directory
    const response = await fetch(
      `https://plc.directory/${encodeURIComponent(did)}`,
    );
    if (!response.ok)
      throw new Error(`Failed to fetch PLC DID document for ${did}`);
    return response.json();
  } else if (did.startsWith("did:web:")) {
    // For web DIDs, fetch from well-known
    const handle = did.replace("did:web:", "");
    const url = `https://${handle}/.well-known/did.json`;
    const response = await fetch(url);
    if (!response.ok)
      throw new Error(
        `Failed to fetch web DID document for ${did} (CORS or not found)`,
      );
    return response.json();
  } else {
    throw new Error(`Unsupported DID type: ${did}`);
  }
};

export const ModerationInitializer = () => {
  const { agent } = useAuth();
  const setLabelerConfig = useSetAtom(labelerConfigAtom);

  // 1. Get User Identity to get PDS URL
  const { data: identity } = useQueryIdentity(agent?.did);

  // 2. Get User Preferences (Global: "porn" -> "hide")
  const { data: prefs } = useQueryPreferences({
    agent: agent ?? undefined,
    pdsUrl: identity?.pds,
  });

  // 3. Identify Labeler DIDs from prefs
  const userPrefDids =
    prefs?.preferences
      ?.find((pref: any) => pref.$type === "app.bsky.actor.defs#labelersPref")
      ?.labelers?.map((l: any) => l.did) ?? [];

  // 2. MERGE: Force Bsky DID + User DIDs (Set removes duplicates)
  const activeLabelerDids = Array.from(
    new Set([BSKY_LABELER_DID, ...userPrefDids])
  );

  // 4. Parallel fetch all Labeler DID Documents and Service Records
  const labelerDidDocQueries = useQueries({
    queries: activeLabelerDids.map((did: string) => ({
      queryKey: ["labelerDidDoc", did],
      queryFn: () => fetchDidDocument(did),
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1, // Only retry once for DID docs
    })),
  });

  const labelerServiceQueries = useQueries({
    queries: activeLabelerDids.map((did: string) => ({
      queryKey: ["labelerService", did],
      queryFn: async () => {
        if (!identity?.pds) throw new Error("No PDS URL");
        const response = await fetch(
          `${identity.pds}/xrpc/com.atproto.repo.getRecord?repo=${encodeURIComponent(did)}&collection=${encodeURIComponent("app.bsky.labeler.service")}&rkey=self`,
        );
        if (!response.ok) throw new Error("Failed to fetch labeler service");
        return response.json();
      },
      enabled: !!identity?.pds && !!agent,
      staleTime: 5 * 60 * 1000, // 5 minutes
    })),
  });

  useEffect(() => {
    if (
      !prefs ||
      labelerDidDocQueries.some((q) => q.isLoading) ||
      labelerDidDocQueries.some((q) => q.isFetching) ||
      labelerServiceQueries.some((q) => q.isLoading) ||
      labelerServiceQueries.some((q) => q.isFetching)
    )
      return;

    // Extract content label preferences
    const contentLabelPrefs =
      prefs.preferences?.filter(
        (pref: any) => pref.$type === "app.bsky.actor.defs#contentLabelPref",
      ) ?? [];

    const globalPrefs: Record<string, LabelPreference> = {};
    contentLabelPrefs.forEach((pref: any) => {
      globalPrefs[pref.label] = pref.visibility as LabelPreference;
    });

    const definitions: LabelerDefinition[] = activeLabelerDids
      .map((did: string, index: number) => {
        const didDocQuery = labelerDidDocQueries[index];
        const serviceQuery = labelerServiceQueries[index];

        if (!didDocQuery.data || !serviceQuery.data) return null;

        // Extract service endpoint from DID document
        const didDoc = didDocQuery.data as any;
        const atprotoLabelerService = didDoc?.service?.find(
          (s: any) => s.id === "#atproto_labeler",
        );

        const record = (serviceQuery.data as any).value; // The raw ATProto record

        // 1. Create the Metadata Map
        const labelDefs: Record<string, LabelValueDefinition> = {};
        
        if (record.policies.labelValueDefinitions) {
          record.policies.labelValueDefinitions.forEach((def: any) => {
            labelDefs[def.identifier] = {
              identifier: def.identifier,
              severity: def.severity,
              blurs: def.blurs,
              adultOnly: def.adultOnly,
              defaultSetting: def.defaultSetting,
              locales: def.locales || [] // <--- Capture the locales array
            };
          });
        }

        // RESOLUTION LOGIC:
        // Map record.policies.labelValueDefinitions to a lookup map.
        // Priority: User Global Pref > Labeler Default > 'ignore'
        const supportedLabels: Record<string, LabelPreference> = {};

        record.policies?.labelValues?.forEach((val: string) => {
          // Does user have a global override for this string?
          const globalPref = globalPrefs[val];
          // Or use labeler default
          const defaultPref =
            record.policies?.labelValueDefinitions?.find(
              (d: any) => d.identifier === val,
            )?.defaultSetting || "ignore";

          supportedLabels[val] = (globalPref || defaultPref) as LabelPreference;
        });

        return {
          did: did,
          url: atprotoLabelerService?.serviceEndpoint || record.serviceEndpoint,
          isDefault: false, // logic to determine if this is a default Bluesky labeler
          supportedLabels,
          labelDefs,
        };
      })
      .filter(Boolean) as LabelerDefinition[];

    setLabelerConfig(definitions);
  }, [prefs, labelerDidDocQueries, labelerServiceQueries, setLabelerConfig, identity?.pds, activeLabelerDids]);

  return null; // Headless component
};
