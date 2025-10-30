import { useInfiniteQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useAtom } from "jotai";
import React from "react";

import { Header } from "~/components/Header";
import { constellationURLAtom } from "~/utils/atoms";
import { useQueryIdentity, yknowIReallyHateThisButWhateverGuardedConstructConstellationInfiniteQueryLinks } from "~/utils/useQuery";

import {
  EmptyState,
  ErrorState,
  LoadingState,
  NotificationItem,
} from "../notifications";

export const Route = createFileRoute("/profile/$did/post/$rkey/reposted-by")({
  component: RouteComponent,
});

function RouteComponent() {
  const { did, rkey } = Route.useParams();
  const { data: identity } = useQueryIdentity(did);
  const atUri = identity?.did && rkey ? `at://${decodeURIComponent(identity.did)}/app.bsky.feed.post/${rkey}` : '';

  const [constellationurl] = useAtom(constellationURLAtom);
  const infinitequeryresults = useInfiniteQuery({
    ...yknowIReallyHateThisButWhateverGuardedConstructConstellationInfiniteQueryLinks(
      {
        constellation: constellationurl,
        method: "/links",
        target: atUri,
        collection: "app.bsky.feed.repost",
        path: ".subject.uri",
      }
    ),
    enabled: !!atUri,
  });

  const {
    data: infiniteRepostsData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
  } = infinitequeryresults;

  const repostsAturis = React.useMemo(() => {
    // Get all replies from the standard infinite query
    return (
      infiniteRepostsData?.pages.flatMap(
        (page) =>
          page?.linking_records.map(
            (r) => `at://${r.did}/${r.collection}/${r.rkey}`
          ) ?? []
      ) ?? []
    );
  }, [infiniteRepostsData]);

  return (
    <>
      <Header
        title={`Reposted By`}
        backButtonCallback={() => {
          if (window.history.length > 1) {
            window.history.back();
          } else {
            window.location.assign("/");
          }
        }}
      />

      <>
        {(() => {
          if (isLoading) return <LoadingState text="Loading reposts..." />;
          if (isError) return <ErrorState error={error} />;

          if (!repostsAturis?.length)
            return <EmptyState text="No reposts yet." />;
        })()}
      </>

      {repostsAturis.map((m) => (
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
