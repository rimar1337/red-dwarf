import { useQueryClient } from "@tanstack/react-query";
import { useAtom } from "jotai";
import React, { createContext, use, useCallback, useMemo } from "react";

import { useAuth } from "~/providers/UnifiedAuthProvider";
import { renderSnack } from "~/routes/__root";
import { localPollVotesAtom, type LocalVote } from "~/utils/atoms";
import { useGetOneToOneState } from "~/utils/followState";
import { useQueryConstellation } from "~/utils/useQuery";

// ------------------------------------------------------------------
// Types
// ------------------------------------------------------------------

// We extend the LocalVote type internally to handle "Tombstones"
// (explicit instructions to hide a server-side vote)
type ExtendedLocalVote = LocalVote & {
  action: "create" | "delete";
};

interface PollMutationContextType {
  castVoteRaw: (
    pollUri: string,
    pollCid: string,
    option: string,
    isMultiple: boolean,
    currentServerVotes: string[],
  ) => Promise<void>;

  getLocalVotes: (pollUri: string) => ExtendedLocalVote[];
  refreshPollData: (pollUri?: string) => void;
}

const PollMutationContext = createContext<PollMutationContextType | undefined>(
  undefined,
);

// ------------------------------------------------------------------
// Provider
// ------------------------------------------------------------------

export function PollMutationQueueProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { agent } = useAuth();
  const queryClient = useQueryClient();
  const [localVotes, setLocalVotes] = useAtom(localPollVotesAtom);

  const getLocalVotes = useCallback(
    (pollUri: string) => {
      return (localVotes[pollUri] || []) as ExtendedLocalVote[];
    },
    [localVotes],
  );

  const updateLocalState = useCallback(
    (
      pollUri: string,
      updater: (prev: ExtendedLocalVote[]) => ExtendedLocalVote[],
    ) => {
      setLocalVotes((prev) => ({
        ...prev,
        [pollUri]: updater((prev[pollUri] || []) as ExtendedLocalVote[]),
      }));
    },
    [setLocalVotes],
  );

  const refreshPollData = useCallback(
    (pollUri?: string) => {
      // Clear all local pending votes for this poll or all polls
      if (pollUri) {
        // Clear local state for specific poll
        setLocalVotes((prev) => {
          const newState = { ...prev };
          delete newState[pollUri];
          return newState;
        });
      } else {
        // Clear all local votes
        setLocalVotes({});
      }

      // Invalidate all poll constellation queries using predicate function
      queryClient.invalidateQueries({
        predicate: (query) => {
          const queryKey = query.queryKey;
          return (
            Array.isArray(queryKey) && queryKey.includes("constellation-polls")
          );
        },
      });

      // If specific poll URI provided, also invalidate that poll's data
      if (pollUri) {
        queryClient.invalidateQueries({
          queryKey: ["arbitrary", pollUri],
        });
      }
    },
    [queryClient, setLocalVotes],
  );

  const castVoteRaw = useCallback(
    async (
      pollUri: string,
      pollCid: string,
      option: string,
      isMultiple: boolean,
      currentServerVotes: string[],
    ) => {
      if (!agent?.did) {
        renderSnack({
          title: "Please log in to vote",
          description: "You need to be authenticated to participate in polls",
        });
        return;
      }

      const optionKey = option as "a" | "b" | "c" | "d";
      const timestamp = Date.now();

      // 1. DETERMINE CURRENT STATUS
      const currentLocal = (localVotes[pollUri] || []) as ExtendedLocalVote[];
      const localEntry = currentLocal.find((v) => v.option === optionKey);

      // Check if ANY server vote exists for this option
      const hasServerVote = currentServerVotes.some((uri) =>
        uri.includes(`app.reddwarf.poll.vote.${optionKey}`),
      );

      const isCurrentlyVoted = localEntry
        ? localEntry.action === "create"
        : hasServerVote;

      // ------------------------------------------------------------
      // ACTION: UNVOTE (Toggle Off)
      // ------------------------------------------------------------
      if (isCurrentlyVoted) {
        // Optimistic Update: Tombstone
        updateLocalState(pollUri, (prev) => {
          const clean = prev.filter((v) => v.option !== optionKey);
          return [
            ...clean,
            {
              pollUri,
              option: optionKey,
              status: "pending",
              action: "delete",
              timestamp,
            },
          ];
        });

        try {
          // FIX: Collect ALL URIs for this option (Server + Local)
          // We want to nuke every record that matches this option to clean up state
          const serverUris = currentServerVotes.filter((uri) =>
            uri.includes(`app.reddwarf.poll.vote.${optionKey}`),
          );

          const urisToDelete = [...serverUris];
          if (localEntry?.uri) {
            urisToDelete.push(localEntry.uri);
          }

          // Deduplicate just in case
          const uniqueUris = [...new Set(urisToDelete)];

          // Parallel delete for everything found
          await Promise.all(
            uniqueUris.map((uri) => {
              const match = uri.match(/at:\/\/(.+)\/(.+)\/(.+)/);
              if (!match) return Promise.resolve();
              const [, repo, collection, rkey] = match;
              return agent.com.atproto.repo.deleteRecord({
                repo,
                collection,
                rkey,
              });
            }),
          );
        } catch (e) {
          console.error("Failed to unvote", e);
          renderSnack({ title: "Failed to remove vote" });
          // Revert optimistic update
          updateLocalState(pollUri, (prev) =>
            prev.filter((v) => v.timestamp !== timestamp),
          );
        }
      }

      // ------------------------------------------------------------
      // ACTION: VOTE (Toggle On)
      // ------------------------------------------------------------
      else {
        // ... (The Vote logic remains the same, as the Single Choice cleanup
        // logic there already iterated over the entire array) ...

        updateLocalState(pollUri, (prev) => {
          const newState = isMultiple
            ? [...prev]
            : prev.filter((v) => v.action !== "create");
          const clean = newState.filter((v) => v.option !== optionKey);
          return [
            ...clean,
            {
              pollUri,
              option: optionKey,
              status: "pending",
              action: "create",
              timestamp,
            },
          ];
        });

        // Cleanup others if single choice
        if (!isMultiple) {
          const votesToDelete = [
            ...currentServerVotes,
            ...(currentLocal
              .filter((v) => v.action === "create" && v.uri)
              .map((v) => v.uri) as string[]),
          ];

          // This was already safe because it iterates the whole array
          votesToDelete.forEach((voteUri) => {
            if (voteUri.includes(`app.reddwarf.poll.vote.${optionKey}`)) return;
            const match = voteUri.match(/at:\/\/(.+)\/(.+)\/(.+)/);
            if (match) {
              const [, repo, collection, rkey] = match;
              agent.com.atproto.repo
                .deleteRecord({ repo, collection, rkey })
                .catch(console.error);
            }
          });
        }

        try {
          const res = await agent.com.atproto.repo.createRecord({
            // ... standard create logic
            collection: `app.reddwarf.poll.vote.${optionKey}`,
            repo: agent.assertDid,
            record: {
              $type: `app.reddwarf.poll.vote.${optionKey}`,
              subject: { uri: pollUri, cid: pollCid },
              createdAt: new Date().toISOString(),
            },
          });

          updateLocalState(pollUri, (prev) => {
            const clean = prev.filter((v) => v.option !== optionKey);
            return [
              ...clean,
              {
                pollUri,
                option: optionKey,
                status: "confirmed",
                action: "create",
                uri: res.data.uri,
                timestamp: Date.now(),
              },
            ];
          });
        } catch (e) {
          console.error("Vote failed", e);
          renderSnack({ title: "Vote failed" });
          updateLocalState(pollUri, (prev) =>
            prev.filter((v) => v.timestamp !== timestamp),
          );
        }
      }
    },
    [agent, localVotes, updateLocalState, setLocalVotes],
  );

  return (
    <PollMutationContext
      value={{ castVoteRaw, getLocalVotes, refreshPollData }}
    >
      {children}
    </PollMutationContext>
  );
}

