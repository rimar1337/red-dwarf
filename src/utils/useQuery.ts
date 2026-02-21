import * as ATPAPI from "@atproto/api";
import {
  infiniteQueryOptions,
  QueryClient,
  type QueryFunctionContext,
  queryOptions,
  useInfiniteQuery,
  useQueries,
  useQuery,
  //useQueryClient,
  type UseQueryResult,
} from "@tanstack/react-query";
import { create, windowScheduler } from "@yornaath/batshit";
import { useAtom } from "jotai";
import { useMemo } from "react";

import { HOST_LABELMERGE } from "~/../policy";
import type {
  Error as LabelMergeQueryLabelsOutputSchemaError,
  OutputSchema as LabelMergeQueryLabelsOutputSchema,
  QueryParams as LabelMergeQueryLabelsQueryParams,
} from "~/api/labelmerge/types/app/reddwarf/labelmerge/queryLabels";
import { useAuth } from "~/providers/UnifiedAuthProvider";

import { constellationURLAtom, lycanURLAtom, slingshotURLAtom } from "./atoms";

export function constructIdentityQuery(
  didorhandle?: string,
  slingshoturl?: string,
) {
  return queryOptions({
    queryKey: ["identity", didorhandle],
    queryFn: async () => {
      if (!didorhandle) return undefined as undefined;
      const res = await fetch(
        `https://${slingshoturl}/xrpc/com.bad-example.identity.resolveMiniDoc?identifier=${encodeURIComponent(didorhandle)}`,
      );
      if (!res.ok) throw new Error("Failed to fetch post");
      try {
        return (await res.json()) as {
          did: string;
          handle: string;
          pds: string;
          signing_key: string;
        };
      } catch (_e) {
        return undefined;
      }
    },
    staleTime: /*0,//*/ 5 * 60 * 1000, // 5 minutes
    gcTime: /*0//*/ 5 * 60 * 1000,
  });
}
export function useQueryIdentity(didorhandle: string): UseQueryResult<
  {
    did: string;
    handle: string;
    pds: string;
    signing_key: string;
  },
  Error
>;
export function useQueryIdentity(): UseQueryResult<undefined, Error>;
export function useQueryIdentity(didorhandle?: string): UseQueryResult<
  | {
      did: string;
      handle: string;
      pds: string;
      signing_key: string;
    }
  | undefined,
  Error
>;
export function useQueryIdentity(didorhandle?: string) {
  const [slingshoturl] = useAtom(slingshotURLAtom);
  return useQuery(constructIdentityQuery(didorhandle, slingshoturl));
}

export function constructFastAVIdentityQuery(
  didorhandle?: string,
  slingshoturl?: string,
  queryClient?: QueryClient,
  enabled?: boolean
) {
  return queryOptions({
    queryKey: ["identity", didorhandle],
    queryFn: async () => {
      try {
        console.log("whathuh trying", ["savpq", didorhandle])
        if (!queryClient) throw "whatever"
        const datas = queryClient.getQueriesData<SingularAVPostResult | undefined>({
          queryKey: ["savpq", didorhandle],
        })
        console.log("whathuh checking", datas)
        const data = datas[0][1];
        if (!data) {
          throw "whatever"
        }
        //const parsedaturi = new ATPAPI.AtUri(data.uri)
        console.log("whathuh success")
        return {
          did: data.author.did,
          handle: data.author.handle
        }
      } catch {
        console.log("whathuh failure")
        if (!didorhandle) return undefined as undefined;
        const res = await fetch(
          `https://${slingshoturl}/xrpc/com.bad-example.identity.resolveMiniDoc?identifier=${encodeURIComponent(didorhandle)}`,
        );
        if (!res.ok) throw new Error("Failed to fetch post");
        try {
          return (await res.json()) as {
            did: string;
            handle: string;
            pds: string;
            signing_key: string;
          };
        } catch (_e) {
          return undefined;
        }
      }
    },
    enabled,
    staleTime: /*0,//*/ 5 * 60 * 1000, // 5 minutes
    gcTime: /*0//*/ 5 * 60 * 1000,
  });
}


export function useQueryFastAVIdentity(didorhandle?: string, slingshoturl?: string, queryClient?: QueryClient, enabled: boolean = true) {
  return useQuery(constructFastAVIdentityQuery(didorhandle, slingshoturl, queryClient, enabled));
}

export function constructPostQuery(uri?: string, slingshoturl?: string) {
  return queryOptions({
    queryKey: ["post", uri],
    queryFn: async () => {
      if (!uri) return undefined as undefined;
      const res = await fetch(
        `https://${slingshoturl}/xrpc/com.bad-example.repo.getUriRecord?at_uri=${encodeURIComponent(uri)}`,
      );
      let data: any;
      try {
        data = await res.json();
      } catch {
        return undefined;
      }
      if (res.status === 400) return undefined;
      if (
        data?.error === "InvalidRequest" &&
        data.message?.includes("Could not find repo")
      ) {
        return undefined; // cache “not found”
      }
      try {
        if (!res.ok) throw new Error("Failed to fetch post");
        return data as {
          uri: string;
          cid: string;
          value: any;
        };
      } catch (_e) {
        return undefined;
      }
    },
    retry: (failureCount, error) => {
      // dont retry 400 errors
      if ((error as any)?.message?.includes("400")) return false;
      return failureCount < 2;
    },
    staleTime: /*0,//*/ 5 * 60 * 1000, // 5 minutes
    gcTime: /*0//*/ 5 * 60 * 1000,
  });
}
export function useQueryPost(uri: string): UseQueryResult<
  {
    uri: string;
    cid: string;
    value: ATPAPI.AppBskyFeedPost.Record;
  },
  Error
>;
export function useQueryPost(): UseQueryResult<undefined, Error>;
export function useQueryPost(uri?: string): UseQueryResult<
  | {
      uri: string;
      cid: string;
      value: ATPAPI.AppBskyFeedPost.Record;
    }
  | undefined,
  Error
>;
export function useQueryPost(uri?: string) {
  const [slingshoturl] = useAtom(slingshotURLAtom);
  return useQuery(constructPostQuery(uri, slingshoturl));
}

