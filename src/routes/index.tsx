import { createFileRoute } from "@tanstack/react-router";
import { useAtom } from "jotai";
import * as React from "react";
import { useEffect, useLayoutEffect } from "react";

import { Header } from "~/components/Header";
import { InfiniteCustomFeed } from "~/components/InfiniteCustomFeed";
import { useAuth } from "~/providers/UnifiedAuthProvider";
import {
  agentAtom,
  authedAtom,
  feedScrollPositionsAtom,
  isAtTopAtom,
  selectedFeedUriAtom,
  store,
} from "~/utils/atoms";
//import { usePersistentStore } from "~/providers/PersistentStoreProvider";
import {
  //constructArbitraryQuery,
  //constructIdentityQuery,
  //constructInfiniteFeedSkeletonQuery,
  //constructPostQuery,
  useQueryArbitrary,
  useQueryIdentity,
  useQueryPreferences,
} from "~/utils/useQuery";

export const Route = createFileRoute("/")({
  // loader: async ({ context }) => {
  //   const { queryClient } = context;
  //   const atomauth = store.get(authedAtom);
  //   const atomagent = store.get(agentAtom);

  //   let identitypds: string | undefined;
  //   const initialselectedfeed = store.get(selectedFeedUriAtom);
  //   if (atomagent && atomauth && atomagent?.did) {
  //     const identityopts = constructIdentityQuery(atomagent.did);
  //     const identityresultmaybe =
  //       await queryClient.ensureQueryData(identityopts);
  //     identitypds = identityresultmaybe?.pds;
  //   }

  //   const arbitraryopts = constructArbitraryQuery(
  //     initialselectedfeed ??
  //       "at://did:plc:z72i7hdynmk6r22z27h6tvur/app.bsky.feed.generator/whats-hot"
  //   );
  //   const feedGengetrecordquery =
  //     await queryClient.ensureQueryData(arbitraryopts);
  //   const feedServiceDid = (feedGengetrecordquery?.value as any)?.did;
  //   //queryClient.ensureInfiniteQueryData()

  //   const { queryKey, queryFn } = constructInfiniteFeedSkeletonQuery({
  //     feedUri:
  //       initialselectedfeed ??
  //       "at://did:plc:z72i7hdynmk6r22z27h6tvur/app.bsky.feed.generator/whats-hot",
  //     agent: atomagent ?? undefined,
  //     isAuthed: atomauth ?? false,
  //     pdsUrl: identitypds,
  //     feedServiceDid: feedServiceDid,
  //   });

  //   const res = await queryClient.ensureInfiniteQueryData({
  //     queryKey,
  //     queryFn,
  //     initialPageParam: undefined as never,
  //     getNextPageParam: (lastPage: any) => lastPage.cursor as null | undefined,
  //     staleTime: Infinity,
  //     //refetchOnWindowFocus: false,
  //     //enabled: true,
  //   });
  //   await Promise.all(
  //     res.pages.map(async (page) => {
  //       await Promise.all(
  //         page.feed.map(async (feedviewpost) => {
  //           if (!feedviewpost.post) return;
  //           // /*mass comment*/ console.log("preloading: ", feedviewpost.post);
  //           const opts = constructPostQuery(feedviewpost.post);
  //           try {
  //             await queryClient.ensureQueryData(opts);
  //           } catch (e) {
  //             // /*mass comment*/ console.log(" failed:", e);
  //           }
  //         })
  //       );
  //     })
  //   );
  // },
  component: Home,
  pendingComponent: PendingHome, // PendingHome,
  staticData: { keepAlive: true },
});
function PendingHome() {
  return <div>loading... (prefetching your timeline)</div>;
}

