import { type Agent, AtUri } from "@atproto/api";
import { TID } from "@atproto/common-web";
import type { QueryClient, UseQueryResult } from "@tanstack/react-query";

import { type linksRecordsResponse, useQueryConstellation } from "./useQuery";

const pendingFollowOperations = new Set<string>();

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
      : { method: "undefined", target: "whatever" },
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

  const operationKey = `${agent.did}->${targetDid}`;
  if (pendingFollowOperations.has(operationKey)) {
    console.warn("Follow operation already pending for", targetDid);
    return;
  }

  pendingFollowOperations.add(operationKey);

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
      oldData: linksRecordsResponse | undefined,
    ) => linksRecordsResponse | undefined,
  ) => {
    queryClient.setQueryData(
      queryKey,
      (oldData: linksRecordsResponse | undefined) => updater(oldData),
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

    agent.com.atproto.repo
      .createRecord(newRecord)
      .catch((err) => {
        console.error("Follow failed, reverting cache:", err);
        // rollback cache
        updateCache((old) => {
          return {
            ...old,
            linking_records:
              old?.linking_records.filter((r) => r.rkey !== newRecord.rkey) ??
              [],
          } as linksRecordsResponse;
        });
      })
      .finally(() => {
        pendingFollowOperations.delete(operationKey);
      });

    return;
  }

  const deletePromises = followRecords.map((followRecord) => {
    const aturi = new AtUri(followRecord);
    return agent.com.atproto.repo
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
            `at://${rec.did}/${rec.collection}/${rec.rkey}`,
          ),
      ),
    };
  });

  Promise.all(deletePromises).finally(() => {
    pendingFollowOperations.delete(operationKey);
  });
}

export type OneToOneState = {
  uris: string[];
  status: "disabled" | "loading" | "ready" | "error";
  isLoading: boolean;
  isError: boolean;
};

export function useGetOneToOneState(params?: {
  target: string;
  user: string;
  collection: string;
  path: string;
  enabled: boolean;
}): OneToOneState {
  const enabled = params?.enabled ?? false;
  const whatever = useQueryConstellation(
    params && params.user
      ? {
          method: "/links",
          target: params.target,
          // @ts-expect-error overloading sucks so much
          collection: params.collection,
          path: params.path,
          dids: [params.user],
          // todo disgusting hack please never code again
          customkey: params.collection.includes("reddwarf.poll.vote")
            ? "constellation-polls"
            : undefined,
          enabled,
        }
      : { method: "undefined", target: "whatever", enabled: false },
    // overloading sucks so much
  ) as UseQueryResult<linksRecordsResponse | undefined, Error>;

  if (!params || !params.user)
    return {
      uris: [],
      status: "disabled",
      isLoading: false,
      isError: false,
    };

  const arbitrarydata = whatever.data;
  const data = arbitrarydata?.linking_records.slice(0, 50) ?? [];

  if (data.length > 0) {
    return {
      uris: data.map((linksRecord) => {
        return `at://${linksRecord.did}/${linksRecord.collection}/${linksRecord.rkey}`;
      }),
      status: "ready",
      isLoading: false,
      isError: false,
    };
  }

  if (whatever.isError) {
    return {
      uris: [],
      status: "error",
      isLoading: false,
      isError: true,
    };
  }

  if (whatever.isPending) {
    return {
      uris: [],
      status: enabled ? "loading" : "disabled",
      isLoading: enabled,
      isError: false,
    };
  }

  return {
    uris: [],
    status: "ready",
    isLoading: false,
    isError: false,
  };
}
