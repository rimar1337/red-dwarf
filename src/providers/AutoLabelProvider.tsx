import * as ATPAPI from "@atproto/api";
import {
  isContentLabelPref,
  isLabelersPref,
} from "@atproto/api/dist/client/types/app/bsky/actor/defs";
import { useQueries, useQueryClient } from "@tanstack/react-query";
import { useAtom } from "jotai";
import { Dialog } from "radix-ui";
import React, { createContext, useContext, useMemo } from "react";

import { FORCED_LABELER_DIDS } from "~/../policy";
import { useAuth } from "~/providers/UnifiedAuthProvider";
import { NotificationItem } from "~/routes/notifications";
import { disabledLabelersAtom, slingshotURLAtom } from "~/utils/atoms";
import { useQueryIdentity, useQueryPreferences } from "~/utils/useQuery";

declare const __INSTANCE_MODEL__: boolean

// higher prio overwrites lower prio
export const LABEL_PRIO_DEFAULT = 0;
export const LABEL_PRIO_USER = 5;
// export const LABEL_PRIO_FORCED = 20 // Not used in pref merging

export interface HydratedLabelValueDefinition
  extends ATPAPI.ComAtprotoLabelDefs.LabelValueDefinition {
  pref: ATPAPI.ComAtprotoLabelDefs.LabelValueDefinition["defaultSetting"];
}

export type labelpref = {
  did: string;
  label: string;
  visibility: ATPAPI.AppBskyActorDefs.ContentLabelPref["visibility"];
  priority: number;
};

type labeldefpref = {
  did: string;
  labeldefs?: ATPAPI.ComAtprotoLabelDefs.LabelValueDefinition[];
  err?: string;
};

type hydratedlabeldefpref = {
  did: string;
  labeldefs?: HydratedLabelValueDefinition[];
  err?: string;
};

type AutoLabelConfig = {
  activeLabelerDids: string[];
  mergedPrefContentLabels: labelpref[];
  hydratedLabelDefs: Map<string, HydratedLabelValueDefinition>;
  isLoading: boolean;
  isError: boolean;
  sendError: (error: LabelerError) => void;
};

export type LabelerError = { did: string; message: string };

const AutoLabelContext = createContext<AutoLabelConfig | undefined>(undefined);

export function useAutoLabelConfig(): AutoLabelConfig {
  const context = useContext(AutoLabelContext);
  if (!context) {
    throw new Error(
      "useAutoLabelConfig must be used within an AutoLabelProvider",
    );
  }
  return context;
}

