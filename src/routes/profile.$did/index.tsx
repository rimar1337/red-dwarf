import { Agent, RichText } from "@atproto/api";
import * as ATPAPI from "@atproto/api";
import { TID } from "@atproto/common-web";
import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useAtom } from "jotai";
import React, { type ReactNode, useEffect, useState } from "react";

import { FORCE_HIDE_LABELS, FORCE_HIDE_LABELS_WHITELISTED_SOURCE } from "~/../policy";
import defaultpfp from "~/../public/defaultpfp.png";
import { Header } from "~/components/Header";
import {
  ReusableTabRoute,
  useReusableTabScrollRestore,
} from "~/components/ReusableTabRoute";
import {
  SmallAuthorLabelBadge,
  SmallAuthorLabelBadgeInner,
  UniversalPostRendererATURILoader,
} from "~/components/UniversalPostRenderer";
import { renderTextWithFacets } from "~/components/UtilityFunctions";
import { getGetHydratedLabelDefs, useAutoLabels } from "~/hooks/useAutoLabels";
import type { HydratedLabelValueDefinition } from "~/providers/AutoLabelProvider";
//import { useModeration } from "~/hooks/useModeration";
import { useAuth } from "~/providers/UnifiedAuthProvider";
import { enableBitesAtom, imgCDNAtom, profileChipsAtom } from "~/utils/atoms";
import {
  toggleFollow,
  useGetFollowState,
  useGetOneToOneState,
} from "~/utils/followState";
import { useFastSetLikesFromFeed } from "~/utils/likeMutationQueue";
import {
  useInfiniteQueryAuthorFeed,
  useQueryArbitrary,
  useQueryConstellation,
  useQueryConstellationLinksCountDistinctDids,
  useQueryIdentity,
  useQueryProfile,
} from "~/utils/useQuery";
// README this weird manual import is required because icon auto imports in this file (and some other files) are broken
// for some reason which i dont know. 
import IconMdiMoreHoriz from "~icons/mdi/more-horiz.jsx";
import IconMdiShieldOutline from "~icons/mdi/shield-outline.jsx";

import { renderSnack } from "../__root";
import { Chip, NotificationItem } from "../notifications";

export const Route = createFileRoute("/profile/$did/")({
  component: ProfileComponent,
});

