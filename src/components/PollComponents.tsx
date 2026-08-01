//import * as ATPAPI from "@atproto/api"
import { useAtom } from "jotai";
import * as React from "react";

import {
  usePollData,
  usePollMutationQueue,
} from "~/providers/PollMutationQueueProvider";
//import { useAuth } from "~/providers/UnifiedAuthProvider";
import { renderSnack } from "~/routes/__root";
import { imgCDNAtom } from "~/utils/atoms";
import { getAvatarUrl } from "~/utils/useHydrated";
import {
  useQueryArbitrary,
  useQueryConstellation,
  useQueryProfile,
} from "~/utils/useQuery";

import { type embedtryfall } from "./PostEmbeds";
import { ExternalLinkEmbed } from "./PostEmbeds";

export function PollEmbed({
  did,
  rkey,
  redactedLoading,
  embedtryfall,
}: {
  did: string;
  rkey: string;
  redactedLoading?: boolean;
  embedtryfall?: embedtryfall;
}) {
  //const { agent } = useAuth();
  const { refreshPollData } = usePollMutationQueue();
  const pollUri = `at://${did}/app.reddwarf.embed.poll/${rkey}`;
  const { data: pollRecord, isLoading, error } = useQueryArbitrary(pollUri);
  const dontLoadPolls =
    (embedtryfall &&
      (isLoading || pollRecord === undefined || error !== null)) ||
    false;

  const { data: voteCountsA } = useQueryConstellation({
    method: "/links/count/distinct-dids",
    target: pollUri,
    collection: "app.reddwarf.poll.vote.a",
    path: ".subject.uri",
    customkey: "constellation-polls",
    enabled: !dontLoadPolls,
  });

  const { data: voteCountsB } = useQueryConstellation({
    method: "/links/count/distinct-dids",
    target: pollUri,
    collection: "app.reddwarf.poll.vote.b",
    path: ".subject.uri",
    customkey: "constellation-polls",
    enabled: !dontLoadPolls,
  });

  const { data: voteCountsC } = useQueryConstellation({
    method: "/links/count/distinct-dids",
    target: pollUri,
    collection: "app.reddwarf.poll.vote.c",
    path: ".subject.uri",
    customkey: "constellation-polls",
    enabled: !dontLoadPolls,
  });

  const { data: voteCountsD } = useQueryConstellation({
    method: "/links/count/distinct-dids",
    target: pollUri,
    collection: "app.reddwarf.poll.vote.d",
    path: ".subject.uri",
    customkey: "constellation-polls",
    enabled: !dontLoadPolls,
  });

  // const { data: votersA } = useQueryConstellation({
  //   method: "/links",
  //   target: pollUri,
  //   collection: "app.reddwarf.poll.vote.a",
  //   path: ".subject.uri",
  //   customkey: "constellation-polls",
  //   enabled: !isLoading
  // });
  // const { data: votersB } = useQueryConstellation({
  //   method: "/links",
  //   target: pollUri,
  //   collection: "app.reddwarf.poll.vote.b",
  //   path: ".subject.uri",
  //   customkey: "constellation-polls",
  //   enabled: !isLoading
  // });
  // const { data: votersC } = useQueryConstellation({
  //   method: "/links",
  //   target: pollUri,
  //   collection: "app.reddwarf.poll.vote.c",
  //   path: ".subject.uri",
  //   customkey: "constellation-polls",
  //   enabled: !isLoading
  // });
  // const { data: votersD } = useQueryConstellation({
  //   method: "/links",
  //   target: pollUri,
  //   collection: "app.reddwarf.poll.vote.d",
  //   path: ".subject.uri",
  //   customkey: "constellation-polls",
  //   enabled: !isLoading
  // });

  const poll = {
    ...(pollRecord?.value ?? {}),
    multiple: true,
  } as {
    a: string;
    b: string;
    c?: string;
    d?: string;
    expiry?: string;
    multiple?: boolean;
    createdAt: string;
  };

  const options = [poll.a, poll.b, poll.c, poll.d].filter(Boolean);

  const serverCounts = {
    a: parseInt((voteCountsA as any)?.total || "0"),
    b: parseInt((voteCountsB as any)?.total || "0"),
    c: parseInt((voteCountsC as any)?.total || "0"),
    d: parseInt((voteCountsD as any)?.total || "0"),
  };

  const {
    results,
    totalVotes,
    handleVote,
    votersA,
    votersB,
    votersC,
    votersD,
  } = usePollData(
    pollUri,
    pollRecord?.cid,
    !!poll.multiple,
    serverCounts,
    !dontLoadPolls,
  );
  if (dontLoadPolls && embedtryfall) {
    const link = embedtryfall.embed.external;
    const onOpen = embedtryfall.onOpen;
    return (
      <>
        {/* pass thru confirm<br />
      embedtryfall = {JSON.stringify(embedtryfall, null, 2)}<br />
      isLoading = {JSON.stringify(isLoading, null, 2)}<br />
      pollRecord = {JSON.stringify(pollRecord, null, 2)}<br />
      error = {JSON.stringify(error, null, 2)}<br /> */}
        <ExternalLinkEmbed
          link={link}
          onOpen={onOpen}
          style={{ marginTop: 0 }}
          redactedLoading={redactedLoading}
        />
      </>
    );
  }
  if (isLoading && !embedtryfall) {
    return (
      <div className="animate-pulse">
        <div className="flex items-center gap-2 mb-3">
          <div className="h-6 w-20 bg-gray-300 dark:bg-gray-600 rounded"></div>
          <div className="h-6 w-32 bg-gray-300 dark:bg-gray-600 rounded"></div>
        </div>
        <div className="space-y-2">
          <div className="h-12 bg-gray-300 dark:bg-gray-600 rounded-lg"></div>
          <div className="h-12 bg-gray-300 dark:bg-gray-600 rounded-lg w-3/4"></div>
        </div>
      </div>
    );
  }

  if (error || !pollRecord?.value) {
    return <div className="text-red-500 text-sm p-2">Failed to load poll</div>;
  }
  const isExpired = false;

  return (
    <>
      <div className={`${redactedLoading ? "pointer-events-none" : ""} my-4`}>
        <div className="mb-4 flex items-center gap-3">
          <div className="flex items-center gap-1.5 rounded-lg border-gray-300 dark:border-gray-600 pl-2 pr-2.5 py-1 text-sm font-medium uppercase tracking-wide text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800">
            <IconMdiGlobe />
            <span>Public Poll</span>
          </div>

          <span className="text-sm font-normal text-gray-500 dark:text-gray-400 flex flex-row items-center gap-1">
            {poll.multiple ? (
              <IconMdiCheckboxMultipleMarked />
            ) : (
              <IconMdiCheckCircle />
            )}
            <span className="md:flex hidden">
              {poll.multiple
                ? "Select one or more options"
                : "Select one option"}
            </span>
          </span>

          <button
            onClick={(e) => {
              e.stopPropagation();
              refreshPollData(pollUri);
            }}
            className="ml-auto rounded-full h-8 outline outline-gray-200 text-gray-700 dark:outline-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors px-3 py-1 text-[12px] flex items-center gap-1"
            title="Refresh poll data"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" />
            </svg>
            Refresh
          </button>
        </div>

        <div className="space-y-3">
          {options.map((optionText, index) => {
            const optionKey = ["a", "b", "c", "d"][index] as
              "a" | "b" | "c" | "d";
            const { topVoterDids } = results[optionKey];
            const optionState = results[optionKey];
            const hasVotedForOption = optionState.hasVoted;
            const votePercentage =
              totalVotes > 0 ? (optionState.count / totalVotes) * 100 : 0;

            const votersData = (() => {
              if (optionKey === "a") return votersA?.linking_records || [];
              if (optionKey === "b") return votersB?.linking_records || [];
              if (optionKey === "c") return votersC?.linking_records || [];
              if (optionKey === "d") return votersD?.linking_records || [];
              return [];
            })();
            const topVoters = votersData
              .filter((v: any) => !!v.did)
              .slice(0, 5);

            return (
              <div
                key={index}
                className={`group relative h-12 items-center justify-between rounded-lg border px-4 flex overflow-hidden ${
                  !isExpired
                    ? hasVotedForOption
                      ? "bg-gray-100 dark:bg-gray-950 border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-900 cursor-pointer outline-2 outline-gray-500 dark:outline-gray-400"
                      : "bg-gray-100 dark:bg-gray-950 border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-900 cursor-pointer"
                    : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700"
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!isExpired) {
                    handleVote(optionKey);
                  }
                }}
              >
                <div
                  className="absolute inset-y-0 left-0 bg-gray-300 dark:bg-gray-700 group-hover:bg-gray-400 dark:group-hover:bg-gray-600 transition-[width]"
                  style={{ width: `${votePercentage}%` }}
                />

                <span className="relative z-[2] text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                  {optionText}
                  {hasVotedForOption && (
                    <span className="ml-2 text-gray-600 dark:text-gray-400">
                      {poll.multiple ? "✓" : "✓ (click to remove)"}
                    </span>
                  )}
                </span>

                <div className="relative z-[2] flex items-center gap-2">
                  {topVoterDids.length > 0 && (
                    <div className="flex -space-x-2">
                      {topVoterDids.map((did, idx) => (
                        <div
                          key={did}
                          className="w-5 h-5 rounded-full border-2 border-white dark:border-gray-900 overflow-hidden bg-gray-200"
                          style={{ zIndex: 5 - idx }}
                        >
                          <PollOptionAvatar did={did} />
                        </div>
                      ))}
                    </div>
                  )}

                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {votePercentage.toFixed(0)}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-2">
            <IconMdiClockOutline />
            <span>Never expires</span>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              renderSnack({
                title: "Not implemented yet...",
                description: "Opening PDSLS",
              });
              const pdslsUrl = `https://pdsls.dev/at://${did}/app.reddwarf.embed.poll/${rkey}#backlinks`;
              window.open(pdslsUrl, "_blank");
            }}
            className="rounded-full h-10 bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors px-4 py-2 text-[14px]"
          >
            View all {totalVotes} votes
          </button>
        </div>
      </div>
    </>
  );
}

export function PollOptionAvatar({ did }: { did: string }) {
  const [imgcdn] = useAtom(imgCDNAtom);
  const { data: profileRecord } = useQueryProfile(
    `at://${did}/app.bsky.actor.profile/self`,
  );

  const avatarUrl = getAvatarUrl(imgcdn, profileRecord?.value, did);

  if (!avatarUrl) {
    return <div className="w-full h-full bg-gray-500" />;
  }

  return (
    <img
      src={avatarUrl}
      alt="voter"
      className="w-full h-full object-cover"
      onError={(e) => {
        const target = e.target as HTMLImageElement;
        target.style.display = "none";
        target.parentElement!.style.backgroundColor = "#6b7280";
      }}
    />
  );
}
