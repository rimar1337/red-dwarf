import { AtUri, type Agent } from "@atproto/api";
import { useQueryConstellation, type linksRecordsResponse } from "./useQuery";
import type { QueryClient } from "@tanstack/react-query";
import { TID } from "@atproto/common-web";

export function useGetFollowState({
  target,
  user,
}: {
  target: string;
  user?: string;
}): string[] | undefined {
  const { data: followData } = useQueryConstellation(
    user
      ? {
          method: "/links",
          target: target,
          // @ts-expect-error overloading sucks so much
          collection: "app.bsky.graph.follow",
          path: ".subject",
          dids: [user],
        }
      : { method: "undefined", target: "whatever" }
    // overloading sucks so much
  ) as { data: linksRecordsResponse | undefined };
  const follows = followData?.linking_records.slice(0, 50) ?? [];

  if (follows.length > 0) {
    return follows.map((linksRecord) => {
      return `at://${linksRecord.did}/${linksRecord.collection}/${linksRecord.rkey}`;
    });
  }

  return undefined;
}

export function toggleFollow({
  agent,
  targetDid,
  followRecords,
  queryClient,
}: {
  agent?: Agent;
  targetDid?: string;
  followRecords: undefined | string[];
  queryClient: QueryClient;
}) {
  if (!agent?.did || !targetDid) return;

  const queryKey = [
    "constellation",
    "/links",
    targetDid,
    "app.bsky.graph.follow",
    ".subject",
    undefined,
    [agent.did],
  ] as const;

  const updateCache = (
    updater: (
      oldData: linksRecordsResponse | undefined
    ) => linksRecordsResponse | undefined
  ) => {
    queryClient.setQueryData(
      queryKey,
      (oldData: linksRecordsResponse | undefined) => updater(oldData)
    );
  };

  if (typeof followRecords === "undefined") {
    const newRecord = {
      repo: agent.did,
      collection: "app.bsky.graph.follow",
      rkey: TID.next().toString(),
      record: {
        $type: "app.bsky.graph.follow",
        subject: targetDid,
        createdAt: new Date().toISOString(),
      },
    };

    updateCache((old) => {
      const newLinkingRecords = [newRecord, ...(old?.linking_records ?? [])];
      return {
        ...old,
        linking_records: newLinkingRecords,
      } as linksRecordsResponse;
    });

    agent.com.atproto.repo.createRecord(newRecord).catch((err) => {
      console.error("Follow failed, reverting cache:", err);
      // rollback cache
      updateCache((old) => {
        return {
          ...old,
          linking_records:
            old?.linking_records.filter((r) => r.rkey !== newRecord.rkey) ?? [],
        } as linksRecordsResponse;
      });
    });

    return;
  }

  followRecords.forEach((followRecord) => {
    const aturi = new AtUri(followRecord);
    agent.com.atproto.repo
      .deleteRecord({
        repo: agent.did!,
        collection: "app.bsky.graph.follow",
        rkey: aturi.rkey,
      })
      .catch(console.error);
  });

  updateCache((old) => {
    if (!old?.linking_records) return old;
    return {
      ...old,
      linking_records: old.linking_records.filter(
        (rec) =>
          !followRecords.includes(
            `at://${rec.did}/${rec.collection}/${rec.rkey}`
          )
      ),
    };
  });
}