export interface LabelWithHydratedLocaleName extends ATPAPI.ComAtprotoLabelDefs.Label {
  name: string
}

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

  const agentDid = agent?.did;
  const authorDid = identity?.did;

  const userBlocksAuthor = useGetOneToOneState(
    agentDid && authorDid
      ? {
        target: authorDid,
        user: agentDid,
        collection: "app.bsky.graph.block",
        path: ".subject",
      }
      : undefined,
  );
  const authorBlocksUser = useGetOneToOneState(
    agentDid && authorDid
      ? {
        target: agentDid,
        user: authorDid,
        collection: "app.bsky.graph.block",
        path: ".subject",
      }
      : undefined,
  );
  
  const redactWhileLoadingBlock = userBlocksAuthor.isLoading || authorBlocksUser.isLoading
  const redactFinalBlock = userBlocksAuthor.uris.length > 0 || authorBlocksUser.uris.length > 0

  const subjects = identity ? [
    identity.did,
    `at://${identity.did}/app.bsky.actor.profile/self`,
  ] : []
  
  const {
    results: labelResults,
    hydratedLabelDefs,
  } = useAutoLabels({
    subjects,
    type: "post", // or whatever you’re keying on for now
  })

  const ghld = getGetHydratedLabelDefs(hydratedLabelDefs)
  const accountResult = labelResults.get(identity?.did || did)
  const profileResult = labelResults.get(
    `at://${identity?.did || did}/app.bsky.actor.profile/self`,
  )

  const accountLabelVerdict = accountResult?.labelVerdict ?? "unknown"
  const authorLabels = accountResult?.labels ?? []

  const profileLabelVerdict = profileResult?.labelVerdict ?? "unknown"
  const profileLabels = profileResult?.labels ?? []

  const authorModUnknown = accountLabelVerdict === "unknown";
  const profileModUnknown = profileLabelVerdict === "unknown";

  const authorModLoading = accountLabelVerdict === "loading";
  const profileModLoading = profileLabelVerdict === "loading";

  const authorModError = accountLabelVerdict === "error";
  const profileModError = profileLabelVerdict === "error";

  const strictModerationUnknown = authorModUnknown || profileModUnknown
  const strictModerationLoading = authorModLoading || profileModLoading || redactWhileLoadingBlock
  const strictModerationError = authorModError || profileModError

  const strictModerationDontShow = strictModerationUnknown || strictModerationLoading || strictModerationError || redactFinalBlock

  const verdictDebugString = `accountLabelVerdict: ${accountLabelVerdict}, profileLabelVerdict: ${profileLabelVerdict}`

  const hideAuthorLabels = authorLabels.filter(
    (label) => ghld(label.src,label.val)?.pref === "hide",
  );
  const warnAuthorLabels = authorLabels.filter(
    (label) => ghld(label.src,label.val)?.severity === "warn" && ghld(label.src,label.val)?.pref === "warn",
  );
  const informAuthorLabels: LabelWithHydratedLocaleName[] = authorLabels.flatMap(
    (label) => {
      if (ghld(label.src,label.val)?.severity === "inform" && ghld(label.src,label.val)?.pref === "warn") {
        return [{
          ...label,
          name: getLocaleLabel(ghld(label.src,label.val))?.name || label.val
        }]
      }
      return []
    },
  );
  const hideProfileLabels = profileLabels.filter(
    (label) => ghld(label.src,label.val)?.pref === "hide",
  );
  const warnProfileLabels = profileLabels.filter(
    (label) => ghld(label.src,label.val)?.pref === "warn",
  );

  // i was gonna check the did doc but useQueryIdentity doesnt return that info (slingshot minidoc)
  // so instead we should query the labeler profile

  const { data: labelerProfile } = useQueryArbitrary(
    identity?.did
      ? `at://${identity?.did}/app.bsky.labeler.service/self`
      : undefined
  );

  const isLabeler = !!labelerProfile?.cid;
  const labelerRecord = isLabeler
    ? (labelerProfile?.value as ATPAPI.AppBskyLabelerService.Record)
    : undefined;

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

  const resultwhateversure = useQueryConstellationLinksCountDistinctDids(
    resolvedDid
      ? {
        method: "/links/count/distinct-dids",
        collection: "app.bsky.graph.follow",
        target: resolvedDid,
        path: ".subject",
      }
      : undefined
  );

  const followercount = resultwhateversure?.data?.total;

  const isForceHidden = [...[...authorLabels].filter((label) => {
    return (
      FORCE_HIDE_LABELS.has(label.val) &&
      FORCE_HIDE_LABELS_WHITELISTED_SOURCE.has(label.src)
    );
  }), ...hideAuthorLabels];

  // // todo remove this replace it with blurs
  // if (strictModerationLoading) {
  //   return (
  //     <div className="">
  //       <Header
  //         title={`Loading Profile`}
  //         backButtonCallback={() => {
  //           if (window.history.length > 1) {
  //             window.history.back();
  //           } else {
  //             window.location.assign("/");
  //           }
  //         }}
  //         bottomBorderDisabled={true}
  //       />
  //       <div className=" leading-normal flex flex-col gap-4 p-4">
  //         <span>DEBUG LOADING LABELS</span>
  //         <span>{identity?.did || did}</span>
  //         <span>{verdictDebugString}</span>
  //       </div>
  //     </div>
  //   );
  // }

  console.log("HLLO HLLO HisForceHidden" + did + isForceHidden + authorLabels)
  if (isForceHidden.length > 0 || redactFinalBlock) {
    // todo pretify this please
    return (
      <div className="">
        <Header
          title={`Hidden Profile`}
          backButtonCallback={() => {
            if (window.history.length > 1) {
              window.history.back();
            } else {
              window.location.assign("/");
            }
          }}
          bottomBorderDisabled={true}
        />
        <div className="p-4">
          <div className="p-4 bg-gray-100 dark:bg-gray-900 rounded-xl  border-gray-200 dark:border-gray-800 flex flex-col gap-4">
            {/* todo: separate host-mandated labelers from user-picked labelers. 
            currently assumes all labelers that hides profiles are host-mandated */}
            <p>This profile is hidden due to these reason(s):</p>
            {isForceHidden.map((item) => {
              return (
                // todo this sucks
                <NotificationItem
                  key={item.src}
                  notification={item.src}
                  labeler={getLocaleLabel(ghld(item.src, item.val))?.name || item.val}
                  disablefollow={true}
                />
              )
            })}
            {/* todo add unblock button duhhhhhh */}
            {/* {userBlocksAuthor.uris.length > 0 && (<div className="p-4">User Blocked by You</div>)} */}
            {userBlocksAuthor.uris.length > 0 && (
              <NotificationItem
                notification={authorDid||did}
                blocking={"unblock"}
              />
            )}
            {/* {authorBlocksUser.uris.length > 0 && (<div className="p-4">User Blocking You</div>)} */}
            {authorBlocksUser.uris.length > 0 && (
              <NotificationItem
                notification={authorDid||did}
                blocking={"blocked"}
              />
            )}
            <div className="flex flex-row gap-2">
              <Link to="/moderation" className="flex-1 rounded-full bg-gray-200 hover:bg-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700 p-4 flex items-center justify-center">
              <span>Moderation Settings</span>
            </Link>
            <Link to="/about" className="flex-1 rounded-full bg-gray-200 hover:bg-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700 p-4 flex items-center justify-center">
              <span>Host instance's policies</span>
            </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }
  return (
    <div className="">
      <Header
        title={`${strictModerationLoading ? "Loading " :" "}Profile`}
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
            backgroundImage: strictModerationLoading ? undefined : `url(${getBannerUrl(profile)})`,
            backgroundColor: strictModerationLoading ? "var(--color-placeholder)" : undefined,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />

        {/* Avatar (PFP) */}
        <div className="absolute left-[16px] top-[100px] ">
          {strictModerationLoading ? (
            <div
              className={`w-28 h-28 ${isLabeler ? "rounded-md" : "rounded-full"} object-cover border-4 border-white dark:border-gray-950 bg-gray-300 dark:bg-gray-700 overflow-clip`}
            >
              <div className={`w-28 h-28 bg-gray-400 dark:bg-gray-600 animate-pulse`}
            />
            </div>
          ) : !getAvatarUrl(profile) && isLabeler ? (
            <div
              className={`w-28 h-28 ${isLabeler ? "rounded-md" : "rounded-full"} items-center justify-center flex object-cover border-4 border-white dark:border-gray-950 bg-gray-300 dark:bg-gray-700`}
            >
              <IconMdiShieldOutline className="w-20 h-20" />
            </div>
          ) : (
            <img
              src={getAvatarUrl(profile) || "/favicon.png"}
              alt="avatar"
              className={`w-28 h-28 ${isLabeler ? "rounded-md" : "rounded-full"} object-cover border-4 border-white dark:border-gray-950 bg-gray-300 dark:bg-gray-700`}
            />
          )}
        </div>

        <div className="absolute right-[16px] top-[170px] flex flex-row gap-2.5">
          <BiteButton targetdidorhandle={did} />
          {/* 
            todo: full follow and unfollow backfill (along with partial likes backfill, 
            just enough for it to be useful) 
            also delay the backfill to be on demand because it would be pretty intense
            also save it persistently
          */}
          <FollowButton targetdidorhandle={did} />
          <button
            className="rounded-full h-10 w-10 text-[15px] flex justify-center items-center bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
            onClick={(e) => {
              renderSnack({
                title: "Not Implemented Yet",
                description: "Sorry...",
                //button: { label: 'Try Again', onClick: () => console.log('whatever') },
              });
            }}
          >
            <IconMdiMoreHoriz />
          </button>
        </div>

        {/* Info Card */}
        <div className="mt-14 pb-2 px-4 text-gray-900 dark:text-gray-100">
          <div className="font-bold text-2xl">{displayName}</div>
          <div className="text-gray-500 dark:text-gray-400 text-base mb-3 flex flex-row gap-1">
            <Mutual targetdidorhandle={did} />
            {handle}
          </div>
          <div className="flex flex-row gap-2 text-md text-gray-500 dark:text-gray-400 mb-2">
            <Link to="/profile/$did/followers" params={{ did: did }}>
              {followercount && (
                <span className="mr-1 text-gray-900 dark:text-gray-200 font-medium">
                  {followercount}
                </span>
              )}
              Followers
            </Link>
            -
            <Link to="/profile/$did/follows" params={{ did: did }}>
              Follows
            </Link>
          </div>
          {!strictModerationLoading && description && (
            <div className="text-base leading-relaxed text-gray-800 dark:text-gray-300 mb-5 whitespace-pre-wrap break-words text-[15px]">
              {/* {description} */}
              <RichTextRenderer key={did} description={description} />
            </div>
          )}
          {/* <ModerationInner subject={post.author.did} /> */}
          {authorModLoading ?
            (
              <div className="flex flex-wrap flex-row gap-1">
                <div
                  className="text-xs bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded-full flex flex-row items-center gap-1"
                >
                  {/* <img
                                src={resolvedpfp || defaultpfp}
                                alt="avatar"
                                className={`rounded-full object-cover border border-gray-300 dark:border-gray-800 bg-gray-300 dark:bg-gray-600`}
                                style={{
                                  width: 12,
                                  height: 12,
                                }}
                              /> */}
                  <span className="font-medium">loading badges...</span>
                </div>
              </div>
            )
            :
            (
              <div className="flex flex-wrap flex-row gap-1">
                {/* authorLabels{JSON.stringify(authorLabels,null,2)} */}
                {informAuthorLabels.map((label, index) => (
                  <SmallAuthorLabelBadge label={label} key={label.cts + label.src + label.val} large />
                ))}
              </div>
            )
          }
        </div>
      </div>

      {/* this should not be rendered until its ready (the top profile layout is stable) */}
      {isReady ? (
        <ReusableTabRoute
          route={`Profile` + did}
          tabs={{
            ...(isLabeler
              ? {
                Labels: <LabelsTab did={did} labelerRecord={labelerRecord} />,
              }
              : {}),
            ...{
              Posts: <PostsTab did={did} />,
              Reposts: <RepostsTab did={did} />,
              Feeds: <FeedsTab did={did} />,
              Lists: <ListsTab did={did} />,
            },
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

export type ProfilePostsFilter = {
  posts: boolean;
  replies: boolean;
  mediaOnly: boolean;
};
export const defaultProfilePostsFilter: ProfilePostsFilter = {
  posts: true,
  replies: true,
  mediaOnly: false,
};

function ProfilePostsFilterChipBar({
  filters,
  toggle,
}: {
  filters: ProfilePostsFilter | null;
  toggle: (key: keyof ProfilePostsFilter) => void;
}) {
  const empty = !filters?.replies && !filters?.posts;
  const almostEmpty = !filters?.replies && filters?.posts;

  useEffect(() => {
    if (empty) {
      toggle("posts");
    }
  }, [empty, toggle]);

  return (
    <div className="flex flex-row flex-wrap gap-2 px-4 pt-4">
      <Chip
        state={filters?.posts ?? true}
        text="Posts"
        onClick={() => (almostEmpty ? null : toggle("posts"))}
      />
      <Chip
        state={filters?.replies ?? true}
        text="Replies"
        onClick={() => toggle("replies")}
      />
      <Chip
        state={filters?.mediaOnly ?? false}
        text="Media Only"
        onClick={() => toggle("mediaOnly")}
      />
    </div>
  );
}

function PostsTab({ did }: { did: string }) {
  // todo: this needs to be a (non-persisted is fine) atom to survive navigation
  const [filterses, setFilterses] = useAtom(profileChipsAtom);
  const filters = filterses?.[did];
  const setFilters = (obj: ProfilePostsFilter) => {
    setFilterses((prev) => {
      return {
        ...prev,
        [did]: obj,
      };
    });
  };
  useEffect(() => {
    if (!filters) {
      setFilters(defaultProfilePostsFilter);
    }
  });
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

  const toggle = (key: keyof ProfilePostsFilter) => {
    setFilterses((prev) => {
      const existing = prev[did] ?? {
        posts: false,
        replies: false,
        mediaOnly: false,
      }; // default

      return {
        ...prev,
        [did]: {
          ...existing,
          [key]: !existing[key], // safely negate
        },
      };
    });
  };

  return (
    <>
      {/* <div className="text-gray-500 dark:text-gray-400 text-lg font-semibold my-3 mx-4">
        Posts
      </div> */}
      <ProfilePostsFilterChipBar filters={filters} toggle={toggle} />
      <div>
        {posts.map((post) => (
          <UniversalPostRendererATURILoader
            key={post.uri}
            atUri={post.uri}
            feedviewpost={true}
            filterNoReplies={!filters?.replies}
            filterMustHaveMedia={filters?.mediaOnly}
            filterMustBeReply={!filters?.posts}
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

function LabelsTab({
  did,
  labelerRecord,
}: {
  did: string;
  labelerRecord?: ATPAPI.AppBskyLabelerService.Record;
}) {
  useReusableTabScrollRestore(`Profile` + did);
  const { agent } = useAuth();
  // const {
  //   data: identity,
  //   isLoading: isIdentityLoading,
  //   error: identityError,
  // } = useQueryIdentity(did);

  // const resolvedDid = did.startsWith("did:") ? did : identity?.did;

  const labelMap = new Map(
    labelerRecord?.policies?.labelValueDefinitions?.map((def) => {
      const locale = def.locales.find((l) => l.lang === "en") ?? def.locales[0];
      return [
        def.identifier,
        {
          name: locale?.name,
          description: locale?.description,
          blur: def.blurs,
          severity: def.severity,
          adultOnly: def.adultOnly,
          defaultSetting: def.defaultSetting,
        },
      ];
    })
  );

  return (
    <>
      <div className="text-gray-500 dark:text-gray-400 text-lg font-semibold my-3 mx-4">
        Labels
      </div>
      <div>
        {[...labelMap.entries()].map(([key, item]) => (
          <div
            key={key}
            className="border-gray-300 dark:border-gray-700 border-b px-4 py-4"
          >
            <div className="font-semibold text-lg">{item.name}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {item.description}
            </div>
            <div className="mt-1 text-xs text-gray-400">
              {item.blur && <span>Blur: {item.blur} </span>}
              {item.severity && <span>• Severity: {item.severity} </span>}
              {item.adultOnly && <span>• 18+ only</span>}
            </div>
          </div>
        ))}
      </div>

      {/* Loading and "Load More" states */}
      {!labelerRecord && (
        <div className="p-4 text-center text-gray-500">Loading labels...</div>
      )}
      {/* {!labelerRecord && (
        <div className="p-4 text-center text-gray-500">Loading more...</div>
      )} */}
      {/* {hasNextPage && !isFetchingNextPage && (
        <button
          onClick={() => fetchNextPage()}
          className="w-[calc(100%-2rem)] mx-4 my-4 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 font-semibold"
        >
          Load More Feeds
        </button>
      )}
      {feeds.length === 0 && !arePostsLoading && (
        <div className="p-4 text-center text-gray-500">No feeds found.</div>
      )} */}
    </>
  );
}

export function FeedItemRenderAturiLoader({
  aturi,
  listmode,
  disableBottomBorder,
  disablePropagation,
}: {
  aturi: string;
  listmode?: boolean;
  disableBottomBorder?: boolean;
  disablePropagation?: boolean;
}) {
  const { data: record } = useQueryArbitrary(aturi);

  if (!record) return;
  return (
    <FeedItemRender
      listmode={listmode}
      feed={record}
      disableBottomBorder={disableBottomBorder}
      disablePropagation={disablePropagation}
    />
  );
}

export function FeedItemRender({
  feed,
  listmode,
  disableBottomBorder,
  disablePropagation,
}: {
  feed: { uri: string; cid: string; value: any };
  listmode?: boolean;
  disableBottomBorder?: boolean;
  disablePropagation?: boolean;
}) {
  const name = listmode
    ? (feed.value?.name as string)
    : (feed.value?.displayName as string);
  const aturi = new ATPAPI.AtUri(feed.uri);
  const { data: identity } = useQueryIdentity(aturi.host);
  const resolvedDid = identity?.did;
  const [imgcdn] = useAtom(imgCDNAtom);

  function getAvatarThumbnailUrl(f: typeof feed) {
    const link = f?.value.avatar?.ref?.["$link"];
    if (!link || !resolvedDid) return null;
    return `https://${imgcdn}/img/avatar/plain/${resolvedDid}/${link}@jpeg`;
  }

  const { data: likes } = useQueryConstellation(
    // @ts-expect-error overloads sucks
    !listmode
      ? {
        target: feed.uri,
        method: "/links/count",
        collection: "app.bsky.feed.like",
        path: ".subject.uri",
      }
      : undefined
  );

  return (
    <Link
      className={`px-4 py-4 ${!disableBottomBorder && "border-b"} flex flex-col gap-1`}
      to="/profile/$did/feed/$rkey"
      params={{ did: aturi.host, rkey: aturi.rkey }}
      onClick={(e) => {
        e.stopPropagation();
      }}
    >
      <div className="flex flex-row gap-3">
        <div className="min-w-10 min-h-10">
          <img
            src={getAvatarThumbnailUrl(feed) || defaultpfp}
            className="h-10 w-10 rounded border"
          />
        </div>
        <div className="flex flex-col">
          <span className="">{name}</span>
          <span className=" text-sm px-1.5 py-0.5 text-gray-500 bg-gray-200 dark:text-gray-400 dark:bg-gray-800 rounded-lg flex flex-row items-center justify-center">
            {feed.value.did || aturi.rkey}
          </span>
        </div>
        <div className="flex-1" />
        {/* <div className="button bg-red-500 rounded-full min-w-[60px]" /> */}
      </div>
      <span className=" text-sm">{feed.value?.description}</span>
      {!listmode && (
        <span className=" text-sm dark:text-gray-400 text-gray-500">
          Liked by {((likes as unknown as any)?.total as number) || 0} users
        </span>
      )}
    </Link>
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
          return (
            <FeedItemRender listmode={true} feed={feed as any} key={feed.uri} />
          );
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
    data: likesData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: arePostsLoading,
  } = useInfiniteQueryAuthorFeed(
    resolvedDid,
    identity?.pds,
    "app.bsky.feed.like"
  );

  const likes = React.useMemo(
    () => likesData?.pages.flatMap((page) => page.records) ?? [],
    [likesData]
  );

  const { setFastState } = useFastSetLikesFromFeed();
  const seededRef = React.useRef(new Set<string>());

  useEffect(() => {
    for (const like of likes) {
      if (!seededRef.current.has(like.uri)) {
        seededRef.current.add(like.uri);
        const record = like.value as unknown as ATPAPI.AppBskyFeedLike.Record;
        setFastState(record.subject.uri, {
          target: record.subject.uri,
          uri: like.uri,
          cid: like.cid,
        });
      }
    }
  }, [likes, setFastState]);

  return (
    <>
      <div className="text-gray-500 dark:text-gray-400 text-lg font-semibold my-3 mx-4">
        Likes
      </div>
      <div>
        {likes.map((like) => {
          if (
            !like ||
            !like?.value ||
            !like?.value?.subject ||
            // @ts-expect-error blehhhhh
            !like?.value?.subject?.uri
          )
            return;
          const likeRecord =
            like.value as unknown as ATPAPI.AppBskyFeedLike.Record;
          return (
            <UniversalPostRendererATURILoader
              key={likeRecord.subject.uri}
              atUri={likeRecord.subject.uri}
              feedviewpost={true}
            />
          );
        })}
      </div>

      {/* Loading and "Load More" states */}
      {arePostsLoading && likes.length === 0 && (
        <div className="p-4 text-center text-gray-500">Loading likes...</div>
      )}
      {isFetchingNextPage && (
        <div className="p-4 text-center text-gray-500">Loading more...</div>
      )}
      {hasNextPage && !isFetchingNextPage && (
        <button
          onClick={() => fetchNextPage()}
          className="w-[calc(100%-2rem)] mx-4 my-4 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 font-semibold"
        >
          Load More Likes
        </button>
      )}
      {likes.length === 0 && !arePostsLoading && (
        <div className="p-4 text-center text-gray-500">No likes found.</div>
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
              className=" shrink-0 font-medium rounded-full h-10 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors px-4 py-2 text-[14px]"
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
              className=" shrink-0 font-medium rounded-full h-10 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors px-4 py-2 text-[14px]"
            >
              Unfollow
            </button>
          )}
        </>
      ) : (
        <button
          className=" shrink-0 font-medium rounded-full h-10 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors px-4 py-2 text-[14px]"
          onClick={(e) => {
            renderSnack({
              title: "Not Implemented Yet",
              description: "Sorry...",
              //button: { label: 'Try Again', onClick: () => console.log('whatever') },
            });
          }}
        >
          Edit Profile
        </button>
      )}
    </>
  );
}

export function BiteButton({
  targetdidorhandle,
}: {
  targetdidorhandle: string;
}) {
  const { agent } = useAuth();
  const { data: identity } = useQueryIdentity(targetdidorhandle);
  const [show] = useAtom(enableBitesAtom);

  if (!show) return;

  return (
    <>
      <button
        onClick={async (e) => {
          e.stopPropagation();
          await sendBite({
            agent: agent || undefined,
            targetDid: identity?.did,
          });
        }}
        className=" shrink-0 font-medium rounded-full h-10 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors px-4 py-2 text-[14px]"
      >
        Bite
      </button>
    </>
  );
}

async function sendBite({
  agent,
  targetDid,
}: {
  agent?: Agent;
  targetDid?: string;
}) {
  if (!agent?.did || !targetDid) {
    renderSnack({
      title: "Bite Failed",
      description: "You must be logged-in to bite someone.",
      //button: { label: 'Try Again', onClick: () => console.log('whatever') },
    });
    return;
  }
  const newRecord = {
    repo: agent.did,
    collection: "net.wafrn.feed.bite",
    rkey: TID.next().toString(),
    record: {
      $type: "net.wafrn.feed.bite",
      subject: "at://" + targetDid,
      createdAt: new Date().toISOString(),
    },
  };

  try {
    await agent.com.atproto.repo.createRecord(newRecord);
    renderSnack({
      title: "Bite Sent",
      description: "Your bite was delivered.",
      //button: { label: 'Undo', onClick: () => console.log('Undo clicked') },
    });
  } catch (err) {
    console.error("Bite failed:", err);
    renderSnack({
      title: "Bite Failed",
      description: "Your bite failed to be delivered.",
      //button: { label: 'Try Again', onClick: () => console.log('whatever') },
    });
  }
}

export function Mutual({ targetdidorhandle }: { targetdidorhandle: string }) {
  const { agent } = useAuth();
  const { data: identity } = useQueryIdentity(targetdidorhandle);

  const { uris: theyFollowYouRes } = useGetOneToOneState(
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

export function getLocaleLabel(hlvd?: HydratedLabelValueDefinition) {
  if (!hlvd) return undefined
  const userLang = "en"; 
  const locale = hlvd.locales.find((l) => l.lang === userLang) 
    || hlvd.locales.find((l) => l.lang === "en")
    || hlvd.locales[0];
    return locale
}