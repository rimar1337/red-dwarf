import { RichText } from "@atproto/api";
import { useAtom } from "jotai";
import { Dialog } from "radix-ui";
import { useEffect, useRef, useState } from "react";

import { useAuth } from "~/providers/UnifiedAuthProvider";
import { composerAtom } from "~/utils/atoms";
import { useQueryPost } from "~/utils/useQuery";

import { ProfileThing } from "./Login";
import { UniversalPostRendererATURILoader } from "./UniversalPostRenderer";

const MAX_POST_LENGTH = 300;

export function Composer() {
  const [composerState, setComposerState] = useAtom(composerAtom);
  const { agent } = useAuth();

  const [postText, setPostText] = useState("");
  const [posting, setPosting] = useState(false);
  const [postSuccess, setPostSuccess] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);

  useEffect(() => {
    setPostText("");
    setPosting(false);
    setPostSuccess(false);
    setPostError(null);
  }, [composerState.kind]);

  const parentUri =
    composerState.kind === "reply"
      ? composerState.parent
      : composerState.kind === "quote"
        ? composerState.subject
        : undefined;

  const { data: parentPost, isLoading: isParentLoading } =
    useQueryPost(parentUri);

  async function handlePost() {
    if (!agent || !postText.trim() || postText.length > MAX_POST_LENGTH) return;

    setPosting(true);
    setPostError(null);

    try {
      const rt = new RichText({ text: postText });
      await rt.detectFacets(agent);

      const record: Record<string, unknown> = {
        $type: "app.bsky.feed.post",
        text: rt.text,
        facets: rt.facets,
        createdAt: new Date().toISOString(),
      };

      if (composerState.kind === "reply" && parentPost) {
        record.reply = {
          root: parentPost.value?.reply?.root ?? {
            uri: parentPost.uri,
            cid: parentPost.cid,
          },
          parent: {
            uri: parentPost.uri,
            cid: parentPost.cid,
          },
        };
      }

      if (composerState.kind === "quote" && parentPost) {
        record.embed = {
          $type: "app.bsky.embed.record",
          record: {
            uri: parentPost.uri,
            cid: parentPost.cid,
          },
        };
      }

      await agent.com.atproto.repo.createRecord({
        collection: "app.bsky.feed.post",
        repo: agent.assertDid,
        record,
      });

      setPostSuccess(true);
      setPostText("");

      setTimeout(() => {
        setPostSuccess(false);
        setComposerState({ kind: "closed" });
      }, 1500);
    } catch (e: any) {
      setPostError(e?.message || "Failed to post");
    } finally {
      setPosting(false);
    }
  }
  // if (composerState.kind === "closed") {
  //   return null;
  // }

  const getPlaceholder = () => {
    switch (composerState.kind) {
      case "reply":
        return "Post your reply";
      case "quote":
        return "Add a comment...";
      case "root":
      default:
        return "What's happening?!";
    }
  };

  const charsLeft = MAX_POST_LENGTH - postText.length;
  const isPostButtonDisabled =
    posting || !postText.trim() || isParentLoading || charsLeft < 0;

  return (
    <Dialog.Root
      open={composerState.kind !== "closed"}
      onOpenChange={(open) => {
        if (!open) setComposerState({ kind: "closed" });
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 dark:bg-black/50 data-[state=open]:animate-fadeIn" />

        <Dialog.Content className="fixed overflow-y-scroll inset-0 z-50 flex items-start justify-center py-10 sm:py-20">
          <div className="bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl w-full max-w-xl relative mx-4">
            <div className="flex flex-row justify-between p-2">
              <Dialog.Close asChild>
                <button
                  className="h-8 w-8 flex items-center justify-center rounded-full text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                  disabled={posting}
                  aria-label="Close"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </Dialog.Close>

              <div className="flex-1" />
              <div className="flex items-center gap-4">
                <span
                  className={`text-sm ${charsLeft < 0 ? "text-red-500" : "text-gray-500"}`}
                >
                  {charsLeft}
                </span>
                <button
                  className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-1 px-4 rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  onClick={handlePost}
                  disabled={isPostButtonDisabled}
                >
                  {posting ? "Posting..." : "Post"}
                </button>
              </div>
            </div>

            {postSuccess ? (
              <div className="flex flex-col items-center justify-center py-16">
                <span className="text-gray-500 text-6xl mb-4">✓</span>
                <span className="text-xl font-bold text-black dark:text-white">
                  Posted!
                </span>
              </div>
            ) : (
              <div className="px-4">
                {composerState.kind === "reply" && (
                  <div className="mb-1 -mx-4">
                    {isParentLoading ? (
                      <div className="text-sm text-gray-500 animate-pulse">
                        Loading parent post...
                      </div>
                    ) : parentUri ? (
                      <UniversalPostRendererATURILoader
                        atUri={parentUri}
                        bottomReplyLine
                        bottomBorder={false}
                      />
                    ) : (
                      <div className="text-sm text-red-500 rounded-lg border border-red-500/50 p-3">
                        Could not load parent post.
                      </div>
                    )}
                  </div>
                )}

                <div className="flex w-full gap-1 flex-col">
                  <ProfileThing agent={agent} large />
                  <div className="flex pl-[50px]">
                    <AutoGrowTextarea
                      className="w-full text-lg bg-transparent focus:outline-none resize-none placeholder:text-gray-500 text-black dark:text-white pb-2"
                      rows={5}
                      placeholder={getPlaceholder()}
                      value={postText}
                      onChange={(e) => setPostText(e.target.value)}
                      disabled={posting}
                      autoFocus
                    />
                  </div>
                </div>

                {composerState.kind === "quote" && (
                  <div className="mb-4 ml-[50px] rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                    {isParentLoading ? (
                      <div className="text-sm text-gray-500 animate-pulse">
                        Loading parent post...
                      </div>
                    ) : parentUri ? (
                      <UniversalPostRendererATURILoader
                        atUri={parentUri}
                        isQuote
                      />
                    ) : (
                      <div className="text-sm text-red-500 rounded-lg border border-red-500/50 p-3">
                        Could not load parent post.
                      </div>
                    )}
                  </div>
                )}

                {postError && (
                  <div className="text-red-500 text-sm my-2 text-center">
                    {postError}
                  </div>
                )}
              </div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function AutoGrowTextarea({
  value,
  className,
  onChange,
  ...props
}: React.DetailedHTMLProps<
  React.TextareaHTMLAttributes<HTMLTextAreaElement>,
  HTMLTextAreaElement
>) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  }, [value]);

  return (
    <textarea
      ref={ref}
      className={className}
      value={value}
      onChange={onChange}
      {...props}
    />
  );
}
