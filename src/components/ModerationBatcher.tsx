import { useAtom, useAtomValue } from "jotai";
import { useEffect, useRef } from "react";

import { fetchLabelsBatch } from "~/api/moderation";
import {
  CACHE_TIMEOUT_MS,
  labelerConfigAtom,
  moderationCacheAtom,
  pendingUriQueueAtom,
  processingUriSetAtom,
} from "~/state/moderationAtoms";

const BATCH_CHUNK_SIZE = 25;

export const ModerationBatcher = () => {
  const [queue, setQueue] = useAtom(pendingUriQueueAtom);
  const [processingSet, setProcessingSet] = useAtom(processingUriSetAtom);
  const [cache, setCache] = useAtom(moderationCacheAtom);
  const labelers = useAtomValue(labelerConfigAtom);

  const stateRef = useRef({ queue, processingSet, cache, labelers });
  useEffect(() => {
    stateRef.current = { queue, processingSet, cache, labelers };
  }, [queue, processingSet, cache, labelers]);

  useEffect(() => {
    const interval = setInterval(async () => {
      const {
        queue: currentQueue,
        processingSet: currentProcessing,
        cache: currentCache,
        labelers: currentLabelers,
      } = stateRef.current;

      if (currentQueue.size === 0 || currentLabelers.length === 0) return;

      const now = Date.now();

      // 1. Identify stale items
      const batchUris = Array.from(currentQueue).filter((uri) => {
        const entry = currentCache.get(uri);
        const isStale = entry ? now - entry.timestamp > CACHE_TIMEOUT_MS : true;
        return !currentProcessing.has(uri) && isStale;
      });

      if (batchUris.length === 0) return;

      console.log(`[Batcher] Processing ${batchUris.length} URIs...`);

      // 2. Lock items
      setProcessingSet((prev) => {
        const next = new Set(prev);
        batchUris.forEach((u) => next.add(u));
        return next;
      });
      setQueue((prev) => {
        const next = new Set(prev);
        batchUris.forEach((u) => next.delete(u));
        return next;
      });

      // 3. Process chunks
      const chunks = [];
      for (let i = 0; i < batchUris.length; i += BATCH_CHUNK_SIZE) {
        chunks.push(batchUris.slice(i, i + BATCH_CHUNK_SIZE));
      }

      for (const chunk of chunks) {
        try {
          const results = await Promise.allSettled(
            currentLabelers.map((l) => fetchLabelsBatch(l.url, chunk)),
          );

          setCache((prevCache) => {
            const nextCache = new Map(prevCache);
            const updateTime = Date.now();

            // A. Initialize requested URIs (to remove loading state)
            chunk.forEach((uri) => {
              if (
                !nextCache.has(uri) ||
                nextCache.get(uri)!.timestamp < updateTime
              ) {
                nextCache.set(uri, { labels: [], timestamp: updateTime });
              }
            });

            // B. Process Results
            results.forEach((res, index) => {
              if (res.status === "fulfilled") {
                const labeler = currentLabelers[index];
                const rawLabels = res.value.labels || [];

                // --- REDUCTION LOGIC START ---

                // 1. Group by URI
                const labelsByUri = new Map<string, typeof rawLabels>();
                rawLabels.forEach((l) => {
                  if (!labelsByUri.has(l.uri)) labelsByUri.set(l.uri, []);
                  labelsByUri.get(l.uri)!.push(l);
                });

                // 2. Process each URI's history
                labelsByUri.forEach((labels, uri) => {
                  // Only process if this URI is actually in our cache/interest
                  if (!nextCache.has(uri)) return;
                  const cacheEntry = nextCache.get(uri)!;

                  // 3. Find latest state per (Source + Value)
                  // Key: "did:plc:xyz::porn" -> Latest Label Object
                  const latestState = new Map<string, (typeof rawLabels)[0]>();

                  labels.forEach((l) => {
                    const key = `${l.src}::${l.val}`;
                    const existing = latestState.get(key);

                    const currentCts = new Date(l.cts).getTime();
                    const existingCts = existing
                      ? new Date(existing.cts).getTime()
                      : 0;

                    if (!existing || currentCts > existingCts) {
                      latestState.set(key, l);
                    }
                  });

                  // 4. Push only active (non-negated) labels
                  for (const activeLabel of latestState.values()) {
                    if (activeLabel.neg) continue; // Skip deleted labels

                    // Resolve preference from the Labeler Config (our subscription)
                    // Note: We attribute the label to the 'labeler.did' (the service we subscribed to)
                    // even if the signer (src) is different, because prefs are attached to the service.
                    const resolvedPref =
                      labeler.supportedLabels?.[activeLabel.val] || "ignore";

                    cacheEntry.labels.push({
                      sourceDid: labeler.did,
                      val: activeLabel.val,
                      cts: activeLabel.cts,
                      preference: resolvedPref,
                    });
                  }
                });
                // --- REDUCTION LOGIC END ---
              } else {
                console.error(
                  `[Batcher] Labeler ${currentLabelers[index].url} failed:`,
                  res.reason,
                );
              }
            });

            return nextCache;
          });
        } catch (e) {
          console.error("[Batcher] Chunk failed", e);
        }
      }

      // 5. Release Lock
      setProcessingSet((prev) => {
        const next = new Set(prev);
        batchUris.forEach((u) => next.delete(u));
        return next;
      });
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return null;
};