export function AutoLabelProvider({ children }: { children: React.ReactNode }) {
  if (!__INSTANCE_MODEL__) {
    return <>{children}</>;
  }

  const { agent, status } = useAuth();
  const [slingshoturl] = useAtom(slingshotURLAtom);
  const queryClient = useQueryClient();

  const [disabledLabelers, setDisabledLabelers] = useAtom(disabledLabelersAtom);

  // Modal state
  const [errorModalOpen, setErrorModalOpen] = React.useState(false);
  const [labelerErrors, setLabelerErrors] = React.useState<LabelerError[]>([]);
  const erroredLabelerDids = new Set(labelerErrors.map((e) => e.did));

  const sendError = React.useCallback((error: LabelerError) => {
    setLabelerErrors((prev) => {
      // Avoid duplicates
      if (prev.find((e) => e.did === error.did)) return prev;
      return [...prev, error];
    });
    setErrorModalOpen(true);
  }, []);

  const isUnauthed = status === "signedOut" || !agent;

  // 1. Get User Identity & Preferences
  const { data: identity } = useQueryIdentity(agent?.did);
  const {
    data: prefs,
    isLoading: prefsLoading,
    isError: prefsError,
  } = useQueryPreferences({
    agent: agent ?? undefined,
    pdsUrl: identity?.pds,
  });

  // 2. Identify Labeler DIDs & User Preferences (Use useMemo for stability)
  const userPrefLabelerDids = useMemo(
    () =>
      prefs?.preferences?.find(isLabelersPref)?.labelers.map((l) => l.did) ??
      [],
    [prefs],
  );

  const userPrefContentLabelsRaw = useMemo(
    () => prefs?.preferences?.filter(isContentLabelPref) ?? [],
    [prefs],
  );

  const userPrefContentLabels: labelpref[] = useMemo(
    () =>
      userPrefContentLabelsRaw.map((pref) => {
        const res: labelpref = {
          did: pref.labelerDid || "global",
          label: pref.label,
          visibility: pref.visibility,
          priority: LABEL_PRIO_USER,
        };
        return res;
      }),
    [userPrefContentLabelsRaw],
  );

  // 3. Force Bsky DID + User DIDs
  const userPrefLabelerDidsFiltered = React.useMemo(
    () => userPrefLabelerDids.filter((did) => !disabledLabelers.includes(did)),
    [userPrefLabelerDids, disabledLabelers],
  );

  const activeLabelerDids = useMemo(
    () =>
      Array.from(
        new Set([...FORCED_LABELER_DIDS, ...userPrefLabelerDidsFiltered]),
      ),
    [userPrefLabelerDidsFiltered],
  );

  // 4. Parallel fetch Service Records (The expensive part)
  const labelerServiceQueries = useQueries({
    queries: activeLabelerDids.map((did: string) => ({
      queryKey: ["labelerServiceDefaultstestwhatever", did],
      queryFn: async () => {
        const host = slingshoturl;
        const response = await fetch(
          `https://${host}/xrpc/com.atproto.repo.getRecord?repo=${encodeURIComponent(did)}&collection=app.bsky.labeler.service&rkey=self`,
        );
        if (!response.ok) throw new Error("Failed to fetch labeler service");
        try {
          const res = (await response.json()) as {
            uri: string;
            cid: string;
            value: ATPAPI.AppBskyLabelerService.Record;
          };
          const labeldefs = res.value.policies.labelValueDefinitions;
          return {
            did: did,
            labeldefs: labeldefs,
          } as labeldefpref;
        } catch {
          sendError({ did, message: ".json()" });
          return {
            did: did,
            err: ".json()",
          } as labeldefpref;
        }
      },
      staleTime: 1000 * 60 * 60, // Cache for 1 hour
    })),
  });

  const defaultPrefContentLabels: labelpref[] = useMemo(
    () =>
      labelerServiceQueries.flatMap((labeler) => {
        if (labeler.error || labeler.data?.err || !labeler.data) {
          return [];
        }

        const labelerDid = labeler.data.did;

        return (
          labeler.data.labeldefs?.map((label) => ({
            did: labelerDid,
            label: label.identifier,
            visibility: label.defaultSetting,
            priority: LABEL_PRIO_DEFAULT,
          })) ?? []
        );
      }),
    [labelerServiceQueries],
  );

  // 5. Merge Default and User Preferences
  const mergedPrefContentLabels: labelpref[] = useMemo(() => {
    const allrawPrefContentLabels = [
      ...defaultPrefContentLabels,
      ...userPrefContentLabels,
    ];

    return Object.values(
      allrawPrefContentLabels.reduce(
        (acc, pref) => {
          const key = `${pref.did}::${pref.label}`;
          const existing = acc[key];
          if (!existing || pref.priority > existing.priority) {
            acc[key] = pref;
          }
          return acc;
        },
        {} as Record<string, labelpref>,
      ),
    );
  }, [defaultPrefContentLabels, userPrefContentLabels]);

  const hydratedLabelDefs = convertLabelDefsToMap(
    labelerServiceQueries
      .map((item) => item.data)
      .filter((data): data is labeldefpref => data !== undefined),
    mergedPrefContentLabels,
  );

  const labelerServiceLoading = labelerServiceQueries.some((q) => q.isLoading);
  const labelerServiceError = labelerServiceQueries.some((q) => q.isError);

  const isLoading = prefsLoading || labelerServiceLoading;
  const isError = (!isUnauthed && prefsError) || labelerServiceError;

  const value = useMemo(
    () => ({
      activeLabelerDids,
      mergedPrefContentLabels,
      hydratedLabelDefs,
      isLoading,
      isError,
      sendError,
    }),
    [
      activeLabelerDids,
      mergedPrefContentLabels,
      hydratedLabelDefs,
      isLoading,
      isError,
      sendError,
    ],
  );

  // The provider must wrap the application root where useAutoLabels is called
  return (
    <>
      <AutoLabelContext.Provider value={value}>
        {children}
      </AutoLabelContext.Provider>
      {errorModalOpen && (
        <Dialog.Root open={errorModalOpen} onOpenChange={setErrorModalOpen}>
          <Dialog.Overlay className="z-70 fixed inset-0 bg-black/40" />
          <Dialog.Content className="z-80 fixed inset-0 flex justify-center items-center">
            <div className="max-w-md max-h-[calc(100dvh-80px)] flex flex-col py-6 bg-gray-100 dark:bg-gray-900 rounded-xl shadow-xl">
              <div className="flex flex-col gap-2 mx-4">
                <span className="text-[19px] font-semibold">
                  Labeler Errors
                </span>
                <span className="text-gray-700 dark:text-gray-400">
                  These labelers have returned an error. <br />
                  You can disable them to continue using the app.
                </span>
              </div>
              <div className="mb-4 space-y-2 overflow-y-auto">
                {labelerErrors.map((e) => (
                  // <li key={e.did} className="flex justify-between items-center border-b pb-1">
                  //   <span>{e.did}: {e.message}</span>
                  //   <button
                  //     className="text-red-500 text-sm"
                  //     onClick={() => {
                  //       setDisabledLabelers(prev => [...prev, e.did]);
                  //       setLabelerErrors(prev => prev.filter(err => err.did !== e.did));
                  //     }}
                  //   >
                  //     Disable
                  //   </button>
                  // </li>
                  <NotificationItem
                    key={e.did}
                    notification={e.did}
                    labeler={true}
                    labelererror={e.message || "unknown error"}
                  />
                ))}
              </div>
              <div className="flex justify-end gap-2 mx-4">
                {/* <button
                className="px-3 py-1 rounded bg-gray-200 dark:bg-gray-700"
                onClick={() => setErrorModalOpen(false)}
              >
                Close
              </button> */}
                <button
                  className="rounded-full bg-gray-200 hover:bg-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700 p-4 flex-1 flex items-center justify-center"
                  onClick={() => {
                    queryClient.refetchQueries({
                      predicate: (query) => {
                        const key = query.queryKey;

                        // Defensive: ensure shape matches
                        if (!Array.isArray(key) || key.length < 4) return false;

                        const [, kind, , labelerDid] = key;

                        return (
                          kind === "slq" &&
                          typeof labelerDid === "string" &&
                          erroredLabelerDids.has(labelerDid)
                        );
                      },
                    });
                    setLabelerErrors([]);
                    setErrorModalOpen(false);
                    // optional: retry all
                  }}
                >
                  Retry
                </button>
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Root>
      )}
    </>
  );
}

