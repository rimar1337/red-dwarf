import { AtUri } from "@atproto/api";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useAtom } from "jotai";
import * as React from "react";
import { useEffect, useLayoutEffect } from "react";

import defaultpfp from "~/../public/favicon.png";
import { Header } from "~/components/Header";
import {
  MdiCardsHeartOutline,
  MdiCommentOutline,
  MdiRepeat,
  UniversalPostRendererATURILoader,
} from "~/components/UniversalPostRenderer";
import { useAuth } from "~/providers/UnifiedAuthProvider";
import {
  constellationURLAtom,
  imgCDNAtom,
  isAtTopAtom,
  notificationsScrollAtom,
} from "~/utils/atoms";
import {
  useInfiniteQueryAuthorFeed,
  useQueryConstellation,
  useQueryIdentity,
  useQueryProfile,
  yknowIReallyHateThisButWhateverGuardedConstructConstellationInfiniteQueryLinks,
} from "~/utils/useQuery";

import { FollowButton, Mutual } from "./profile.$did";

export function NotificationsComponent() {
  return (
    <div className="">
      <Header
        title={`Notifications`}
        backButtonCallback={() => {
          if (window.history.length > 1) {
            window.history.back();
          } else {
            window.location.assign("/");
          }
        }}
        bottomBorderDisabled={true}
      />
      <NotificationsTabs />
    </div>
  );
}

export const Route = createFileRoute("/notifications")({
  component: NotificationsComponent,
});

