import { useAtom } from "jotai";
import React, { createContext, use, useCallback, useMemo } from "react";

import { useAuth } from "~/providers/UnifiedAuthProvider";
import { renderSnack } from "~/routes/__root";
import { localPollVotesAtom, type LocalVote } from "~/utils/atoms";

interface PollMutationContextType {
  castVote: (
    pollUri: string, 
    pollCid: string, 
    option: string, 
    isMultiple: boolean,
    currentServerVotes: string[] // Pass current user vote URIs to handle unvoting logic
  ) => Promise<void>;
  
  getLocalVotes: (pollUri: string) => LocalVote[];
}

const PollMutationContext = createContext<PollMutationContextType | undefined>(undefined);

export function PollMutationQueueProvider({ children }: { children: React.ReactNode }) {
  const { agent } = useAuth();
  const [localVotes, setLocalVotes] = useAtom(localPollVotesAtom);
  
  // Helper to safely update state
  const updateLocalState = useCallback((pollUri: string, updater: (prev: LocalVote[]) => LocalVote[]) => {
    setLocalVotes(prev => ({
      ...prev,
      [pollUri]: updater(prev[pollUri] || [])
    }));
  }, [setLocalVotes]);

  const getLocalVotes = useCallback((pollUri: string) => {
    return localVotes[pollUri] || [];
  }, [localVotes]);

  const castVote = useCallback(async (
    pollUri: string, 
    pollCid: string, 
    option: string, 
    isMultiple: boolean,
    currentServerVotes: string[] // Array of AT-URIs existing on server
  ) => {
    if (!agent?.did) return;

    const optionKey = option as 'a' | 'b' | 'c' | 'd';
    const timestamp = Date.now();

    // 1. DETERMINE ACTION: Are we adding or removing?
    // Check local state first, then server state
    const currentLocal = localVotes[pollUri] || [];
    
    // Is this option currently selected in our "Merged" view?
    // It's selected if it's in local state OR (in server state AND NOT specifically removed locally)
    // For simplicity in this logic, we will assume if local state exists, it overrides server state for that option.
    const isLocallySelected = currentLocal.find(v => v.option === optionKey);
    
    // Logic: Toggle
    if (isLocallySelected) {
      // --- UNVOTE OPERATION ---
      
      // 1. Optimistic Update: Remove from local state immediately
      updateLocalState(pollUri, (prev) => prev.filter(v => v.option !== optionKey));

      try {
        // If it was 'confirmed' (has a URI) or was a server vote, we delete.
        // If it was 'pending', we can't delete yet (complex edge case), strictly ideally we block interaction on pending.
        
        let uriToDelete = isLocallySelected.uri;
        
        // If local didn't have URI (rare race condition) check server votes
        if (!uriToDelete) {
           const serverMatch = currentServerVotes.find(v => v.includes(`app.reddwarf.poll.vote.${optionKey}`));
           if (serverMatch) uriToDelete = serverMatch;
        }

        if (uriToDelete) {
           const match = uriToDelete.match(/at:\/\/(.+)\/(.+)\/(.+)/);
           if (match) {
             const [, repo, collection, rkey] = match;
             await agent.com.atproto.repo.deleteRecord({ repo, collection, rkey });
           }
        }
      } catch (e) {
        console.error("Failed to unvote", e);
        renderSnack({ title: "Failed to remove vote" });
        // Revert: add it back
        updateLocalState(pollUri, (prev) => [...prev, isLocallySelected]);
      }

    } else {
      // --- VOTE OPERATION ---

      // 1. Optimistic Update: Add to local state
      const tempVote: LocalVote = { 
        pollUri, 
        option: optionKey, 
        status: 'pending', 
        timestamp 
      };

      updateLocalState(pollUri, (prev) => {
        const newState = isMultiple ? [...prev] : []; // If single choice, clear other local votes
        // Add new vote
        newState.push(tempVote);
        return newState;
      });

      // 2. Handle Single Choice - Network Side (Delete others)
      if (!isMultiple) {
        // We need to delete ANY existing votes (Server or Local Confirmed) that aren't this option
        // Note: The UI updated instantly above, so the user sees the switch. Now we assume the debt.
        const votesToDelete = [
            ...currentServerVotes, 
            ...(localVotes[pollUri]?.map(v => v.uri).filter(Boolean) as string[] || [])
        ];
        
        // Fire and forget deletions (or queue them)
        votesToDelete.forEach(voteUri => {
            if (voteUri.includes(`app.reddwarf.poll.vote.${optionKey}`)) return; // Don't delete self (shouldn't happen here but safety)
            const match = voteUri.match(/at:\/\/(.+)\/(.+)\/(.+)/);
            if (match) {
                const [, repo, collection, rkey] = match;
                agent.com.atproto.repo.deleteRecord({ repo, collection, rkey }).catch(console.error);
            }
        });
      }

      // 3. The 5-Second Grace Period Logic
      let isTimedOut = false;
      
      const timeoutPromise = new Promise<void>((resolve) => {
        setTimeout(() => {
          if (!isTimedOut) { // Check purely for closure capture
             // We check the *current* state. If it is still pending, we revert visual.
             // We access the ref/current state via the setter callback to be safe
             setLocalVotes(current => {
               const pollVotes = current[pollUri] || [];
               const myVote = pollVotes.find(v => v.option === optionKey && v.timestamp === timestamp);
               
               if (myVote && myVote.status === 'pending') {
                 isTimedOut = true;
                 // REVERT VISUALS (Requirement 1)
                 // We remove it from local state so the UI looks "unvoted", but the request continues.
                 return {
                   ...current,
                   [pollUri]: pollVotes.filter(v => v !== myVote)
                 };
               }
               return current;
             });
          }
          resolve();
        }, 5000);
      });

      // 4. Perform Network Request
      const performVote = async () => {
        try {
          const res = await agent.com.atproto.repo.createRecord({
            collection: `app.reddwarf.poll.vote.${optionKey}`,
            repo: agent.assertDid,
            record: {
              $type: `app.reddwarf.poll.vote.${optionKey}`,
              subject: { uri: pollUri, cid: pollCid },
              createdAt: new Date().toISOString(),
            },
          });

          // SUCCESS!
          
          // Requirement 2: Hold the URI.
          // We force this into the state with status 'confirmed'.
          // Even if we timed out earlier (and removed it), this puts it back!
          updateLocalState(pollUri, (prev) => {
             // Remove any pending entry for this option (if it exists)
             const clean = prev.filter(v => v.option !== optionKey);
             return [...clean, {
               pollUri,
               option: optionKey,
               status: 'confirmed',
               uri: res.data.uri,
               timestamp: Date.now() // Update timestamp to fresh
             }];
          });
          
        } catch (e) {
          console.error("Vote failed", e);
          if (!isTimedOut) {
            renderSnack({ title: "Vote failed" });
            // Revert optimistic state
            updateLocalState(pollUri, (prev) => prev.filter(v => v.timestamp !== timestamp));
          }
        }
      };

      // Run them
      // We don't await the timeout for the UI, but the timeout logic runs in parallel
      performVote(); 
      // We don't await performVote here to unblock UI, but the logic inside handles state updates
    }

  }, [agent, localVotes, updateLocalState, setLocalVotes]);

  return (
    <PollMutationContext value={{ castVote, getLocalVotes }}>
      {children}
    </PollMutationContext>
  );
}

