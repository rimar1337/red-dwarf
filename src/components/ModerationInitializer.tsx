import { useQueries } from "@tanstack/react-query";
import { useAtom, useSetAtom } from "jotai";
import { useEffect, useRef } from "react";

import { FORCED_LABELER_DIDS, UNAUTHED_FORCE_WARN_LABELS } from "~/../policy";
import { useAuth } from "~/providers/UnifiedAuthProvider";
import { labelerConfigAtom } from "~/state/moderationAtoms";
import type { LabelerDefinition, LabelPreference, LabelValueDefinition } from "~/types/moderation";
import { slingshotURLAtom } from "~/utils/atoms";
import { useQueryIdentity } from "~/utils/useQuery";
import { useQueryPreferences } from "~/utils/useQuery";

// Manual DID document resolution
const fetchDidDocument = async (did: string): Promise<any> => {
  if (did.startsWith("did:plc:")) {
    const response = await fetch(
      `https://plc.directory/${encodeURIComponent(did)}`,
    );
    if (!response.ok)
      throw new Error(`Failed to fetch PLC DID document for ${did}`);
    return response.json();
  } else if (did.startsWith("did:web:")) {
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
  const { agent, status } = useAuth();
  const setLabelerConfig = useSetAtom(labelerConfigAtom);
  const [slingshoturl] = useAtom(slingshotURLAtom);

  // Define clear boolean for mode
  const isUnauthed = status === "signedOut" || !agent;
  
  // Track previous status to detect transitions
  const prevStatusRef = useRef(status);

  // --- 1. THE HARD FLUSH ---
  // When Auth Status changes (Logged In <-> Logged Out), immediately wipe the config.
  // This prevents "Authed" prefs from bleeding into "Unauthed" state and vice versa
  // while the async queries are spinning up.
  useEffect(() => {
    if (prevStatusRef.current !== status) {
      console.log(`[Moderation] Auth status changed (${prevStatusRef.current} -> ${status}). Flushing config.`);
      setLabelerConfig([]); // <--- WIPE CLEAN
      prevStatusRef.current = status;
    }
  }, [status, setLabelerConfig]);

  // 2. Get User Identity (Only if authed)
  const { data: identity } = useQueryIdentity(agent?.did);

  // 3. Get User Preferences (Only if authed)
  const { data: prefs } = useQueryPreferences({
    agent: agent ?? undefined,
    pdsUrl: identity?.pds,
  });

  // 4. Identify Labeler DIDs
  // Important: If unauthed, userPrefDids MUST be empty, even if cache exists.
  const userPrefDids = !isUnauthed
    ? prefs?.preferences
        ?.find((pref: any) => pref.$type === "app.bsky.actor.defs#labelersPref")
        ?.labelers?.map((l: any) => l.did) ?? []
    : [];

  // 5. Force Bsky DID + User DIDs
  const activeLabelerDids = Array.from(
    new Set([...FORCED_LABELER_DIDS, ...userPrefDids])
  );

  // 6. Parallel fetch DID Docs
  const labelerDidDocQueries = useQueries({
    queries: activeLabelerDids.map((did: string) => ({
      queryKey: ["labelerDidDoc", did],
      queryFn: () => fetchDidDocument(did),
      staleTime: 1000 * 60 * 60 * 24, 
    })),
  });

  // 7. Parallel fetch Service Records
  const labelerServiceQueries = useQueries({
    queries: activeLabelerDids.map((did: string) => ({
      queryKey: ["labelerService", did],
      queryFn: async () => {
        const host = slingshoturl || "public.api.bsky.app"; 
        const response = await fetch(
          `https://${host}/xrpc/com.atproto.repo.getRecord?repo=${encodeURIComponent(did)}&collection=${encodeURIComponent("app.bsky.labeler.service")}&rkey=self`,
        );
        if (!response.ok) throw new Error("Failed to fetch labeler service");
        return response.json();
      },
      staleTime: 1000 * 60 * 60,
    })),
  });

  useEffect(() => {
    // Guard: Wait for queries
    if (
      labelerDidDocQueries.some((q) => q.isLoading) ||
      labelerServiceQueries.some((q) => q.isLoading)
    ) {
      return;
    }

    // Guard: If we are supposed to be Authed, but prefs haven't loaded yet,
    // DO NOT run the logic. Wait. This prevents falling back to defaults temporarily.
    if (!isUnauthed && !prefs) {
      return;
    }

    // A. Extract User Global Overrides
    // STRICT SEPARATION: If unauthed, force this to be empty to ensure no leakage.
    const globalPrefs: Record<string, LabelPreference> = {};
    
    if (!isUnauthed && prefs?.preferences) {
      const contentLabelPrefs = prefs.preferences.filter(
        (pref: any) => pref.$type === "app.bsky.actor.defs#contentLabelPref",
      );
      contentLabelPrefs.forEach((pref: any) => {
        globalPrefs[pref.label] = pref.visibility as LabelPreference;
      });
    }

    const definitions: LabelerDefinition[] = activeLabelerDids
      .map((did: string, index: number) => {
        const didDocQuery = labelerDidDocQueries[index];
        const serviceQuery = labelerServiceQueries[index];

        if (!didDocQuery.data || !serviceQuery.data) return null;

        const didDoc = didDocQuery.data as any;
        const atprotoLabelerService = didDoc?.service?.find(
          (s: any) => s.id === "#atproto_labeler",
        );

        const record = (serviceQuery.data as any).value;

        // B. Gather ALL identifiers
        const allIdentifiers = new Set<string>();
        record.policies?.labelValues?.forEach((val: string) => allIdentifiers.add(val));
        record.policies?.labelValueDefinitions?.forEach((def: any) => allIdentifiers.add(def.identifier));

        // C. Create Metadata Map
        const labelDefs: Record<string, LabelValueDefinition> = {};
        if (record.policies.labelValueDefinitions) {
          record.policies.labelValueDefinitions.forEach((def: any) => {
            labelDefs[def.identifier] = {
              identifier: def.identifier,
              severity: def.severity,
              blurs: def.blurs,
              adultOnly: def.adultOnly,
              defaultSetting: def.defaultSetting,
              locales: def.locales || []
            };
          });
        }

        // D. Resolve Preferences
        const supportedLabels: Record<string, LabelPreference> = {};

        allIdentifiers.forEach((val) => {
          // todo this works but with how useModeration hooks works right now old verdicts wont get stale-d
          // it only works right now because these are warns and warns are negligable i guess
          // --- BRANCH 1: UNAUTHED MODE ---
          if (isUnauthed) {
            // 1. Strict Force Overrides
            if (UNAUTHED_FORCE_WARN_LABELS.has(val)) {
              supportedLabels[val] = "warn"; // or 'hide' if that's what your policy constant implies
              return;
            }
            
            // 2. Default Labeler Settings
            const def = labelDefs[val];
            const rawDefault = def?.defaultSetting || "ignore";
            
            // 3. Apply Unauthed-Specific Aliasing (Optional)
            // e.g., if you want to hide 'inform' labels for unauthed users
            supportedLabels[val] = rawDefault as LabelPreference;
            return;
          }

          // --- BRANCH 2: AUTHED MODE ---
          // 1. User Global Override (Highest Priority)
          const globalPref = globalPrefs[val];
          if (globalPref) {
            supportedLabels[val] = globalPref;
            return;
          }

          // 2. Labeler Default
          const def = labelDefs[val];
          const rawDefault = def?.defaultSetting || "ignore";

          supportedLabels[val] = rawDefault as LabelPreference;
        });

        return {
          did: did,
          url: atprotoLabelerService?.serviceEndpoint || record.serviceEndpoint,
          isDefault: FORCED_LABELER_DIDS.includes(did),
          supportedLabels,
          labelDefs,
        };
      })
      .filter(Boolean) as LabelerDefinition[];

    setLabelerConfig(definitions);
  }, [
    prefs, 
    labelerDidDocQueries, 
    labelerServiceQueries, 
    setLabelerConfig, 
    activeLabelerDids, 
    isUnauthed // <--- Critical dependency triggers re-eval on login/out
  ]);

  return null;
};