export default function NotificationsTabs() {
  const [notifState, setNotifState] = useAtom(notificationsScrollAtom);
  const activeTab = notifState.activeTab;
  const [isAtTop] = useAtom(isAtTopAtom);

  const handleValueChange = (newTab: string) => {
    console.log(newTab);
    setNotifState((prev) => {
      const wow = {
        ...prev,
        scrollPositions: {
          ...prev.scrollPositions,
          [prev.activeTab]: window.scrollY,
        },
        activeTab: newTab,
      };
      //console.log(wow);
      return wow;
    });
  };

  useLayoutEffect(() => {
    return () => {
      setNotifState((prev) => {
        const wow = {
          ...prev,
          scrollPositions: {
            ...prev.scrollPositions,
            [activeTab]: window.scrollY,
          },
        };
        //console.log(wow);
        return wow;
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <TabsPrimitive.Root
      value={activeTab}
      onValueChange={handleValueChange}
      className={`w-full`}
    >
      <TabsPrimitive.List
        className={`flex sticky top-[52px] bg-[var(--header-bg-light)] dark:bg-[var(--header-bg-dark)] z-[9] border-0 sm:border-b ${!isAtTop && "shadow-sm"} sm:shadow-none sm:dark:bg-gray-950 sm:bg-white border-gray-200 dark:border-gray-700`}
      >
        <TabsPrimitive.Trigger
          value="mentions"
          className="m3tab"
          // styling is in app.css
        >
          Mentions
        </TabsPrimitive.Trigger>
        <TabsPrimitive.Trigger value="follows" className="m3tab">
          Follows
        </TabsPrimitive.Trigger>
        <TabsPrimitive.Trigger value="postInteractions" className="m3tab">
          Post Interactions
        </TabsPrimitive.Trigger>
      </TabsPrimitive.List>

      <TabsPrimitive.Content value="mentions" className="flex-1">
        {activeTab === "mentions" && <MentionsTab />}
      </TabsPrimitive.Content>

      <TabsPrimitive.Content value="follows" className="flex-1">
        {activeTab === "follows" && <FollowsTab />}
      </TabsPrimitive.Content>

      <TabsPrimitive.Content value="postInteractions" className="flex-1">
        {activeTab === "postInteractions" && <PostInteractionsTab />}
      </TabsPrimitive.Content>
    </TabsPrimitive.Root>
  );
}

function MentionsTab() {
  const { agent } = useAuth();
  const [constellationurl] = useAtom(constellationURLAtom);
  const infinitequeryresults = useInfiniteQuery({
    ...yknowIReallyHateThisButWhateverGuardedConstructConstellationInfiniteQueryLinks(
      {
        constellation: constellationurl,
        method: "/links",
        target: agent?.did,
        collection: "app.bsky.feed.post",
        path: ".facets[app.bsky.richtext.facet].features[app.bsky.richtext.facet#mention].did",
      }
    ),
    enabled: !!agent?.did,
  });

  const {
    data: infiniteMentionsData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
  } = infinitequeryresults;

  const mentionsAturis = React.useMemo(() => {
    // Get all replies from the standard infinite query
    return (
      infiniteMentionsData?.pages.flatMap(
        (page) =>
          page?.linking_records.map(
            (r) => `at://${r.did}/${r.collection}/${r.rkey}`
          ) ?? []
      ) ?? []
    );
  }, [infiniteMentionsData]);

  const [notifState] = useAtom(notificationsScrollAtom);
  const activeTab = notifState.activeTab;
  useEffect(() => {
    const savedY = notifState.scrollPositions[activeTab] ?? 0;
    window.scrollTo(0, savedY);
  }, [activeTab, notifState.scrollPositions]);

  if (isLoading) return <LoadingState text="Loading mentions..." />;
  if (isError) return <ErrorState error={error} />;

  if (!mentionsAturis?.length) return <EmptyState text="No mentions yet." />;

  return (
    <>
      {mentionsAturis.map((m) => (
        <UniversalPostRendererATURILoader key={m} atUri={m} />
      ))}

      {hasNextPage && (
        <button
          onClick={() => fetchNextPage()}
          disabled={isFetchingNextPage}
          className="w-[calc(100%-2rem)] mx-4 my-4 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 font-semibold disabled:opacity-50"
        >
          {isFetchingNextPage ? "Loading..." : "Load More"}
        </button>
      )}
    </>
  );
}

function FollowsTab() {
  const { agent } = useAuth();
  const [constellationurl] = useAtom(constellationURLAtom);
  const infinitequeryresults = useInfiniteQuery({
    ...yknowIReallyHateThisButWhateverGuardedConstructConstellationInfiniteQueryLinks(
      {
        constellation: constellationurl,
        method: "/links",
        target: agent?.did,
        collection: "app.bsky.graph.follow",
        path: ".subject",
      }
    ),
    enabled: !!agent?.did,
  });

  const {
    data: infiniteFollowsData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
  } = infinitequeryresults;

  const followsAturis = React.useMemo(() => {
    // Get all replies from the standard infinite query
    return (
      infiniteFollowsData?.pages.flatMap(
        (page) =>
          page?.linking_records.map(
            (r) => `at://${r.did}/${r.collection}/${r.rkey}`
          ) ?? []
      ) ?? []
    );
  }, [infiniteFollowsData]);

  const [notifState] = useAtom(notificationsScrollAtom);
  const activeTab = notifState.activeTab;
  useEffect(() => {
    const savedY = notifState.scrollPositions[activeTab] ?? 0;
    window.scrollTo(0, savedY);
  }, [activeTab, notifState.scrollPositions]);

  if (isLoading) return <LoadingState text="Loading mentions..." />;
  if (isError) return <ErrorState error={error} />;

  if (!followsAturis?.length) return <EmptyState text="No mentions yet." />;

  return (
    <>
      {followsAturis.map((m) => (
        <NotificationItem key={m} notification={m} />
      ))}

      {hasNextPage && (
        <button
          onClick={() => fetchNextPage()}
          disabled={isFetchingNextPage}
          className="w-[calc(100%-2rem)] mx-4 my-4 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 font-semibold disabled:opacity-50"
        >
          {isFetchingNextPage ? "Loading..." : "Load More"}
        </button>
      )}
    </>
  );
}

function PostInteractionsTab() {
  const { agent } = useAuth();
  const { data: identity } = useQueryIdentity(agent?.did);
  const queryClient = useQueryClient();
  const {
    data: postsData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: arePostsLoading,
  } = useInfiniteQueryAuthorFeed(agent?.did, identity?.pds);

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

  const [notifState] = useAtom(notificationsScrollAtom);
  const activeTab = notifState.activeTab;
  useEffect(() => {
    const savedY = notifState.scrollPositions[activeTab] ?? 0;
    window.scrollTo(0, savedY);
  }, [activeTab, notifState.scrollPositions]);

  return (
    <>
      {posts.map((m) => (
        <PostInteractionsItem key={m.uri} uri={m.uri} />
      ))}

      {hasNextPage && (
        <button
          onClick={() => fetchNextPage()}
          disabled={isFetchingNextPage}
          className="w-[calc(100%-2rem)] mx-4 my-4 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 font-semibold disabled:opacity-50"
        >
          {isFetchingNextPage ? "Loading..." : "Load More"}
        </button>
      )}
    </>
  );
}

const ORDER: ("like" | "repost" | "reply" | "quote")[] = [
  "like",
  "repost",
  "reply",
  "quote",
];

function PostInteractionsItem({ uri }: { uri: string }) {
  const { data: links } = useQueryConstellation({
    method: "/links/all",
    target: uri,
  });

  const likes =
    links?.links?.["app.bsky.feed.like"]?.[".subject.uri"]?.records || 0;
  const replies =
    links?.links?.["app.bsky.feed.post"]?.[".reply.parent.uri"]?.records || 0;
  const reposts =
    links?.links?.["app.bsky.feed.repost"]?.[".subject.uri"]?.records || 0;
  const quotes1 =
    links?.links?.["app.bsky.feed.post"]?.[".embed.record.uri"]?.records || 0;
  const quotes2 =
    links?.links?.["app.bsky.feed.post"]?.[".embed.record.record.uri"]
      ?.records || 0;
  const quotes = quotes1 + quotes2;

  const all = likes + replies + reposts + quotes;

  return (
    <div className="flex flex-col">
      <div className="border rounded-xl mx-4 mt-4 overflow-hidden">
        <UniversalPostRendererATURILoader
          isQuote
          key={uri}
          atUri={uri}
          nopics={true}
          concise={true}
        />
        <div className="flex flex-col divide-x">
          <InteractionsButton
            key={likes}
            type={"like"}
            uri={uri}
            count={likes}
          />
          <InteractionsButton
            key={reposts}
            type={"repost"}
            uri={uri}
            count={reposts}
          />
          <InteractionsButton
            key={replies}
            type={"reply"}
            uri={uri}
            count={replies}
          />
          <InteractionsButton
            key={quotes}
            type={"quote"}
            uri={uri}
            count={quotes}
          />
          {!all && (
            <div className="text-center text-gray-500 dark:text-gray-400 pb-3 pt-2 border-t">
              No interactions yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InteractionsButton({
  type,
  uri,
  count,
}: {
  type: "reply" | "repost" | "like" | "quote";
  uri: string;
  count: number;
}) {
  if (!count) return <></>;
  const aturi = new AtUri(uri);
  return (
    <Link
      to={
        `/profile/$did/post/$rkey` +
        (type === "like"
          ? "/liked-by"
          : type === "repost"
            ? "/reposted-by"
            : type === "quote"
              ? "/quotes"
              : "")
      }
      params={{
        did: aturi.host,
        rkey: aturi.rkey,
      }}
      className="flex-1 border-t py-2 px-4 flex flex-row items-center gap-2 transition-colors hover:bg-gray-100 hover:dark:bg-gray-800"
    >
      {type === "like" ? (
        <MdiCardsHeartOutline height={22} width={22} />
      ) : type === "repost" ? (
        <MdiRepeat height={22} width={22} />
      ) : type === "reply" ? (
        <MdiCommentOutline height={22} width={22} />
      ) : type === "quote" ? (
        <IconMdiMessageReplyTextOutline
          height={22}
          width={22}
          className=" text-gray-400"
        />
      ) : (
        <></>
      )}
      {type}
      {/* bad grammar replys */}
      {count > 1 ? "s" : ""} <div className="flex-1" /> {count}
    </Link>
  );
}

export function NotificationItem({ notification }: { notification: string }) {
  const aturi = new AtUri(notification);
  const navigate = useNavigate();
  const { data: identity } = useQueryIdentity(aturi.host);
  const resolvedDid = identity?.did;
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

  const avatar = getAvatarUrl(profile);

  return (
    <div
      className="flex items-center p-4 cursor-pointer gap-3 justify-around border-b flex-row"
      onClick={() =>
        aturi &&
        navigate({
          to: "/profile/$did",
          params: { did: aturi.host },
        })
      }
    >
      {/* <div>
        {aturi.collection === "app.bsky.graph.follow" ? (
          <IconMdiAccountPlus />
        ) : aturi.collection === "app.bsky.feed.like" ? (
          <MdiCardsHeart />
        ) : (
          <></>
        )}
      </div> */}
      {profile ? (
        <img
          src={avatar || defaultpfp}
          alt={identity?.handle}
          className="w-10 h-10 rounded-full"
        />
      ) : (
        <div className="w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-700" />
      )}
      <div className="flex flex-col min-w-0">
        <div className="flex flex-row gap-2 overflow-hidden text-ellipsis whitespace-nowrap min-w-0">
          <span className="font-medium text-gray-900 dark:text-gray-100 truncate">
            {profile?.displayName || identity?.handle || "Someone"}
          </span>
          <span className="text-gray-700 dark:text-gray-400 truncate">
            @{identity?.handle}
          </span>
        </div>
        <div className="flex flex-row gap-2">
          {identity?.did && <Mutual targetdidorhandle={identity?.did} />}
          {/* <span className="text-sm text-gray-600 dark:text-gray-400">
            followed you
          </span> */}
        </div>
      </div>
      <div className="flex-1" />
      {identity?.did && <FollowButton targetdidorhandle={identity?.did} />}
    </div>
  );
}

export const EmptyState = ({ text }: { text: string }) => (
  <div className="py-10 text-center text-gray-500 dark:text-gray-400">
    {text}
  </div>
);

export const LoadingState = ({ text }: { text: string }) => (
  <div className="py-10 text-center text-gray-500 dark:text-gray-400 italic">
    {text}
  </div>
);

export const ErrorState = ({ error }: { error: unknown }) => (
  <div className="py-10 text-center text-red-600 dark:text-red-400">
    Error: {(error as Error)?.message || "Something went wrong."}
  </div>
);
