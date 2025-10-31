import * as ATPAPI from "@atproto/api";
import { AtUri } from "@atproto/api";
import { createFileRoute } from "@tanstack/react-router";
import { useAtom } from "jotai";

import { Header } from "~/components/Header";
import { InfiniteCustomFeed } from "~/components/InfiniteCustomFeed";
import { useAuth } from "~/providers/UnifiedAuthProvider";
import { quickAuthAtom } from "~/utils/atoms";
import { useQueryArbitrary, useQueryIdentity } from "~/utils/useQuery";

export const Route = createFileRoute("/profile/$did/feed/$rkey")({
  component: FeedRoute,
});

function FeedRoute() {
  const { did, rkey } = Route.useParams();
  const { agent, status } = useAuth();
  const { data: identitydata } = useQueryIdentity(did);
  const { data: identity } = useQueryIdentity(agent?.did);
  const uri = `at://${identitydata?.did || did}/app.bsky.feed.generator/${rkey}`;
  const aturi = new AtUri(uri);
  const { data: feeddata } = useQueryArbitrary(uri);

  const [quickAuth, setQuickAuth] = useAtom(quickAuthAtom);
  const isAuthRestoring = quickAuth ? status === "loading" : false;

  const authed = status === "signedIn";

  const feedServiceDid = !isAuthRestoring
    ? ((feeddata?.value as any)?.did as string | undefined)
    : undefined;

  // const {
  //   data: feedData,
  //   isLoading: isFeedLoading,
  //   error: feedError,
  // } = useQueryFeedSkeleton({
  //   feedUri: selectedFeed!,
  //   agent: agent ?? undefined,
  //   isAuthed: authed ?? false,
  //   pdsUrl: identity?.pds,
  //   feedServiceDid: feedServiceDid,
  // });

  // const feed = feedData?.feed || [];

  const isReadyForAuthedFeed =
    !isAuthRestoring && authed && agent && identity?.pds && feedServiceDid;
  const isReadyForUnauthedFeed = !isAuthRestoring && !authed;

  const feed: ATPAPI.AppBskyFeedGenerator.Record | undefined = feeddata?.value;

  const web = feedServiceDid?.replace(/^did:web:/, "") || "";

  return (
    <>
      <Header
        title={feed?.displayName || aturi.rkey}
        backButtonCallback={() => {
          if (window.history.length > 1) {
            window.history.back();
          } else {
            window.location.assign("/");
          }
        }}
      />

      {isAuthRestoring ||
        (authed && (!identity?.pds || !feedServiceDid) && (
          <div className="p-4 text-center text-gray-500">
            Preparing your feed...
          </div>
        ))}

      {!isAuthRestoring && (isReadyForAuthedFeed || isReadyForUnauthedFeed) ? (
        <InfiniteCustomFeed
          key={uri}
          feedUri={uri}
          pdsUrl={identity?.pds}
          feedServiceDid={feedServiceDid}
          authedOverride={!authed && true || undefined}
          unauthedfeedurl={!authed && web || undefined}
        />
      ) : (
        <div className="p-4 text-center text-gray-500">Loading.......</div>
      )}
    </>
  );
}