export function constructProfileQuery(uri?: string, slingshoturl?: string) {
  return queryOptions({
    queryKey: ["profile", uri],
    queryFn: async () => {
      if (!uri) return undefined as undefined;
      const res = await fetch(
        `https://${slingshoturl}/xrpc/com.bad-example.repo.getUriRecord?at_uri=${encodeURIComponent(uri)}`,
      );
      let data: any;
      try {
        data = await res.json();
      } catch {
        return undefined;
      }
      if (res.status === 400) return undefined;
      if (
        data?.error === "InvalidRequest" &&
        data.message?.includes("Could not find repo")
      ) {
        return undefined; // cache “not found”
      }
      try {
        if (!res.ok) throw new Error("Failed to fetch post");
        return data as {
          uri: string;
          cid: string;
          value: any;
        };
      } catch (_e) {
        return undefined;
      }
    },
    retry: (failureCount, error) => {
      // dont retry 400 errors
      if ((error as any)?.message?.includes("400")) return false;
      return failureCount < 2;
    },
    staleTime: /*0,//*/ 5 * 60 * 1000, // 5 minutes
    gcTime: /*0//*/ 5 * 60 * 1000,
  });
}
export function useQueryProfile(uri: string): UseQueryResult<
  {
    uri: string;
    cid: string;
    value: ATPAPI.AppBskyActorProfile.Record;
  },
  Error
>;
export function useQueryProfile(): UseQueryResult<undefined, Error>;
export function useQueryProfile(uri?: string): UseQueryResult<
  | {
      uri: string;
      cid: string;
      value: ATPAPI.AppBskyActorProfile.Record;
    }
  | undefined,
  Error
>;
export function useQueryProfile(uri?: string) {
  const [slingshoturl] = useAtom(slingshotURLAtom);
  return useQuery(constructProfileQuery(uri, slingshoturl));
}

// export function constructConstellationQuery(
//   method: "/links",
//   target: string,
//   collection: string,
//   path: string,
//   cursor?: string
// ): QueryOptions<linksRecordsResponse, Error>;
// export function constructConstellationQuery(
//   method: "/links/distinct-dids",
//   target: string,
//   collection: string,
//   path: string,
//   cursor?: string
// ): QueryOptions<linksDidsResponse, Error>;
// export function constructConstellationQuery(
//   method: "/links/count",
//   target: string,
//   collection: string,
//   path: string,
//   cursor?: string
// ): QueryOptions<linksCountResponse, Error>;
// export function constructConstellationQuery(
//   method: "/links/count/distinct-dids",
//   target: string,
//   collection: string,
//   path: string,
//   cursor?: string
// ): QueryOptions<linksCountResponse, Error>;
// export function constructConstellationQuery(
//   method: "/links/all",
//   target: string
// ): QueryOptions<linksAllResponse, Error>;
export function constructConstellationQuery(query?: {
  constellation: string;
  method:
    | "/links"
    | "/links/distinct-dids"
    | "/links/count"
    | "/links/count/distinct-dids"
    | "/links/all"
    | "undefined";
  target: string;
  collection?: string;
  path?: string;
  cursor?: string;
  dids?: string[];
  customkey?: string;
  enabled?: boolean;
}) {
  // : QueryOptions<
  //   | linksRecordsResponse
  //   | linksDidsResponse
  //   | linksCountResponse
  //   | linksAllResponse
  //   | undefined,
  //   Error
  // >
  return queryOptions({
    enabled: query?.enabled,
    queryKey: [
      "constellation",
      query?.method,
      query?.target,
      query?.collection,
      query?.path,
      query?.cursor,
      query?.dids,
      query?.customkey,
    ] as const,
    queryFn: async () => {
      if (!query || query.method === "undefined") return undefined as undefined;
      const method = query.method;
      const target = query.target;
      const collection = query?.collection;
      const path = query?.path;
      const cursor = query.cursor;
      const dids = query?.dids;
      const res = await fetch(
        `https://${query.constellation}${method}?target=${encodeURIComponent(target)}${collection ? `&collection=${encodeURIComponent(collection)}` : ""}${path ? `&path=${encodeURIComponent(path)}` : ""}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}${dids ? dids.map((did) => `&did=${encodeURIComponent(did)}`).join("") : ""}`,
      );
      if (!res.ok) throw new Error("Failed to fetch post");
      try {
        switch (method) {
          case "/links":
            return (await res.json()) as linksRecordsResponse;
          case "/links/distinct-dids":
            return (await res.json()) as linksDidsResponse;
          case "/links/count":
            return (await res.json()) as linksCountResponse;
          case "/links/count/distinct-dids":
            return (await res.json()) as linksCountResponse;
          case "/links/all":
            return (await res.json()) as linksAllResponse;
          default:
            return undefined;
        }
      } catch (_e) {
        return undefined;
      }
    },
    // enforce short lifespan
    staleTime: /*0,//*/ 5 * 60 * 1000, // 5 minutes
    gcTime: /*0//*/ 5 * 60 * 1000,
  });
}
// todo do more of these instead of overloads since overloads sucks so much apparently
export function useQueryConstellationLinksCountDistinctDids(query?: {
  method: "/links/count/distinct-dids";
  target: string;
  collection: string;
  path: string;
  cursor?: string;
}): UseQueryResult<linksCountResponse, Error> | undefined {
  //if (!query) return;
  const [constellationurl] = useAtom(constellationURLAtom);
  const queryres = useQuery(
    constructConstellationQuery(
      query && { constellation: constellationurl, ...query },
    ),
  ) as unknown as UseQueryResult<linksCountResponse, Error>;
  if (!query) {
    return undefined as undefined;
  }
  return queryres as UseQueryResult<linksCountResponse, Error>;
}

