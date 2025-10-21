import { AtUri } from "@atproto/api";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useAtom } from "jotai";
import React, { useLayoutEffect } from "react";

import { Header } from "~/components/Header";
import { UniversalPostRendererATURILoader } from "~/components/UniversalPostRenderer";
import { constellationURLAtom, slingshotURLAtom } from "~/utils/atoms";
//import { usePersistentStore } from '~/providers/PersistentStoreProvider';
import {
  constructPostQuery,
  type linksAllResponse,
  type linksRecordsResponse,
  useQueryConstellation,
  useQueryIdentity,
  useQueryPost,
  yknowIReallyHateThisButWhateverGuardedConstructConstellationInfiniteQueryLinks,
} from "~/utils/useQuery";

import type { LightboxProps } from "./post.$rkey.image.$i";

//const HANDLE_DID_CACHE_TIMEOUT = 60 * 60 * 1000; // 1 hour

export const Route = createFileRoute("/profile/$did/post/$rkey")({
  component: RouterWrapper,
});

function RouterWrapper() {
  const { did, rkey } = Route.useParams();

  return (
    <>
      <ProfilePostComponent
        key={`/profile/${did}/post/${rkey}`}
        did={did}
        rkey={rkey}
      />
      {/* <ShrinkingBox /> */}
    </>
  );
}

