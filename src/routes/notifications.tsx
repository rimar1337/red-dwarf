import { AtUri } from "@atproto/api";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAtom } from "jotai";
import * as React from "react";

import defaultpfp from "~/../public/favicon.png";
import { Header } from "~/components/Header";
import {
  MdiCardsHeartOutline,
  MdiCommentOutline,
  MdiRepeat,
  UniversalPostRendererATURILoader,
} from "~/components/UniversalPostRenderer";
import { useAuth } from "~/providers/UnifiedAuthProvider";
import { constellationURLAtom, imgCDNAtom, isAtTopAtom } from "~/utils/atoms";
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
  const [activeTab, setActiveTab] = React.useState("mentions");
  const [isAtTop] = useAtom(isAtTopAtom);

  const scrollPositions = React.useRef<Record<string, number>>({});

  const handleValueChange = (newTab: string) => {
    scrollPositions.current[activeTab] = window.scrollY;
    setActiveTab(newTab);
  };

  React.useEffect(() => {
    const savedY = scrollPositions.current[activeTab] ?? 0;
    window.scrollTo(0, savedY);
  }, [activeTab]);

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
          // styling is in app.css
        >
          Mentions
        </TabsPrimitive.Trigger>
        <TabsPrimitive.Trigger value="follows">Follows</TabsPrimitive.Trigger>
        <TabsPrimitive.Trigger value="postInteractions">
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

function PostInteractionsItem({ uri }: { uri: string }) {
  const { data: links } = useQueryConstellation({
    method: "/links/all",
    target: uri,
  });

  const interactions = React.useMemo(() => {
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

    const totals = {
      likes,
      replies,
      reposts,
      quotes: quotes1 + quotes2,
    };

    const list = (
      [
        ["reply", totals.replies],
        ["repost", totals.reposts],
        ["like", totals.likes],
        ["quote", totals.quotes],
      ] as const
    ).filter(([, count]) => count > 0);

    return { totals, list };
  }, [links]);

  return (
    <div className="flex flex-col border-b pb-8">
      <div className="border rounded-xl mx-4 mt-4 ">
        <UniversalPostRendererATURILoader
          isQuote
          key={uri}
          atUri={uri}
          nopics
        />
      </div>
      <div className="flex flex-col">
        {interactions.list.map(([type, count]) => (
          <InteractionsButton key={type} type={type} uri={uri} count={count} />
        ))}
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
  return (
    <div className="flex-1 border-t py-2 px-4 flex flex-row items-center gap-2">
      {type === "like" ? (
        <MdiCardsHeartOutline height={22} width={22} />
      ) : type === "repost" ? (
        <MdiRepeat height={22} width={22} />
      ) : type === "reply" ? (
        <MdiCommentOutline height={22} width={22} />
      ) : (
        <></>
      )}
      {type}
      {/* bad grammar replys */}
      {count > 1 ? "s" : ""} <div className="flex-1" /> {count}
    </div>
  );
}

function NotificationItem({ notification }: { notification: string }) {
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
      className="flex items-center gap-3 p-4 cursor-pointer border-b flex-row"
      onClick={() =>
        aturi &&
        navigate({
          to: "/profile/$did",
          params: { did: aturi.host },
        })
      }
    >
      <div>
        {aturi.collection === "app.bsky.graph.follow" ? (
          <IconMdiAccountPlus />
        ) : (
          <></>
        )}
      </div>
      {profile ? (
        <img
          src={avatar || defaultpfp}
          alt={identity?.handle}
          className="w-10 h-10 rounded-full"
        />
      ) : (
        <div className="w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-700" />
      )}
      <div className="flex flex-col">
        <div className="flex flex-row gap-2">
          <span className="font-medium text-gray-900 dark:text-gray-100">
            {profile?.displayName || identity?.handle || "Someone"}
          </span>
          <span className="text-gray-700 dark:text-gray-400">
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


const EmptyState = ({ text }: { text: string }) => (
  <div className="py-10 text-center text-gray-500 dark:text-gray-400">
    {text}
  </div>
);

const LoadingState = ({ text }: { text: string }) => (
  <div className="py-10 text-center text-gray-500 dark:text-gray-400 italic">
    {text}
  </div>
);

const ErrorState = ({ error }: { error: unknown }) => (
  <div className="py-10 text-center text-red-600 dark:text-red-400">
    Error: {(error as Error)?.message || "Something went wrong."}
  </div>
);