import { AtUri } from "@atproto/api";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Outlet } from "@tanstack/react-router";
import React, { useEffect, useLayoutEffect } from "react";

import { Header } from "~/components/Header";
import { UniversalPostRendererATURILoader } from "~/components/UniversalPostRenderer";
//import { usePersistentStore } from '~/providers/PersistentStoreProvider';
import {
  constructPostQuery,
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
  lightboxCallback
}: {
  did: string;
  rkey: string;
  nopics?: boolean;
  lightboxCallback?: (d:LightboxProps) => void;
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
        : "",
    [resolvedDid, rkey]
  );

  const { data: mainPost } = useQueryPost(atUri);

  // const { data: repliesData } = useQueryConstellation({
  //   method: "/links",
  //   target: atUri,
  //   collection: "app.bsky.feed.post",
  //   path: ".reply.parent.uri",
  // });
  // const replies = repliesData?.linking_records.slice(0, 50) ?? [];
  const infinitequeryresults = useInfiniteQuery({
    ...yknowIReallyHateThisButWhateverGuardedConstructConstellationInfiniteQueryLinks(
      {
        method: "/links",
        target: atUri,
        collection: "app.bsky.feed.post",
        path: ".reply.parent.uri",
      }
    ),
    enabled: !!atUri,
  });

  const {
    data: repliesData,
    // fetchNextPage,
    // hasNextPage,
    // isFetchingNextPage,
  } = infinitequeryresults;

  // auto-fetch all pages
  useEffect(() => {
    if (
      infinitequeryresults.hasNextPage &&
      !infinitequeryresults.isFetchingNextPage
    ) {
      console.log("Fetching the next page...");
      infinitequeryresults.fetchNextPage();
    }
  }, [infinitequeryresults]);

  const replyAturis = repliesData
    ? repliesData.pages.flatMap((page) =>
        page
          ? page.linking_records.map((record) => {
              const aturi = `at://${record.did}/${record.collection}/${record.rkey}`;
              return aturi;
            })
          : []
      )
    : [];

  const opdid = new AtUri(atUri).host;

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
  const userHasScrolled = React.useRef(false);

  const scrollAnchor = React.useRef<{ top: number } | null>(null);

  React.useEffect(() => {
    const onScroll = () => {
      if (window.scrollY > 50) {
        userHasScrolled.current = true;

        window.removeEventListener("scroll", onScroll);
      }
    };

    if (!userHasScrolled.current) {
      window.addEventListener("scroll", onScroll, { passive: true });
    }
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useLayoutEffect(() => {
    if (parentsLoading && mainPostRef.current && !userHasScrolled.current) {
      scrollAnchor.current = {
        top: mainPostRef.current.getBoundingClientRect().top,
      };
    }
  }, [parentsLoading]);

  useLayoutEffect(() => {
    if (
      scrollAnchor.current &&
      mainPostRef.current &&
      !userHasScrolled.current
    ) {
      const newTop = mainPostRef.current.getBoundingClientRect().top;
      const topDiff = newTop - scrollAnchor.current.top;
      if (topDiff > 0) {
        window.scrollBy(0, topDiff);
      }
      scrollAnchor.current = null;
    }
  }, [parents]);

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
            constructPostQuery(currentParentUri)
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
          paddingBottom: "20dvh"
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
        </div>
      </div>
    </>
  );
}
