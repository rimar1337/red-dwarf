import * as ATPAPI from "@atproto/api";

import {
  type HydratedLabelValueDefinition,
  type labelpref,
  useAutoLabelConfig,
} from "~/providers/AutoLabelProvider";
import { useQueryLabels } from "~/utils/useQuery";

export function normalizeLabels(
  labels: ATPAPI.ComAtprotoLabelDefs.Label[],
): ATPAPI.ComAtprotoLabelDefs.Label[] {
  const map = new Map<string, ATPAPI.ComAtprotoLabelDefs.Label>();

  for (const label of labels) {
    const key = `${label.src}::${label.uri}::${label.val}`;

    if (label.neg) {
      map.delete(key);
    } else {
      map.set(key, label);
    }
  }

  return [...map.values()];
}

function computeVerdict(
  prefs: labelpref[],
  labels: ATPAPI.ComAtprotoLabelDefs.Label[],
): ATPAPI.AppBskyActorDefs.ContentLabelPref["visibility"] {
  for (const pref of prefs) {
    // check if any label matches this pref
    const hit = labels.some((l) => l.src === pref.did && l.val === pref.label);

    if (!hit) continue;

    if (pref.visibility === "hide") {
      return "hide";
    }

    if (pref.visibility === "warn") {
      return "warn";
    }
  }

  return "ignore";
}

export function useAutoLabels({
  subjects,
  type,
}: {
  subjects: string[];
  type: "post" | "profile" | "account";
}): {
  results: Map<
    string,
    {
      labelVerdict: ATPAPI.AppBskyActorDefs.ContentLabelPref["visibility"];
      labels: ATPAPI.ComAtprotoLabelDefs.Label[];
    }
  >;
  hydratedLabelDefs: Map<
    string,
    HydratedLabelValueDefinition
  >;
} {
  const {
    activeLabelerDids,
    mergedPrefContentLabels,
    hydratedLabelDefs,
    isLoading: configLoading,
    isError: configError,
    sendError,
  } = useAutoLabelConfig();

  const results = new Map<
    string,
    {
      labelVerdict: ATPAPI.AppBskyActorDefs.ContentLabelPref["visibility"];
      labels: ATPAPI.ComAtprotoLabelDefs.Label[];
    }
  >();

  // const res = useQueryLabelMerge({
  //   s: subjects,
  //   l: activeLabelerDids,
  //   strict: false,
  // });
  const res = useQueryLabels(subjects,activeLabelerDids);
  if (configLoading || res.isLoading) {
    for (const subject of subjects) {
      const subjectLabels = [] as ATPAPI.ComAtprotoLabelDefs.Label[];
      results.set(subject, {
        labelVerdict: "loading",
        labels: subjectLabels,
      });
    }
    return {
      results,
      hydratedLabelDefs,
    };
  }
  if (configError || res.isError || res.data?.error) {
    if (res.isError) {
      sendError({
        did: "!all",
        message: "queryFailure"
      })
    } else 
    if (res.data?.error) {
      console.log("fuck shit !internal-IDK-unknown, ", res.data)
      res.data?.error?.forEach((err)=>{
        sendError({
          did: err.s,
          message: err.e || "!internal-uAL-unknown, len: " + res.data.error?.length + ". label-length" + res.data.labels.length
        })
      })
    }
    console.error("Error fetching auto-label configuration or subject labels",{
      configError: configError,
      isLoading: res.isLoading,
      isError: res.isError,
      data: res.data,
      //error: res.error,
    });

    for (const subject of subjects) {
      const subjectLabels = [] as ATPAPI.ComAtprotoLabelDefs.Label[];
      results.set(subject, {
        labelVerdict: "error",
        labels: subjectLabels,
      });
    }
    return {
      results,
      hydratedLabelDefs,
    };
  }
  
  if (res.data && (res.data.labels.length === 0) ) {
    // early return because wow you did it theres no labels to be computed! wonderful! wow!
    // group labels by subject (uri)

    for (const subject of subjects) {
      const subjectLabels = [] as ATPAPI.ComAtprotoLabelDefs.Label[];
      results.set(subject, {
        labelVerdict: "ignore",
        labels: subjectLabels,
      });
    }
    return {
      results,
      hydratedLabelDefs,
    };
  }

  const effectiveLabels = normalizeLabels(res.data?.labels ?? []);

  // group labels by subject (uri)
  const labelsBySubject = new Map<
    string,
    ATPAPI.ComAtprotoLabelDefs.Label[]
  >();

  for (const label of effectiveLabels) {
    const arr = labelsBySubject.get(label.uri) ?? [];
    arr.push(label);
    labelsBySubject.set(label.uri, arr);
  }

  for (const subject of subjects) {
    const subjectLabels = labelsBySubject.get(subject) ?? [];
    const verdict = computeVerdict(
      mergedPrefContentLabels,
      subjectLabels,
    );
    results.set(subject, {
      labelVerdict: verdict,
      labels: subjectLabels,
    });
  }

  return {
    results,
    hydratedLabelDefs,
  };
}

export function getGetHydratedLabelDefs(
  hydratedLabelDefs: Map<
    string,
    HydratedLabelValueDefinition
  >,
) {
  function getHydratedLabelDefs(did: string, label: string) {
    return hydratedLabelDefs.get(did + "::" + label);
  }
  return getHydratedLabelDefs;
}