function convertLabelDefsToMap(
  labelDefPrefs: labeldefpref[],
  mergedPrefContentLabels: labelpref[],
): Map<string, HydratedLabelValueDefinition> {
  const labelMap = new Map<string, HydratedLabelValueDefinition>();

  for (const pref of labelDefPrefs) {
    const did = pref.did;

    // Only process if labeldefs array exists
    if (pref.labeldefs && pref.labeldefs.length > 0) {
      for (const def of pref.labeldefs) {
        // Construct the key: did + "::" + identifier

        const key = `${did}::${def.identifier}`;

        const prefdlabelvis = mergedPrefContentLabels.find(
          (i) => i.did === did && i.label === def.identifier,
        )?.visibility;
        const hydrateddef: HydratedLabelValueDefinition = {
          ...def,
          pref: collapsePrefs(
            prefdlabelvis ? prefdlabelvis : def.defaultSetting,
          ),
        };

        // Set the key and the LabelValueDefinition as the value
        labelMap.set(key, hydrateddef);
      }
    }
  }

  return labelMap;
}

function collapsePrefs(
  def: "ignore" | "warn" | "hide" | "show" | (string & {}),
): "ignore" | "warn" | "hide" {
  if (def === "ignore") return "ignore";
  if (def === "warn") return "warn";
  if (def === "hide") return "hide";
  if (def === "show") return "ignore";
  if (def === "alert") return "warn";
  if (def === "inform") return "warn";
  if (def === "none") return "ignore";
  return "ignore";
}
