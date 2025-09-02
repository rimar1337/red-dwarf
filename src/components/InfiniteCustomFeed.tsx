import * as React from "react";
//import { useInView } from "react-intersection-observer";
import { UniversalPostRendererATURILoader } from "~/components/UniversalPostRenderer";
import { useAuth } from "~/providers/PassAuthProvider";
import {
  useQueryArbitrary,
  useQueryIdentity,
  useInfiniteQueryFeedSkeleton,
} from "~/utils/useQuery";

interface InfiniteCustomFeedProps {
  feedUri: string;
  pdsUrl?: string;
  feedServiceDid?: string;
}

export function InfiniteCustomFeed({
  feedUri,
  pdsUrl,
  feedServiceDid,
}: InfiniteCustomFeedProps) {
  const { agent, authed } = useAuth();

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
  } = useInfiniteQueryFeedSkeleton({
    feedUri: feedUri,
    agent: agent ?? undefined,
    isAuthed: authed ?? false,
    pdsUrl: pdsUrl,
    feedServiceDid: feedServiceDid,
  });

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

  const allPosts =
    data?.pages.flatMap((page) => {
      if (page) return page.feed;
    }) ?? [];

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
      {!hasNextPage && <div className="p-4 text-center text-gray-500">End of feed.</div>}
    </>
  );
}