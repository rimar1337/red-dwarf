import { useAtom } from "jotai";
import React, { createContext, use, useCallback, useMemo } from "react";

import { useAuth } from "~/providers/UnifiedAuthProvider";
import { renderSnack } from "~/routes/__root";
import { localPollVotesAtom, type LocalVote } from "~/utils/atoms";
import { useGetOneToOneState } from "~/utils/followState";

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
  const [localVotes, setLocalVotes] = useAtom(localPollVotesAtom);

  const getLocalVotes = useCallback(
    (pollUri: string) => {
      return (localVotes[pollUri] || []) as ExtendedLocalVote[];
    },
    [localVotes],
  );

  const updateLocalState = useCallback(
    (pollUri: string, updater: (prev: ExtendedLocalVote[]) => ExtendedLocalVote[]) => {
      setLocalVotes((prev) => ({
        ...prev,
        [pollUri]: updater((prev[pollUri] || []) as ExtendedLocalVote[]),
      }));
    },
    [setLocalVotes],
  );

  const castVoteRaw = useCallback(
    async (
      pollUri: string,
      pollCid: string,
      option: string,
      isMultiple: boolean,
      currentServerVotes: string[],
    ) => {
      if (!agent?.did) return;

      const optionKey = option as "a" | "b" | "c" | "d";
      const timestamp = Date.now();

      // 1. DETERMINE CURRENT STATUS
      const currentLocal = (localVotes[pollUri] || []) as ExtendedLocalVote[];
      const localEntry = currentLocal.find((v) => v.option === optionKey);

      // Check if ANY server vote exists for this option
      const hasServerVote = currentServerVotes.some((uri) =>
        uri.includes(`app.reddwarf.poll.vote.${optionKey}`)
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
          const clean = prev.filter(v => v.option !== optionKey);
          return [...clean, {
            pollUri,
            option: optionKey,
            status: "pending",
            action: "delete",
            timestamp
          }];
        });

        try {
          // FIX: Collect ALL URIs for this option (Server + Local)
          // We want to nuke every record that matches this option to clean up state
          const serverUris = currentServerVotes.filter(uri =>
            uri.includes(`app.reddwarf.poll.vote.${optionKey}`)
          );

          const urisToDelete = [...serverUris];
          if (localEntry?.uri) {
            urisToDelete.push(localEntry.uri);
          }

          // Deduplicate just in case
          const uniqueUris = [...new Set(urisToDelete)];

          // Parallel delete for everything found
          await Promise.all(
            uniqueUris.map(uri => {
              const match = uri.match(/at:\/\/(.+)\/(.+)\/(.+)/);
              if (!match) return Promise.resolve();
              const [, repo, collection, rkey] = match;
              return agent.com.atproto.repo.deleteRecord({
                repo,
                collection,
                rkey,
              });
            })
          );

        } catch (e) {
          console.error("Failed to unvote", e);
          renderSnack({ title: "Failed to remove vote" });
          // Revert optimistic update
          updateLocalState(pollUri, (prev) => prev.filter(v => v.timestamp !== timestamp));
        }
      }

      // ------------------------------------------------------------
      // ACTION: VOTE (Toggle On)
      // ------------------------------------------------------------
      else {
        // ... (The Vote logic remains the same, as the Single Choice cleanup 
        // logic there already iterated over the entire array) ...

        updateLocalState(pollUri, (prev) => {
          const newState = isMultiple ? [...prev] : prev.filter(v => v.action !== 'create');
          const clean = newState.filter(v => v.option !== optionKey);
          return [...clean, {
            pollUri,
            option: optionKey,
            status: "pending",
            action: "create",
            timestamp
          }];
        });

        // Cleanup others if single choice
        if (!isMultiple) {
          const votesToDelete = [
            ...currentServerVotes,
            ...(currentLocal.filter(v => v.action === 'create' && v.uri).map(v => v.uri) as string[])
          ];

          // This was already safe because it iterates the whole array
          votesToDelete.forEach((voteUri) => {
            if (voteUri.includes(`app.reddwarf.poll.vote.${optionKey}`)) return;
            const match = voteUri.match(/at:\/\/(.+)\/(.+)\/(.+)/);
            if (match) {
              const [, repo, collection, rkey] = match;
              agent.com.atproto.repo.deleteRecord({ repo, collection, rkey }).catch(console.error);
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
            const clean = prev.filter(v => v.option !== optionKey);
            return [...clean, {
              pollUri,
              option: optionKey,
              status: "confirmed",
              action: "create",
              uri: res.data.uri,
              timestamp: Date.now(),
            }];
          });
        } catch (e) {
          console.error("Vote failed", e);
          renderSnack({ title: "Vote failed" });
          updateLocalState(pollUri, (prev) => prev.filter(v => v.timestamp !== timestamp));
        }
      }
    },
    [agent, localVotes, updateLocalState, setLocalVotes],
  );

  return (
    <PollMutationContext value={{ castVoteRaw, getLocalVotes }}>
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
    agentDid ? { target: pollUri, user: agentDid, collection: "app.reddwarf.poll.vote.a", path: ".subject.uri" } : undefined
  );
  const userVotesB = useGetOneToOneState(
    agentDid ? { target: pollUri, user: agentDid, collection: "app.reddwarf.poll.vote.b", path: ".subject.uri" } : undefined
  );
  const userVotesC = useGetOneToOneState(
    agentDid ? { target: pollUri, user: agentDid, collection: "app.reddwarf.poll.vote.c", path: ".subject.uri" } : undefined
  );
  const userVotesD = useGetOneToOneState(
    agentDid ? { target: pollUri, user: agentDid, collection: "app.reddwarf.poll.vote.d", path: ".subject.uri" } : undefined
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
  const { castVoteRaw, getLocalVotes } = usePollMutationQueue();
  const serverUserVotes = usePollSelfVotes(pollUri);
  const localVotes = getLocalVotes(pollUri); // Returns ExtendedLocalVote[]

  const handleVote = useCallback((optionKey: string) => {
    if (!pollCid) return;
    castVoteRaw(pollUri, pollCid, optionKey, isMultiple, serverUserVotes);
  }, [pollUri, pollCid, isMultiple, serverUserVotes, castVoteRaw]);

  return useMemo(() => {
    const calculateOptionState = (option: "a" | "b" | "c" | "d") => {
      const localEntry = localVotes.find((v) => v.option === option);
      const isServerVoted = serverUserVotes.some((uri) => uri.includes(`app.reddwarf.poll.vote.${option}`));

      // --- MERGE STATUS LOGIC ---
      let hasVoted = false;

      if (localEntry) {
        // 1. If we have an explicit local action, it overrides everything for this option
        // 'create' = true, 'delete' = false
        hasVoted = localEntry.action === "create";
      } else {
        // 2. If no local action for this specific option...
        if (isMultiple) {
          // In multiple choice, server truth stands unless explicitly deleted (checked above)
          hasVoted = isServerVoted;
        } else {
          // In single choice, we must check if we voted for *something else* locally
          const hasSwitchedToOther = localVotes.some(v => v.option !== option && v.action === "create");
          if (hasSwitchedToOther) {
            hasVoted = false; // Implicitly unvoted because we switched
          } else {
            hasVoted = isServerVoted;
          }
        }
      }

      // --- MERGE COUNT LOGIC ---
      let count = serverCounts[option] || 0;

      // Adjust counts based on our "Virtual" state vs "Server" state
      // If we are Voted locally but Server doesn't know -> +1
      if (hasVoted && !isServerVoted) {
        count++;
      }
      // If we are NOT Voted locally (e.g. unvoted or switched) but Server thinks we are -> -1
      if (!hasVoted && isServerVoted) {
        count = Math.max(0, count - 1);
      }

      return { hasVoted, count };
    };

    const stateA = calculateOptionState("a");
    const stateB = calculateOptionState("b");
    const stateC = calculateOptionState("c");
    const stateD = calculateOptionState("d");

    return {
      results: { a: stateA, b: stateB, c: stateC, d: stateD },
      hasVotedAny: stateA.hasVoted || stateB.hasVoted || stateC.hasVoted || stateD.hasVoted,
      totalVotes: stateA.count + stateB.count + stateC.count + stateD.count,
      handleVote,
    };
  }, [localVotes, serverUserVotes, serverCounts, isMultiple, handleVote]);
}