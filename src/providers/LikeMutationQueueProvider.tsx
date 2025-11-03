import { AtUri } from "@atproto/api";
import { TID } from "@atproto/common-web";
import { useQueryClient } from "@tanstack/react-query";
import { useAtom } from "jotai";
import React, { createContext, use, useCallback, useEffect, useRef } from "react";

import { useAuth } from "~/providers/UnifiedAuthProvider";
import { renderSnack } from "~/routes/__root";
import { constellationURLAtom, internalLikedPostsAtom } from "~/utils/atoms";
import { constructArbitraryQuery, constructConstellationQuery, type linksRecordsResponse } from "~/utils/useQuery";

export type LikeRecord = { uri: string; target: string; cid: string };
export type LikeMutation = { type: 'like'; target: string; cid: string };
export type UnlikeMutation = { type: 'unlike'; likeRecordUri: string; target: string, originalRecord: LikeRecord };
export type Mutation = LikeMutation | UnlikeMutation;

interface LikeMutationQueueContextType {
  fastState: (target: string) => LikeRecord | null | undefined;
  fastToggle: (target:string, cid:string) => void;
  backfillState: (target: string, user: string) => Promise<void>;
}

const LikeMutationQueueContext = createContext<LikeMutationQueueContextType | undefined>(undefined);

export function LikeMutationQueueProvider({ children }: { children: React.ReactNode }) {
  const { agent } = useAuth();
  const queryClient = useQueryClient();
  const [likedPosts, setLikedPosts] = useAtom(internalLikedPostsAtom);
  const [constellationurl] = useAtom(constellationURLAtom);

  const likedPostsRef = useRef(likedPosts);
  useEffect(() => {
    likedPostsRef.current = likedPosts;
  }, [likedPosts]);

  const queueRef = useRef<Mutation[]>([]);
  const runningRef = useRef(false);

  const fastState = (target: string) => likedPosts[target];

  const setFastState = useCallback(
    (target: string, record: LikeRecord | null) =>
      setLikedPosts((prev) => ({ ...prev, [target]: record })),
    [setLikedPosts]
  );
  
  const enqueue = (mutation: Mutation) => queueRef.current.push(mutation);

  const fastToggle = useCallback((target: string, cid: string) => {
    const likedRecord = likedPostsRef.current[target];
    
    if (likedRecord) {
      setFastState(target, null);
      if (likedRecord.uri !== 'pending') {
        enqueue({ type: "unlike", likeRecordUri: likedRecord.uri, target, originalRecord: likedRecord });
      }
    } else {
      setFastState(target, { uri: "pending", target, cid });
      enqueue({ type: "like", target, cid });
    }
  }, [setFastState]);

  /**
   * 
   * @deprecated dont use it yet, will cause infinite rerenders
   */
  const backfillState = async (target: string, user: string) => {
      const query = constructConstellationQuery({
        constellation: constellationurl,
        method: "/links",
        target,
        collection: "app.bsky.feed.like",
        path: ".subject.uri",
        dids: [user],
      });
      const data = await queryClient.fetchQuery(query);
      const likes = (data as linksRecordsResponse)?.linking_records?.slice(0, 50) ?? [];
      const found = likes.find((r) => r.did === user);
      if (found) {
        const uri = `at://${found.did}/${found.collection}/${found.rkey}`;
        const ciddata = await queryClient.fetchQuery(
          constructArbitraryQuery(uri)
        );
        if (ciddata?.cid)
          setFastState(target, { uri, target, cid: ciddata?.cid });
      } else {
        setFastState(target, null);
      }
    };
  

  useEffect(() => {
    if (!agent?.did) return;

    const processQueue = async () => {
      if (runningRef.current || queueRef.current.length === 0) return;
      runningRef.current = true;

      while (queueRef.current.length > 0) {
        const mutation = queueRef.current.shift()!;
        try {
          if (mutation.type === "like") {
            const newRecord = {
              repo: agent.did!,
              collection: "app.bsky.feed.like",
              rkey: TID.next().toString(),
              record: {
                $type: "app.bsky.feed.like",
                subject: { uri: mutation.target, cid: mutation.cid },
                createdAt: new Date().toISOString(),
              },
            };
            const response = await agent.com.atproto.repo.createRecord(newRecord);
            if (!response.success) throw new Error("createRecord failed");

            const uri = `at://${agent.did}/${newRecord.collection}/${newRecord.rkey}`;
            setFastState(mutation.target, {
              uri,
              target: mutation.target,
              cid: mutation.cid,
            });
          } else if (mutation.type === "unlike") {
            const aturi = new AtUri(mutation.likeRecordUri);
            await agent.com.atproto.repo.deleteRecord({ repo: agent.did!, collection: aturi.collection, rkey: aturi.rkey });
            setFastState(mutation.target, null);
          }
        } catch (err) {
          console.error("Like mutation failed, reverting:", err);
          renderSnack({
            title: 'Like Mutation Failed',
            description: 'Please try again.',
            //button: { label: 'Try Again', onClick: () => console.log('whatever') },
          })
          if (mutation.type === 'like') {
            setFastState(mutation.target, null);
          } else if (mutation.type === 'unlike') {
            setFastState(mutation.target, mutation.originalRecord);
          }
        }
      }
      runningRef.current = false;
    };

    const interval = setInterval(processQueue, 1000);
    return () => clearInterval(interval);
  }, [agent, setFastState]);

  const value = { fastState, fastToggle, backfillState };

  return (
    <LikeMutationQueueContext value={value}>
      {children}
    </LikeMutationQueueContext>
  );
}

export function useLikeMutationQueue() {
  const context = use(LikeMutationQueueContext);
  if (context === undefined) {
    throw new Error('useLikeMutationQueue must be used within a LikeMutationQueueProvider');
  }
  return context;
}