//function Homer() {
//  return <div></div>
//}
export function Home({ hidden = false }: { hidden?: boolean }) {
  const {
    agent,
    status,
    authMethod,
    loginWithPassword,
    loginWithOAuth,
    logout,
  } = useAuth();
  const authed = !!agent?.did;

  useEffect(() => {
    if (agent?.did) {
      store.set(authedAtom, true);
    } else {
      store.set(authedAtom, false);
    }
  }, [status, agent, authed]);
  useEffect(() => {
    if (agent) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore is it just me or is the type really weird here it should be Agent not AtpAgent
      store.set(agentAtom, agent);
    } else {
      store.set(agentAtom, null);
    }
  }, [status, agent, authed]);

  //const { get, set } = usePersistentStore();
  // const [feed, setFeed] = React.useState<any[]>([]);
  // const [loading, setLoading] = React.useState(true);
  // const [error, setError] = React.useState<string | null>(null);

  // const [prefs, setPrefs] = React.useState<any>({});
  // React.useEffect(() => {
  //   if (!loadering && authed && agent && agent.did) {
  //     const run = async () => {
  //       try {
  //         if (!agent.did) return;
  //         const prefs = await cachedGetPrefs({
  //           did: agent.did,
  //           agent,
  //           get,
  //           set,
  //         });

  //         // /*mass comment*/ console.log("alistoffeeds", prefs);
  //         setPrefs(prefs || {});
  //       } catch (err) {
  //         console.error("alistoffeeds Fetch error in preferences effect:", err);
  //       }
  //     };

  //     run();
  //   }
  // }, [loadering, authed, agent]);

  // const savedFeedsPref = React.useMemo(() => {
  //   if (!prefs?.preferences) return null;
  //   return prefs.preferences.find(
  //     (p: any) => p?.$type === "app.bsky.actor.defs#savedFeedsPrefV2",
  //   );
  // }, [prefs]);

  // const savedFeeds = savedFeedsPref?.items || [];

  const identityresultmaybe = useQueryIdentity(agent?.did);
  const identity = identityresultmaybe?.data;

  const prefsresultmaybe = useQueryPreferences({
    agent: agent ?? undefined,
    pdsUrl: identity?.pds,
  });
  const prefs = prefsresultmaybe?.data;

  const savedFeeds = React.useMemo(() => {
    const savedFeedsPref = prefs?.preferences?.find(
      (p: any) => p?.$type === "app.bsky.actor.defs#savedFeedsPrefV2"
    );
    return savedFeedsPref?.items || [];
  }, [prefs]);

  const [persistentSelectedFeed, setPersistentSelectedFeed] =
    useAtom(selectedFeedUriAtom); // React.useState<string | null>(null);
  const [unauthedSelectedFeed, setUnauthedSelectedFeed] = React.useState(
    persistentSelectedFeed
  ); // React.useState<string | null>(null);
  const selectedFeed = agent?.did
    ? persistentSelectedFeed
    : unauthedSelectedFeed;
  const setSelectedFeed = agent?.did
    ? setPersistentSelectedFeed
    : setUnauthedSelectedFeed;

  // /*mass comment*/ console.log("my selectedFeed is: ", selectedFeed);
  React.useEffect(() => {
    const fallbackFeed =
      "at://did:plc:z72i7hdynmk6r22z27h6tvur/app.bsky.feed.generator/whats-hot";
    if (authed) {
      if (selectedFeed) return;
      if (savedFeeds.length > 0) {
        setSelectedFeed((prev) =>
          prev && savedFeeds.some((f: any) => f.value === prev)
            ? prev
            : savedFeeds[0].value
        );
      } else {
        if (selectedFeed) return;
        setSelectedFeed(fallbackFeed);
      }
    } else {
      if (selectedFeed) return;
      setSelectedFeed(fallbackFeed);
    }
  }, [savedFeeds, authed, setSelectedFeed]);

  // React.useEffect(() => {
  //   if (loadering || !selectedFeed) return;

  //   let ignore = false;

  //   const run = async () => {
  //     setLoading(true);
  //     setError(null);

  //     try {
  //       if (authed && agent) {
  //         if (!agent.did) return;

  //         const pdsurl = await cachedResolveIdentity({
  //           didOrHandle: agent.did,
  //           get,
  //           set,
  //         });

  //         const fetchstringcomplex = `${pdsurl.pdsUrl}/xrpc/app.bsky.feed.getFeedSkeleton?feed=${selectedFeed}`;
  //         // /*mass comment*/ console.log("fetching feed authed: " + fetchstringcomplex);

  //         const feeddef = await cachedGetRecord({
  //           atUri: selectedFeed,
  //           get,
  //           set,
  //         });

  //         const feedservicedid = feeddef.value.did;

  //         const res = await agent.fetchHandler(fetchstringcomplex, {
  //           method: "GET",
  //           headers: {
  //             "atproto-proxy": `${feedservicedid}#bsky_fg`,
  //             "Content-Type": "application/json",
  //           },
  //         });

  //         if (!res.ok) throw new Error("Failed to fetch feed");
  //         const data = await res.json();

  //         if (!ignore) setFeed(data.feed || []);
  //       } else {
  //         // /*mass comment*/ console.log("falling back");
  //         // always use fallback feed for not logged in
  //         const fallbackFeed =
  //           "at://did:plc:z72i7hdynmk6r22z27h6tvur/app.bsky.feed.generator/whats-hot";
  //         // const feeddef = await cachedGetRecord({
  //         //   atUri: fallbackFeed,
  //         //   get,
  //         //   set,
  //         // });

  //         //const feedservicedid = "did:web:discover.bsky.app" //feeddef.did;
  //         const fetchstringsimple = `https://discover.bsky.app/xrpc/app.bsky.feed.getFeedSkeleton?feed=${fallbackFeed}`;
  //         // /*mass comment*/ console.log("fetching feed unauthed: " + fetchstringsimple);

  //         const res = await fetch(fetchstringsimple);
  //         if (!res.ok) throw new Error("Failed to fetch feed");
  //         const data = await res.json();

  //         if (!ignore) setFeed(data.feed || []);
  //       }
  //     } catch (e) {
  //       if (!ignore) {
  //         if (e instanceof Error) {
  //           setError(e.message);
  //         } else {
  //           setError("Unknown error");
  //         }
  //       }
  //     } finally {
  //       if (!ignore) setLoading(false);
  //     }
  //   };

  //   run();

  //   return () => {
  //     ignore = true;
  //   };
  // }, [authed, agent, loadering, selectedFeed, get, set]);

  const [scrollPositions, setScrollPositions] = useAtom(
    feedScrollPositionsAtom
  );

  const scrollPositionsRef = React.useRef(scrollPositions);

  React.useEffect(() => {
    scrollPositionsRef.current = scrollPositions;
  }, [scrollPositions]);

  useLayoutEffect(() => {
    const savedPosition = scrollPositions[selectedFeed ?? "null"] ?? 0;

    window.scrollTo({ top: savedPosition, behavior: "instant" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFeed]);

  useLayoutEffect(() => {
    if (!selectedFeed) return;

    const handleScroll = () => {
      scrollPositionsRef.current = {
        ...scrollPositionsRef.current,
        [selectedFeed]: window.scrollY,
      };
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);

      setScrollPositions(scrollPositionsRef.current);
    };
  }, [selectedFeed, setScrollPositions]);

  const feedGengetrecordquery = useQueryArbitrary(selectedFeed ?? undefined);
  const feedServiceDid = (feedGengetrecordquery?.data?.value as any)?.did;

  // const {
  //   data: feedData,
  //   isLoading: isFeedLoading,
  //   error: feedError,
  // } = useQueryFeedSkeleton({
  //   feedUri: selectedFeed!,
  //   agent: agent ?? undefined,
  //   isAuthed: authed ?? false,
  //   pdsUrl: identity?.pds,
  //   feedServiceDid: feedServiceDid,
  // });

  // const feed = feedData?.feed || [];

  const isReadyForAuthedFeed =
    authed && agent && identity?.pds && feedServiceDid;
  const isReadyForUnauthedFeed = !authed && selectedFeed;


  const [isAtTop] = useAtom(isAtTopAtom);

  return (
    <div
      className={`relative flex flex-col divide-y divide-gray-200 dark:divide-gray-800 ${hidden && "hidden"} ${!isAtTop && "shadow"}`}
    >
      {savedFeeds.length > 0 ? (
        <div className="flex items-center px-4 py-2 h-[52px] sticky top-0 bg-[var(--header-bg-light)] dark:bg-[var(--header-bg-dark)] z-10 border-0 border-gray-200 dark:border-gray-700 overflow-x-auto overflow-y-hidden scroll-thin">
          {savedFeeds.map((item: any, idx: number) => {
            const label = item.value.split("/").pop() || item.value;
            const isActive = selectedFeed === item.value;
            return (
              <button
                key={item.value || idx}
                className={`px-3 py-1 rounded-full whitespace-nowrap font-medium transition-colors ${
                  isActive
                    ? "text-gray-900 dark:text-gray-100 hover:bg-gray-300 dark:bg-gray-700 bg-gray-200 hover:dark:bg-gray-600"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 hover:dark:bg-gray-800"
                  // ? "bg-gray-500 text-white"
                  // : item.pinned
                  //   ? "bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200"
                  //   : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200"
                }`}
                onClick={() => setSelectedFeed(item.value)}
                title={item.value}
              >
                {label}
                {item.pinned && (
                  <span
                    className={`ml-1 text-xs ${
                      isActive
                        ? "text-gray-900 dark:text-gray-100 hover:bg-gray-300 dark:bg-gray-700 bg-gray-200 hover:dark:bg-gray-600"
                        : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 hover:dark:bg-gray-800"
                    }`}
                  >
                    ★
                  </span>
                )}
              </button>
            );
          })}
        </div>
      ) : (
        // <span className="text-xl font-bold ml-2">Home</span>
        <Header title="Home" />
      )}
      {/* {isFeedLoading && <div className="p-4 text-gray-500">Loading...</div>}
      {feedError && <div className="p-4 text-red-500">{feedError.message}</div>}
      {!isFeedLoading && !feedError && feed.length === 0 && (
        <div className="p-4 text-gray-500">No posts found.</div>
      )} */}
      {/* {feed.map((item, i) => (
        <UniversalPostRendererATURILoader
          key={item.post || i}
          atUri={item.post}
        />
      ))} */}

      {authed && (!identity?.pds || !feedServiceDid) && (
        <div className="p-4 text-center text-gray-500">
          Preparing your feed...
        </div>
      )}

      {isReadyForAuthedFeed || isReadyForUnauthedFeed ? (
        <InfiniteCustomFeed
          feedUri={selectedFeed!}
          pdsUrl={identity?.pds}
          feedServiceDid={feedServiceDid}
        />
      ) : (
        <div className="p-4 text-center text-gray-500">
          Select a feed to get started.
        </div>
      )}
      {/* {false && restoringScrollPosition && (
        <div className="fixed top-1/2 left-1/2 right-1/2">
          restoringScrollPosition
        </div>
      )} */}
    </div>
  );
}
// not even used lmaooo

