import { useAtom, useSetAtom } from "jotai";
import { selectAtom } from "jotai/utils";
import { useEffect, useMemo } from "react";

import {
  CACHE_TIMEOUT_MS,
  moderationCacheAtom,
  pendingUriQueueAtom,
  processingUriSetAtom,
} from "~/state/moderationAtoms";
/**
 * Deprecated, left as is for potential future use
 * @deprecated please use the newer useAutoLabels() hook
 */
export const useModeration = (opaqueIdentifierStringToBeModerated: string) => {
  const setQueue = useSetAtom(pendingUriQueueAtom);

  // 1. Select ONLY this URI's cache entry
  const entryAtom = useMemo(
    () => selectAtom(moderationCacheAtom, (cache) => cache.get(opaqueIdentifierStringToBeModerated)),
    [opaqueIdentifierStringToBeModerated],
  );
  const [cachedEntry] = useAtom(entryAtom);

  // 2. Select ONLY this opaqueIdentifierStringToBeModerated's processing state
  const isProcessingAtom = useMemo(
    () => selectAtom(processingUriSetAtom, (set) => set.has(opaqueIdentifierStringToBeModerated)),
    [opaqueIdentifierStringToBeModerated],
  );
  const [isProcessing] = useAtom(isProcessingAtom);

  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const exists = cachedEntry !== undefined;
  const isStale = exists && now - cachedEntry.timestamp > CACHE_TIMEOUT_MS;

  useEffect(() => {
    // Stop if we have valid data or are currently working on it
    if ((exists && !isStale) || isProcessing) return;

    // Queue it
    setQueue((prev) => {
      if (prev.has(opaqueIdentifierStringToBeModerated)) return prev;
      const next = new Set(prev);
      next.add(opaqueIdentifierStringToBeModerated);
      return next;
    });
  }, [opaqueIdentifierStringToBeModerated, exists, isStale, isProcessing, setQueue]);

  return {
    // Show loading ONLY if we have absolutely no data (first load)
    isLoading: !exists, 
    labels: cachedEntry?.labels || [],
  };
};