export function ProfilePostComponent({
  did,
  rkey,
  nopics,
  lightboxCallback,
}: {
  did: string;
  rkey: string;
  nopics?: boolean;
  lightboxCallback?: (d: LightboxProps) => void;
}) {
  //const { get, set } = usePersistentStore();
  const queryClient = useQueryClient();
  // const [resolvedDid, setResolvedDid] = React.useState<string | null>(null);
  // const [loading, setLoading] = React.useState(false);
  // const [error, setError] = React.useState<string | null>(null);

  // const [mainPost, setMainPost] = React.useState<any | null>(null);
  // const [parents, setParents] = React.useState<any[]>([]);
  // const [parentsLoading, setParentsLoading] = React.useState(false);
  // const [replies, setReplies] = React.useState<any[]>([]);

  // React.useEffect(() => {
  //   let ignore = false;
  //   async function resolveDidIfNeeded() {
  //     if (!did) {
  //       setResolvedDid(null);
  //       return;
  //     }
  //     if (did.startsWith('did:')) {
  //       setResolvedDid(did);
  //       return;
  //     }
  //     setLoading(true);
  //     setError(null);
  //     const cacheKey = `handleDid:${did}`;
  //     const now = Date.now();
  //     const cached = await get(cacheKey); // <-- await here
  //     if (cached && cached.value && cached.time && now - cached.time < HANDLE_DID_CACHE_TIMEOUT) {
  //       try {
  //         const data = JSON.parse(cached.value);
  //         if (!ignore) setResolvedDid(data.did);
  //         setLoading(false);
  //         return;
  //       } catch {}
  //     }
  //     try {
  //       const url = `https://free-fly-24.deno.dev/?handle=${encodeURIComponent(did)}`;
  //       const res = await fetch(url);
  //       if (!res.ok) throw new Error('Failed to resolve handle');
  //       const data = await res.json();
  //       await set(cacheKey, JSON.stringify(data)); // <-- await here
  //       if (!ignore) setResolvedDid(data.did);
  //     } catch (e: any) {
  //       if (!ignore) setError('Failed to resolve handle: ' + (e?.message || e));
  //     } finally {
  //       setLoading(false);
  //     }
  //   }
  //   resolveDidIfNeeded();
  //   return () => {
  //     ignore = true;
  //   };
  // }, [did, get, set]);

  // const atUri = resolvedDid && rkey ? `at://${decodeURIComponent(resolvedDid)}/app.bsky.feed.post/${rkey}` : '';

  // React.useEffect(() => {
  //   if (!atUri) return;
  //   let ignore = false;
  //   async function fetchMainPost() {
  //     try {
  //       const postData = await cachedGetRecord({ atUri, get, set });
  //       if (!ignore) {
  //         setMainPost(postData);
  //       }
  //     } catch (e) {
  //       console.error('Failed to fetch main post record:', e);
  //     }
  //   }
  //   fetchMainPost();
  //   return () => {
  //     ignore = true;
  //   };
  // }, [atUri, get, set]);

  // React.useEffect(() => {
  //   if (!mainPost) return;
  //   let ignore = false;
  //   async function fetchParents() {
  //     setParentsLoading(true);
  //     const parentChain: any[] = [];
  //     let currentParentUri = mainPost.value?.reply?.parent?.uri;
  //     const MAX_PARENTS = 25; // Important to know theres a limit
  //     let safetyCounter = 0;

  //     while (currentParentUri && safetyCounter < MAX_PARENTS) {
  //       try {
  //         const parentPost = await cachedGetRecord({ atUri: currentParentUri, get, set });
  //         if (!parentPost) break;
  //         parentChain.push(parentPost);
  //         currentParentUri = parentPost.value?.reply?.parent?.uri;
  //         safetyCounter++;
  //       } catch (error) {
  //         console.error('Failed to fetch a parent post:', error);
  //         break;
  //       }
  //     }

  //     if (!ignore) {
  //       setParents(parentChain.reverse());
  //       setParentsLoading(false);
  //     }
  //   }

  //   fetchParents();
  //   return () => {
  //     ignore = true;
  //   };
  // }, [mainPost, get, set]);

  // React.useEffect(() => {
  //   if (!atUri) return;
  //   let ignore = false;
  //   async function fetchReplies() {
  //     try {
  //       const url = `https://constellation.microcosm.blue/links?target=${encodeURIComponent(
  //         atUri,
  //       )}&collection=app.bsky.feed.post&path=.reply.parent.uri`;
  //       const res = await fetch(url);
  //       if (!res.ok) throw new Error('Failed to fetch replies');
  //       const data = await res.json();
  //       if (!ignore && data.linking_records) {
  //         setReplies(data.linking_records.slice(0, 50));
  //       }
  //     } catch (e) {
  //       if (!ignore) setReplies([]);
  //     }
  //   }
  //   fetchReplies();
  //   return () => {
  //     ignore = true;
  //   };
  // }, [atUri]);

  const {
    data: identity,
    isLoading: isIdentityLoading,
    error: identityError,
  } = useQueryIdentity(did);

  const resolvedDid = did.startsWith("did:") ? did : identity?.did;

  const atUri = React.useMemo(
    () =>
      resolvedDid
        ? `at://${decodeURIComponent(resolvedDid)}/app.bsky.feed.post/${rkey}`
        : undefined,
    [resolvedDid, rkey]
  );

  const { data: mainPost } = useQueryPost(atUri);

  console.log("atUri",atUri)
  
  const opdid = React.useMemo(
    () =>
      atUri
        ? new AtUri(atUri).host
        : undefined,
    [atUri]
  );

  // @ts-expect-error i hate overloads
  const { data: links } = useQueryConstellation(atUri?{
    method: "/links/all",
    target: atUri,
  } : {
    method: "undefined",
    target: ""
  })as { data: linksAllResponse | undefined };

  //const [likes, setLikes] = React.useState<number | null>(null);
  //const [reposts, setReposts] = React.useState<number | null>(null);
  const [replyCount, setReplyCount] = React.useState<number | null>(null);

  React.useEffect(() => {
    // /*mass comment*/ console.log(JSON.stringify(links, null, 2));
    // setLikes(
    //   links
    //     ? links?.links?.["app.bsky.feed.like"]?.[".subject.uri"]?.records || 0
    //     : null
    // );
    // setReposts(
    //   links
    //     ? links?.links?.["app.bsky.feed.repost"]?.[".subject.uri"]?.records || 0
    //     : null
    // );
    setReplyCount(
      links
        ? links?.links?.["app.bsky.feed.post"]?.[".reply.parent.uri"]
            ?.records || 0
        : null
    );
  }, [links]);

  const { data: opreplies } = useQueryConstellation(
    !!opdid && replyCount && replyCount >= 25
      ? {
          method: "/links",
          target: atUri,
          // @ts-expect-error overloading sucks so much
          collection: "app.bsky.feed.post",
          path: ".reply.parent.uri",
          //cursor?: string;
          dids: [opdid],
        }
      : {
          method: "undefined",
          target: "",
        }
  ) as { data: linksRecordsResponse | undefined };

  const opReplyAturis =
    opreplies?.linking_records.map(
      (r) => `at://${r.did}/${r.collection}/${r.rkey}`,
    ) ?? [];


  // const { data: repliesData } = useQueryConstellation({
  //   method: "/links",
  //   target: atUri,
  //   collection: "app.bsky.feed.post",
  //   path: ".reply.parent.uri",
  // });
  // const replies = repliesData?.linking_records.slice(0, 50) ?? [];
    const [constellationurl] = useAtom(constellationURLAtom)
  
  const infinitequeryresults = useInfiniteQuery({
    ...yknowIReallyHateThisButWhateverGuardedConstructConstellationInfiniteQueryLinks(
      {
        constellation: constellationurl,
        method: "/links",
        target: atUri,
        collection: "app.bsky.feed.post",
        path: ".reply.parent.uri",
      }
    ),
    enabled: !!atUri,
  });

  const {
    data: infiniteRepliesData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = infinitequeryresults;

  // // auto-fetch all pages
  // useEffect(() => {
  //   if (
  //     infinitequeryresults.hasNextPage &&
  //     !infinitequeryresults.isFetchingNextPage
  //   ) {
  //     console.log("Fetching the next page...");
  //     infinitequeryresults.fetchNextPage();
  //   }
  // }, [infinitequeryresults]);

  // const replyAturis = repliesData
  //   ? repliesData.pages.flatMap((page) =>
  //       page
  //         ? page.linking_records.map((record) => {
  //             const aturi = `at://${record.did}/${record.collection}/${record.rkey}`;
  //             return aturi;
  //           })
  //         : []
  //     )
  //   : [];

  const replyAturis = React.useMemo(() => {
    // Get all replies from the standard infinite query
    const allReplies =
      infiniteRepliesData?.pages.flatMap(
        (page) =>
          page?.linking_records.map(
            (r) => `at://${r.did}/${r.collection}/${r.rkey}`,
          ) ?? [],
      ) ?? [];

    if (replyCount && (replyCount < 25)) {
      // If count is low, just use the standard list and find the oldest OP reply to move to the top
      const opdidFromUri = atUri ? new AtUri(atUri).host : undefined;
      const oldestOpsIndex = allReplies.findIndex(
        (aturi) => new AtUri(aturi).host === opdidFromUri,
      );
      if (oldestOpsIndex > 0) {
        const [oldestOpsReply] = allReplies.splice(oldestOpsIndex, 1);
        allReplies.unshift(oldestOpsReply);
      }
      return allReplies;
    } else {
      // If count is high, prioritize OP replies from the special query
      // and filter them out from the main list to avoid duplication.
      const opReplySet = new Set(opReplyAturis);
      const otherReplies = allReplies.filter((uri) => !opReplySet.has(uri));
      return [...opReplyAturis, ...otherReplies];
    }
  }, [infiniteRepliesData, opReplyAturis, replyCount, atUri]);

  // Find oldest OP reply
  const oldestOpsIndex = replyAturis.findIndex(
    (aturi) => new AtUri(aturi).host === opdid
  );

  // Reorder: move oldest OP reply to the front
  if (oldestOpsIndex > 0) {
    const [oldestOpsReply] = replyAturis.splice(oldestOpsIndex, 1);
    replyAturis.unshift(oldestOpsReply);
  }

  const [parents, setParents] = React.useState<any[]>([]);
  const [parentsLoading, setParentsLoading] = React.useState(false);

  const mainPostRef = React.useRef<HTMLDivElement>(null);
  const hasPerformedInitialLayout = React.useRef(false);

  const [layoutReady, setLayoutReady] = React.useState(false);

  useLayoutEffect(() => {
    if (parents.length > 0 && !layoutReady && mainPostRef.current) {
      const mainPostElement = mainPostRef.current;

      if (window.scrollY === 0 && !hasPerformedInitialLayout.current) {
        const elementTop = mainPostElement.getBoundingClientRect().top;
        const headerOffset = 70;

        const targetScrollY = elementTop - headerOffset;

        window.scrollBy(0, targetScrollY);

        hasPerformedInitialLayout.current = true;
      }
      
      // todo idk what to do with this
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLayoutReady(true);
    }
  }, [parents, layoutReady]);


  const [slingshoturl] = useAtom(slingshotURLAtom)
      
  React.useEffect(() => {
    if (parentsLoading) {
      setLayoutReady(false);
    }

    if (!mainPost?.value?.reply?.parent?.uri && !parentsLoading) {
      setLayoutReady(true);
      hasPerformedInitialLayout.current = true;
    }
  }, [parentsLoading, mainPost]);

  React.useEffect(() => {
    if (!mainPost?.value?.reply?.parent?.uri) {
      setParents([]);
      return;
    }

    let ignore = false;
    const fetchParents = async () => {
      setParentsLoading(true);
      const parentChain: any[] = [];
      let currentParentUri = mainPost?.value.reply?.parent.uri;
      const MAX_PARENTS = 25;
      let safetyCounter = 0;

      while (currentParentUri && safetyCounter < MAX_PARENTS) {
        try {
          const parentPost = await queryClient.fetchQuery(
            constructPostQuery(currentParentUri, slingshoturl)
          );
          if (!parentPost) break;
          parentChain.push(parentPost);
          currentParentUri = parentPost.value?.reply?.parent?.uri;
        } catch (error) {
          console.error("Failed to fetch a parent post:", error);
          break;
        }
        safetyCounter++;
      }

      if (!ignore) {
        setParents(parentChain.reverse());
        setParentsLoading(false);
      }
    };

    fetchParents();
    return () => {
      ignore = true;
    };
  }, [mainPost, queryClient]);

  if (!did || !rkey) return <div>Invalid post URI</div>;
  if (isIdentityLoading) return <div>Resolving handle...</div>;
  if (identityError)
    return <div style={{ color: "red" }}>{identityError.message}</div>;
  if (!atUri) return <div>Could not construct post URI.</div>;

  return (
    <>
      <Outlet />
      <Header
        title={`Post`}
        backButtonCallback={() => {
          if (window.history.length > 1) {
            window.history.back();
          } else {
            window.location.assign("/");
          }
        }}
      />

      {parentsLoading && (
        <div className="text-center text-gray-500 dark:text-gray-400 flex flex-row">
          <div className="ml-4 w-[42px] flex justify-center">
            <div
              style={{ width: 2, height: "100%", opacity: 0.5 }}
              className="bg-gray-500 dark:bg-gray-400"
            ></div>
          </div>
          Loading conversation...
        </div>
      )}

      {/* we should use the reply lines here thats provided by UPR*/}
      <div style={{ maxWidth: 600, padding: 0 }}>
        {parents.map((parent, index) => (
          <UniversalPostRendererATURILoader
            key={parent.uri}
            atUri={parent.uri}
            topReplyLine={index > 0}
            bottomReplyLine={true}
            bottomBorder={false}
          />
        ))}
      </div>
      <div ref={mainPostRef}>
        <UniversalPostRendererATURILoader
          atUri={atUri}
          detailed={true}
          topReplyLine={parentsLoading || parents.length > 0}
          nopics={!!nopics}
          lightboxCallback={lightboxCallback}
        />
      </div>
      <div
        style={{
          maxWidth: 600,
          //margin: "0px auto 0",
          padding: 0,
          minHeight: "80dvh",
          paddingBottom: "20dvh",
        }}
      >
        <div
          className="text-gray-500 dark:text-gray-400 text-sm font-bold"
          style={{
            fontSize: 18,
            margin: "12px 16px 12px 16px",
            fontWeight: 600,
          }}
        >
          Replies
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {replyAturis.length > 0 &&
            replyAturis.map((reply) => {
              //const replyAtUri = `at://${reply.did}/app.bsky.feed.post/${reply.rkey}`;
              return (
                <UniversalPostRendererATURILoader
                  key={reply}
                  atUri={reply}
                  maxReplies={4}
                />
              );
            })}
            {hasNextPage && (
            <button
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
              className="w-[calc(100%-2rem)] mx-4 my-4 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 font-semibold disabled:opacity-50"
            >
              {isFetchingNextPage ? "Loading..." : "Load More"}
            </button>
          )}
        </div>
      </div>
    </>
  );
}