export function useQueryConstellation(query: {
  method: "/links";
  target: string;
  collection: string;
  path: string;
  cursor?: string;
  dids?: string[];
  customkey?: string;
  enabled?: boolean;
}): UseQueryResult<linksRecordsResponse, Error>;
export function useQueryConstellation(query: {
  method: "/links/distinct-dids";
  target: string;
  collection: string;
  path: string;
  cursor?: string;
  customkey?: string;
  enabled?: boolean;
}): UseQueryResult<linksDidsResponse, Error>;
export function useQueryConstellation(query: {
  method: "/links/count";
  target: string;
  collection: string;
  path: string;
  cursor?: string;
  customkey?: string;
  enabled?: boolean;
}): UseQueryResult<linksCountResponse, Error>;
export function useQueryConstellation(query: {
  method: "/links/count/distinct-dids";
  target: string;
  collection: string;
  path: string;
  cursor?: string;
  customkey?: string;
  enabled?: boolean;
}): UseQueryResult<linksCountResponse, Error>;
export function useQueryConstellation(query: {
  method: "/links/all";
  target: string;
  customkey?: string;
  enabled?: boolean;
}): UseQueryResult<linksAllResponse, Error>;
export function useQueryConstellation(): undefined;
export function useQueryConstellation(query: {
  method: "undefined";
  target: string;
  customkey?: string;
  enabled?: boolean;
}): undefined;
export function useQueryConstellation(query?: {
  method:
    | "/links"
    | "/links/distinct-dids"
    | "/links/count"
    | "/links/count/distinct-dids"
    | "/links/all"
    | "undefined";
  target: string;
  collection?: string;
  path?: string;
  cursor?: string;
  dids?: string[];
  customkey?: string;
  enabled?: boolean;
}):
  | UseQueryResult<
      | linksRecordsResponse
      | linksDidsResponse
      | linksCountResponse
      | linksAllResponse
      | undefined,
      Error
    >
  | undefined {
  //if (!query) return;
  const [constellationurl] = useAtom(constellationURLAtom);
  const res = useQuery(
    constructConstellationQuery(
      query && { constellation: constellationurl, ...query },
    ),
  );
  return res
}

export type linksRecord = {
  did: string;
  collection: string;
  rkey: string;
};
export type linksRecordsResponse = {
  total: string;
  linking_records: linksRecord[];
  cursor?: string;
};
type linksDidsResponse = {
  total: string;
  linking_dids: string[];
  cursor?: string;
};
type linksCountResponse = {
  total: string;
};
export type linksAllResponse = {
  links: Record<
    string,
    Record<
      string,
      {
        records: number;
        distinct_dids: number;
      }
    >
  >;
};

export function constructFeedSkeletonQuery(options?: {
  feedUri: string;
  agent?: ATPAPI.Agent;
  isAuthed: boolean;
  pdsUrl?: string;
  feedServiceDid?: string;
}) {
  return queryOptions({
    // The query key includes all dependencies to ensure it refetches when they change
    queryKey: [
      "feedSkeleton",
      options?.feedUri,
      { isAuthed: options?.isAuthed, did: options?.agent?.did },
    ],
    queryFn: async () => {
      if (!options) return undefined as undefined;
      const { feedUri, agent, isAuthed, pdsUrl, feedServiceDid } = options;
      if (isAuthed) {
        // Authenticated flow
        if (!agent || !pdsUrl || !feedServiceDid) {
          throw new Error(
            "Missing required info for authenticated feed fetch.",
          );
        }
        const url = `${pdsUrl}/xrpc/app.bsky.feed.getFeedSkeleton?feed=${encodeURIComponent(feedUri)}`;
        const res = await agent.fetchHandler(url, {
          method: "GET",
          headers: {
            "atproto-proxy": `${feedServiceDid}#bsky_fg`,
            "Content-Type": "application/json",
          },
        });
        if (!res.ok)
          throw new Error(`Authenticated feed fetch failed: ${res.statusText}`);
        return (await res.json()) as ATPAPI.AppBskyFeedGetFeedSkeleton.OutputSchema;
      } else {
        // Unauthenticated flow (using a public PDS/AppView)
        const url = `https://discover.bsky.app/xrpc/app.bsky.feed.getFeedSkeleton?feed=${encodeURIComponent(feedUri)}`;
        const res = await fetch(url);
        if (!res.ok)
          throw new Error(`Public feed fetch failed: ${res.statusText}`);
        return (await res.json()) as ATPAPI.AppBskyFeedGetFeedSkeleton.OutputSchema;
      }
    },
    //enabled: !!feedUri && (isAuthed ? !!agent && !!pdsUrl && !!feedServiceDid : true),
  });
}

export function useQueryFeedSkeleton(options?: {
  feedUri: string;
  agent?: ATPAPI.Agent;
  isAuthed: boolean;
  pdsUrl?: string;
  feedServiceDid?: string;
}) {
  return useQuery(constructFeedSkeletonQuery(options));
}

export function constructRecordQuery(
  did?: string,
  collection?: string,
  rkey?: string,
  pdsUrl?: string,
) {
  return queryOptions({
    queryKey: ["record", did, collection, rkey],
    queryFn: async () => {
      if (!did || !collection || !rkey || !pdsUrl)
        return undefined as undefined;
      const url = `${pdsUrl}/xrpc/com.atproto.repo.getRecord?repo=${encodeURIComponent(did)}&collection=${encodeURIComponent(collection)}&rkey=${encodeURIComponent(rkey)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch record");
      try {
        return (await res.json()) as {
          uri: string;
          cid: string;
          value: any;
        };
      } catch (_e) {
        return undefined;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 5 * 60 * 1000,
  });
}

export function useQueryRecord(
  did?: string,
  collection?: string,
  rkey?: string,
  pdsUrl?: string,
) {
  return useQuery(constructRecordQuery(did, collection, rkey, pdsUrl));
}

export function constructPreferencesQuery(
  agent?: ATPAPI.Agent | undefined,
  pdsUrl?: string | undefined,
) {
  return queryOptions({
    queryKey: ["preferences", agent?.did],
    queryFn: async () => {
      if (!agent || !pdsUrl) throw new Error("Agent or PDS URL not available");
      const url = `${pdsUrl}/xrpc/app.bsky.actor.getPreferences`;
      const res = await agent.fetchHandler(url, { method: "GET" });
      if (!res.ok) throw new Error("Failed to fetch preferences");
      // todo, i just gave it real types (atproto api types) so theres gonna be a bunch of errors so pls fix thx
      return (await res.json()) as ATPAPI.AppBskyActorGetPreferences.OutputSchema;
    },
  });
}
export function useQueryPreferences(options: {
  agent?: ATPAPI.Agent | undefined;
  pdsUrl?: string | undefined;
}) {
  return useQuery(constructPreferencesQuery(options.agent, options.pdsUrl));
}

export function constructArbitraryQuery(uri?: string, slingshoturl?: string) {
  return queryOptions({
    queryKey: ["arbitrary", uri],
    queryFn: async () => {
      if (!uri) return undefined as undefined;
      const res = await fetch(
        `https://${slingshoturl}/xrpc/com.bad-example.repo.getUriRecord?at_uri=${encodeURIComponent(uri)}`,
      );
      let data: any;
      try {
        data = await res.json();
      } catch {
        return undefined;
      }
      if (res.status === 400) return undefined;
      if (
        data?.error === "InvalidRequest" &&
        data.message?.includes("Could not find repo")
      ) {
        return undefined; // cache “not found”
      }
      try {
        if (!res.ok) throw new Error("Failed to fetch post");
        return data as {
          uri: string;
          cid: string;
          value: any;
        };
      } catch (_e) {
        return undefined;
      }
    },
    retry: (failureCount, error) => {
      // dont retry 400 errors
      if ((error as any)?.message?.includes("400")) return false;
      return failureCount < 2;
    },
    staleTime: /*0,//*/ 5 * 60 * 1000, // 5 minutes
    gcTime: /*0//*/ 5 * 60 * 1000,
  });
}
export function useQueryArbitrary(uri: string): UseQueryResult<
  {
    uri: string;
    cid: string;
    value: any;
  },
  Error
