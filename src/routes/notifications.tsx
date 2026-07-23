import { AtUri } from "@atproto/api";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useAtom } from "jotai";
import { Switch } from "radix-ui";
import * as React from "react";

import { FORCED_LABELER_DIDS } from "~/../policy";
import defaultpfp from "~/../public/defaultpfp.png";
import { Header } from "~/components/Header";
import {
  ReusableTabRoute,
  useReusableTabScrollRestore,
} from "~/components/ReusableTabRoute";
import { UniversalPostRendererATURILoader } from "~/components/UniversalPostRenderer";
import { useAuth } from "~/providers/UnifiedAuthProvider";
import {
  constellationURLAtom,
  disabledLabelersAtom,
  enableBitesAtom,
  imgCDNAtom,
  postInteractionsFiltersAtom,
} from "~/utils/atoms";
import {
  useInfiniteQueryAuthorFeed,
  useQueryConstellation,
  useQueryIdentity,
  useQueryProfile,
  yknowIReallyHateThisButWhateverGuardedConstructConstellationInfiniteQueryLinks,
} from "~/utils/useQuery";

import { renderSnack } from "./__root";
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
  const [bitesEnabled] = useAtom(enableBitesAtom);
  return (
    <ReusableTabRoute
      route={`Notifications`}
      tabs={{
        Mentions: <MentionsTab />,
        Follows: <FollowsTab />,
        "Post Interactions": <PostInteractionsTab />,
        ...(bitesEnabled
          ? {
              Bites: <BitesTab />,
            }
          : {}),
      }}
    />
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
      },
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
            (r) => `at://${r.did}/${r.collection}/${r.rkey}`,
          ) ?? [],
      ) ?? []
    );
  }, [infiniteMentionsData]);

  useReusableTabScrollRestore("Notifications");

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

export function FollowsTab({ did }: { did?: string }) {
  const { agent } = useAuth();
  const userdidunsafe = did ?? agent?.did;
  const { data: identity } = useQueryIdentity(userdidunsafe);
  const userdid = identity?.did;

  const [constellationurl] = useAtom(constellationURLAtom);
  const infinitequeryresults = useInfiniteQuery({
    ...yknowIReallyHateThisButWhateverGuardedConstructConstellationInfiniteQueryLinks(
      {
        constellation: constellationurl,
        method: "/links",
        target: userdid,
        collection: "app.bsky.graph.follow",
        path: ".subject",
      },
    ),
    enabled: !!userdid,
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
            (r) => `at://${r.did}/${r.collection}/${r.rkey}`,
          ) ?? [],
      ) ?? []
    );
  }, [infiniteFollowsData]);

  useReusableTabScrollRestore("Notifications");

  if (isLoading) return <LoadingState text="Loading follows..." />;
  if (isError) return <ErrorState error={error} />;

  if (!followsAturis?.length) return <EmptyState text="No follows yet." />;

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

