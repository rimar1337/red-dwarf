import { RichText } from "@atproto/api";
import * as ATPAPI from "@atproto/api";
import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAtom } from "jotai";
import React, { type ReactNode, useEffect, useState } from "react";

import defaultpfp from "~/../public/favicon.png";
import { Header } from "~/components/Header";
import {
  ReusableTabRoute,
  useReusableTabScrollRestore,
} from "~/components/ReusableTabRoute";
import {
  renderTextWithFacets,
  UniversalPostRendererATURILoader,
} from "~/components/UniversalPostRenderer";
import { useAuth } from "~/providers/UnifiedAuthProvider";
import { imgCDNAtom } from "~/utils/atoms";
import {
  toggleFollow,
  useGetFollowState,
  useGetOneToOneState,
} from "~/utils/followState";
import {
  useInfiniteQueryAuthorFeed,
  useQueryConstellation,
  useQueryIdentity,
  useQueryProfile,
} from "~/utils/useQuery";

export const Route = createFileRoute("/profile/$did/")({
  component: ProfileComponent,
});

function ProfileComponent() {
  // booo bad this is not always the did it might be a handle, use identity.did instead
  const { did } = Route.useParams();
  const { agent } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const {
    data: identity,
    isLoading: isIdentityLoading,
    error: identityError,
  } = useQueryIdentity(did);

  const resolvedDid = did.startsWith("did:") ? did : identity?.did;
  const resolvedHandle = did.startsWith("did:") ? identity?.handle : did;
  const pdsUrl = identity?.pds;

  const profileUri = resolvedDid
    ? `at://${resolvedDid}/app.bsky.actor.profile/self`
    : undefined;
  const { data: profileRecord } = useQueryProfile(profileUri);
  const profile = profileRecord?.value;

  const [imgcdn] = useAtom(imgCDNAtom);

  function getAvatarUrl(p: typeof profile) {
    const link = p?.avatar?.ref?.["$link"];
    if (!link || !resolvedDid) return null;
    return `https://${imgcdn}/img/avatar/plain/${resolvedDid}/${link}@jpeg`;
  }
  function getBannerUrl(p: typeof profile) {
    const link = p?.banner?.ref?.["$link"];
    if (!link || !resolvedDid) return null;
    return `https://${imgcdn}/img/banner/plain/${resolvedDid}/${link}@jpeg`;
  }

  const displayName =
    profile?.displayName || (resolvedHandle ? `@${resolvedHandle}` : did);
  const handle = resolvedHandle ? `@${resolvedHandle}` : resolvedDid || did;
  const description = profile?.description || "";

  const isReady = !!resolvedDid && !isIdentityLoading && !!profileRecord;

  return (
    <div className="">
      <Header
        title={`Profile`}
        backButtonCallback={() => {
          if (window.history.length > 1) {
            window.history.back();
          } else {
            window.location.assign("/");
          }
        }}
        bottomBorderDisabled={true}
      />
      {/* <div className="flex gap-2 px-4 py-2 h-[52px] sticky top-0 bg-white dark:bg-gray-950 z-10 border-b border-gray-200 dark:border-gray-700">
        <Link
          to=".."
          className="px-3 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-900 font-bold text-lg"
          onClick={(e) => {
            e.preventDefault();
            if (window.history.length > 1) {
              window.history.back()
            } else {
              window.location.assign("/");
            }
          }}
          aria-label="Go back"
        >
          ←
        </Link>
        <span className="text-xl font-bold ml-2">Profile</span>
      </div> */}

      {/* Profile Header */}
      <div className="w-full max-w-2xl mx-auto overflow-hidden relative bg-gray-100 dark:bg-gray-900">
        {/* Banner */}
        <div
          className="w-full h-40 bg-gray-300 dark:bg-gray-700"
          style={{
            backgroundImage: `url(${getBannerUrl(profile)})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />

        {/* Avatar (PFP) */}
        <div className="absolute left-[16px] top-[100px] ">
          <img
            src={getAvatarUrl(profile) || "/favicon.png"}
            alt="avatar"
            className="w-28 h-28 rounded-full object-cover border-4 border-white dark:border-gray-950 bg-gray-300 dark:bg-gray-700"
          />
        </div>

        <div className="absolute right-[16px] top-[170px] flex flex-row gap-2.5">
          {/* 
            todo: full follow and unfollow backfill (along with partial likes backfill, 
            just enough for it to be useful) 
            also delay the backfill to be on demand because it would be pretty intense
            also save it persistently
          */}
          <FollowButton targetdidorhandle={did} />
          <button className="rounded-full dark:bg-gray-600 bg-gray-300 px-3 py-2 text-[14px]">
            ... {/* todo: icon */}
          </button>
        </div>

        {/* Info Card */}
        <div className="mt-16 pb-2 px-4 text-gray-900 dark:text-gray-100">
          <div className="font-bold text-2xl">{displayName}</div>
          <div className="text-gray-500 dark:text-gray-400 text-base mb-3 flex flex-row gap-1">
            <Mutual targetdidorhandle={did} />
            {handle}
          </div>
          {description && (
            <div className="text-base leading-relaxed text-gray-800 dark:text-gray-300 mb-5 whitespace-pre-wrap break-words text-[15px]">
              {/* {description} */}
              <RichTextRenderer key={did} description={description} />
            </div>
          )}
        </div>
      </div>

      {/* this should not be rendered until its ready (the top profile layout is stable) */}
      {isReady ? (
        <ReusableTabRoute
          route={`Profile` + did}
          tabs={{
            Posts: <PostsTab did={did} />,
            Reposts: <RepostsTab did={did} />,
            Feeds: <FeedsTab did={did} />,
            Lists: <ListsTab did={did} />,
            ...(identity?.did === agent?.did
              ? { Likes: <SelfLikesTab did={did} /> }
              : {}),
          }}
        />
      ) : isIdentityLoading ? (
        <div className="p-4 text-center text-gray-500">
          Resolving profile...
        </div>
      ) : identityError ? (
        <div className="p-4 text-center text-red-500">
          Error: {identityError.message}
        </div>
      ) : !resolvedDid ? (
        <div className="p-4 text-center text-gray-500">Profile not found.</div>
      ) : (
        <div className="p-4 text-center text-gray-500">
          Loading profile content...
        </div>
      )}
    </div>
  );
}

function PostsTab({ did }: { did: string }) {
  useReusableTabScrollRestore(`Profile` + did);
  const queryClient = useQueryClient();
  const {
    data: identity,
    isLoading: isIdentityLoading,
    error: identityError,
  } = useQueryIdentity(did);

  const resolvedDid = did.startsWith("did:") ? did : identity?.did;

  const {
    data: postsData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: arePostsLoading,
  } = useInfiniteQueryAuthorFeed(resolvedDid, identity?.pds);

  React.useEffect(() => {
    if (postsData) {
      postsData.pages.forEach((page) => {
        page.records.forEach((record) => {
          if (!queryClient.getQueryData(["post", record.uri])) {
            queryClient.setQueryData(["post", record.uri], record);
          }
        });
      });
    }
  }, [postsData, queryClient]);

  const posts = React.useMemo(
    () => postsData?.pages.flatMap((page) => page.records) ?? [],
    [postsData]
  );

  return (
    <>
      <div className="text-gray-500 dark:text-gray-400 text-lg font-semibold my-3 mx-4">
        Posts
      </div>
      <div>
        {posts.map((post) => (
          <UniversalPostRendererATURILoader
            key={post.uri}
            atUri={post.uri}
            feedviewpost={true}
          />
        ))}
      </div>

      {/* Loading and "Load More" states */}
      {arePostsLoading && posts.length === 0 && (
        <div className="p-4 text-center text-gray-500">Loading posts...</div>
      )}
      {isFetchingNextPage && (
        <div className="p-4 text-center text-gray-500">Loading more...</div>
      )}
      {hasNextPage && !isFetchingNextPage && (
        <button
          onClick={() => fetchNextPage()}
          className="w-[calc(100%-2rem)] mx-4 my-4 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 font-semibold"
        >
          Load More Posts
        </button>
      )}
      {posts.length === 0 && !arePostsLoading && (
        <div className="p-4 text-center text-gray-500">No posts found.</div>
      )}
    </>
  );
}

function RepostsTab({ did }: { did: string }) {
  useReusableTabScrollRestore(`Profile` + did);
  const {
    data: identity,
    isLoading: isIdentityLoading,
    error: identityError,
  } = useQueryIdentity(did);

  const resolvedDid = did.startsWith("did:") ? did : identity?.did;

  const {
    data: repostsData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: arePostsLoading,
  } = useInfiniteQueryAuthorFeed(
    resolvedDid,
    identity?.pds,
    "app.bsky.feed.repost"
  );

  const reposts = React.useMemo(
    () => repostsData?.pages.flatMap((page) => page.records) ?? [],
    [repostsData]
  );

  return (
    <>
      <div className="text-gray-500 dark:text-gray-400 text-lg font-semibold my-3 mx-4">
        Reposts
      </div>
      <div>
        {reposts.map((repost) => {
          if (
            !repost ||
            !repost?.value ||
            !repost?.value?.subject ||
            // @ts-expect-error blehhhhh
            !repost?.value?.subject?.uri
          )
            return;
          const repostRecord =
            repost.value as unknown as ATPAPI.AppBskyFeedRepost.Record;
          return (
            <UniversalPostRendererATURILoader
              key={repostRecord.subject.uri}
              atUri={repostRecord.subject.uri}
              feedviewpost={true}
              repostedby={repost.uri}
            />
          );
        })}
      </div>

      {/* Loading and "Load More" states */}
      {arePostsLoading && reposts.length === 0 && (
        <div className="p-4 text-center text-gray-500">Loading posts...</div>
      )}
      {isFetchingNextPage && (
        <div className="p-4 text-center text-gray-500">Loading more...</div>
      )}
      {hasNextPage && !isFetchingNextPage && (
        <button
          onClick={() => fetchNextPage()}
          className="w-[calc(100%-2rem)] mx-4 my-4 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 font-semibold"
        >
          Load More Posts
        </button>
      )}
      {reposts.length === 0 && !arePostsLoading && (
        <div className="p-4 text-center text-gray-500">No posts found.</div>
      )}
    </>
  );
}

function FeedsTab({ did }: { did: string }) {
  useReusableTabScrollRestore(`Profile` + did);
  const {
    data: identity,
    isLoading: isIdentityLoading,
    error: identityError,
  } = useQueryIdentity(did);

  const resolvedDid = did.startsWith("did:") ? did : identity?.did;

  const {
    data: feedsData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: arePostsLoading,
  } = useInfiniteQueryAuthorFeed(
    resolvedDid,
    identity?.pds,
    "app.bsky.feed.generator"
  );

  const feeds = React.useMemo(
    () => feedsData?.pages.flatMap((page) => page.records) ?? [],
    [feedsData]
  );

  return (
    <>
      <div className="text-gray-500 dark:text-gray-400 text-lg font-semibold my-3 mx-4">
        Feeds
      </div>
      <div>
        {feeds.map((feed) => {
          if (!feed || !feed?.value) return;
          const feedGenRecord =
            feed.value as unknown as ATPAPI.AppBskyFeedGenerator.Record;
          return <FeedItemRender feed={feed as any} key={feed.uri} />;
        })}
      </div>

      {/* Loading and "Load More" states */}
      {arePostsLoading && feeds.length === 0 && (
        <div className="p-4 text-center text-gray-500">Loading feeds...</div>
      )}
      {isFetchingNextPage && (
        <div className="p-4 text-center text-gray-500">Loading more...</div>
      )}
      {hasNextPage && !isFetchingNextPage && (
        <button
          onClick={() => fetchNextPage()}
          className="w-[calc(100%-2rem)] mx-4 my-4 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 font-semibold"
        >
          Load More Feeds
        </button>
      )}
      {feeds.length === 0 && !arePostsLoading && (
        <div className="p-4 text-center text-gray-500">No feeds found.</div>
      )}
    </>
  );
}

function FeedItemRender({
  feed,
  listmode
}: {
  feed: { uri: string; cid: string; value: ATPAPI.AppBskyFeedGenerator.Record };
  listmode?: boolean;
}) {
  const name = listmode ? feed.value?.name as string : feed.value?.displayName as string;
  const aturi = new ATPAPI.AtUri(feed.uri);
  const {data: identity} = useQueryIdentity(aturi.host);
  const resolvedDid = identity?.did;
  const [imgcdn] = useAtom(imgCDNAtom);

  function getAvatarThumbnailUrl(f: typeof feed) {
    const link = f?.value.avatar?.ref?.["$link"];
    if (!link || !resolvedDid) return null;
    return `https://${imgcdn}/img/avatar/plain/${resolvedDid}/${link}@jpeg`;
  }

  // @ts-expect-error overloads sucks
  const {data: likes} = useQueryConstellation(!listmode ? {
    target: feed.uri,
    method: "/links/count",
    collection: "app.bsky.feed.like",
    path: ".subject.uri"
  } : undefined)

  return (
    <div className="px-4 py-4 border-b flex flex-col gap-1">
      <div className="flex flex-row gap-3">
        <div className="min-w-10 min-h-10">
          <img src={getAvatarThumbnailUrl(feed) || defaultpfp} className="h-10 w-10 rounded border" />
        </div>
        <div className="flex flex-col">
          <span className="">{name}</span>
          <span className=" text-sm px-1.5 py-0.5 text-gray-500 bg-gray-200 dark:text-gray-400 dark:bg-gray-800 rounded-lg flex flex-row items-center justify-center">{feed.value.did || aturi.rkey}</span>
        </div>
        <div className="flex-1" />
        {/* <div className="button bg-red-500 rounded-full min-w-[60px]" /> */}
      </div>
      <span className=" text-sm">{feed.value?.description}</span>
      {!listmode && (<span className=" text-sm dark:text-gray-400 text-gray-500">Liked by {(likes as unknown as any)?.total as number || 0} users</span>)}
    </div>
  );
}


function ListsTab({ did }: { did: string }) {
  useReusableTabScrollRestore(`Profile` + did);
  const {
    data: identity,
    isLoading: isIdentityLoading,
    error: identityError,
  } = useQueryIdentity(did);

  const resolvedDid = did.startsWith("did:") ? did : identity?.did;

  const {
    data: feedsData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: arePostsLoading,
  } = useInfiniteQueryAuthorFeed(
    resolvedDid,
    identity?.pds,
    "app.bsky.graph.list"
  );

  const feeds = React.useMemo(
    () => feedsData?.pages.flatMap((page) => page.records) ?? [],
    [feedsData]
  );

  return (
    <>
      <div className="text-gray-500 dark:text-gray-400 text-lg font-semibold my-3 mx-4">
        Feeds
      </div>
      <div>
        {feeds.map((feed) => {
          if (!feed || !feed?.value) return;
          const feedGenRecord =
            feed.value as unknown as ATPAPI.AppBskyFeedGenerator.Record;
          return <FeedItemRender listmode={true} feed={feed as any} key={feed.uri} />;
        })}
      </div>

      {/* Loading and "Load More" states */}
      {arePostsLoading && feeds.length === 0 && (
        <div className="p-4 text-center text-gray-500">Loading lists...</div>
      )}
      {isFetchingNextPage && (
        <div className="p-4 text-center text-gray-500">Loading more...</div>
      )}
      {hasNextPage && !isFetchingNextPage && (
        <button
          onClick={() => fetchNextPage()}
          className="w-[calc(100%-2rem)] mx-4 my-4 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 font-semibold"
        >
          Load More Lists
        </button>
      )}
      {feeds.length === 0 && !arePostsLoading && (
        <div className="p-4 text-center text-gray-500">No lists found.</div>
      )}
    </>
  );
}

function SelfLikesTab({ did }: { did: string }) {
  useReusableTabScrollRestore(`Profile` + did);
  const {
    data: identity,
    isLoading: isIdentityLoading,
    error: identityError,
  } = useQueryIdentity(did);

  const resolvedDid = did.startsWith("did:") ? did : identity?.did;

  const {
    data: repostsData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: arePostsLoading,
  } = useInfiniteQueryAuthorFeed(
    resolvedDid,
    identity?.pds,
    "app.bsky.feed.like"
  );

  const reposts = React.useMemo(
    () => repostsData?.pages.flatMap((page) => page.records) ?? [],
    [repostsData]
  );

  return (
    <>
      <div className="text-gray-500 dark:text-gray-400 text-lg font-semibold my-3 mx-4">
        Likes
      </div>
      <div>
        {reposts.map((repost) => {
          if (
            !repost ||
            !repost?.value ||
            !repost?.value?.subject ||
            // @ts-expect-error blehhhhh
            !repost?.value?.subject?.uri
          )
            return;
          const repostRecord =
            repost.value as unknown as ATPAPI.AppBskyFeedLike.Record;
          return (
            <UniversalPostRendererATURILoader
              key={repostRecord.subject.uri}
              atUri={repostRecord.subject.uri}
              feedviewpost={true}
            />
          );
        })}
      </div>

      {/* Loading and "Load More" states */}
      {arePostsLoading && reposts.length === 0 && (
        <div className="p-4 text-center text-gray-500">Loading posts...</div>
      )}
      {isFetchingNextPage && (
        <div className="p-4 text-center text-gray-500">Loading more...</div>
      )}
      {hasNextPage && !isFetchingNextPage && (
        <button
          onClick={() => fetchNextPage()}
          className="w-[calc(100%-2rem)] mx-4 my-4 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 font-semibold"
        >
          Load More Posts
        </button>
      )}
      {reposts.length === 0 && !arePostsLoading && (
        <div className="p-4 text-center text-gray-500">No posts found.</div>
      )}
    </>
  );
}

export function FollowButton({
  targetdidorhandle,
}: {
  targetdidorhandle: string;
}) {
  const { agent } = useAuth();
  const { data: identity } = useQueryIdentity(targetdidorhandle);
  const queryClient = useQueryClient();

  const followRecords = useGetFollowState({
    target: identity?.did ?? targetdidorhandle,
    user: agent?.did,
  });

  return (
    <>
      {identity?.did !== agent?.did ? (
        <>
          {!(followRecords?.length && followRecords?.length > 0) ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleFollow({
                  agent: agent || undefined,
                  targetDid: identity?.did,
                  followRecords: followRecords,
                  queryClient: queryClient,
                });
              }}
              className="rounded-full h-10 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors px-4 py-2 text-[14px]"
            >
              Follow
            </button>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleFollow({
                  agent: agent || undefined,
                  targetDid: identity?.did,
                  followRecords: followRecords,
                  queryClient: queryClient,
                });
              }}
              className="rounded-full h-10 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors px-4 py-2 text-[14px]"
            >
              Unfollow
            </button>
          )}
        </>
      ) : (
        <button className="rounded-full h-10 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors px-4 py-2 text-[14px]">
          Edit Profile
        </button>
      )}
    </>
  );
}