>;
export function useQueryArbitrary(): UseQueryResult<undefined, Error>;
export function useQueryArbitrary(uri?: string): UseQueryResult<
  | {
      uri: string;
      cid: string;
      value: any;
    }
  | undefined,
  Error
>;
export function useQueryArbitrary(uri?: string) {
  const [slingshoturl] = useAtom(slingshotURLAtom);
  return useQuery(constructArbitraryQuery(uri, slingshoturl));
}

export function constructFallbackNothingQuery() {
  return queryOptions({
    queryKey: ["nothing"],
    queryFn: async () => {
      return undefined;
    },
  });
}

type ListRecordsResponse = {
  cursor?: string;
  records: {
    uri: string;
    cid: string;
    value: ATPAPI.AppBskyFeedPost.Record;
  }[];
};

export function constructAuthorFeedQuery(
  did: string,
  pdsUrl: string,
  collection: string = "app.bsky.feed.post",
) {
  return queryOptions({
    queryKey: ["authorFeed", did, collection],
    queryFn: async ({ pageParam }: QueryFunctionContext) => {
      const limit = 25;

      const cursor = pageParam as string | undefined;
      const cursorParam = cursor ? `&cursor=${cursor}` : "";

      const url = `${pdsUrl}/xrpc/com.atproto.repo.listRecords?repo=${did}&collection=${collection}&limit=${limit}${cursorParam}`;

      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch author's posts");

      return res.json() as Promise<ListRecordsResponse>;
    },
  });
}

export function useInfiniteQueryAuthorFeed(
  did: string | undefined,
  pdsUrl: string | undefined,
  collection?: string,
) {
  const { queryKey, queryFn } = constructAuthorFeedQuery(
    did!,
    pdsUrl!,
    collection,
  );

  return useInfiniteQuery({
    queryKey,
    queryFn,
    initialPageParam: undefined as never, // ???? what is this shit
    getNextPageParam: (lastPage) => lastPage.cursor as null | undefined,
    enabled: !!did && !!pdsUrl,
  });
}

type FeedSkeletonPage = ATPAPI.AppBskyFeedGetFeedSkeleton.OutputSchema;

export function constructInfiniteFeedSkeletonQuery(options: {
  feedUri: string;
  agent?: ATPAPI.Agent;
  isAuthed: boolean;
  pdsUrl?: string;
  feedServiceDid?: string;
  // todo the hell is a unauthedfeedurl
  unauthedfeedurl?: string;
}) {
  const { feedUri, agent, isAuthed, pdsUrl, feedServiceDid, unauthedfeedurl } =
    options;

  return queryOptions({
    queryKey: ["feedSkeleton", feedUri, { isAuthed, did: agent?.did }],

    queryFn: async ({
      pageParam,
    }: QueryFunctionContext): Promise<FeedSkeletonPage> => {
      const cursorParam = pageParam ? `&cursor=${pageParam}` : "";

      if (isAuthed && !unauthedfeedurl) {
        if (!agent || !pdsUrl || !feedServiceDid) {
          throw new Error(
            "Missing required info for authenticated feed fetch.",
          );
        }
        const url = `${pdsUrl}/xrpc/app.bsky.feed.getFeedSkeleton?feed=${encodeURIComponent(feedUri)}${cursorParam}`;
        const res = await agent.fetchHandler(url, {
          method: "GET",
          headers: {
            "atproto-proxy": `${feedServiceDid}#bsky_fg`,
            "Content-Type": "application/json",
          },
        });
        if (!res.ok)
          throw new Error(`Authenticated feed fetch failed: ${res.statusText}`);
        return (await res.json()) as FeedSkeletonPage;
      } else {
        const url = `https://${unauthedfeedurl ? unauthedfeedurl : "discover.bsky.app"}/xrpc/app.bsky.feed.getFeedSkeleton?feed=${encodeURIComponent(feedUri)}${cursorParam}`;
        const res = await fetch(url);
        if (!res.ok)
          throw new Error(`Public feed fetch failed: ${res.statusText}`);
        return (await res.json()) as FeedSkeletonPage;
      }
    },
  });
}

export function useInfiniteQueryFeedSkeleton(options: {
  feedUri: string;
  agent?: ATPAPI.Agent;
  isAuthed: boolean;
  pdsUrl?: string;
  feedServiceDid?: string;
  unauthedfeedurl?: string;
}) {
  const { queryKey, queryFn } = constructInfiniteFeedSkeletonQuery(options);

  return {
    ...useInfiniteQuery({
      queryKey,
      queryFn,
      initialPageParam: undefined as never,
      getNextPageParam: (lastPage) => lastPage.cursor as null | undefined,
      staleTime: Infinity,
      refetchOnWindowFocus: false,
      enabled:
        !!options.feedUri &&
        (options.isAuthed
          ? ((!!options.agent && !!options.pdsUrl) ||
              !!options.unauthedfeedurl) &&
            !!options.feedServiceDid
          : true),
    }),
    queryKey: queryKey,
  };
}

