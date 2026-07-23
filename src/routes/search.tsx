import type { Agent } from "@atproto/api";
import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useAtom } from "jotai";
import { useEffect, useMemo } from "react";

import { HOST_TITLE } from "~/../policy";
import { Header } from "~/components/Header";
import { Import } from "~/components/Import";
import {
  ReusableTabRoute,
  useReusableTabScrollRestore,
} from "~/components/ReusableTabRoute";
import { UniversalPostRendererATURILoader } from "~/components/UniversalPostRenderer";
import { useAuth } from "~/providers/UnifiedAuthProvider";
import { lycanURLAtom } from "~/utils/atoms";
import {
  constructLycanRequestIndexQuery,
  useInfiniteQueryLycanSearch,
  useQueryIdentity,
  useQueryLycanStatus,
} from "~/utils/useQuery";

import { renderSnack } from "./__root";
import { SliderPrimitive } from "./settings";

export const Route = createFileRoute("/search")({
  component: Search,
});

export function Search() {
  const queryClient = useQueryClient();
  const { agent, status } = useAuth();
  const { data: identity } = useQueryIdentity(agent?.did);
  const [lycandomain] = useAtom(lycanURLAtom);
  const lycanExists = lycandomain !== "";
  const { data: lycanstatusdata, refetch } = useQueryLycanStatus();
  const lycanIndexed = lycanstatusdata?.status === "finished" || false;
  const lycanIndexing = lycanstatusdata?.status === "in_progress" || false;
  const lycanIndexingProgress = lycanIndexing
    ? lycanstatusdata?.progress
    : undefined;

  const authed = status === "signedIn";

  const lycanReady = lycanExists && lycanIndexed && authed;

  const { q }: { q: string } = useSearch({ from: "/search" });

  // auto-refetch Lycan status until ready
  useEffect(() => {
    if (!lycanExists || !authed) return;
    if (lycanReady) return;

    const interval = setInterval(() => {
      refetch();
    }, 3000);

    return () => clearInterval(interval);
  }, [lycanExists, authed, lycanReady, refetch]);

  const maintext = !lycanExists
    ? `Sorry we dont have search. But instead, you can load some of these types of content into ${HOST_TITLE}:`
    : authed
      ? lycanReady
        ? `Lycan Search is enabled and ready! Type to search posts you've interacted with in the past. You can also load some of these types of content into ${HOST_TITLE}:`
        : `Sorry, while Lycan Search is enabled, you are not indexed. Index below please. You can load some of these types of content into ${HOST_TITLE}:`
      : `Sorry, while Lycan Search is enabled, you are unauthed. Please log in to use Lycan. You can load some of these types of content into ${HOST_TITLE}:`;

  async function index(opts: {
    agent?: Agent;
    isAuthed: boolean;
    pdsUrl?: string;
    feedServiceDid?: string;
  }) {
    renderSnack({
      title: "Registering account...",
    });
    try {
      const response = await queryClient.fetchQuery(
        constructLycanRequestIndexQuery(opts),
      );
      if (
        response?.message !== "Import has already started" &&
        response?.message !== "Import has been scheduled"
      ) {
        renderSnack({
          title: "Registration failed!",
          description: "Unknown server error (2)",
        });
      } else {
        renderSnack({
          title: "Succesfully sent registration request!",
          description: "Please wait for the server to index your account",
        });
        refetch();
      }
    } catch {
      renderSnack({
        title: "Registration failed!",
        description: "Unknown server error (1)",
      });
    }
  }

  return (
    <>
      <Header
        title="Explore"
        backButtonCallback={() => {
          if (window.history.length > 1) {
            window.history.back();
          } else {
            window.location.assign("/");
          }
        }}
      />
      <div className=" flex flex-col items-center mt-4 mx-4 gap-4">
        <Import optionaltextstring={q} />
        <div className="flex flex-col">
          <p className="text-gray-600 dark:text-gray-400">{maintext}</p>
          <ul className="list-disc list-inside mt-2 text-gray-600 dark:text-gray-400">
            <li>
              Bluesky URLs (from supported clients) (like{" "}
              <code className="text-sm">bsky.app</code> or{" "}
              <code className="text-sm">deer.social</code>).
            </li>
            <li>
              AT-URIs (e.g.,{" "}
              <code className="text-sm">at://did:example/collection/item</code>
              ).
            </li>
            <li>
              User Handles (like{" "}
              <code className="text-sm">@username.bsky.social</code>).
            </li>
            <li>
              DIDs (Decentralized Identifiers, starting with{" "}
              <code className="text-sm">did:</code>).
            </li>
          </ul>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Simply paste one of these into the import field above and press
            Enter to load the content.
          </p>

          {lycanExists && authed && !lycanReady ? (
            !lycanIndexing ? (
              <div className="mt-4 mx-auto">
                <button
                  onClick={() =>
                    index({
                      agent: agent || undefined,
                      isAuthed: status === "signedIn",
                      pdsUrl: identity?.pds,
                      feedServiceDid: "did:web:" + lycandomain,
                    })
                  }
                  className="px-6 py-2 h-12 rounded-full bg-gray-100 dark:bg-gray-800 
                             text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition"
                >
                  Index my Account
                </button>
              </div>
            ) : (
              <div className="mt-4 gap-2 flex flex-col">
                <span>indexing...</span>
                <SliderPrimitive
                  value={lycanIndexingProgress || 0}
                  min={0}
                  max={1}
                />
              </div>
            )
          ) : (
            <></>
          )}
        </div>
      </div>
      {q ? <SearchTabs query={q} /> : <></>}
    </>
  );
}

function SearchTabs({ query }: { query: string }) {
  return (
    <div>
      <ReusableTabRoute
        route={`search` + query}
        tabs={{
          Likes: <LycanTab query={query} type={"likes"} key={"likes"} />,
          Reposts: <LycanTab query={query} type={"reposts"} key={"reposts"} />,
          Quotes: <LycanTab query={query} type={"quotes"} key={"quotes"} />,
          Pins: <LycanTab query={query} type={"pins"} key={"pins"} />,
        }}
      />
    </div>
  );
}

function LycanTab({
  query,
  type,
}: {
  query: string;
  type: "likes" | "pins" | "reposts" | "quotes";
}) {
  useReusableTabScrollRestore("search" + query);

  const {
    data: postsData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: arePostsLoading,
  } = useInfiniteQueryLycanSearch({ query: query, type: type });

  const posts = useMemo(
    () =>
      postsData?.pages.flatMap((page) => {
        if (page) {
          return page.posts;
        } else {
          return [];
        }
      }) ?? [],
    [postsData],
  );

  return (
    <>
      {/* <div className="text-gray-500 dark:text-gray-400 text-lg font-semibold my-3 mx-4">
        Posts
      </div> */}
      <div>
        {posts.map((post) => (
          <UniversalPostRendererATURILoader
            key={post}
            atUri={post}
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

  return <></>;
}
