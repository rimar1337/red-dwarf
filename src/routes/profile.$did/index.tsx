import { createFileRoute, Link } from "@tanstack/react-router";
import React from "react";
import { UniversalPostRendererATURILoader } from "~/components/UniversalPostRenderer";
import { useQueryClient } from "@tanstack/react-query";

import {
  useQueryIdentity,
  useQueryProfile,
  useInfiniteQueryAuthorFeed,
} from "~/utils/useQuery";

export const Route = createFileRoute("/profile/$did/")({
  component: ProfileComponent,
});

function ProfileComponent() {
  const { did } = Route.useParams();
  const queryClient = useQueryClient();

  const {
    data: identity,
    isLoading: isIdentityLoading,
    error: identityError,
  } = useQueryIdentity(did);

  const resolvedDid = did.startsWith("did:") ? did : identity?.did;
  const resolvedHandle = did.startsWith("did:") ? identity?.handle : did;
  const pdsUrl = identity?.pds;

  const profileUri = resolvedDid
    ? `at://${resolvedDid}/app.bsky.actor.profile/self`
    : undefined;
  const { data: profileRecord } = useQueryProfile(profileUri);
  const profile = profileRecord?.value;

  const {
    data: postsData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: arePostsLoading,
  } = useInfiniteQueryAuthorFeed(resolvedDid, pdsUrl);

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

  function getAvatarUrl(p: typeof profile) {
    const link = p?.avatar?.ref?.["$link"];
    if (!link || !resolvedDid) return null;
    return `https://cdn.bsky.app/img/avatar/plain/${resolvedDid}/${link}@jpeg`;
  }
  function getBannerUrl(p: typeof profile) {
    const link = p?.banner?.ref?.["$link"];
    if (!link || !resolvedDid) return null;
    return `https://cdn.bsky.app/img/banner/plain/${resolvedDid}/${link}@jpeg`;
  }

  const displayName =
    profile?.displayName || (resolvedHandle ? `@${resolvedHandle}` : did);
  const handle = resolvedHandle ? `@${resolvedHandle}` : resolvedDid || did;
  const description = profile?.description || "";

  if (isIdentityLoading) {
    return (
      <div className="p-4 text-center text-gray-500">Resolving profile...</div>
    );
  }

  if (identityError) {
    return (
      <div className="p-4 text-center text-red-500">
        Error: {identityError.message}
      </div>
    );
  }

  if (!resolvedDid) {
    return (
      <div className="p-4 text-center text-gray-500">Profile not found.</div>
    );
  }

  return (
    <>
      <div className="flex gap-2 px-4 py-2 h-[52px] sticky top-0 bg-white dark:bg-gray-950 z-10 border-b border-gray-200 dark:border-gray-700">
        <Link
          to=".."
          className="px-3 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-900 font-bold text-lg"
          onClick={(e) => {
            e.preventDefault();
            window.history.length > 1
              ? window.history.back()
              : window.location.assign("/");
          }}
          aria-label="Go back"
        >
          ←
        </Link>
        <span className="text-xl font-bold ml-2">Profile</span>
      </div>

      {/* Profile Header */}
      <div className="w-full max-w-2xl mx-auto shadow-lg rounded-b-lg overflow-hidden relative bg-gray-200 dark:bg-gray-900">
        {/* Banner */}
        <div
          className="w-full h-40 bg-gray-300 dark:bg-gray-700"
          style={{
            backgroundImage: `url(${getBannerUrl(profile)})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />

        {/* Avatar (PFP) */}
        <div className="absolute left-[16px] top-[100px] ">
          <img
            src={getAvatarUrl(profile) || "/favicon.png"}
            alt="avatar"
            className="w-28 h-28 rounded-full object-cover border-4 border-white dark:border-gray-950 bg-gray-300 dark:bg-gray-700"
          />
        </div>

        <div className="absolute right-[16px] top-[170px] flex flex-row gap-2.5">
          {/* 
            todo: full follow and unfollow backfill (along with partial likes backfill, 
            just enough for it to be useful) 
            also delay the backfill to be on demand because it would be pretty intense
            also save it persistently
          */}
          {true ? (
            <>
              <button className="rounded-full bg-gray-600 px-3 py-2 text-[14px]">
                Follow
              </button>
              <button className="rounded-full bg-gray-600 px-3 py-2 text-[14px]">
                Unfollow
              </button>
            </>
          ) : (
            <button className="rounded-full bg-gray-600 px-3 py-2 text-[14px]">
              Edit Profile
            </button>
          )}
          <button className="rounded-full bg-gray-600 px-3 py-2 text-[14px]">
            ... {/* todo: icon */}
          </button>
        </div>

        {/* Info Card */}
        <div className="mt-16 pb-2 px-4 text-gray-900 dark:text-gray-100">
          <div className="font-bold text-2xl">{displayName}</div>
          <div className="text-gray-500 dark:text-gray-400 text-base mb-3">
            {handle}
          </div>
          {description && (
            <div className="text-base leading-relaxed text-gray-800 dark:text-gray-300 mb-5 whitespace-pre-wrap break-words text-[15px]">
              {description}
            </div>
          )}
        </div>
      </div>

      {/* Posts Section */}
      <div className="max-w-2xl mx-auto">
        <div className="text-gray-500 dark:text-gray-400 text-lg font-semibold my-3 mx-4">
          Posts
        </div>
        <div>
          {posts.map((post) => (
            <UniversalPostRendererATURILoader
              key={post.uri}
              atUri={post.uri}
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
      </div>
    </>
  );
}