export function yknowIReallyHateThisButWhateverGuardedConstructConstellationInfiniteQueryLinks(query?: {
  constellation: string;
  method: "/links";
  target?: string;
  collection: string;
  path: string;
  staleMult?: number;
}) {
  const safemult = query?.staleMult ?? 1;
  // console.log(
  //   'yknowIReallyHateThisButWhateverGuardedConstructConstellationInfiniteQueryLinks',
  //   query,
  // )

  return infiniteQueryOptions({
    enabled: !!query?.target,
    queryKey: [
      "reddwarf_constellation",
      query?.method,
      query?.target,
      query?.collection,
      query?.path,
    ] as const,

    queryFn: async ({ pageParam }: { pageParam?: string }) => {
      if (!query || !query?.target) return undefined;

      const method = query.method;
      const target = query.target;
      const collection = query.collection;
      const path = query.path;
      const cursor = pageParam;

      const res = await fetch(
        `https://${query.constellation}${method}?target=${encodeURIComponent(target)}${
          collection ? `&collection=${encodeURIComponent(collection)}` : ""
        }${path ? `&path=${encodeURIComponent(path)}` : ""}${
          cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""
        }`,
      );

      if (!res.ok) throw new Error("Failed to fetch");

      return (await res.json()) as linksRecordsResponse;
    },

    getNextPageParam: (lastPage) => {
      return (lastPage as any)?.cursor ?? undefined;
    },
    initialPageParam: undefined,
    staleTime: 5 * 60 * 1000 * safemult,
    gcTime: 5 * 60 * 1000 * safemult,
  });
}

export function useQueryLycanStatus() {
  const [lycanurl] = useAtom(lycanURLAtom);
  const { agent, status } = useAuth();
  const { data: identity } = useQueryIdentity(agent?.did);
  return useQuery(
    constructLycanStatusCheckQuery({
      agent: agent || undefined,
      isAuthed: status === "signedIn",
      pdsUrl: identity?.pds,
      feedServiceDid: "did:web:" + lycanurl,
    }),
  );
}

export function constructLycanStatusCheckQuery(options: {
  agent?: ATPAPI.Agent;
  isAuthed: boolean;
  pdsUrl?: string;
  feedServiceDid?: string;
}) {
  const { agent, isAuthed, pdsUrl, feedServiceDid } = options;

  return queryOptions({
    queryKey: ["lycanStatus", { isAuthed, did: agent?.did }],

    queryFn: async () => {
      if (isAuthed && agent && pdsUrl && feedServiceDid) {
        const url = `${pdsUrl}/xrpc/blue.feeds.lycan.getImportStatus`;
        const res = await agent.fetchHandler(url, {
          method: "GET",
          headers: {
            "atproto-proxy": `${feedServiceDid}#lycan`,
            "Content-Type": "application/json",
          },
        });
        if (!res.ok)
          throw new Error(
            `Authenticated lycan status fetch failed: ${res.statusText}`,
          );
        return (await res.json()) as statuschek;
      }
      return undefined;
    },
  });
}

type statuschek = {
  [key: string]: unknown;
  error?: "MethodNotImplemented";
  message?: "Method Not Implemented";
  status?: "finished" | "in_progress";
  position?: string;
  progress?: number;
};

//{"status":"in_progress","position":"2025-08-30T06:53:18Z","progress":0.0878319661441268}
type importtype = {
  message?: "Import has already started" | "Import has been scheduled";
};

export function constructLycanRequestIndexQuery(options: {
  agent?: ATPAPI.Agent;
  isAuthed: boolean;
  pdsUrl?: string;
  feedServiceDid?: string;
}) {
  const { agent, isAuthed, pdsUrl, feedServiceDid } = options;

  return queryOptions({
    queryKey: ["lycanIndex", { isAuthed, did: agent?.did }],

    queryFn: async () => {
      if (isAuthed && agent && pdsUrl && feedServiceDid) {
        const url = `${pdsUrl}/xrpc/blue.feeds.lycan.startImport`;
        const res = await agent.fetchHandler(url, {
          method: "POST",
          headers: {
            "atproto-proxy": `${feedServiceDid}#lycan`,
            "Content-Type": "application/json",
          },
        });
        if (!res.ok)
          throw new Error(
            `Authenticated lycan status fetch failed: ${res.statusText}`,
          );
        return (await res.json()) as importtype;
      }
      return undefined;
    },
  });
}

type LycanSearchPage = {
  terms: string[];
  posts: string[];
  cursor?: string;
};

export function useInfiniteQueryLycanSearch(options: {
  query: string;
  type: "likes" | "pins" | "reposts" | "quotes";
}) {
  const [lycanurl] = useAtom(lycanURLAtom);
  const { agent, status } = useAuth();
  const { data: identity } = useQueryIdentity(agent?.did);

  const { queryKey, queryFn } = constructLycanSearchQuery({
    agent: agent || undefined,
    isAuthed: status === "signedIn",
    pdsUrl: identity?.pds,
    feedServiceDid: "did:web:" + lycanurl,
    query: options.query,
    type: options.type,
  });

  return {
    ...useInfiniteQuery({
      queryKey,
      queryFn,
      initialPageParam: undefined as never,
      getNextPageParam: (lastPage) => lastPage?.cursor as null | undefined,
      //staleTime: Infinity,
      refetchOnWindowFocus: false,
      // enabled:
      //   !!options.feedUri &&
      //   (options.isAuthed
      //     ? ((!!options.agent && !!options.pdsUrl) ||
      //         !!options.unauthedfeedurl) &&
      //       !!options.feedServiceDid
      //     : true),
    }),
    queryKey: queryKey,
  };
}

export function constructLycanSearchQuery(options: {
  agent?: ATPAPI.Agent;
  isAuthed: boolean;
  pdsUrl?: string;
  feedServiceDid?: string;
  type: "likes" | "pins" | "reposts" | "quotes";
  query: string;
}) {
  const { agent, isAuthed, pdsUrl, feedServiceDid, type, query } = options;

  return infiniteQueryOptions({
    queryKey: ["lycanSearch", query, type, { isAuthed, did: agent?.did }],

    queryFn: async ({
      pageParam,
    }: QueryFunctionContext): Promise<LycanSearchPage | undefined> => {
      if (isAuthed && agent && pdsUrl && feedServiceDid) {
        const url = `${pdsUrl}/xrpc/blue.feeds.lycan.searchPosts?query=${query}&collection=${type}${pageParam ? `&cursor=${pageParam}` : ""}`;
        const res = await agent.fetchHandler(url, {
          method: "GET",
          headers: {
            "atproto-proxy": `${feedServiceDid}#lycan`,
            "Content-Type": "application/json",
          },
        });
        if (!res.ok)
          throw new Error(
            `Authenticated lycan status fetch failed: ${res.statusText}`,
          );
        return (await res.json()) as LycanSearchPage;
      }
      return undefined;
    },
    initialPageParam: undefined as never,
    getNextPageParam: (lastPage) => lastPage?.cursor as null | undefined,
  });
}