// ------------------------------------------------------------------
// Hooks
// ------------------------------------------------------------------

export function usePollMutationQueue() {
  const context = use(PollMutationContext);
  if (!context) throw new Error("Missing PollMutationQueueProvider");
  return context;
}

function usePollSelfVotes(pollUri: string) {
  const { agent } = useAuth();
  const agentDid = agent?.did;

  const userVotesA = useGetOneToOneState(
    agentDid
      ? {
          target: pollUri,
          user: agentDid,
          collection: "app.reddwarf.poll.vote.a",
          path: ".subject.uri",
        }
      : undefined,
  );
  const userVotesB = useGetOneToOneState(
    agentDid
      ? {
          target: pollUri,
          user: agentDid,
          collection: "app.reddwarf.poll.vote.b",
          path: ".subject.uri",
        }
      : undefined,
  );
  const userVotesC = useGetOneToOneState(
    agentDid
      ? {
          target: pollUri,
          user: agentDid,
          collection: "app.reddwarf.poll.vote.c",
          path: ".subject.uri",
        }
      : undefined,
  );
  const userVotesD = useGetOneToOneState(
    agentDid
      ? {
          target: pollUri,
          user: agentDid,
          collection: "app.reddwarf.poll.vote.d",
          path: ".subject.uri",
        }
      : undefined,
  );

  return useMemo(() => {
    return [
      ...(userVotesA || []),
      ...(userVotesB || []),
      ...(userVotesC || []),
      ...(userVotesD || []),
    ];
  }, [userVotesA, userVotesB, userVotesC, userVotesD]);
}