// export async function cachedResolveDIDWEBDOC({
//   didweb,
//   cacheTimeout = CACHE_TIMEOUT,
//   get,
//   set,
// }: {
//   didweb: string;
//   cacheTimeout?: number;
//   get: (key: string) => any;
//   set: (key: string, value: string) => void;
// }): Promise<any> {
//   const isDidInput = didweb.startsWith("did:web:");
//   const cacheKey = `didwebdoc:${didweb}`;
//   const now = Date.now();
//   const cached = get(cacheKey);
//   if (
//     cached &&
//     cached.value &&
//     cached.time &&
//     now - cached.time < cacheTimeout
//   ) {
//     try {
//       return JSON.parse(cached.value);
//     } catch (_e) {/* whatever*/ }
//   }
//   const url = `https://free-fly-24.deno.dev/resolve-did-web?did=${encodeURIComponent(
//     didweb
//   )}`;
//   const res = await fetch(url);
//   if (!res.ok) throw new Error("Failed to resolve didwebdoc");
//   const data = await res.json();
//   set(cacheKey, JSON.stringify(data));
//   if (!isDidInput && data.did) {
//     set(`didwebdoc:${data.did}`, JSON.stringify(data));
//   }
//   return data;
// }

// export async function cachedGetPrefs({
//   did,
//   agent,
//   get,
//   set,
//   cacheTimeout = CACHE_TIMEOUT,
// }: {
//   did: string;
//   agent: any; // or type properly if available
//   get: (key: string) => any;
//   set: (key: string, value: string) => void;
//   cacheTimeout?: number;
// }): Promise<any> {
//   const cacheKey = `prefs:${did}`;
//   const cached = get(cacheKey);
//   const now = Date.now();

//   if (
//     cached &&
//     cached.value &&
//     cached.time &&
//     now - cached.time < cacheTimeout
//   ) {
//     try {
//       return JSON.parse(cached.value);
//     } catch {
//       // fall through to fetch
//     }
//   }

//   const resolved = await cachedResolveIdentity({
//     didOrHandle: did,
//     get,
//     set,
//   });

//   if (!resolved?.pdsUrl) throw new Error("Missing resolved PDS info");

//   const fetchUrl = `${resolved.pdsUrl}/xrpc/app.bsky.actor.getPreferences`;

//   const res = await agent.fetchHandler(fetchUrl, {
//     method: "GET",
//     headers: {
//       "Content-Type": "application/json",
//     },
//   });

//   if (!res.ok) throw new Error(`Failed to fetch preferences: ${res.status}`);

//   const text = await res.text();

//   let data: any;
//   try {
//     data = JSON.parse(text);
//   } catch (err) {
//     console.error("Failed to parse preferences JSON:", err);
//     throw err;
//   }

//   set(cacheKey, JSON.stringify(data));
//   return data;
// }