// HOST_LABELMERGE

export async function innerLabelMergeQueryFn(options: LabelMergeQueryLabelsQueryParams): Promise<LabelMergeQueryLabelsOutputSchema | undefined> {
  const { s, l, strict } = options;
  const params = new URLSearchParams();
  s.forEach((v) => params.append("s", v));
  l.forEach((v) => params.append("l", v));
  if (strict) {
    params.append("strict", "true");
  }
  const qs = params.toString();

  const url =
    `${HOST_LABELMERGE}/xrpc/app.reddwarf.labelmerge.queryLabels?` + qs;
  console.log("LabelMerge URL", url);
  const res = await fetch(url);
  if (!res.ok)
    throw new Error(`Labelmerge fetch failed: ${res.statusText}`);
  return (await res.json()) as LabelMergeQueryLabelsOutputSchema;
}

export function constructLabelMergeQuery(
  options: LabelMergeQueryLabelsQueryParams,
) {
  const { s, l, strict } = options;

  return queryOptions({
    queryKey: [
      "LabelMergeQueryLabelsQuery",
      [...s].sort().join(","),
      [...l].sort().join(","),
      strict,
    ],

    enabled:
      Array.isArray(s) && s.length > 0 && Array.isArray(l) && l.length > 0,

    queryFn: ()=>innerLabelMergeQueryFn(options),
  });
}
export function useQueryLabelMerge(options: LabelMergeQueryLabelsQueryParams) {
  return useQuery(constructLabelMergeQuery(options));
}

export type PartialLabelQuery = {
  s: string;
  l: string[];
};
export type SingularLabelQuery = {
  s: string;
  l: string;
};

export type SingularLabelResult = {
  labels?: ATPAPI.ComAtprotoLabelDefs.Label;
  error?: LabelMergeQueryLabelsOutputSchemaError;
}; //ATPAPI.ComAtprotoLabelDefs.Label | LabelMergeQueryLabelsOutputSchemaError | null
export type PartialLabelResult = {
  subject: string;
  labels?: ATPAPI.ComAtprotoLabelDefs.Label[];
  error?: LabelMergeQueryLabelsOutputSchemaError[];
};

function flattenLabelQueries(
  partials: PartialLabelQuery[],
): SingularLabelQuery[] {
  return partials.flatMap((p) => p.l.map((label) => ({ s: p.s, l: label })));
}

// batShitQueryClient
export const unpersistedQueryClient = new QueryClient(/*{
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      //cacheTime: 10 * 60 * 1000, // 10 minutes
      gcTime: 5 * 60 * 1000,
    },
  },
}*/);


interface MicroSingleResult {
  l: string,
  t: number,
}

const labelmerge = create(
  /*<Record<String,SingularLabelResult>[], SingularLabelQuery>*/ {
    // The fetcher resolves the list of queries(here just a list of user ids as number) to one single api call.
    fetcher: async (slqa: SingularLabelQuery[]) => {
      // Use a shared QueryClient if possible; creating a new one per fetch is usually not needed

      // Deduplicate, but don’t sort
      const sarr = Array.from(new Set(slqa.map((slq) => slq.s)));
      const larr = Array.from(new Set(slqa.map((slq) => slq.l)));

      //const result = await batShitQueryClient.fetchQuery(
      //  constructLabelMergeQuery({ s: sarr, l: larr }),
      //);
      const result = await innerLabelMergeQueryFn({s:sarr, l: larr})
      //const qfn = constructLabelMergeQuery({ s: sarr, l: larr }).queryFn
      //const result = await (qfn ? qfn() : ()=>{})
      if (!result) return [];

      // Build maps for quick lookup
      const errmap = new Map<string, LabelMergeQueryLabelsOutputSchemaError>();
      const resmap = new Map<string, ATPAPI.ComAtprotoLabelDefs.Label>();

      result.error?.forEach((err) => errmap.set(err.s, err));
      result.labels?.forEach((label) => resmap.set(`${label.src}::${label.uri}`, label));

      // Map back to the original queries
      const output: Record<string, SingularLabelResult>[] = slqa.map((slq) => {
        const key = `${slq.l}::${slq.s}`; // or just slq.l if you prefer

        const err = errmap.get(slq.l);
        const label = resmap.get(key);

        if (err) return { [key]: { error: err } };
        if (label) return { [key]: { labels: label } };

        // if result is neither, it means the subject is free of labels
        return { 
          [key]: { labels: undefined} 
        };
        // idiot
        // return { 
        //   [key]: { error: {
        //     s: slq.l,
        //     e: `!internal-bslm-unknown: ${slq.s}`
        //   }} 
        // };
      });

      return output;
    },
    // when we call users.fetch, this will resolve the correct user using the field `id`
    resolver: (rslra, slq) => {
      if (rslra.length < 1) {
        return undefined;
      }
      // const result: SingularLabelResult | undefined = slra.find((slr, i) => {
      //   // find if error first
      //   const error = slr.error;
      //   const label = slr.labels;
      //   if (error) {
      //     if (slq.l === error.s) {
      //       return slq;
      //     }
      //   } else if (label) {
      //     // if not error
      //     if (slq.l === label.src && slq.s === label.uri) {
      //       return slq;
      //     }
      //     // else unhandled not found
      //   } else {
      //     return undefined;
      //   }
      //   return undefined;
      // });
      const outputMap: Record<string, SingularLabelResult> = Object.assign({}, ...rslra)
      const key = `${slq.l}::${slq.s}`; // or just slq.l if you prefer
      const result: SingularLabelResult | undefined = outputMap[key]
      return result;
    },
    scheduler: windowScheduler(10 * 100), // 1 second
  },
);

// const labelmergepartial = create/*<PartialLabelResult[], PartialLabelQuery>*/({
//   // The fetcher resolves the list of queries(here just a list of user ids as number) to one single api call.
//   fetcher: async (plqa: PartialLabelQuery[]) => {
//     const singulars = flattenLabelQueries(plqa); // SingularLabelQuery[]
//     const singularResults = await Promise.all(singulars.map(q => labelmerge.fetch(q)));

