import { useInfiniteQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useAtom } from "jotai";
import React from "react";

import { Header } from "~/components/Header";
import { UniversalPostRendererATURILoader } from "~/components/UniversalPostRenderer";
import { constellationURLAtom } from "~/utils/atoms";
import {
  type linksRecord,
  useQueryIdentity,
  yknowIReallyHateThisButWhateverGuardedConstructConstellationInfiniteQueryLinks,
} from "~/utils/useQuery";

import { EmptyState, ErrorState, LoadingState } from "../notifications";

export const Route = createFileRoute("/profile/$did/post/$rkey/quotes")({
  component: RouteComponent,
});

function RouteComponent() {
  const { did, rkey } = Route.useParams();
  const { data: identity } = useQueryIdentity(did);
  const atUri =
    identity?.did && rkey
      ? `at://${decodeURIComponent(identity.did)}/app.bsky.feed.post/${rkey}`
      : "";

  const [constellationurl] = useAtom(constellationURLAtom);
  const infinitequeryresultsWithoutMedia = useInfiniteQuery({
    ...yknowIReallyHateThisButWhateverGuardedConstructConstellationInfiniteQueryLinks(
      {
        constellation: constellationurl,
        method: "/links",
        target: atUri,
        collection: "app.bsky.feed.post",
        path: ".embed.record.uri", // embed.record.record.uri and embed.record.uri
      },
    ),
    enabled: !!atUri,
  });
  const infinitequeryresultsWithMedia = useInfiniteQuery({
    ...yknowIReallyHateThisButWhateverGuardedConstructConstellationInfiniteQueryLinks(
      {
        constellation: constellationurl,
        method: "/links",
        target: atUri,
        collection: "app.bsky.feed.post",
        path: ".embed.record.record.uri", // embed.record.record.uri and embed.record.uri
      },
    ),
    enabled: !!atUri,
  });

  const {
    data: infiniteQuotesDataWithoutMedia,
    fetchNextPage: fetchNextPageWithoutMedia,
    hasNextPage: hasNextPageWithoutMedia,
    isFetchingNextPage: isFetchingNextPageWithoutMedia,
    isLoading: isLoadingWithoutMedia,
    isError: isErrorWithoutMedia,
    error: errorWithoutMedia,
  } = infinitequeryresultsWithoutMedia;
  const {
    data: infiniteQuotesDataWithMedia,
    fetchNextPage: fetchNextPageWithMedia,
    hasNextPage: hasNextPageWithMedia,
    isFetchingNextPage: isFetchingNextPageWithMedia,
    isLoading: isLoadingWithMedia,
    isError: isErrorWithMedia,
    error: errorWithMedia,
  } = infinitequeryresultsWithMedia;

  const fetchNextPage = async () => {
    await Promise.all([
      hasNextPageWithMedia && fetchNextPageWithMedia(),
      hasNextPageWithoutMedia && fetchNextPageWithoutMedia(),
    ]);
  };

  const hasNextPage = hasNextPageWithMedia || hasNextPageWithoutMedia;
  const isFetchingNextPage =
    isFetchingNextPageWithMedia || isFetchingNextPageWithoutMedia;
  const isLoading = isLoadingWithMedia || isLoadingWithoutMedia;

  const allQuotes = React.useMemo(() => {
    const withPages = infiniteQuotesDataWithMedia?.pages ?? [];
    const withoutPages = infiniteQuotesDataWithoutMedia?.pages ?? [];
    const maxLen = Math.max(withPages.length, withoutPages.length);
    const merged: linksRecord[] = [];

    for (let i = 0; i < maxLen; i++) {
      const a = withPages[i]?.linking_records ?? [];
      const b = withoutPages[i]?.linking_records ?? [];
      const mergedPage = [...a, ...b].sort((b, a) =>
        a.rkey.localeCompare(b.rkey),
      );
      merged.push(...mergedPage);
    }

    return merged;
  }, [
    infiniteQuotesDataWithMedia?.pages,
    infiniteQuotesDataWithoutMedia?.pages,
  ]);

  const quotesAturis = React.useMemo(() => {
    return allQuotes.flatMap((r) => `at://${r.did}/${r.collection}/${r.rkey}`);
  }, [allQuotes]);

  return (
    <>
      <Header
        title={`Quotes`}
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
          if (isLoading) return <LoadingState text="Loading quotes..." />;
          if (isErrorWithMedia) return <ErrorState error={errorWithMedia} />;
          if (isErrorWithoutMedia)
            return <ErrorState error={errorWithoutMedia} />;

          if (!quotesAturis?.length)
            return <EmptyState text="No quotes yet." />;
        })()}
      </>

      {quotesAturis.map((m) => (
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