export function Mutual({ targetdidorhandle }: { targetdidorhandle: string }) {
  const { agent } = useAuth();
  const { data: identity } = useQueryIdentity(targetdidorhandle);

  const theyFollowYouRes = useGetOneToOneState(
    agent?.did
      ? {
          target: agent?.did,
          user: identity?.did ?? targetdidorhandle,
          collection: "app.bsky.graph.follow",
          path: ".subject",
        }
      : undefined
  );

  const youFollowThemRes = useGetFollowState({
    target: identity?.did ?? targetdidorhandle,
    user: agent?.did,
  });

  const theyFollowYou: boolean =
    !!theyFollowYouRes?.length && theyFollowYouRes.length > 0;
  const youFollowThem: boolean =
    !!youFollowThemRes?.length && youFollowThemRes.length > 0;

  return (
    <>
      {/* if not self */}
      {identity?.did !== agent?.did ? (
        <>
          {theyFollowYou ? (
            <>
              {youFollowThem ? (
                <div className=" text-sm px-1.5 py-0.5 text-gray-500 bg-gray-200 dark:text-gray-400 dark:bg-gray-800 rounded-lg flex flex-row items-center justify-center">
                  mutuals
                </div>
              ) : (
                <div className=" text-sm px-1.5 py-0.5 text-gray-500 bg-gray-200 dark:text-gray-400 dark:bg-gray-800 rounded-lg flex flex-row items-center justify-center">
                  follows you
                </div>
              )}
            </>
          ) : (
            <></>
          )}
        </>
      ) : (
        // lmao can someone be mutuals with themselves ??
        <></>
      )}
    </>
  );
}

export function RichTextRenderer({ description }: { description: string }) {
  const [richDescription, setRichDescription] = useState<string | ReactNode[]>(
    description
  );
  const { agent } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;

    // setRichDescription(description);

    async function processRichText() {
      try {
        if (!agent?.did) return;
        const rt = new RichText({ text: description });
        await rt.detectFacets(agent);

        if (!mounted) return;

        if (rt.facets) {
          setRichDescription(
            renderTextWithFacets({ text: rt.text, facets: rt.facets, navigate })
          );
        } else {
          setRichDescription(rt.text);
        }
      } catch (error) {
        console.error("Failed to detect facets:", error);
        if (mounted) {
          setRichDescription(description);
        }
      }
    }

    processRichText();

    return () => {
      mounted = false;
    };
  }, [description, agent, navigate]);

  return <>{richDescription}</>;
}