//     // Now we need to **group singularResults back by the original PartialLabelQuery.s**
//     // so that each PartialLabelQuery gets a PartialLabelResult (LabelMergeQueryLabelsOutputSchema)
//     const grouped: Record<string, SingularLabelResult[]> = {};
//     singulars.forEach((q, i) => {
//       if (!grouped[q.s]) grouped[q.s] = [];
//       if (singularResults[i]) {
//         grouped[q.s].push(singularResults[i]);
//       } else {
//         grouped[q.s].push({});
//       }
//     });

//     // Convert grouped record to your PartialLabelResult format
//     const result: PartialLabelResult[] = Object.entries(grouped).map(([s, labels]) => {
//       const cleanLabels = labels
//         .map(l => l?.labels)
//         .filter((l): l is ATPAPI.ComAtprotoLabelDefs.Label => !!l?.val)
//       const cleanErrors = labels
//         .map(l => l?.error)
//         .filter((e): e is LabelMergeQueryLabelsOutputSchemaError => !!e?.s)
//       return {
//         subject: s,
//         labels: cleanLabels,
//         error: cleanErrors ? cleanErrors : undefined
//       }
//      });
//     return result
//   },
//   resolver: (plra, plq) => {
//     if (plra.length < 1) {
//       return undefined
//     }
//     const subject = plq.s;
//     const result: PartialLabelResult | undefined = plra.find((plr,i)=>{
//       return plr.subject === subject;
//     })
//     return result
//   },
//   // this will batch all calls to users.fetch that are made within 10 milliseconds.
//   scheduler: windowScheduler(10*100) // 1 second
// })

// export const useQueryLabel = (s: string, la: string[]) => {
//   return useQuery({
//     queryKey: ["useQueryLabel (single) sla", s, la],
//     queryFn: async () => {
//       return labelmergepartial.fetch({ s, l: la })
//     },
//   })
// }

/**
 * todo:
 * - [x] switch from useQuery to normal custom hook and switch from Promise.All to useQueries
 * - [ ] Move neg normalization to the batshit unmerging, and make the cache labels only (pre sorted)
 * - [ ] Also do signature verification on the constructSingularQuery
 */

// also the cache hits from constructSingularLabelQuery is not being sent fast because
// it waits for all of them first
// but also if we send it fast would it cause even worse synchronous traffic jams downstream ?
// export const useQueryLabels = (subjects: string[], labelers: string[]) => {
//   const queryClient = useQueryClient();
//   return useQuery({
//     queryKey: ["useQueryLabelFull", subjects, labelers],
//     queryFn: async (): Promise<LabelMergeQueryLabelsOutputSchema> => {
//       // Build all singular queries
//       const singulars: SingularLabelQuery[] = subjects.flatMap((s) =>
//         labelers.map((l) => ({ s, l })),
//       );

//       // Fetch all results in parallel
//       const results = await Promise.all(
//         // singulars.map((q) =>
//         //   queryClient.fetchQuery(constructSingularLabelQuery(q)),
//         // ),
//         singulars.map((q) =>
//           queryClient.fetchQuery(constructSingularLabelQuery(q)).catch((e: Error)=>{
//             return {
//               error: {
//                 s: q.l,
//                 e: e.message.toString(),
//               }
//             } as SingularLabelResult
//           }),
//         ),
//         // singulars.map(q => queryClient.fetchQuery(constructSingularLabelQuery(q)).catch((err:SingularLabelResult)=>{
//         //   return err
//         // }))
//         //singulars.map(q => labelmerge.fetch(q).catch(err => ({ error: err } as SingularLabelResult)))
//       );

//       const labels = Array.from(
//         new Map(
//           results
//             .map(r => r?.labels)
//             .filter((l): l is ATPAPI.ComAtprotoLabelDefs.Label => !!l?.src)
//             .map(l => [`${l.src}::${l.uri}`, l])
//         ).values()
//       );
//       const errors = Array.from(
//         new Map(
//           results
//             .map(r => r?.error)
//             .filter(
//               (e): e is LabelMergeQueryLabelsOutputSchemaError =>
//                 !!e && typeof e.s === "string"
//             )
//             .map(e => [`${e.s}::${e.e ?? ""}`, e])
//         ).values()
//       );

//       const result: LabelMergeQueryLabelsOutputSchema = {
//         labels: labels,
//         error: errors.length < 1 ? undefined : errors,
//       };

//       return result;
//     },
//   });
// };

function buildSingularQueries(subjects: string[], labelers: string[]) {
  return subjects.flatMap((s) =>
    labelers.map((l) => ({
      s,
      l,
    })),
  );
}

export function useQueryLabels(subjects: string[], labelers: string[]) {
  const singulars = useMemo(
    () => buildSingularQueries(subjects, labelers),
    [subjects, labelers],
  );

  const queries = useQueries({
    queries: singulars.map((q) =>
      constructSingularLabelQuery(q),
    ),
  });

  // derive merged state synchronously
  const labels = useMemo(() => {
    return Array.from(
      new Map(
        queries
          .map((q) => q.data?.labels)
          .filter(
            (l): l is ATPAPI.ComAtprotoLabelDefs.Label =>
              !!l?.src,
          )
          .map((l) => [`${l.src}::${l.uri}`, l]),
      ).values(),
    );
  }, [queries]);

  const errors = useMemo(() => {
    return Array.from(
      new Map(
        queries
          .map((q) => q.data?.error)
          .flat()
          .filter(
            (e): e is LabelMergeQueryLabelsOutputSchemaError =>
              !!e && typeof e.s === "string",
          )
          .map((e) => [`${e.s}::${e.e ?? ""}`, e]),
      ).values(),
    );
  }, [queries]);

  const isLoading = queries.some((q) => q.isLoading);
  const isError = queries.some((q) => q.isError);
  const isFetching = queries.some((q) => q.isFetching);

  return {
    data: {
      labels,
      error: errors.length ? errors : undefined,
    },
    isLoading,
    isError,
    isFetching,
  };
}

export function constructSingularLabelQuery(options: SingularLabelQuery) {
  const { s, l } = options;

  return queryOptions({
    queryKey: ["__volatile","slq", s, l],

    enabled: !!s && !!l,

    queryFn: async (): Promise<SingularLabelResult | undefined> => {
      // const result = (await labelmerge.fetch(options).catch(err => {throw { error: err } as SingularLabelResult})) as SingularLabelResult
      // if (result.error) {
      //   throw result.error
      // }
      // return result;
      const result = (await labelmerge
        .fetch(options)
        .catch(
          (err) => ({ error: err }) as SingularLabelResult,
        )) as SingularLabelResult;
      
      if (result === undefined) {
        throw new Error("what the hell happened")
      }
      return result;
    },

    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 5 * 60 * 1000,
  });
}
export function useQuerySingularLabelQuery(options: SingularLabelQuery) {
  return useQuery(constructSingularLabelQuery(options));
}


