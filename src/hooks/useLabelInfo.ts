import { useAtomValue } from "jotai";
import { useCallback } from "react";

import { labelerConfigAtom } from "~/state/moderationAtoms";

export const useLabelInfo = () => {
  const labelers = useAtomValue(labelerConfigAtom);

  const getLabelInfo = useCallback(
    (sourceDid: string, val: string) => {
      // 1. Find the labeler config
      const labeler = labelers.find((l) => l.did === sourceDid);

      // Fallback if labeler or definition is missing
      const fallback = {
        name: val,
        description: "",
        isAdult: false,
      };

      if (!labeler) return fallback;

      // 2. Look up the definition
      const def = labeler.labelDefs[val];
      if (!def) return fallback;

      // 3. Resolve Locale (Match browser lang -> 'en' -> first available)
      // You can replace 'en' with a proper i18n atom if you have one
      const userLang = "en";
      const locale =
        def.locales.find((l) => l.lang === userLang) ||
        def.locales.find((l) => l.lang === "en") ||
        def.locales[0];

      return {
        name: locale?.name || val,
        description: locale?.description || "",
        isAdult: def.adultOnly,
        severity: def.severity,
        blurs: def.blurs,
      };
    },
    [labelers],
  );

  return { getLabelInfo };
};
