import * as ATPAPI from "@atproto/api";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useAtom } from "jotai";
import * as React from "react";

import { Header } from "~/components/Header";
import { useAuth } from "~/providers/UnifiedAuthProvider";
import { imgCDNAtom, quickAuthAtom } from "~/utils/atoms";
import {
  useQueryArbitrary,
  useQueryIdentity,
  useQueryPreferences,
} from "~/utils/useQuery";

export const Route = createFileRoute("/feeds")({
  component: Feeds,
});

export function Feeds() {
  const { agent, status } = useAuth();
  const [quickAuth] = useAtom(quickAuthAtom);
  const isAuthRestoring = quickAuth ? status === "loading" : false;

  const identityresultmaybe = useQueryIdentity(
    !isAuthRestoring ? agent?.did : undefined,
  );
  const identity = identityresultmaybe?.data;

  const prefsresultmaybe = useQueryPreferences({
    agent: !isAuthRestoring ? (agent ?? undefined) : undefined,
    pdsUrl: !isAuthRestoring ? identity?.pds : undefined,
  });
  const prefs = prefsresultmaybe?.data;

  const savedFeeds = React.useMemo(() => {
    const savedFeedsPref = prefs?.preferences?.find(
      (p: any) => p?.$type === "app.bsky.actor.defs#savedFeedsPrefV2",
    );
    return savedFeedsPref?.items || [];
  }, [prefs]);

  const pinnedFeeds = React.useMemo(() => {
    return savedFeeds.filter((feed: any) => feed.pinned);
  }, [savedFeeds]);

  const nonPinnedFeeds = React.useMemo(() => {
    return savedFeeds.filter((feed: any) => !feed.pinned);
  }, [savedFeeds]);

  return (
    <div className="">
      <Header
        title={`Feeds`}
        backButtonCallback={() => {
          if (window.history.length > 1) {
            window.history.back();
          } else {
            window.location.assign("/");
          }
        }}
        bottomBorderDisabled={false}
      />
      <div className="py-4">
        {pinnedFeeds.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-3 px-4">Pinned Feeds</h2>
            <div className="flex flex-col">
              {pinnedFeeds.map((feed: any) => (
                <FeedItem key={feed.value} feedUri={feed.value} />
              ))}
            </div>
          </div>
        )}

        {nonPinnedFeeds.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-3 px-4">Saved Feeds</h2>
            <div className="flex flex-col">
              {nonPinnedFeeds.map((feed: any) => (
                <FeedItem key={feed.value} feedUri={feed.value} />
              ))}
            </div>
          </div>
        )}

        {savedFeeds.length === 0 && (
          <div className="text-center text-gray-500 py-8 px-4">
            <p>No feeds saved yet.</p>
            <p className="mt-2">
              Save feeds from the home page to see them here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function FeedItem({ feedUri }: { feedUri: string }) {
  const { data: feedData } = useQueryArbitrary(feedUri);
  const feed = feedData?.value as ATPAPI.AppBskyFeedGenerator.Record;
  const [imgcdn] = useAtom(imgCDNAtom);
  let aturi: ATPAPI.AtUri | null = null;
  try {
    aturi = new ATPAPI.AtUri(feedUri);
  } catch (err) {
    // todo terrible hack lmaoo (hack type: forcing following feed to fallback to rinds fresh feed)
    aturi = new ATPAPI.AtUri("at://did:plc:mn45tewwnse5btfftvd3powc/app.bsky.feed.generator/rinds");
  }

  function getAvatarUrl() {
    const link = feed?.avatar?.ref?.["$link"];
    if (!link) return null;
    return `https://${imgcdn}/img/avatar/plain/${aturi?.host}/${link}@jpeg`;
  }

  const avatarUrl = getAvatarUrl();

  return (
    <Link
      className="p-4 border-t border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900 cursor-pointer transition-colors"
      to="/profile/$did/feed/$rkey"
      params={{ did: aturi?.host, rkey: aturi?.rkey }}
      onClick={(e) => {
        e.stopPropagation();
      }}
      //disabled={feedUri === "following"}
    >
      <div className="flex items-center justify-between">
        <div className="flex gap-3">
          <img
            src={avatarUrl || "/defaultpfp.png"}
            alt={feed?.displayName || "Feed avatar"}
            className="w-10 h-10 rounded-sm object-cover"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.onerror = null;
              target.src = "/defaultpfp.png";
            }}
          />
          <div>
            <h3 className="font-medium text-gray-900 dark:text-gray-100">
              {feed?.displayName || feedUri.split("/").pop()}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-1">
              {feedUri === "following" ? "(not implemented, if clicked will open an alternative)" : feed?.description || "No description"}
            </p>
          </div>
        </div>
        <div className="text-gray-400">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 18l6-6-6-6"></path>
          </svg>
        </div>
      </div>
    </Link>
  );
}