type SingularAVPostQuery = {
  aturi: string,
  avurl: string,
  instantBypass?: boolean,
}
type SingularAVPostResult = ATPAPI.AppBskyFeedDefs.PostView

type AVPostQueryPostsQueryParams = {
  aturis: string[],
  avurl: string,
}

const MAX_URIS_PER_REQUEST = 25;
function chunk<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}


export async function innerAVPostsQueryFn(
  options: AVPostQueryPostsQueryParams
): Promise<ATPAPI.AppBskyFeedGetPosts.OutputSchema | undefined> {
  const { aturis, avurl } = options;

  if (!aturis?.length) return undefined;

  const batches = chunk(aturis, MAX_URIS_PER_REQUEST);

  const responses = await Promise.all(
    batches.map(async (batch) => {
      const params = new URLSearchParams();
      batch.forEach((uri) => params.append("uris", uri));

      const url = `${avurl}/xrpc/app.bsky.feed.getPosts?${params.toString()}`;

      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Labelmerge fetch failed: ${res.status} ${res.statusText}`);
      }

      return (await res.json()) as ATPAPI.AppBskyFeedGetPosts.OutputSchema;
    })
  );

  // Merge all posts into one response
  const merged: ATPAPI.AppBskyFeedGetPosts.OutputSchema = {
    posts: responses.flatMap((r) => r.posts ?? []),
  };

  return merged;
}

const postquerymerge = create(
  /*<Record<String,SingularLabelResult>[], SingularLabelQuery>*/ {
    // The fetcher resolves the list of queries(here just a list of user ids as number) to one single api call.
    fetcher: async (savpqa: SingularAVPostQuery[]) => {
      // Use a shared QueryClient if possible; creating a new one per fetch is usually not needed

      // Deduplicate, but don’t sort
      const sarr = Array.from(new Set(savpqa.map((savpq) => savpq.aturi)));

      //const result = await batShitQueryClient.fetchQuery(
      //  constructLabelMergeQuery({ s: sarr, l: larr }),
      //);
      const result = await innerAVPostsQueryFn({aturis: sarr, avurl: savpqa.at(-1)?.avurl || savpqa[0].avurl})
      //const qfn = constructLabelMergeQuery({ s: sarr, l: larr }).queryFn
      //const result = await (qfn ? qfn() : ()=>{})
      if (!result) return [];

      // Build maps for quick lookup
      //const errmap = new Map<string, LabelMergeQueryLabelsOutputSchemaError>();
      // const resmap = new Map<string, SingularAVPostResult>();

      // result.posts?.forEach((post) => resmap.set(post.uri, post));

      // // Map back to the original queries
      // const output: Record<string, SingularAVPostResult>[] = savpqa.map((savpq) => {
      //   const key = savpq.aturi; // or just slq.l if you prefer

      //   //const err = errmap.get(slq.l);
      //   const post = resmap.get(key);

      //   //if (err) return { [key]: { error: err } };
      //   if (post) return { [key]: { labels: label } };

      //   // if result is neither, it means the subject is free of labels
      //   return { 
      //     [key]: { labels: undefined} 
      //   };
      //   // idiot
      //   // return { 
      //   //   [key]: { error: {
      //   //     s: slq.l,
      //   //     e: `!internal-bslm-unknown: ${slq.s}`
      //   //   }} 
      //   // };
      // });
      const output = result.posts;

      return output;
    },
    // when we call users.fetch, this will resolve the correct user using the field `id`
    resolver: (rslra, savpq) => {
      if (rslra.length < 1) {
        return undefined;
      }
      // const result: SingularLabelResult | undefined = slra.find((slr, i) => {
      //   // find if error first
      //   const error = slr.error;
      //   const label = slr.labels;
      //   if (error) {
      //     if (slq.l === error.s) {
      //       return slq;
      //     }
      //   } else if (label) {
      //     // if not error
      //     if (slq.l === label.src && slq.s === label.uri) {
      //       return slq;
      //     }
      //     // else unhandled not found
      //   } else {
      //     return undefined;
      //   }
      //   return undefined;
      // });
      //const outputMap: Record<string, SingularLabelResult> = Object.assign({}, ...rslra)
      //const key = `${slq.l}::${slq.s}`; // or just slq.l if you prefer
      const item = rslra.find(obj => obj.uri === savpq.aturi);
      const result: SingularAVPostResult | undefined = item//outputMap[key]
      return result;
    },
    scheduler: windowScheduler(10 * 100), // 1 second
  },
);

export function constructSingularAVPostQuery(options: SingularAVPostQuery) {
  const { aturi, avurl, instantBypass } = options;
  const parsedaturi = new ATPAPI.AtUri(aturi)

  return queryOptions({
    queryKey: ["savpq", parsedaturi.host, /*"__volatile", */aturi],

    enabled: !!aturi && !!avurl,

    queryFn: async (): Promise<SingularAVPostResult | undefined> => {
      // const result = (await labelmerge.fetch(options).catch(err => {throw { error: err } as SingularLabelResult})) as SingularLabelResult
      // if (result.error) {
      //   throw result.error
      // }
      // return result;
      if (instantBypass) {
        const params = new URLSearchParams();
        params.append("uris", aturi)
        const url = `${avurl}/xrpc/app.bsky.feed.getPosts?${params.toString()}`;

        const res = await fetch(url);
        if (!res.ok) {
          throw new Error(`Labelmerge fetch failed: ${res.status} ${res.statusText}`);
        }

        const result = (await res.json()) as ATPAPI.AppBskyFeedGetPosts.OutputSchema;
        return result.posts[0]
      }
      const result = (await postquerymerge
        .fetch(options))as SingularAVPostResult;
        // .catch(
        //   (err) => ({ error: err }) as SingularAVPostResult,
        // )) as SingularAVPostResult;
      
      if (result === undefined) {
        throw new Error("what the hell happened")
      }
      return result;
    },

    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 5 * 60 * 1000,
  });
}

export function useQuerySingularAVPostQuery(options: SingularAVPostQuery) {
  return useQuery(constructSingularAVPostQuery(options));
}
