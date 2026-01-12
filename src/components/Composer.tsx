import { AppBskyRichtextFacet, RichText } from "@atproto/api";
import { TID } from "@atproto/common-web";
import { useAtom } from "jotai";
import { Dialog, Switch } from "radix-ui";
import { useEffect, useRef, useState } from "react";

import { useAuth } from "~/providers/UnifiedAuthProvider";
import { composerAtom } from "~/utils/atoms";
import { useQueryPost } from "~/utils/useQuery";

import { ProfileThing } from "./Login";
import { useOGGenerator } from "./OGPoll";
import { UniversalPostRendererATURILoader } from "./UniversalPostRenderer";

const MAX_POST_LENGTH = 300;

// Helper to calculate expiry dates
const addHours = (date: Date, h: number) => {
  const newDate = new Date(date);
  newDate.setTime(newDate.getTime() + h * 60 * 60 * 1000);
  return newDate;
};

export function Composer() {
  const { generate, element: generatorElement } = useOGGenerator();

  const [composerState, setComposerState] = useAtom(composerAtom);
  const { agent } = useAuth();

  const [postText, setPostText] = useState("");
  const [posting, setPosting] = useState(false);
  const [postSuccess, setPostSuccess] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);

  // Poll State
  const [showPoll, setShowPoll] = useState(false);
  const [pollData, setPollData] = useState({
    a: "",
    b: "",
    c: "",
    d: "",
    duration: "24",
    expiry: addHours(new Date(), 24),
  });

  useEffect(() => {
    // Reset Everything on Open/Close
    setPostText("");
    setPosting(false);
    setPostSuccess(false);
    setPostError(null);
    setShowPoll(false);
    setPollData({
      a: "",
      b: "",
      c: "",
      d: "",
      duration: "24",
      expiry: addHours(new Date(), 24),
    });
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
      const rkey = TID.nextStr();
      const rt = new RichText({ text: postText });
      await rt.detectFacets(agent);

      if (rt.facets?.length) {
        rt.facets = rt.facets.filter((item) => {
          if (item.$type !== "app.bsky.richtext.facet") return true;
          if (!item.features?.length) return true;

          item.features = item.features.filter((feature) => {
            if (feature.$type !== "app.bsky.richtext.facet#mention")
              return true;
            const did =
              feature.$type === "app.bsky.richtext.facet#mention"
                ? (feature as AppBskyRichtextFacet.Mention)?.did
                : undefined;
            return typeof did === "string" && did.startsWith("did:");
          });

          return item.features.length > 0;
        });
      }

      let uploadedPollImageBlob = null;

      // Only generate if we actually have poll data AND the user wants a poll
      if (showPoll && pollData.a && pollData.b) {
        // A. Generate the Base64 Data URL using the Client-Side Generator
        const dataUrl = await generate({
          a: pollData.a,
          b: pollData.b,
          c: pollData.c || undefined,
          d: pollData.d || undefined,
          expiry: pollData.expiry,
          multiple: true,
        });

        if (dataUrl) {
          // B. Convert DataURL to Blob
          const blob = await fetch(dataUrl).then((res) => res.blob());

          // C. Upload Blob to Bluesky/ATProto PDS
          const { data } = await agent.uploadBlob(blob, {
            encoding: "image/png",
          });

          uploadedPollImageBlob = data.blob;
        }
      }

      const record: Record<string, unknown> = {
        $type: "app.bsky.feed.post",
        text: rt.text,
        facets: rt.facets,
        createdAt: new Date().toISOString(),
      };

      let externalEmbed = null;

      // todo get real way of doing this better getting domain
      const domain = window.location.hostname;
      if (uploadedPollImageBlob) {
        externalEmbed = {
          $type: "app.bsky.embed.external",
          external: {
            uri: `https://${domain}/profile/${agent.did}/post/${rkey}`, // Todo: update to your actual poll viewer URL
            title: "Poll created by " + agent.did,
            description: "Click to participate in this poll",
            thumb: uploadedPollImageBlob,
          },
        };
      }

      // Handle Replies
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

      // Handle Quotes + Embeds
      if (composerState.kind === "quote" && parentPost) {
        const quoteEmbed = {
          $type: "app.bsky.embed.record",
          record: { uri: parentPost.uri, cid: parentPost.cid },
        };

        if (externalEmbed) {
          record.embed = {
            $type: "app.bsky.embed.recordWithMedia",
            media: externalEmbed,
            record: quoteEmbed,
          };
        } else {
          record.embed = quoteEmbed;
        }
      } else if (externalEmbed) {
        record.embed = externalEmbed;
      }

      const postResponse = await agent.com.atproto.repo.createRecord({
        collection: "app.bsky.feed.post",
        repo: agent.assertDid,
        record,
        rkey: rkey,
      });

      // Create poll embed record if poll data exists
      if (showPoll && pollData.a && pollData.b) {
        const pollRecord = {
          $type: "app.reddwarf.embed.poll",
          subject: {
            $type: "com.atproto.repo.strongRef",
            uri: `at://${agent.assertDid}/app.bsky.feed.post/${rkey}`,
            cid: postResponse.data.cid,
          },
          a: pollData.a,
          b: pollData.b,
          c: pollData.c || undefined,
          d: pollData.d || undefined,
          multiple: true,
          createdAt: new Date().toISOString(),
        };

        try {
          await agent.com.atproto.repo.createRecord({
            collection: "app.reddwarf.embed.poll",
            repo: agent.assertDid,
            record: pollRecord,
            rkey: rkey,
          });
        } catch (pollError) {
          console.error("Failed to create poll embed record:", pollError);
          // Don't fail the entire post if poll record creation fails
        }
      }

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
  // Disable if empty text OR if poll is active but only 1 option is filled
  const isPollInvalid = showPoll && (!pollData.a || !pollData.b);
  const isPostButtonDisabled =
    posting ||
    !postText.trim() ||
    isParentLoading ||
    charsLeft < 0 ||
    isPollInvalid;

  return (
    <>
      <Dialog.Root
        open={composerState.kind !== "closed"}
        onOpenChange={(open) => {
          if (!open) setComposerState({ kind: "closed" });
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed disablegutter inset-0 z-50 bg-black/40 dark:bg-black/50 data-[state=open]:animate-fadeIn" />

          <Dialog.Content className="fixed gutter overflow-y-scroll inset-0 z-50 flex items-start justify-center pt-10 sm:pt-20 pb-[50dvh] sm:pb-[50dvh]">
            <div className="bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl w-full max-w-xl relative mx-4">
              {/* HEADER */}
              <div className="flex flex-row justify-between p-2 items-center">
                <Dialog.Close asChild>
                  <button
                    className="h-8 w-8 flex items-center justify-center rounded-full text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
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
                    className="bg-gray-600 hover:bg-gray-700 text-white font-medium text-sm py-1.5 px-5 rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
                    onClick={handlePost}
                    disabled={isPostButtonDisabled}
                  >
                    {posting ? "Posting..." : "Post"}
                  </button>
                </div>
              </div>

              {/* BODY */}
              {postSuccess ? (
                <div className="flex flex-col items-center justify-center py-16 animate-in fade-in zoom-in duration-300">
                  <span className="text-gray-500 text-6xl mb-4">✓</span>
                  <span className="text-xl font-bold text-black dark:text-white">
                    Posted!
                  </span>
                </div>
              ) : (
                <div className="px-4 pb-4">
                  {/* REPLY CONTEXT */}
                  {composerState.kind === "reply" && (
                    <div className="mb-1 -mx-4">
                      {isParentLoading ? (
                        <div className="text-sm text-gray-500 animate-pulse px-4">
                          Loading parent post...
                        </div>
                      ) : parentUri ? (
                        <UniversalPostRendererATURILoader
                          atUri={parentUri}
                          bottomReplyLine
                          bottomBorder={false}
                        />
                      ) : null}
                    </div>
                  )}

                  <div className="flex w-full gap-3 flex-col">
                    <div className="flex flex-col gap-1">
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

                    {/* QUOTE CONTEXT */}
                    {composerState.kind === "quote" && (
                      <div className="ml-[52px] mb-4 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                        {isParentLoading ? (
                          <div className="p-4 text-sm text-gray-500 animate-pulse">
                            Loading parent post...
                          </div>
                        ) : parentUri ? (
                          <UniversalPostRendererATURILoader
                            atUri={parentUri}
                            isQuote
                          />
                        ) : null}
                      </div>
                    )}

                    {/* POLL FORM */}
                    <div className="pl-[52px] transition-all duration-300 ease-in-out">
                      {showPoll && (
                        <PollCreator
                          data={pollData}
                          onChange={setPollData}
                          disabled={posting}
                        />
                      )}
                    </div>

                    {/* TOOLS BAR (Switch) */}
                    <div className="pl-[52px] pt-2 flex items-center justify-between border-t border-gray-100 dark:border-gray-800 mt-2">
                      <div className="flex items-center gap-2">
                        <div className="text-gray-500 dark:text-gray-400">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <rect width="18" height="18" x="3" y="3" rx="2" />
                            <path d="M8 17h8" />
                            <path d="M8 12h8" />
                            <path d="M8 7h4" />
                          </svg>
                        </div>
                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400 select-none">
                          Create a Poll
                        </span>
                      </div>
                      <Switch.Root
                        checked={showPoll}
                        onCheckedChange={setShowPoll}
                        disabled={posting}
                        className="m3switch root"
                      >
                        <Switch.Thumb className="m3switch thumb" />
                      </Switch.Root>
                    </div>
                  </div>

                  {postError && (
                    <div className="text-red-500 bg-red-50 dark:bg-red-900/10 p-2 rounded-lg text-sm mt-4 text-center">
                      {postError}
                    </div>
                  )}
                </div>
              )}
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      {generatorElement}
    </>
  );
}

/**
 * Poll Creation Form
 * Follows Material Design 3 spacing and filled input styles
 */
function PollCreator({
  data,
  onChange,
  disabled,
}: {
  data: any;
  onChange: any;
  disabled: boolean;
}) {
  const handleChange = (field: string, val: string) => {
    onChange((prev: any) => ({ ...prev, [field]: val }));
  };

  // const handleDuration = (val: string) => {
  //   const hours = parseInt(val, 10);
  //   onChange((prev: any) => ({
  //     ...prev,
  //     duration: val,
  //     expiry: addHours(new Date(), hours),
  //   }));
  // };

  return (
    <div className="mt-2 p-4 bg-gray-100 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-800 space-y-3">
      {/* Option A */}
      <div className="relative group">
        <input
          type="text"
          placeholder="Option 1"
          className="block w-full px-3 pt-5 pb-2 text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 border-b-2 border-gray-300 dark:border-gray-600 rounded-t-lg focus:border-gray-600 dark:focus:border-gray-400 focus:outline-none peer placeholder-transparent"
          value={data.a}
          onChange={(e) => handleChange("a", e.target.value)}
          disabled={disabled}
        />
        <label className="absolute text-xs text-gray-500 dark:text-gray-400 duration-300 transform -translate-y-3 scale-75 top-4 z-10 origin-[0] left-3 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-3">
          Option 1 (Required)
        </label>
      </div>

      {/* Option B */}
      <div className="relative group">
        <input
          type="text"
          placeholder="Option 2"
          className="block w-full px-3 pt-5 pb-2 text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 border-b-2 border-gray-300 dark:border-gray-600 rounded-t-lg focus:border-gray-600 dark:focus:border-gray-400 focus:outline-none peer placeholder-transparent"
          value={data.b}
          onChange={(e) => handleChange("b", e.target.value)}
          disabled={disabled}
        />
        <label className="absolute text-xs text-gray-500 dark:text-gray-400 duration-300 transform -translate-y-3 scale-75 top-4 z-10 origin-[0] left-3 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-3">
          Option 2 (Required)
        </label>
      </div>

      {/* Option C */}
      <div className="relative group">
        <input
          type="text"
          placeholder="Option 3"
          className="block w-full px-3 pt-5 pb-2 text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 border-b-2 border-gray-300 dark:border-gray-600 rounded-t-lg focus:border-gray-600 dark:focus:border-gray-400 focus:outline-none peer placeholder-transparent"
          value={data.c}
          onChange={(e) => handleChange("c", e.target.value)}
          disabled={disabled}
        />
        <label className="absolute text-xs text-gray-500 dark:text-gray-400 duration-300 transform -translate-y-3 scale-75 top-4 z-10 origin-[0] left-3 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-3">
          Option 3 (Optional)
        </label>
      </div>

      {/* Option D */}
      <div className="relative group">
        <input
          type="text"
          placeholder="Option 4"
          className="block w-full px-3 pt-5 pb-2 text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 border-b-2 border-gray-300 dark:border-gray-600 rounded-t-lg focus:border-gray-600 dark:focus:border-gray-400 focus:outline-none peer placeholder-transparent"
          value={data.d}
          onChange={(e) => handleChange("d", e.target.value)}
          disabled={disabled}
        />
        <label className="absolute text-xs text-gray-500 dark:text-gray-400 duration-300 transform -translate-y-3 scale-75 top-4 z-10 origin-[0] left-3 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-3">
          Option 4 (Optional)
        </label>
      </div>

      {/* <div className="flex flex-col gap-1 pt-2">
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider pl-1">
          Poll Duration
        </label>
        <div className="relative">
          <select
            value={data.duration}
            onChange={(e) => handleDuration(e.target.value)}
            disabled={disabled}
            className="appearance-none block w-full px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-200"
          >
            <option value="1">1 Hour</option>
            <option value="6">6 Hours</option>
            <option value="12">12 Hours</option>
            <option value="24">1 Day</option>
            <option value="72">3 Days</option>
            <option value="168">7 Days</option>
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
            <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20">
              <path
                d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                clipRule="evenodd"
                fillRule="evenodd"
              ></path>
            </svg>
          </div>
        </div>
      </div> */}
    </div>
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
