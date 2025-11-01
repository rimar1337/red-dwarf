import * as ATPAPI from "@atproto/api"
import { createFileRoute } from '@tanstack/react-router'
import React from 'react';

import { Header } from '~/components/Header';
import { useReusableTabScrollRestore } from '~/components/ReusableTabRoute';
import { useInfiniteQueryAuthorFeed, useQueryIdentity } from '~/utils/useQuery';

import { EmptyState, ErrorState, LoadingState, NotificationItem } from '../notifications';

export const Route = createFileRoute('/profile/$did/follows')({
  component: RouteComponent,
})

// todo: scroll restoration
function RouteComponent() {
  const params = Route.useParams();
  return (
    <div>
      <Header
        title={"Follows"}
        backButtonCallback={() => {
          if (window.history.length > 1) {
            window.history.back();
          } else {
            window.location.assign("/");
          }
        }}
      />
      <Follows did={params.did}/>
    </div>
  );
}

function Follows({did}:{did:string}) {
  const {data: identity} = useQueryIdentity(did);
  const infinitequeryresults = useInfiniteQueryAuthorFeed(identity?.did, identity?.pds, "app.bsky.graph.follow");

  const {
    data: infiniteFollowsData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
  } = infinitequeryresults;

  const followsAturis = React.useMemo(
    () => infiniteFollowsData?.pages.flatMap((page) => page.records) ?? [],
    [infiniteFollowsData]
  );

  useReusableTabScrollRestore("Notifications");

  if (isLoading) return <LoadingState text="Loading follows..." />;
  if (isError) return <ErrorState error={error} />;

  if (!followsAturis?.length) return <EmptyState text="No follows yet." />;

  return (
    <>
      {followsAturis.map((m) => {
        const record = m.value as unknown as ATPAPI.AppBskyGraphFollow.Record;
        return <NotificationItem key={record.subject} notification={record.subject} />
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
    </>
  );
}