export function BitesTab({ did }: { did?: string }) {
  const { agent } = useAuth();
  const userdidunsafe = did ?? agent?.did;
  const { data: identity } = useQueryIdentity(userdidunsafe);
  const userdid = identity?.did;

  const [constellationurl] = useAtom(constellationURLAtom);
  const infinitequeryresults = useInfiniteQuery({
    ...yknowIReallyHateThisButWhateverGuardedConstructConstellationInfiniteQueryLinks(
      {
        constellation: constellationurl,
        method: "/links",
        target: "at://" + userdid,
        collection: "net.wafrn.feed.bite",
        path: ".subject",
        staleMult: 0, // safe fun
      },
    ),
    enabled: !!userdid,
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
            (r) => `at://${r.did}/${r.collection}/${r.rkey}`,
          ) ?? [],
      ) ?? []
    );
  }, [infiniteFollowsData]);

  useReusableTabScrollRestore("Notifications");

  if (isLoading) return <LoadingState text="Loading bites..." />;
  if (isError) return <ErrorState error={error} />;

  if (!followsAturis?.length) return <EmptyState text="No bites yet." />;

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
    [postsData],
  );

  useReusableTabScrollRestore("Notifications");

  const [filters] = useAtom(postInteractionsFiltersAtom);
  const empty =
    !filters.likes && !filters.quotes && !filters.replies && !filters.reposts;

  return (
    <>
      <PostInteractionsFilterChipBar />
      {!empty &&
        posts.map((m) => <PostInteractionsItem key={m.uri} uri={m.uri} />)}

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

function PostInteractionsFilterChipBar() {
  const [filters, setFilters] = useAtom(postInteractionsFiltersAtom);
  // const empty = (!filters.likes && !filters.quotes && !filters.replies && !filters.reposts);

  // useEffect(() => {
  //   if (empty) {
  //     setFilters((prev) => ({
  //       ...prev,
  //       likes: true,
  //     }));
  //   }
  // }, [
  //   empty,
  //   setFilters,
  // ]);

  const toggle = (key: keyof typeof filters) => {
    setFilters((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  return (
    <div className="flex flex-row flex-wrap gap-2 px-4 pt-4">
      <Chip
        state={filters.likes}
        text="Likes"
        onClick={() => toggle("likes")}
      />
      <Chip
        state={filters.reposts}
        text="Reposts"
        onClick={() => toggle("reposts")}
      />
      <Chip
        state={filters.replies}
        text="Replies"
        onClick={() => toggle("replies")}
      />
      <Chip
        state={filters.quotes}
        text="Quotes"
        onClick={() => toggle("quotes")}
      />
      <Chip
        state={filters.showAll}
        text="Show All Metrics"
        onClick={() => toggle("showAll")}
      />
    </div>
  );
}

export function Chip({
  state,
  text,
  onClick,
}: {
  state: boolean;
  text: string;
  onClick: React.MouseEventHandler<HTMLButtonElement>;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium transition-all
        ${
          state
            ? "bg-primary/20 text-primary bg-gray-200 dark:bg-gray-800 border border-transparent"
            : "bg-surface-container-low text-on-surface-variant border border-outline"
        }
        hover:bg-primary/30 active:scale-[0.97]
        dark:border-outline-variant
      `}
    >
      {state && (
        <IconMdiCheck
          className="mr-1.5 inline-block w-4 h-4 rounded-full bg-primary"
          aria-hidden
        />
      )}
      {text}
    </button>
  );
}

function PostInteractionsItem({ uri }: { uri: string }) {
  const [filters] = useAtom(postInteractionsFiltersAtom);
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

  //const failLikes = filters.likes && likes < 1;
  //const failReposts = filters.reposts && reposts < 1;
  //const failReplies = filters.replies && replies < 1;
  //const failQuotes = filters.quotes && quotes < 1;

  const showLikes = filters.showAll || filters.likes;
  const showReposts = filters.showAll || filters.reposts;
  const showReplies = filters.showAll || filters.replies;
  const showQuotes = filters.showAll || filters.quotes;

  //const showNone = !showLikes && !showReposts && !showReplies && !showQuotes;

  //const fail = failLikes || failReposts || failReplies || failQuotes || showNone;

  const matchesLikes = filters.likes && likes > 0;
  const matchesReposts = filters.reposts && reposts > 0;
  const matchesReplies = filters.replies && replies > 0;
  const matchesQuotes = filters.quotes && quotes > 0;

  const matchesAnything =
    // filters.showAll ||
    matchesLikes || matchesReposts || matchesReplies || matchesQuotes;

  if (!matchesAnything) return null;

  //if (fail) return;

  return (
    <div className="flex flex-col">
      {/* <span>fail likes {failLikes ? "true" : "false"}</span>
      <span>fail repost {failReposts ? "true" : "false"}</span>
      <span>fail reply {failReplies ? "true" : "false"}</span>
      <span>fail qupte {failQuotes ? "true" : "false"}</span> */}
      <div className="border rounded-xl mx-4 mt-4 overflow-hidden">
        <UniversalPostRendererATURILoader
          isQuote
          key={uri}
          atUri={uri}
          nopics={true}
          concise={true}
        />
        <div className="flex flex-col divide-x">
          {showLikes && (
            <InteractionsButton type={"like"} uri={uri} count={likes} />
          )}
          {showReposts && (
            <InteractionsButton type={"repost"} uri={uri} count={reposts} />
          )}
          {showReplies && (
            <InteractionsButton type={"reply"} uri={uri} count={replies} />
          )}
          {showQuotes && (
            <InteractionsButton type={"quote"} uri={uri} count={quotes} />
          )}
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
        <IconMdiCardsHeartOutline height={22} width={22} />
      ) : type === "repost" ? (
        <IconMdiRepeat height={22} width={22} />
      ) : type === "reply" ? (
        <IconMdiCommentOutline height={22} width={22} />
      ) : type === "quote" ? (
        <IconMdiMessageReplyTextOutline
          height={22}
          width={22}
          className=" text-gray-400"
        />
      ) : (
        <></>
      )}
      {type === "like"
        ? "likes"
        : type === "reply"
          ? "replies"
          : type === "quote"
            ? "quotes"
            : type === "repost"
              ? "reposts"
              : ""}
      <div className="flex-1" /> {count}
    </Link>
  );
}

export function NotificationItem({
  notification,
  labeler,
  blocking = undefined,
  disablefollow = false,
  labelererror,
}: {
  notification: string;
  labeler?: boolean | string;
  blocking?: "unblock" | "blocked";
  disablefollow?: boolean;
  labelererror?: string;
}) {
  const aturi = new AtUri(notification);
  const bite = aturi.collection === "net.wafrn.feed.bite";
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
      className={`flex items-center p-4 ${blocking ? "" : "cursor-pointer"} gap-3 justify-around border-b flex-row`}
      onClick={() =>
        aturi &&
        !labelererror &&
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
        labeler && !avatar ? (
          <div
            className={`w-10 h-10 shrink-0 rounded-md items-center justify-center flex object-cover border-1 border-white dark:border-gray-950 bg-gray-300 dark:bg-gray-700`}
          >
            <IconMdiShieldOutline className="w-6 h-6" />
          </div>
        ) : (
          <img
            src={avatar || defaultpfp}
            alt={identity?.handle}
            className={`w-10 h-10 shrink-0 ${labeler ? "rounded-md" : "rounded-full"}`}
          />
        )
      ) : (
        <div className="w-10 h-10 shrink-0 rounded-full bg-gray-300 dark:bg-gray-700" />
      )}
      <div className="flex flex-col min-w-0">
        <div
          className={`flex ${labelererror ? "flex-col gap-1 " : "flex-row gap-2"} overflow-hidden text-ellipsis whitespace-nowrap min-w-0 truncate`}
        >
          <span className="font-medium text-gray-900 dark:text-gray-100 truncate min-w-0">
            {profile?.displayName ||
              identity?.handle ||
              identity?.did ||
              aturi.host}
          </span>
          <span className="text-gray-700 dark:text-gray-400 truncate min-w-0">
            {identity?.handle
              ? "@" + identity.handle
              : identity?.did || aturi.host}
          </span>
          {labelererror && (
            <span className="text-gray-700 dark:text-gray-400 truncate min-w-0">
              error: {labelererror}
            </span>
          )}
        </div>
        <div className="flex flex-row gap-2">
          {identity?.did && <Mutual targetdidorhandle={identity?.did} />}
          {/* <span className="text-sm text-gray-600 dark:text-gray-400">
            followed you
          </span> */}
        </div>
      </div>
      <div className="flex-1" />
      {!disablefollow && !blocking && identity?.did && !labeler && (
        <FollowButton targetdidorhandle={identity?.did} />
      )}
      {blocking === "blocked" && (
        <div className="flex items-center shrink-0 font-medium rounded-md h-8 bg-gray-200 dark:bg-gray-700 px-3 py-2 text-[14px]">
          Blocking You
        </div>
      )}
      {typeof labeler === "string" && (
        <div className="flex items-center shrink-0 font-medium rounded-md h-8 bg-gray-200 dark:bg-gray-700 px-3 py-2 text-[14px]">
          {labeler}
        </div>
      )}
      {blocking === "unblock" && (
        <button
          onClick={() => {
            renderSnack({
              title: "Sorry... Unblocking is not implemented yet",
              description: "You can use another app to unblock",
              //button: { label: 'Try Again', onClick: () => console.log('whatever') },
            });
          }}
          className="group relative flex items-center justify-center shrink-0 font-medium rounded-full h-10 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors px-4 text-[14px] hover:cursor-pointer"
        >
          {/* invisible spacer */}
          <span className="invisible">Blocked by You</span>

          {/* visible */}
          <span className="absolute opacity-100 group-hover:opacity-0 transition-opacity">
            Blocked by You
          </span>
          <span className="absolute opacity-0 group-hover:opacity-100 transition-opacity">
            Unblock
          </span>
        </button>
      )}
      {labeler && !disablefollow && (
        <LabelerToggleLocalEnablementButton
          labeler={identity?.did || aturi.host}
        />
      )}
    </div>
  );
}

export function LabelerToggleLocalEnablementButton({
  labeler,
}: {
  labeler: string;
}) {
  const [disabledLabelers, setDisabledLabelers] = useAtom(disabledLabelersAtom);
  const labelerEnabledState = !disabledLabelers.includes(labeler);
  const isMandatory = FORCED_LABELER_DIDS.includes(labeler);

  function toggleLocalLabelerEnabledState() {
    if (labeler) {
      if (labelerEnabledState) {
        console.log("button clicked disabled it");
        setDisabledLabelers([...disabledLabelers, labeler]);
      } else {
        console.log("button clicked enabled it");
        setDisabledLabelers(disabledLabelers.filter((v) => v !== labeler));
      }
    }
  }

  if (isMandatory) {
    return (
      <>
        <span className=" shrink-0 font-medium relative inline-flex items-center rounded-lg text-sm px-3 py-1.5 bg-gray-300 dark:bg-gray-600 border border-outline dark:border-outline-variant">
          mandated by host
        </span>
      </>
      /**
       * relative inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium transition-all
          bg-surface-container-low text-on-surface-variant border border-outline
          hover:bg-primary/30 active:scale-[0.97]
          dark:border-outline-variant
        
       */
    );
  }

  return (
    <Switch.Root
      id={`switch-${"hardcoded"}`}
      checked={labelerEnabledState}
      onClick={(e) => {
        e.stopPropagation();
        toggleLocalLabelerEnabledState();
      }}
      onCheckedChange={() => {
        // e.stopPropagation();
        // toggleLocalLabelerEnabledState();
      }}
      className="m3switch root shrink-0"
    >
      <Switch.Thumb className="m3switch thumb " />
    </Switch.Root>
    // <button
    //   onClick={(e) => {
    //     e.stopPropagation();
    //     toggleLocalLabelerEnabledState();
    //   }}
    //   className=" font-medium rounded-full h-10 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors px-4 py-2 text-[14px]"
    // >
    //   {labelerEnabledState ? "Enabled" : "Disabled"}
    // </button>
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