export function usePollData(
  pollUri: string,
  pollCid: string | undefined,
  isMultiple: boolean,
  serverCounts: { a: number; b: number; c: number; d: number },
) {
  const { agent } = useAuth();
  const myDid = agent?.did;

  const { castVoteRaw, getLocalVotes } = usePollMutationQueue();
  const serverUserVotes = usePollSelfVotes(pollUri); // Our own votes from server
  const localVotes = getLocalVotes(pollUri); // Pending local actions

  // 1. FETCHING - Move the logic here
  // We only need the first page/subset to show avatars
  const { data: votersA } = useQueryConstellation({
    method: "/links",
    target: pollUri,
    collection: "app.reddwarf.poll.vote.a",
    path: ".subject.uri",
    customkey: "constellation-polls",
  });
  const { data: votersB } = useQueryConstellation({
    method: "/links",
    target: pollUri,
    collection: "app.reddwarf.poll.vote.b",
    path: ".subject.uri",
    customkey: "constellation-polls",
  });
  const { data: votersC } = useQueryConstellation({
    method: "/links",
    target: pollUri,
    collection: "app.reddwarf.poll.vote.c",
    path: ".subject.uri",
    customkey: "constellation-polls",
  });
  const { data: votersD } = useQueryConstellation({
    method: "/links",
    target: pollUri,
    collection: "app.reddwarf.poll.vote.d",
    path: ".subject.uri",
    customkey: "constellation-polls",
  });

  const handleVote = useCallback(
    (optionKey: string) => {
      if (!pollCid) return;
      castVoteRaw(pollUri, pollCid, optionKey, isMultiple, serverUserVotes);
    },
    [pollUri, pollCid, isMultiple, serverUserVotes, castVoteRaw],
  );

  return useMemo(() => {
    // Helper to clean a raw list: extract DIDs, Deduplicate, Remove Self
    const processServerList = (data: any) => {
      const records = data?.linking_records || [];
      const dids = records.map((r: any) => r.did).filter(Boolean) as string[];

      // 2. Deduplicate everyone (Set removes duplicates)
      // 3. Remove self from the list (to ensure we don't appear twice or when we shouldn't)
      const uniqueOthers = new Set(dids.filter((did) => did !== myDid));

      return Array.from(uniqueOthers);
    };

    const serverLists = {
      a: processServerList(votersA),
      b: processServerList(votersB),
      c: processServerList(votersC),
      d: processServerList(votersD),
    };

    const calculateOptionState = (option: "a" | "b" | "c" | "d") => {
      // --- LOGIC: Determine if we have voted (Boolean) ---
      const localEntry = localVotes.find((v) => v.option === option);
      const isServerVoted = serverUserVotes.some((uri) =>
        uri.includes(`app.reddwarf.poll.vote.${option}`),
      );

      let hasVoted = false;

      if (localEntry) {
        hasVoted = localEntry.action === "create";
      } else {
        if (isMultiple) {
          hasVoted = isServerVoted;
        } else {
          // Single choice: if we created a vote elsewhere locally, this one is false
          const hasSwitched = localVotes.some(
            (v) => v.option !== option && v.action === "create",
          );
          hasVoted = hasSwitched ? false : isServerVoted;
        }
      }

      // --- LOGIC: Calculate Count ---
      let count = serverCounts[option] || 0;
      if (hasVoted && !isServerVoted) count++;
      if (!hasVoted && isServerVoted) count = Math.max(0, count - 1);

      // --- LOGIC: Finalize Avatar List ---
      // 4. Add back self purely using the hasVoted state
      let finalVoters = serverLists[option];

      if (hasVoted && myDid) {
        finalVoters = [myDid, ...finalVoters];
      }

      return {
        hasVoted,
        count,
        // We only return the DIDs now, top 5
        topVoterDids: finalVoters.slice(0, 5),
      };
    };

    const stateA = calculateOptionState("a");
    const stateB = calculateOptionState("b");
    const stateC = calculateOptionState("c");
    const stateD = calculateOptionState("d");

    return {
      results: { a: stateA, b: stateB, c: stateC, d: stateD },
      hasVotedAny:
        stateA.hasVoted ||
        stateB.hasVoted ||
        stateC.hasVoted ||
        stateD.hasVoted,
      totalVotes: stateA.count + stateB.count + stateC.count + stateD.count,
      handleVote,
    };
  }, [
    localVotes,
    serverUserVotes,
    serverCounts,
    votersA,
    votersB,
    votersC,
    votersD, // Dependencies for fetching
    isMultiple,
    handleVote,
    myDid,
  ]);
}
