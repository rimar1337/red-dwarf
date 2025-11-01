import { useAtom } from "jotai";
import { useCallback } from "react";

import { type LikeRecord,useLikeMutationQueue as useLikeMutationQueueFromProvider } from "~/providers/LikeMutationQueueProvider";
import { useAuth } from "~/providers/UnifiedAuthProvider";

import { internalLikedPostsAtom } from "./atoms";

export function useFastLike(target: string, cid: string) {
  const { agent } = useAuth();
  const { fastState, fastToggle, backfillState } = useLikeMutationQueueFromProvider();

  const liked = fastState(target);
  const toggle = () => fastToggle(target, cid);
  /**
   * 
   * @deprecated dont use it yet, will cause infinite rerenders
   */
  const backfill = () => agent?.did && backfillState(target, agent.did);

  return { liked, toggle, backfill };
}

export function useFastSetLikesFromFeed() {
  const [_, setLikedPosts] = useAtom(internalLikedPostsAtom);

  const setFastState = useCallback(
    (target: string, record: LikeRecord | null) =>
      setLikedPosts((prev) => ({ ...prev, [target]: record })),
    [setLikedPosts]
  );

  return { setFastState };
}
