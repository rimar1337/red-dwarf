import { useQueryClient } from "@tanstack/react-query";
import * as React from "react";

//import { useInView } from "react-intersection-observer";
import { UniversalPostRendererATURILoader } from "~/components/UniversalPostRenderer";
import { useAuth } from "~/providers/UnifiedAuthProvider";
import {
  useInfiniteQueryFeedSkeleton,
  // useQueryArbitrary,
  // useQueryIdentity,
} from "~/utils/useQuery";

interface InfiniteCustomFeedProps {
  feedUri: string;
  pdsUrl?: string;
  feedServiceDid?: string;
  authedOverride?: boolean;
  unauthedfeedurl?: string;
}

export function InfiniteCustomFeed({
  feedUri,
  pdsUrl,
  feedServiceDid,
  authedOverride,
  unauthedfeedurl,
}: InfiniteCustomFeedProps) {
  const { agent } = useAuth();
  const authed = authedOverride || !!agent?.did;

  // const identityresultmaybe = useQueryIdentity(agent?.did);
  // const identity = identityresultmaybe?.data;
  // const feedGenGetRecordQuery = useQueryArbitrary(feedUri);

  const {
    data,
    error,
    isLoading,
    isError,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
    refetch,
    isRefetching,
    queryKey,
  } = useInfiniteQueryFeedSkeleton({
    feedUri: feedUri,
    agent: agent ?? undefined,
    isAuthed: authed ?? false,
    pdsUrl: pdsUrl,
    feedServiceDid: feedServiceDid,
    unauthedfeedurl: unauthedfeedurl,
  });
  const queryClient = useQueryClient();

  const handleRefresh = () => {
    queryClient.removeQueries({ queryKey: queryKey });
    //queryClient.invalidateQueries(["infinite-feed", feedUri] as const);
    refetch();
  };

  const allPosts = React.useMemo(() => {
    const flattenedPosts = data?.pages.flatMap((page) => page?.feed) ?? [];

    const seenUris = new Set<string>();

    return flattenedPosts.filter((item) => {
      if (!item?.post) return false;

      if (seenUris.has(item.post)) {
        return false;
      }

      seenUris.add(item.post);

      return true;
    });
  }, [data]);

  //const { ref, inView } = useInView();

  // React.useEffect(() => {
  //   if (inView && hasNextPage && !isFetchingNextPage) {
  //     fetchNextPage();
  //   }
  // }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (isLoading) {
    return <div className="p-4 text-center text-gray-500">Loading feed...</div>;
  }

  if (isError) {
    return (
      <div className="p-4 text-center text-red-500">Error: {error.message}</div>
    );
  }

  // const allPosts =
  //   data?.pages.flatMap((page) => {
  //     if (page) return page.feed;
  //   }) ?? [];

  if (!allPosts || typeof allPosts !== "object" || allPosts.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        No posts in this feed.
      </div>
    );
  }

  return (
    <>
      {allPosts.map((item, i) => {
        if (item)
          return (
            <UniversalPostRendererATURILoader
              key={item.post || i}
              atUri={item.post}
              feedviewpost={true}
              repostedby={!!item.reason?.$type && (item.reason as any)?.repost}
            />
          );
      })}
      {/* allPosts?: {allPosts ? "true" : "false"}
      hasNextPage?: {hasNextPage ? "true" : "false"}
      isFetchingNextPage?: {isFetchingNextPage ? "true" : "false"} */}
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
      {!hasNextPage && (
        <div className="p-4 text-center text-gray-500">End of feed.</div>
      )}
      <button
        onClick={handleRefresh}
        disabled={isRefetching}
        className="sticky lg:bottom-4 bottom-22 ml-4 w-[42px] h-[42px] z-10 bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-50 p-[9px] rounded-full shadow-lg transition-transform duration-200 ease-in-out hover:scale-110 disabled:dark:bg-gray-900 disabled:bg-gray-100 disabled:cursor-not-allowed"
        aria-label="Refresh feed"
      >
        <RefreshIcon
          className={`h-6 w-6 text-gray-600 dark:text-gray-400 ${isRefetching && "animate-spin"}`}
        />
      </button>
    </>
  );
}

const RefreshIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    //width={360}
    //height={360}
    viewBox="0 0 24 24"
    {...props}
  >
    <path
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M20 11A8.1 8.1 0 0 0 4.5 9M4 5v4h4m-4 4a8.1 8.1 0 0 0 15.5 2m.5 4v-4h-4"
    ></path>
  </svg>
);