export function usePollMutationQueue() {
  const context = use(PollMutationContext);
  if (!context) throw new Error("Missing PollMutationQueueProvider");
  return context;
}

export function usePollData(
  pollUri: string,
  isMultiple: boolean,
  serverCounts: { a: number; b: number; c: number; d: number },
  serverUserVotes: string[] // Array of AT-URIs (e.g. ['at://.../vote.a/...'])
) {
  const { getLocalVotes } = usePollMutationQueue();
  const localVotes = getLocalVotes(pollUri);

  return useMemo(() => {
    // 1. Identify which options the SERVER thinks we voted for
    const serverState = {
      a: serverUserVotes.some((uri) => uri.includes("app.reddwarf.poll.vote.a")),
      b: serverUserVotes.some((uri) => uri.includes("app.reddwarf.poll.vote.b")),
      c: serverUserVotes.some((uri) => uri.includes("app.reddwarf.poll.vote.c")),
      d: serverUserVotes.some((uri) => uri.includes("app.reddwarf.poll.vote.d")),
    };

    // 2. Identify which options LOCAL STATE thinks we voted for
    // (Pending or Confirmed Stale-While-Revalidate)
    const localState = {
      a: localVotes.some((v) => v.option === "a"),
      b: localVotes.some((v) => v.option === "b"),
      c: localVotes.some((v) => v.option === "c"),
      d: localVotes.some((v) => v.option === "d"),
    };

    // 3. Determine if we have ANY local activity
    // If this is Single Choice, and we have a local vote, strictly ignore server votes for other options.
    const hasAnyLocalVote = localVotes.length > 0;

    const calculateOptionState = (option: "a" | "b" | "c" | "d") => {
      const isLocallyVoted = localState[option];
      const isServerVoted = serverState[option];

      // STATUS MERGE:
      // If Single Choice: Local Vote overrides everything. 
      // If Multi Choice: Local Vote || Server Vote.
      let hasVoted = isLocallyVoted;
      
      if (!isMultiple) {
        // Single Choice Logic:
        // If we haven't touched this poll locally, trust the server.
        // If we HAVE touched it locally (voted for X), ignore server's Y.
        if (!hasAnyLocalVote && isServerVoted) {
          hasVoted = true;
        }
      } else {
        // Multi Choice Logic:
        // Simple Union. (Note: Unvoting in multi-choice with your provider might flicker 
        // because unvoting deletes the local record, causing fall-through to server record.
        // But adding votes works perfectly).
        hasVoted = isLocallyVoted || isServerVoted;
      }

      // COUNT MERGE:
      // Start with server count.
      let count = serverCounts[option] || 0;

      // If we show it as voted LOCALLY, but Server doesn't know yet -> Add 1
      if (isLocallyVoted && !isServerVoted) {
        count++;
      }
      
      // Edge Case: If we show it as NOT voted (because we switched to another option locally),
      // but Server still counts it -> Subtract 1 (Visual only)
      // This happens in single choice switching A -> B.
      // We want to decrement A visually while incrementing B.
      if (!isMultiple && hasAnyLocalVote && !isLocallyVoted && isServerVoted) {
        count = Math.max(0, count - 1);
      }

      return { hasVoted, count };
    };

    const stateA = calculateOptionState("a");
    const stateB = calculateOptionState("b");
    const stateC = calculateOptionState("c");
    const stateD = calculateOptionState("d");

    return {
      results: {
        a: stateA,
        b: stateB,
        c: stateC,
        d: stateD,
      },
      // Helper to check if user has interacted at all
      hasVotedAny: stateA.hasVoted || stateB.hasVoted || stateC.hasVoted || stateD.hasVoted,
      totalVotes: stateA.count + stateB.count + stateC.count + stateD.count
    };
  }, [localVotes, serverUserVotes, serverCounts, isMultiple]);
}