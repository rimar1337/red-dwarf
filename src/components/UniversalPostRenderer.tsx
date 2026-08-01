import * as ATPAPI from "@atproto/api";
import {
  AppBskyActorDefs,
  AppBskyFeedDefs,
  AppBskyFeedPost,
  AtUri,
  type Facet,
} from "@atproto/api";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import DOMPurify from "dompurify";
import { useAtom } from "jotai";
import { DropdownMenu } from "radix-ui";
import { HoverCard } from "radix-ui";
import * as React from "react";
import { useEffect, useState } from "react";

import {
  FORCE_HIDE_LABELS,
  FORCE_HIDE_LABELS_WHITELISTED_SOURCE,
  UNAUTHED_PREVENT_OPENING_WARNS,
} from "~/../policy";
import defaultpfp from "~/../public/defaultpfp.png";
import { getGetHydratedLabelDefs, useAutoLabels } from "~/hooks/useAutoLabels";
import { useLabelInfo } from "~/hooks/useLabelInfo";
//import { useModeration } from "~/hooks/useModeration";
import { useAuth } from "~/providers/UnifiedAuthProvider";
import { renderSnack } from "~/routes/__root";
//import { ModerationInner } from "~/routes/moderation";
import {
  FollowButton,
  getLocaleLabel,
  type LabelWithHydratedLocaleName,
  Mutual,
} from "~/routes/profile.$did";
import type { LightboxProps } from "~/routes/profile.$did/post.$rkey.image.$i";
//import type { ContentLabel } from "~/types/moderation";
import {
  appviewUrlAtom,
  composerAtom,
  constellationURLAtom,
  enableAppViewAtom,
  enableBridgyTextAtom,
  enableWafrnTextAtom,
  imgCDNAtom,
} from "~/utils/atoms";
import { useGetOneToOneState } from "~/utils/followState";
import { useFastLike } from "~/utils/likeMutationQueue";
import { getAvatarUrl, useHydratedEmbed } from "~/utils/useHydrated";
import {
  type GetRecordJSON,
  useQueryConstellation,
  useQueryIdentity,
  useQueryPost,
  useQueryProfile,
  useQuerySingularAVPostQuery,
  yknowIReallyHateThisButWhateverGuardedConstructConstellationInfiniteQueryLinks,
} from "~/utils/useQuery";

import { PostEmbeds, PostEmbedViewContext } from "./PostEmbeds";
import {
  btnstyle,
  fullDateTimeFormat,
  HitSlopButton,
  randomString,
  renderTextWithFacets,
  shortTimeAgo,
} from "./UtilityFunctions";

export interface UniversalPostRendererATURILoaderProps {
  atUri: string;
  onConstellation?: (data: any) => void;
  detailed?: boolean;
  bottomReplyLine?: boolean;
  topReplyLine?: boolean;
  bottomBorder?: boolean;
  feedviewpost?: boolean;
  repostedby?: string;
  style?: React.CSSProperties;
  ref?: React.RefObject<HTMLDivElement>;
  dataIndexPropPass?: number;
  nopics?: boolean;
  concise?: boolean;
  lightboxCallback?: (d: LightboxProps) => void;
  maxReplies?: number;
  isQuote?: boolean;
  filterNoReplies?: boolean;
  filterMustHaveMedia?: boolean;
  filterMustBeReply?: boolean;
}

export function UniversalPostRendererATURILoader({
  atUri,
  onConstellation,
  detailed = false,
  bottomReplyLine,
  topReplyLine,
  bottomBorder = true,
  feedviewpost = false,
  repostedby,
  style,
  ref,
  dataIndexPropPass,
  nopics,
  concise,
  lightboxCallback,
  maxReplies,
  isQuote,
  filterNoReplies,
  filterMustHaveMedia,
  filterMustBeReply,
}: UniversalPostRendererATURILoaderProps) {
  const [usesAV] = useAtom(enableAppViewAtom);
  if (usesAV) {
    return (
      <UniversalPostRendererATURILoader_AppView
        atUri={atUri}
        onConstellation={onConstellation}
        detailed={detailed}
        bottomReplyLine={bottomReplyLine}
        topReplyLine={topReplyLine}
        bottomBorder={bottomBorder}
        feedviewpost={feedviewpost}
        repostedby={repostedby}
        style={style}
        ref={ref}
        dataIndexPropPass={dataIndexPropPass}
        nopics={nopics}
        concise={concise}
        lightboxCallback={lightboxCallback}
        maxReplies={maxReplies}
        isQuote={isQuote}
        filterNoReplies={filterNoReplies}
        filterMustHaveMedia={filterMustHaveMedia}
        filterMustBeReply={filterMustBeReply}
      />
    );
  }
  return (
    <UniversalPostRendererATURILoader_Microcosm
      atUri={atUri}
      onConstellation={onConstellation}
      detailed={detailed}
      bottomReplyLine={bottomReplyLine}
      topReplyLine={topReplyLine}
      bottomBorder={bottomBorder}
      feedviewpost={feedviewpost}
      repostedby={repostedby}
      style={style}
      ref={ref}
      dataIndexPropPass={dataIndexPropPass}
      nopics={nopics}
      concise={concise}
      lightboxCallback={lightboxCallback}
      maxReplies={maxReplies}
      isQuote={isQuote}
      filterNoReplies={filterNoReplies}
      filterMustHaveMedia={filterMustHaveMedia}
      filterMustBeReply={filterMustBeReply}
    />
  );
}
/* 
  todo:
  - either
    - put constellation based reply threading or
    - use a getPostThreadV2 once for quick reply threadings (the post thread page always 
      fetches replies via constellation for complteness)
  - do the profile pages too
 */
export function UniversalPostRendererATURILoader_AppView({
  atUri,
  onConstellation,
  detailed = false,
  bottomReplyLine,
  topReplyLine,
  bottomBorder = true,
  feedviewpost = false,
  repostedby,
  style,
  ref,
  dataIndexPropPass,
  nopics,
  concise,
  lightboxCallback,
  maxReplies,
  isQuote,
  filterNoReplies,
  filterMustHaveMedia,
  filterMustBeReply,
}: UniversalPostRendererATURILoaderProps) {
  const [avurl] = useAtom(appviewUrlAtom);
  const navigate = useNavigate();
  const parsedaturi = new AtUri(atUri);

  const [selfBottomBorder, setSelfBottomBorder] = useState(true);
  const [selfBottomReplyLine, setSelfBottomReplyLine] = useState(false);

  // todo: consider providing an option to opt into constellation counts instead of the appview's
  const { data, isLoading, isEnabled, isError, error } =
    useQuerySingularAVPostQuery({ aturi: atUri, avurl: avurl });

  const thereply = (data?.record as AppBskyFeedPost.Record)?.reply?.parent?.uri;
  const feedviewpostreplydid =
    thereply && !filterNoReplies ? new AtUri(thereply).host : undefined;
  const replyhookvalue = useQueryIdentity(
    feedviewpost ? feedviewpostreplydid : undefined,
  );
  const feedviewpostreplyhandle = replyhookvalue?.data?.handle;

  const aturirepostbydid = repostedby ? new AtUri(repostedby).host : undefined;
  const repostedbyhookvalue = useQueryIdentity(
    repostedby ? aturirepostbydid : undefined,
  );
  const feedviewpostrepostedbyhandle = repostedbyhookvalue?.data?.handle;
  if (!isLoading && data === undefined) {
    return (
      <UniversalPostRendererATURILoader_Microcosm
        atUri={atUri}
        onConstellation={onConstellation}
        detailed={detailed}
        bottomReplyLine={bottomReplyLine}
        topReplyLine={topReplyLine}
        bottomBorder={bottomBorder}
        feedviewpost={feedviewpost}
        repostedby={repostedby}
        style={style}
        ref={ref}
        dataIndexPropPass={dataIndexPropPass}
        nopics={nopics}
        concise={concise}
        lightboxCallback={lightboxCallback}
        maxReplies={maxReplies}
        isQuote={isQuote}
        filterNoReplies={filterNoReplies}
        filterMustHaveMedia={filterMustHaveMedia}
        filterMustBeReply={filterMustBeReply}
      />
    );
  }

  const hasEmbed = (data?.record as AppBskyFeedPost.Record)?.embed;
  const hasImages = hasEmbed?.$type === "app.bsky.embed.images";
  const hasGallery = hasEmbed?.$type === "app.bsky.embed.gallery";
  const hasVideo = hasEmbed?.$type === "app.bsky.embed.video";
  const isquotewithmedia = hasEmbed?.$type === "app.bsky.embed.recordWithMedia";
  const isQuotewithImages =
    isquotewithmedia &&
    (hasEmbed as ATPAPI.AppBskyEmbedRecordWithMedia.Main)?.media?.$type ===
      "app.bsky.embed.images";
  const isQuotewithVideo =
    isquotewithmedia &&
    (hasEmbed as ATPAPI.AppBskyEmbedRecordWithMedia.Main)?.media?.$type ===
      "app.bsky.embed.video";
  const isQuotewithGallery =
    isquotewithmedia &&
    (hasEmbed as ATPAPI.AppBskyEmbedRecordWithMedia.Main)?.media?.$type ===
      "app.bsky.embed.gallery";

  const hasMedia =
    hasEmbed &&
    (hasImages ||
      hasVideo ||
      hasGallery ||
      isQuotewithImages ||
      isQuotewithVideo ||
      isQuotewithGallery);

  if (filterNoReplies && thereply) return null;

  if (filterMustHaveMedia && !hasMedia) return null;

  if (filterMustBeReply && !thereply) return null;

  const replies = data?.replyCount || 0;

  function selfBottomBorderCallback(selfBottomBorderValue: boolean): void {
    setSelfBottomBorder(selfBottomBorderValue);
  }
  function selfBottomReplyLineCallback(setSelfReplyLineValue: boolean): void {
    setSelfBottomReplyLine(setSelfReplyLineValue);
  }

  return (
    <>
      <UniversalPostRenderer
        referral={["appview"]}
        expanded={detailed}
        onPostClick={() =>
          parsedaturi &&
          navigate({
            to: "/profile/$did/post/$rkey",
            params: { did: parsedaturi.host, rkey: parsedaturi.rkey },
            resetScroll: false,
          })
        }
        onProfileClick={(e) => {
          e.stopPropagation();
          if (parsedaturi) {
            navigate({
              to: "/profile/$did",
              params: { did: parsedaturi.host },
            });
          }
        }}
        post={
          data || {
            uri: atUri,
            cid: atUri,
            author: {
              did: parsedaturi.host,
              handle: parsedaturi.host,
            },
            record: {},
            indexedAt: "",
          }
        } // todo: this is bad. just make it so that UPR allows missing data
        uprrrsauthor={{
          ...(data?.author || {
            did: parsedaturi.host,
            handle: parsedaturi.host,
          }),
          $type: "app.bsky.actor.defs#profileViewDetailed",
        }}
        salt={atUri}
        bottomReplyLine={selfBottomReplyLine}
        topReplyLine={topReplyLine}
        bottomBorder={selfBottomBorder}
        feedviewpost={feedviewpost}
        feedviewpostreplyhandle={feedviewpostreplyhandle}
        repostedby={feedviewpostrepostedbyhandle}
        style={style}
        ref={ref}
        dataIndexPropPass={dataIndexPropPass}
        nopics={nopics}
        concise={concise}
        lightboxCallback={lightboxCallback}
        maxReplies={maxReplies}
        isQuote={isQuote}
        constellationLinks={{}}
      />
      {replies > 0 && (
        <MicrocosmReplyChainFetcher
          atUri={atUri}
          maxReplies={maxReplies}
          replies={replies}
          isQuote={isQuote}
          bottomBorder={bottomBorder}
          bottomReplyLine={bottomReplyLine}
          feedviewpost={feedviewpost}
          repostedby={repostedby}
          style={style}
          ref={ref}
          dataIndexPropPass={dataIndexPropPass}
          nopics={nopics}
          concise={concise}
          lightboxCallback={lightboxCallback}
          bottomBorderCallback={selfBottomBorderCallback}
          bottomReplyLineCallback={selfBottomReplyLineCallback}
        />
      )}
    </>
  );
}
export function UniversalPostRendererATURILoader_Microcosm({
  atUri,
  onConstellation,
  detailed = false,
  bottomReplyLine,
  topReplyLine,
  bottomBorder = true,
  feedviewpost = false,
  repostedby,
  style,
  ref,
  dataIndexPropPass,
  nopics,
  concise,
  lightboxCallback,
  maxReplies,
  isQuote,
  filterNoReplies,
  filterMustHaveMedia,
  filterMustBeReply,
}: UniversalPostRendererATURILoaderProps) {
  // todo remove this once tree rendering is implemented, use a prop like isTree
  const TEMPLINEAR = true;
  const parsed = new AtUri(atUri);
  const did = parsed?.host;
  const rkey = parsed?.rkey;

  const {
    data: postQuery,
    isLoading: isPostLoading,
    isError: isPostError,
  } = useQueryPost(atUri);

  const { data: resolved } = useQueryIdentity(did || "");

  const { data: links } = useQueryConstellation({
    method: "/links/all",
    target: atUri,
  });

  const { data: opProfile } = useQueryProfile(
    resolved ? `at://${resolved?.did}/app.bsky.actor.profile/self` : undefined,
  );

  //const [likes, setLikes] = React.useState<number | null>(null);
  //const [reposts, setReposts] = React.useState<number | null>(null);
  //const [replies, setReplies] = React.useState<number | null>(null);

  const likes = links
    ? links?.links?.["app.bsky.feed.like"]?.[".subject.uri"]?.records || 0
    : null;

  const reposts = links
    ? // add the two quote forms as well
      links?.links?.["app.bsky.feed.repost"]?.[".subject.uri"]?.records +
        // .embed.record.uri
        links?.links?.["app.bsky.feed.post"]?.[".embed.record.uri"]?.records +
        // .embed.record.record.uri
        links?.links?.["app.bsky.feed.post"]?.[".embed.record.record.uri"]
          ?.records || 0
    : null;

  const replies = links
    ? links?.links?.["app.bsky.feed.post"]?.[".reply.parent.uri"]?.records || 0
    : null;

  const [constellationurl] = useAtom(constellationURLAtom);

  const infinitequeryresults = useInfiniteQuery({
    ...yknowIReallyHateThisButWhateverGuardedConstructConstellationInfiniteQueryLinks(
      {
        constellation: constellationurl,
        method: "/links",
        target: atUri,
        collection: "app.bsky.feed.post",
        path: ".reply.parent.uri",
      },
    ),
    enabled: !!atUri && !!maxReplies && !isQuote,
  });

  const { data: repliesData } = infinitequeryresults;

  useEffect(() => {
    if (!maxReplies || isQuote || TEMPLINEAR) return;
    if (
      infinitequeryresults.hasNextPage &&
      !infinitequeryresults.isFetchingNextPage
    ) {
      console.log("Fetching the next page...");
      infinitequeryresults.fetchNextPage();
    }
  }, [TEMPLINEAR, infinitequeryresults, isQuote, maxReplies]);

  const replyAturis = repliesData
    ? repliesData.pages.flatMap((page) =>
        page
          ? page.linking_records.map((record) => {
              const aturi = `at://${record.did}/${record.collection}/${record.rkey}`;
              return aturi;
            })
          : [],
      )
    : [];

  const { oldestOpsReply, oldestOpsReplyElseNewestNonOpsReply } = (() => {
    if (isQuote || !replyAturis || replyAturis.length === 0 || !maxReplies)
      return {
        oldestOpsReply: undefined,
        oldestOpsReplyElseNewestNonOpsReply: undefined,
      };

    const opdid = new AtUri(atUri).host;

    const opReplies = replyAturis.filter(
      (aturi) => new AtUri(aturi).host === opdid,
    );

    if (opReplies.length > 0) {
      const opreply = opReplies[opReplies.length - 1];
      return {
        oldestOpsReply: opreply,
        oldestOpsReplyElseNewestNonOpsReply: opreply,
      };
    } else {
      return {
        oldestOpsReply: undefined,
        oldestOpsReplyElseNewestNonOpsReply: replyAturis[0],
      };
    }
  })();

  // placeholder for when a post is missing
  if ((!isPostLoading && !postQuery?.value) || isPostError) {
    if (feedviewpost) {
      return null; // if feed view post then missing post isnt important and just remove it from view
    }
    return (
      <>
        {/* todo add reply lines here. */}
        {/* todo dont let the UPR render the shitty placeholder uri we received */}
        {/* <div className={`flex flex-row p-4 ${isQuote ? "border-gray-200 dark:border-gray-800 border-1 rounded-lg" : "border-gray-200 dark:border-gray-800 border-b"}`}> */}

        <div
          className={`flex flex-col gap-0 border-gray-200 dark:border-gray-800 ${bottomReplyLine ? "" : "border-b"}`}
        >
          <div
            style={{ width: 42, height: 16, minHeight: 16 }}
            className="flex items-center flex-col mx-4"
          >
            <div
              style={{
                width: 2,
                height: 16,
                opacity: 0.5,
              }}
              className={`${topReplyLine ? "bg-gray-500 dark:bg-gray-400" : "bg-transparent"}`}
            />
          </div>
          <div className="flex flex-row px-4">
            <div className="flex flex-col gap-1 flex-1 rounded-lg py-3 px-4 bg-gray-200 dark:bg-gray-800">
              <div className="flex flex-row flex-1 gap-2 rounded-lg bg-gray-200 dark:bg-gray-800 items-center">
                <IconMaterialSymbolsScanDeleteOutline />
                <span>Missing {isQuote ? "Quoted" : ""} Post</span>
              </div>
            </div>
          </div>

          <div
            style={{ width: 42, height: 16, minHeight: 16 }}
            className="flex items-center flex-col mx-4"
          >
            <div
              style={{
                width: 2,
                height: 16,
                opacity: 0.5,
              }}
              // maxReplies === undefined to specifically prevent missing apost from threading down with more missings posts
              // shouldnt affect thread up (parent) or feed view. im pretty sure missinga post would cut off the thread
              className={`${bottomReplyLine && maxReplies === undefined ? "bg-gray-500 dark:bg-gray-400" : "bg-transparent"}`}
            />
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <UniversalPostRendererRawRecordShim
        detailed={detailed}
        postRecord={postQuery}
        profileRecord={opProfile}
        aturi={atUri}
        resolved={resolved}
        likesCount={likes}
        repostsCount={reposts}
        repliesCount={replies}
        links={links}
        bottomReplyLine={
          maxReplies && oldestOpsReplyElseNewestNonOpsReply
            ? true
            : maxReplies && !oldestOpsReplyElseNewestNonOpsReply
              ? false
              : maxReplies === 0 && (!replies || (!!replies && replies === 0))
                ? false
                : bottomReplyLine
        }
        topReplyLine={topReplyLine}
        bottomBorder={
          maxReplies && oldestOpsReplyElseNewestNonOpsReply
            ? false
            : maxReplies === 0
              ? false
              : bottomBorder
        }
        feedviewpost={feedviewpost}
        repostedby={repostedby}
        style={style}
        ref={ref}
        dataIndexPropPass={dataIndexPropPass}
        nopics={nopics}
        concise={concise}
        lightboxCallback={lightboxCallback}
        maxReplies={maxReplies}
        isQuote={isQuote}
        filterNoReplies={filterNoReplies}
        filterMustHaveMedia={filterMustHaveMedia}
        filterMustBeReply={filterMustBeReply}
      />
      <MicrocosmReplyChainRenderer
        atUri={atUri}
        maxReplies={maxReplies}
        replies={replies}
        isQuote={isQuote}
        oldestOpsReplyElseNewestNonOpsReply={
          oldestOpsReplyElseNewestNonOpsReply
        }
        bottomBorder={bottomBorder}
        feedviewpost={feedviewpost}
        repostedby={repostedby}
        style={style}
        ref={ref}
        dataIndexPropPass={dataIndexPropPass}
        nopics={nopics}
        concise={concise}
        lightboxCallback={lightboxCallback}
      />
    </>
  );
}

// todo: consider moving this entire logic inside of _AppView
function MicrocosmReplyChainFetcher({
  atUri,
  maxReplies,
  replies,
  isQuote,
  bottomBorder = true,
  bottomReplyLine = false,
  feedviewpost = false,
  repostedby,
  style,
  ref,
  dataIndexPropPass,
  nopics,
  concise,
  lightboxCallback,
  bottomBorderCallback,
  bottomReplyLineCallback,
}: {
  atUri: string;
  maxReplies?: number;
  replies: number | null;
  isQuote?: boolean;
  bottomBorder?: boolean;
  bottomReplyLine?: boolean;
  feedviewpost?: boolean;
  repostedby?: string;
  style?: React.CSSProperties;
  ref?: React.RefObject<HTMLDivElement>;
  dataIndexPropPass?: number;
  nopics?: boolean;
  concise?: boolean;
  lightboxCallback?: (d: LightboxProps) => void;
  bottomBorderCallback?: (bottomBorder: boolean) => void;
  bottomReplyLineCallback?: (bottomReplyLine: boolean) => void;
}) {
  // todo remove this once tree rendering is implemented, use a prop like isTree
  const TEMPLINEAR = true;
  const [constellationurl] = useAtom(constellationURLAtom);

  const infinitequeryresults = useInfiniteQuery({
    ...yknowIReallyHateThisButWhateverGuardedConstructConstellationInfiniteQueryLinks(
      {
        constellation: constellationurl,
        method: "/links",
        target: atUri,
        collection: "app.bsky.feed.post",
        path: ".reply.parent.uri",
      },
    ),
    enabled: !!atUri && !!maxReplies && !isQuote,
  });

  const { data: repliesData } = infinitequeryresults;

  useEffect(() => {
    if (!maxReplies || isQuote || TEMPLINEAR) return;
    if (
      infinitequeryresults.hasNextPage &&
      !infinitequeryresults.isFetchingNextPage
    ) {
      console.log("Fetching the next page...");
      infinitequeryresults.fetchNextPage();
    }
  }, [TEMPLINEAR, infinitequeryresults, isQuote, maxReplies]);

  const replyAturis = repliesData
    ? repliesData.pages.flatMap((page) =>
        page
          ? page.linking_records.map((record) => {
              const aturi = `at://${record.did}/${record.collection}/${record.rkey}`;
              return aturi;
            })
          : [],
      )
    : [];
  const { oldestOpsReply, oldestOpsReplyElseNewestNonOpsReply } = (() => {
    if (isQuote || !replyAturis || replyAturis.length === 0 || !maxReplies)
      return {
        oldestOpsReply: undefined,
        oldestOpsReplyElseNewestNonOpsReply: undefined,
      };

    const opdid = new AtUri(atUri).host;

    const opReplies = replyAturis.filter(
      (aturi) => new AtUri(aturi).host === opdid,
    );

    if (opReplies.length > 0) {
      const opreply = opReplies[opReplies.length - 1];
      return {
        oldestOpsReply: opreply,
        oldestOpsReplyElseNewestNonOpsReply: opreply,
      };
    } else {
      return {
        oldestOpsReply: undefined,
        oldestOpsReplyElseNewestNonOpsReply: replyAturis[0],
      };
    }
  })();

  const parentBottomBorder =
    maxReplies && oldestOpsReplyElseNewestNonOpsReply
      ? false
      : maxReplies === 0
        ? false
        : bottomBorder;

  const parentBottomReplyLine =
    maxReplies && oldestOpsReplyElseNewestNonOpsReply
      ? true
      : maxReplies && !oldestOpsReplyElseNewestNonOpsReply
        ? false
        : maxReplies === 0 && (!replies || (!!replies && replies === 0))
          ? false
          : bottomReplyLine;

  if (bottomBorderCallback) {
    bottomBorderCallback(parentBottomBorder);
  }
  if (bottomReplyLineCallback) {
    bottomReplyLineCallback(parentBottomReplyLine);
  }

  return (
    <MicrocosmReplyChainRenderer
      atUri={atUri}
      maxReplies={maxReplies}
      replies={replies}
      isQuote={isQuote}
      oldestOpsReplyElseNewestNonOpsReply={oldestOpsReplyElseNewestNonOpsReply}
      bottomBorder={bottomBorder}
      feedviewpost={feedviewpost}
      repostedby={repostedby}
      style={style}
      ref={ref}
      dataIndexPropPass={dataIndexPropPass}
      nopics={nopics}
      concise={concise}
      lightboxCallback={lightboxCallback}
    />
  );
}

function MicrocosmReplyChainRenderer({
  atUri,
  maxReplies,
  replies,
  isQuote,
  oldestOpsReplyElseNewestNonOpsReply,
  bottomBorder = true,
  feedviewpost = false,
  repostedby,
  style,
  ref,
  dataIndexPropPass,
  nopics,
  concise,
  lightboxCallback,
}: {
  atUri: string;
  maxReplies?: number;
  replies: number | null;
  isQuote?: boolean;
  oldestOpsReplyElseNewestNonOpsReply?: string;
  bottomBorder?: boolean;
  feedviewpost?: boolean;
  repostedby?: string;
  style?: React.CSSProperties;
  ref?: React.RefObject<HTMLDivElement>;
  dataIndexPropPass?: number;
  nopics?: boolean;
  concise?: boolean;
  lightboxCallback?: (d: LightboxProps) => void;
}) {
  return (
    <>
      <>
        {maxReplies !== undefined &&
        maxReplies === 0 &&
        replies &&
        replies > 0 ? (
          <>
            <MoreReplies atUri={atUri} />
          </>
        ) : (
          <></>
        )}
      </>
      {!isQuote && oldestOpsReplyElseNewestNonOpsReply && (
        <>
          <UniversalPostRendererATURILoader
            atUri={oldestOpsReplyElseNewestNonOpsReply}
            bottomReplyLine={(maxReplies ?? 0) > 0}
            topReplyLine={
              (!!(maxReplies && maxReplies - 1 === 0) &&
                !!(replies && replies > 0)) ||
              !!((maxReplies ?? 0) > 1)
            }
            bottomBorder={bottomBorder}
            feedviewpost={feedviewpost}
            repostedby={repostedby}
            style={style}
            ref={ref}
            dataIndexPropPass={dataIndexPropPass}
            nopics={nopics}
            concise={concise}
            lightboxCallback={lightboxCallback}
            maxReplies={
              maxReplies && maxReplies > 0 ? maxReplies - 1 : undefined
            }
          />
        </>
      )}
    </>
  );
}

function MoreReplies({ atUri }: { atUri: string }) {
  const navigate = useNavigate();
  const aturio = new AtUri(atUri);
  return (
    <div
      onClick={() =>
        navigate({
          to: "/profile/$did/post/$rkey",
          params: { did: aturio.host, rkey: aturio.rkey },
          resetScroll: false,
        })
      }
      className="border-b border-gray-200 dark:border-gray-800 flex flex-row px-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
    >
      <div className="w-[42px] h-12 flex flex-col items-center justify-center">
        <div
          style={{
            width: 2,
            height: "100%",
            backgroundImage:
              "repeating-linear-gradient(to bottom, var(--color-gray-500) 0, var(--color-gray-500) 4px, transparent 4px, transparent 8px)",
            opacity: 0.5,
          }}
          className="dark:bg-[repeating-linear-gradient(to_bottom,var(--color-gray-500)_0,var(--color-gray-400)_4px,transparent_4px,transparent_8px)]"
        />
      </div>

      <div className="flex items-center pl-3 text-sm text-gray-500 dark:text-gray-400 select-none">
        More Replies
      </div>
    </div>
  );
}

// todo please do it properly
function selfLabelsToLabels(
  selfLabels: ATPAPI.ComAtprotoLabelDefs.SelfLabels | undefined,
  ctx: { src: string; uri: string; cid?: string; cts: string },
): ATPAPI.ComAtprotoLabelDefs.Label[] {
  return (selfLabels?.values ?? []).map((self) => ({
    $type: "com.atproto.label.defs#label",
    src: ctx.src, // author DID
    uri: ctx.uri, // record at-uri
    cid: ctx.cid, // record cid
    val: self.val,
    cts: ctx.cts, // AppView uses indexedAt; for raw records use record.createdAt
    neg: false,
  }));
}

export function UniversalPostRendererRawRecordShim({
  postRecord,
  profileRecord,
  aturi,
  resolved,
  likesCount,
  repostsCount,
  repliesCount,
  links,
  detailed = false,
  bottomReplyLine = false,
  topReplyLine = false,
  bottomBorder = true,
  feedviewpost = false,
  repostedby,
  style,
  ref,
  dataIndexPropPass,
  nopics,
  concise,
  lightboxCallback,
  maxReplies,
  isQuote,
  filterNoReplies,
  filterMustHaveMedia,
  filterMustBeReply,
}: {
  postRecord?: GetRecordJSON<ATPAPI.AppBskyFeedPost.Record>;
  profileRecord?: GetRecordJSON<ATPAPI.AppBskyActorProfile.Record>;
  aturi: string;
  resolved: any;
  likesCount?: number | null;
  repostsCount?: number | null;
  repliesCount?: number | null;
  links?: any;
  detailed?: boolean;
  bottomReplyLine?: boolean;
  topReplyLine?: boolean;
  bottomBorder?: boolean;
  feedviewpost?: boolean;
  repostedby?: string;
  style?: React.CSSProperties;
  ref?: React.RefObject<HTMLDivElement>;
  dataIndexPropPass?: number;
  nopics?: boolean;
  concise?: boolean;
  lightboxCallback?: (d: LightboxProps) => void;
  maxReplies?: number;
  isQuote?: boolean;
  filterNoReplies?: boolean;
  filterMustHaveMedia?: boolean;
  filterMustBeReply?: boolean;
}) {
  const navigate = useNavigate();

  const hasEmbed = (postRecord?.value as AppBskyFeedPost.Record)?.embed;
  const hasImages = hasEmbed?.$type === "app.bsky.embed.images";
  const hasGallery = hasEmbed?.$type === "app.bsky.embed.gallery";
  const hasVideo = hasEmbed?.$type === "app.bsky.embed.video";
  const isquotewithmedia = hasEmbed?.$type === "app.bsky.embed.recordWithMedia";
  const isQuotewithImages =
    isquotewithmedia &&
    (hasEmbed as ATPAPI.AppBskyEmbedRecordWithMedia.Main)?.media?.$type ===
      "app.bsky.embed.images";
  const isQuotewithVideo =
    isquotewithmedia &&
    (hasEmbed as ATPAPI.AppBskyEmbedRecordWithMedia.Main)?.media?.$type ===
      "app.bsky.embed.video";
  const isQuotewithGallery =
    isquotewithmedia &&
    (hasEmbed as ATPAPI.AppBskyEmbedRecordWithMedia.Main)?.media?.$type ===
      "app.bsky.embed.gallery";

  const hasMedia =
    hasEmbed &&
    (hasImages ||
      hasVideo ||
      hasGallery ||
      isQuotewithImages ||
      isQuotewithVideo ||
      isQuotewithGallery);

  const {
    data: hydratedEmbed,
    isLoading: isEmbedLoading,
    error: embedError,
  } = useHydratedEmbed(postRecord?.value?.embed, resolved?.did);

  const [imgcdn] = useAtom(imgCDNAtom);

  const parsedaturi = new AtUri(aturi);

  const fakeprofileviewbasic = React.useMemo<AppBskyActorDefs.ProfileViewBasic>(
    () => ({
      did: resolved?.did || "",
      handle: resolved?.handle || "",
      displayName: profileRecord?.value?.displayName || "",
      avatar: getAvatarUrl(imgcdn, profileRecord?.value, resolved?.did) || "",
      viewer: undefined,
      labels:
        selfLabelsToLabels(
          profileRecord?.value.labels as ATPAPI.ComAtprotoLabelDefs.SelfLabels,
          {
            src: resolved?.did || "",
            uri: profileRecord?.uri || "",
            cid: profileRecord?.cid,
            cts: profileRecord?.value?.createdAt || "",
          },
        ) || undefined,
      verification: undefined,
      pronouns: profileRecord?.value?.pronouns || undefined,
    }),
    [imgcdn, profileRecord, resolved?.did, resolved?.handle],
  );

  const fakeprofileviewdetailed =
    React.useMemo<AppBskyActorDefs.ProfileViewDetailed>(
      () => ({
        ...fakeprofileviewbasic,
        $type: "app.bsky.actor.defs#profileViewDetailed",
        description: profileRecord?.value?.description || undefined,
      }),
      [fakeprofileviewbasic, profileRecord?.value?.description],
    );

  const fakepost = React.useMemo<AppBskyFeedDefs.PostView>(
    () => ({
      $type: "app.bsky.feed.defs#postView",
      uri: aturi,
      cid: postRecord?.cid || "",
      author: fakeprofileviewbasic,
      record: postRecord?.value || {},
      embed: hydratedEmbed ?? undefined,
      replyCount: repliesCount ?? 0,
      repostCount: repostsCount ?? 0,
      likeCount: likesCount ?? 0,
      quoteCount: 0,
      indexedAt: postRecord?.value?.createdAt || "",
      viewer: undefined,
      labels:
        selfLabelsToLabels(
          postRecord?.value?.labels as ATPAPI.ComAtprotoLabelDefs.SelfLabels,
          {
            src: resolved?.did || "",
            uri: postRecord?.uri || "",
            cid: postRecord?.cid,
            cts: postRecord?.value?.createdAt || "",
          },
        ) || undefined,
      threadgate: undefined,
    }),
    [
      aturi,
      postRecord?.cid,
      postRecord?.value,
      postRecord?.uri,
      fakeprofileviewbasic,
      hydratedEmbed,
      repliesCount,
      repostsCount,
      likesCount,
      resolved?.did,
    ],
  );

  const thereply = (fakepost?.record as AppBskyFeedPost.Record)?.reply?.parent
    ?.uri;
  const feedviewpostreplydid =
    thereply && !filterNoReplies ? new AtUri(thereply).host : undefined;
  const replyhookvalue = useQueryIdentity(
    feedviewpost ? feedviewpostreplydid : undefined,
  );
  const feedviewpostreplyhandle = replyhookvalue?.data?.handle;

  const aturirepostbydid = repostedby ? new AtUri(repostedby).host : undefined;
  const repostedbyhookvalue = useQueryIdentity(
    repostedby ? aturirepostbydid : undefined,
  );
  const feedviewpostrepostedbyhandle = repostedbyhookvalue?.data?.handle;

  if (filterNoReplies && thereply) return null;

  if (filterMustHaveMedia && !hasMedia) return null;

  if (filterMustBeReply && !thereply) return null;

  return (
    <>
      <UniversalPostRenderer
        expanded={detailed}
        onPostClick={() =>
          parsedaturi &&
          navigate({
            to: "/profile/$did/post/$rkey",
            params: { did: parsedaturi.host, rkey: parsedaturi.rkey },
            resetScroll: false,
          })
        }
        onProfileClick={(e) => {
          e.stopPropagation();
          if (parsedaturi) {
            navigate({
              to: "/profile/$did",
              params: { did: parsedaturi.host },
            });
          }
        }}
        post={fakepost}
        uprrrsauthor={fakeprofileviewdetailed}
        salt={aturi}
        bottomReplyLine={bottomReplyLine}
        topReplyLine={topReplyLine}
        bottomBorder={bottomBorder}
        feedviewpost={feedviewpost}
        feedviewpostreplyhandle={feedviewpostreplyhandle}
        repostedby={feedviewpostrepostedbyhandle}
        style={style}
        ref={ref}
        dataIndexPropPass={dataIndexPropPass}
        nopics={nopics}
        concise={concise}
        lightboxCallback={lightboxCallback}
        maxReplies={maxReplies}
        isQuote={isQuote}
        constellationLinks={links}
      />
    </>
  );
}

export function UniversalPostRenderer({
  post,
  uprrrsauthor,
  onPostClick,
  onProfileClick,
  expanded,
  isQuote,
  extraOptionalItemInfo,
  bottomReplyLine,
  topReplyLine,
  salt,
  bottomBorder = true,
  feedviewpost,
  feedviewpostreplyhandle,
  depth = 0,
  repostedby,
  style,
  ref,
  dataIndexPropPass,
  nopics,
  concise,
  lightboxCallback,
  maxReplies,
  constellationLinks,
  referral,
}: {
  post: AppBskyFeedDefs.PostView;
  uprrrsauthor?: AppBskyActorDefs.ProfileViewDetailed;
  onPostClick?: (e: React.MouseEvent) => void;
  onProfileClick?: (e: React.MouseEvent) => void;
  expanded?: boolean;
  isQuote?: boolean;
  extraOptionalItemInfo?: AppBskyFeedDefs.FeedViewPost;
  bottomReplyLine?: boolean;
  topReplyLine?: boolean;
  salt: string;
  bottomBorder?: boolean;
  feedviewpost?: boolean;
  feedviewpostreplyhandle?: string;
  depth?: number;
  repostedby?: string;
  style?: React.CSSProperties;
  ref?: React.RefObject<HTMLDivElement>;
  dataIndexPropPass?: number;
  nopics?: boolean;
  concise?: boolean;
  lightboxCallback?: (d: LightboxProps) => void;
  maxReplies?: number;
  constellationLinks?: any;
  referral?: string[];
}) {
  // todo move moderation to one of the UniversalPostRenderer wrapper components, and not the pure renderer component. please. thanks
  // todo please move all moderation including labeling and blocks into a wrapper component please i beg you

  const subjects = [
    post.author.did,
    `at://${post.author.did}/app.bsky.actor.profile/self`,
    post.uri,
  ];

  const { results: labelResults, hydratedLabelDefs } = useAutoLabels({
    subjects,
    type: "post", // or whatever you’re keying on for now
  });

  const ghld = getGetHydratedLabelDefs(hydratedLabelDefs);
  const accountResult = labelResults.get(post.author.did);
  const profileResult = labelResults.get(
    `at://${post.author.did}/app.bsky.actor.profile/self`,
  );
  const postResult = labelResults.get(post.uri);

  const accountLabelVerdict = accountResult?.labelVerdict ?? "unknown";
  const authorLabels = accountResult?.labels ?? [];

  const profileLabelVerdict = profileResult?.labelVerdict ?? "unknown";
  const profileLabels = profileResult?.labels ?? [];

  const postLabelVerdict = postResult?.labelVerdict ?? "unknown";
  const contentLabels = postResult?.labels ?? [];

  const combinedLabels = [...authorLabels, ...profileLabels, ...contentLabels];

  const authorModUnknown = accountLabelVerdict === "unknown";
  const profileModUnknown = profileLabelVerdict === "unknown";
  const contentModUnknown = postLabelVerdict === "unknown";

  const authorModLoading = accountLabelVerdict === "loading";
  const profileModLoading = profileLabelVerdict === "loading";
  const contentModLoading = postLabelVerdict === "loading";

  const authorModError = accountLabelVerdict === "error";
  const profileModError = profileLabelVerdict === "error";
  const contentModError = postLabelVerdict === "error";

  const verdictDebugString = `accountLabelVerdict: ${accountLabelVerdict}, profileLabelVerdict: ${profileLabelVerdict}, postLabelVerdict: ${postLabelVerdict}`;
  //const verdictDebugStringCauses =

  const strictModerationUnknown =
    authorModUnknown || profileModUnknown || contentModUnknown;
  const strictModerationLoading =
    authorModLoading || profileModLoading || contentModLoading;
  const strictModerationError =
    authorModError || profileModError || contentModError;

  const strictModerationDontShow =
    strictModerationUnknown || strictModerationLoading || strictModerationError;

  const hideAuthorLabels = authorLabels.filter(
    (label) => ghld(label.src, label.val)?.pref === "hide",
  );
  const warnAuthorLabels = authorLabels.filter(
    (label) => ghld(label.src, label.val)?.pref === "warn",
  );
  // const errorAuthorLabels = authorLabels.filter(
  //   //(label) => ghld(label.src,label.val)?.severity === "hide",
  // );
  const hideProfileLabels = profileLabels.filter(
    (label) => ghld(label.src, label.val)?.pref === "hide",
  );
  const warnProfileLabels = profileLabels.filter(
    (label) => ghld(label.src, label.val)?.pref === "warn",
  );
  const hideContentLabels = contentLabels.filter(
    (label) => ghld(label.src, label.val)?.pref === "hide",
  );
  const warnContentLabels = contentLabels.filter(
    (label) => ghld(label.src, label.val)?.pref === "warn",
  );

  // add user pronouns
  const pronoun = post.author.pronouns || undefined;
  const informCombinedLabels: LabelWithHydratedLocaleName[] =
    combinedLabels.flatMap((label) => {
      if (
        ghld(label.src, label.val)?.severity === "inform" &&
        ghld(label.src, label.val)?.pref === "warn"
      ) {
        return [
          {
            ...label,
            name: getLocaleLabel(ghld(label.src, label.val))?.name || label.val,
          },
        ];
      }
      return [];
    });

  const parsed = new AtUri(post.uri);
  const navigate = useNavigate();
  const [hasRetweeted, setHasRetweeted] = useState<boolean>(
    post.viewer?.repost ? true : false,
  );
  const [, setComposerPost] = useAtom(composerAtom);
  const { agent, status } = useAuth();
  const [retweetUri, setRetweetUri] = useState<string | undefined>(
    post.viewer?.repost,
  );
  const { liked, toggle, backfill } = useFastLike(post.uri, post.cid);

  const agentDid = agent?.did;
  const authorDid = post.author.did;

  const userBlocksAuthor = useGetOneToOneState(
    agentDid && authorDid
      ? {
          target: authorDid,
          user: agentDid,
          collection: "app.bsky.graph.block",
          path: ".subject",
        }
      : undefined,
  );
  const authorBlocksUser = useGetOneToOneState(
    agentDid && authorDid
      ? {
          target: agentDid,
          user: authorDid,
          collection: "app.bsky.graph.block",
          path: ".subject",
        }
      : undefined,
  );

  const repostOrUnrepostPost = async () => {
    if (!agent) {
      console.error("Agent is null or undefined");
      return;
    }
    if (hasRetweeted) {
      if (retweetUri) {
        await agent.deleteRepost(retweetUri);
        setHasRetweeted(false);
      }
    } else {
      const { uri } = await agent.repost(post.uri, post.cid);
      setRetweetUri(uri);
      setHasRetweeted(true);
    }
  };

  const isRepost = repostedby
    ? repostedby
    : extraOptionalItemInfo
      ? AppBskyFeedDefs.isReasonRepost(extraOptionalItemInfo.reason)
        ? extraOptionalItemInfo.reason?.by.displayName
        : undefined
      : undefined;
  const isReply = extraOptionalItemInfo
    ? extraOptionalItemInfo.reply
    : undefined;

  const emergencySalt = randomString();

  const [showBridgyText] = useAtom(enableBridgyTextAtom);
  const [showWafrnText] = useAtom(enableWafrnTextAtom);

  const unfedibridgy = (post.record as { bridgyOriginalText?: string })
    .bridgyOriginalText;
  const unfediwafrnPartial = (post.record as { fullText?: string }).fullText;
  const unfediwafrnTags = (post.record as { fullTags?: string }).fullTags;
  const unfediwafrnUnHost = (post.record as { fediverseId?: string })
    .fediverseId;

  const undfediwafrnHost = unfediwafrnUnHost
    ? new URL(unfediwafrnUnHost).hostname
    : undefined;

  const tags = unfediwafrnTags
    ? unfediwafrnTags
        .split("\n")
        .map((t) => t.trim())
        .filter(Boolean)
    : undefined;

  const links = tags
    ? tags
        .map((tag) => {
          const encoded = encodeURIComponent(tag);
          return `<a href="https://${undfediwafrnHost}/search/${encoded}" target="_blank">#${tag.replaceAll(" ", "-")}</a>`;
        })
        .join("<br>")
    : "";

  const unfediwafrn = unfediwafrnPartial
    ? unfediwafrnPartial + (links ? `<br>${links}` : "")
    : undefined;

  const fedi =
    (showBridgyText ? unfedibridgy : undefined) ??
    (showWafrnText ? unfediwafrn : undefined);

  const isMainItem = false;
  const setMainItem = (any: any) => {};

  const hideWarnsWhenUnauthed =
    UNAUTHED_PREVENT_OPENING_WARNS && status === "signedOut";

  const showContentWarning = warnContentLabels.length > 0;

  const [isOpen, setIsOpen] = useState(!showContentWarning);

  const [hasUserTouchedToggleYet, setHasUserTouchedToggleYet] = useState(false);

  // Force Hiddens from host policy
  const isForceHiddenAuthor = authorLabels.some((label) => {
    return (
      FORCE_HIDE_LABELS.has(label.val) &&
      FORCE_HIDE_LABELS_WHITELISTED_SOURCE.has(label.src)
    );
  });
  const isForceHiddenProfile = profileLabels.some((label) => {
    return (
      FORCE_HIDE_LABELS.has(label.val) &&
      FORCE_HIDE_LABELS_WHITELISTED_SOURCE.has(label.src)
    );
  });
  const isForceHiddenPost = contentLabels.some((label) => {
    return (
      FORCE_HIDE_LABELS.has(label.val) &&
      FORCE_HIDE_LABELS_WHITELISTED_SOURCE.has(label.src)
    );
  });
  const isForceHidden =
    isForceHiddenAuthor || isForceHiddenProfile || isForceHiddenPost;

  useEffect(() => {
    if (!hasUserTouchedToggleYet && showContentWarning) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsOpen(false);
    }
  }, [hasUserTouchedToggleYet, showContentWarning]);

  console.log(
    "HLLO HLLO HisForceHidden post UPR" +
      post.uri +
      post.author.did +
      isForceHidden,
    "1what",
    contentLabels,
    "2what",
    authorLabels,
  );

  // if (hideAuthorLabels.length > 0 || hideContentLabels.length > 0 || isForceHidden || strictModerationDontShow) {
  //   return (
  //     <div ref={ref} style={style} data-index={dataIndexPropPass} className=" leading-normal flex flex-col gap-4 p-4">
  //       <span>DEBUG LOADING LABELS</span>
  //       <span>{post.uri}</span>
  //       <span>{verdictDebugString}</span>
  //     </div>
  //   );
  // }
  // if ( isForceHidden ) {
  //   return (
  //     <div ref={ref} style={style} data-index={dataIndexPropPass} className=" leading-normal flex flex-col gap-4 p-4">
  //       Post Hidden
  //     </div>
  //   )
  // }

  // todo respect the blur label def
  // todo scrap the verdict system and rename it into what it is (loading state)
  const redactWhileLoadingAuthor =
    authorModLoading || authorModError || authorModUnknown;
  const redactWhileLoadingProfile =
    profileModLoading || profileModError || profileModUnknown;
  const redactWhileLoadingPost =
    contentModLoading || contentModError || contentModUnknown;
  const redactWhileLoadingBlock =
    userBlocksAuthor.isLoading || authorBlocksUser.isLoading;
  const redactWhileLoadingSome =
    redactWhileLoadingAuthor ||
    redactWhileLoadingProfile ||
    redactWhileLoadingPost ||
    redactWhileLoadingBlock;
  /**
   * maybe rules:
   * if author is loading, hide everything
   * if post is loading, hide text and embeds
   * if profile is loading, hide pfp
   */

  // the  || !post.record?.createdAt is so that users cant imply theyre replying to a non existant post by a user
  // if the post doesnt exist, dont render the name or pfp

  const redactWhileLoading_name =
    redactWhileLoadingAuthor ||
    !post.record?.createdAt ||
    redactWhileLoadingBlock;
  const redactWhileLoading_content =
    redactWhileLoadingAuthor ||
    redactWhileLoadingPost ||
    !post.record?.createdAt ||
    redactWhileLoadingBlock;
  const redactWhileLoading_pfp =
    redactWhileLoadingAuthor ||
    redactWhileLoadingProfile ||
    !post.record?.createdAt ||
    redactWhileLoadingBlock;

  const redactFinalBlock =
    userBlocksAuthor.uris.length > 0 || authorBlocksUser.uris.length > 0;

  const redactFinalAuthor =
    hideAuthorLabels.length > 0 || isForceHiddenAuthor || redactFinalBlock;
  const redactFinalProfile =
    hideProfileLabels.length > 0 || isForceHiddenProfile || redactFinalBlock;
  const redactFinalPost =
    hideContentLabels.length > 0 || isForceHiddenPost || redactFinalBlock;

  const redactFinalSome =
    redactFinalAuthor ||
    redactFinalProfile ||
    redactFinalPost ||
    redactFinalBlock;

  const hasEmbed = (post.record as AppBskyFeedPost.Record)?.embed; //(postRecord?.value as AppBskyFeedPost.Record)?.embed;
  const hasImages = hasEmbed?.$type === "app.bsky.embed.images";
  const hasGallery = hasEmbed?.$type === "app.bsky.embed.gallery";
  const hasVideo = hasEmbed?.$type === "app.bsky.embed.video";
  const isquotewithmedia = hasEmbed?.$type === "app.bsky.embed.recordWithMedia";
  const isQuotewithImages =
    isquotewithmedia &&
    (hasEmbed as ATPAPI.AppBskyEmbedRecordWithMedia.Main)?.media?.$type ===
      "app.bsky.embed.images";
  const isQuotewithVideo =
    isquotewithmedia &&
    (hasEmbed as ATPAPI.AppBskyEmbedRecordWithMedia.Main)?.media?.$type ===
      "app.bsky.embed.video";
  const isQuotewithGallery =
    isquotewithmedia &&
    (hasEmbed as ATPAPI.AppBskyEmbedRecordWithMedia.Main)?.media?.$type ===
      "app.bsky.embed.gallery";

  const hasMedia =
    hasEmbed &&
    (hasImages ||
      hasVideo ||
      hasGallery ||
      isQuotewithImages ||
      isQuotewithVideo ||
      isQuotewithGallery);

  const hasAnyGallery = isQuotewithGallery || hasGallery;
  const expandNameForGallery =
    hasAnyGallery &&
    ((post.record as { text?: string }).text ?? "") === "" &&
    !isQuote &&
    !nopics;

  // todo consider if adding an explicit "post removed" visible component is better for this
  //if (redactFinalSome) return null
  // todo preserve reply lines
  // todo share the component with the Missing post from above
  if (redactFinalSome) {
    if (feedviewpost) {
      return null; // if feed view post then moderated post isnt important and just remove it from view
    }
    return (
      <div
        className={`flex flex-col gap-0 border-gray-200 dark:border-gray-800 ${bottomReplyLine ? "" : "border-b"}`}
        onClick={
          isMainItem
            ? onPostClick
            : setMainItem
              ? onPostClick
                ? (e) => {
                    setMainItem({ post: post });
                    onPostClick(e);
                  }
                : () => {
                    setMainItem({ post: post });
                  }
              : undefined
        }
      >
        <div
          style={{ width: 42, height: 16, minHeight: 16 }}
          className="flex items-center flex-col mx-4"
        >
          <div
            style={{
              width: 2,
              height: 16,
              opacity: 0.5,
            }}
            className={`${topReplyLine ? "bg-gray-500 dark:bg-gray-400" : "bg-transparent"}`}
          />
        </div>

        <div className="flex flex-row px-4">
          <div className="flex flex-col gap-1 flex-1 rounded-lg py-3 px-4 bg-gray-200 dark:bg-gray-800">
            <div className="flex flex-row flex-1 gap-2 items-center">
              <IconMdiShieldOutline width={18} height={18} />
              <span className=" font-semibold text-[15px]">Moderated Post</span>
            </div>
            <ul className="flex flex-col gap-0.5 list-disc list-outside">
              {userBlocksAuthor.uris.length > 0 && (
                <li className=" text-sm ml-[18px]">User Blocked by You</li>
              )}
              {authorBlocksUser.uris.length > 0 && (
                <li className=" text-sm ml-[18px]">User Blocking You</li>
              )}
              {hideAuthorLabels.length > 0 && (
                <>
                  {hideAuthorLabels.map((label) => {
                    return (
                      <li
                        key={label.cid || label.exp}
                        className=" text-sm ml-[18px]"
                      >
                        Author Label:{" "}
                        {getLocaleLabel(ghld(label.src, label.val))?.name ||
                          label.val}
                      </li>
                    );
                  })}
                </>
              )}
              {hideProfileLabels.length > 0 && (
                <>
                  {hideProfileLabels.map((label) => {
                    return (
                      <li
                        key={label.cid || label.exp}
                        className=" text-sm ml-[18px]"
                      >
                        Profile Label:{" "}
                        {getLocaleLabel(ghld(label.src, label.val))?.name ||
                          label.val}
                      </li>
                    );
                  })}
                </>
              )}
              {hideContentLabels.length > 0 && (
                <>
                  {hideContentLabels.map((label) => {
                    return (
                      <li
                        key={label.cid || label.exp}
                        className=" text-sm ml-[18px]"
                      >
                        Post Label:{" "}
                        {getLocaleLabel(ghld(label.src, label.val))?.name ||
                          label.val}
                      </li>
                    );
                  })}
                </>
              )}
            </ul>
          </div>
        </div>

        <div
          style={{ width: 42, height: 16, minHeight: 16 }}
          className="flex items-center flex-col mx-4"
        >
          <div
            style={{
              width: 2,
              height: 16,
              opacity: 0.5,
            }}
            className={`${bottomReplyLine ? "bg-gray-500 dark:bg-gray-400" : "bg-transparent"}`}
          />
        </div>
      </div>
    );
  }

  // ${redactWhileLoadingSome && "blur"}
  return (
    <div
      ref={ref}
      style={style}
      data-index={dataIndexPropPass}
      className={` leading-normal `}
    >
      {/* <span>{JSON.stringify(post, null, 2)}</span> */}
      <div
        key={salt + "-" + (post.uri || emergencySalt)}
        onClick={
          isMainItem
            ? onPostClick
            : setMainItem
              ? onPostClick
                ? (e) => {
                    setMainItem({ post: post });
                    onPostClick(e);
                  }
                : () => {
                    setMainItem({ post: post });
                  }
              : undefined
        }
        style={{
          opacity: "1 !important",
          background: "transparent",
          paddingLeft: isQuote ? 12 : 16,
          paddingRight: isQuote ? 12 : 16,
          paddingTop: isRepost ? 10 : isQuote ? 12 : topReplyLine ? 8 : 16,
          paddingBottom: 0,
          fontFamily: "system-ui, sans-serif",
          position: "relative",
          borderBottomWidth: bottomBorder ? (isQuote ? 0 : 1) : 0,
        }}
        className="border-gray-200 dark:border-gray-800"
      >
        {isRepost && (
          <div
            style={{
              marginLeft: 36,
              display: "flex",
              borderRadius: 12,
              paddingBottom: "calc(22px - 1rem)",
              fontSize: 14,
              maxHeight: "1rem",
              justifyContent: "flex-start",
              gap: 4,
              alignItems: "center",
            }}
            className="text-gray-500 dark:text-gray-400"
            // todo moderate reposts (label, and record graph)
          >
            <IconMdiRepost /> Reposted by @{isRepost}
          </div>
        )}
        {!isQuote && (
          <div
            style={{
              opacity: topReplyLine || isReply ? 0.5 : 0,
              position: "absolute",
              top: 0,
              left: 36,
              width: 2,
              height: isRepost
                ? "calc(16px + 1rem - 6px)"
                : topReplyLine
                  ? 8 - 6
                  : 16 - 6,
            }}
            className="bg-gray-500 dark:bg-gray-400"
          />
        )}
        <HoverCard.Root>
          <HoverCard.Trigger asChild>
            <div
              className={`absolute`}
              style={{
                top: isRepost
                  ? "calc(16px + 1rem)"
                  : isQuote
                    ? 12
                    : topReplyLine
                      ? 8
                      : 16,
                left: isQuote ? 12 : 16,
              }}
              onClick={onProfileClick}
            >
              {redactWhileLoading_pfp ? (
                <div
                  className="rounded-full object-cover border border-gray-300 dark:border-gray-800 bg-gray-300 dark:bg-gray-600 animate-pulse"
                  style={{
                    width: isQuote ? 16 : 42,
                    height: isQuote ? 16 : 42,
                  }}
                />
              ) : (
                <img
                  src={post.author.avatar || defaultpfp}
                  alt="avatar"
                  className={`rounded-full object-cover border border-gray-300 dark:border-gray-800 bg-gray-300 dark:bg-gray-600`}
                  style={{
                    width: isQuote ? 16 : 42,
                    height: isQuote ? 16 : 42,
                  }}
                />
              )}
            </div>
          </HoverCard.Trigger>
          <HoverCard.Portal>
            <HoverCard.Content
              className="rounded-md p-4 w-72 bg-gray-50 dark:bg-gray-900 shadow-lg border border-gray-300 dark:border-gray-800 animate-slide-fade z-50"
              side={"bottom"}
              sideOffset={5}
              onClick={onProfileClick}
            >
              <div className="flex flex-col gap-2">
                <div className="flex flex-row">
                  {redactWhileLoading_pfp ? (
                    <div className="rounded-full w-[58px] h-[58px] object-cover border border-gray-300 dark:border-gray-800 bg-gray-300 dark:bg-gray-600 animate-pulse" />
                  ) : (
                    <img
                      src={post.author.avatar || defaultpfp}
                      alt="avatar"
                      className="rounded-full w-[58px] h-[58px] object-cover border border-gray-300 dark:border-gray-800 bg-gray-300 dark:bg-gray-600"
                    />
                  )}
                  <div className=" flex-1 flex flex-row align-middle justify-end">
                    <FollowButton targetdidorhandle={post.author.did} />
                  </div>
                </div>
                <div className="flex flex-col gap-3">
                  <div>
                    <div
                      className={`text-gray-900 dark:text-gray-100 font-medium text-md ${redactWhileLoading_name && "animate-pulse blur"}`}
                    >
                      {redactWhileLoading_name
                        ? "Person Display Name"
                        : post.author.displayName || post.author.handle}
                    </div>
                    <div
                      className={`text-gray-500 dark:text-gray-400 text-md flex flex-row gap-1 ${redactWhileLoading_name && "animate-pulse blur"}`}
                    >
                      <Mutual targetdidorhandle={post.author.did} />@
                      {redactWhileLoading_name
                        ? "person.placeholder"
                        : post.author.handle}
                    </div>
                  </div>
                  {uprrrsauthor?.description && (
                    <div className="text-gray-700 dark:text-gray-300 text-sm text-left break-words line-clamp-3">
                      {uprrrsauthor.description}
                    </div>
                  )}
                </div>
              </div>
            </HoverCard.Content>
          </HoverCard.Portal>
        </HoverCard.Root>

        <div style={{ display: "flex", alignItems: "flex-start", zIndex: 2 }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignSelf: "stretch",
              alignItems: "center",
              overflow: "hidden",
              width: expanded || isQuote ? 0 : "auto",
              marginRight: expanded || isQuote ? 0 : 12,
            }}
            className=" shrink-0"
          >
            <div style={{ width: 42, height: 42 + 6, minHeight: 42 + 6 }} />
            {bottomReplyLine && (
              <div
                style={{
                  width: 2,
                  height: "100%",
                  opacity: 0.5,
                }}
                className="bg-gray-500 dark:bg-gray-400"
              />
            )}
          </div>
          <div style={{ flex: 1, maxWidth: "100%", minWidth: 0 }}>
            <div
              style={{
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                flexWrap: "nowrap",
                maxWidth: `calc(100% - ${!expanded ? (isQuote ? 26 : 0) : 54}px)`,
                width: `calc(100% - ${!expanded ? (isQuote ? 26 : 0) : 54}px)`,
                marginLeft: !expanded ? (isQuote ? 26 : 0) : 54,
                marginBottom: !expanded ? 4 : 6,
              }}
            >
              <div
                style={{
                  display: "flex",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  flexShrink: 1,
                  flexGrow: 1,
                  flexBasis: 0,
                  width: 0,
                  gap: expanded ? 0 : 6,
                  alignItems: expanded ? "flex-start" : "center",
                  flexDirection: expanded ? "column" : "row",
                  height: expanded ? 42 : expandNameForGallery ? 32 : "1rem",
                  paddingTop: expandNameForGallery ? 5 : 0,
                }}
              >
                <span
                  style={{
                    display: "flex",
                    fontWeight: 700,
                    fontSize: 16,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    flexShrink: 1,
                    minWidth: 0,
                    gap: 4,
                    alignItems: "center",
                  }}
                  className={`text-gray-900 dark:text-gray-100  ${redactWhileLoading_name && "animate-pulse blur"}`}
                >
                  {redactWhileLoading_name
                    ? "Person Display Name"
                    : post.author.displayName || post.author.handle}
                  {post.author.verification?.verifiedStatus == "valid" && (
                    <IconMdiVerified />
                  )}
                </span>

                <span
                  style={{
                    fontSize: 16,
                    overflowX: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    flexShrink: 1,
                    flexGrow: 0,
                    minWidth: 0,
                  }}
                  className={`text-gray-500 dark:text-gray-400 ${redactWhileLoading_name && "animate-pulse blur"}`}
                >
                  @
                  {redactWhileLoading_name
                    ? "person.placeholder"
                    : post.author.handle}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  height: expandNameForGallery ? 32 : "1rem",
                  paddingTop: expandNameForGallery ? 5 : 0,
                }}
              >
                <span
                  style={{
                    fontSize: 16,
                    marginLeft: 8,
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                    maxWidth: "100%",
                  }}
                  className="text-gray-500 dark:text-gray-400"
                >
                  · {shortTimeAgo(post.indexedAt)}
                </span>
              </div>
            </div>
            {/* <ModerationInner subject={post.author.did} /> */}
            {authorModLoading ? (
              <div className="flex flex-wrap flex-row gap-1 my-1">
                {/* <div className="text-xs bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded-full flex flex-row items-center gap-1">
                  / <img
                      src={resolvedpfp || defaultpfp}
                      alt="avatar"
                      className={`rounded-full object-cover border border-gray-300 dark:border-gray-800 bg-gray-300 dark:bg-gray-600`}
                      style={{
                        width: 12,
                        height: 12,
                      }}
                    /> /
                  <span className="font-medium">loading badges...</span>
                </div> */}
              </div>
            ) : (
              <div
                className={`flex flex-wrap flex-row gap-1 my-1 ${redactWhileLoading_name ? "animate-pulse blur" : ""}`}
              >
                {pronoun && (
                  <SmallAuthorLabelBadgeInner
                    text={pronoun}
                    disablepfp={true}
                  />
                )}
                {informCombinedLabels.map((label, index) => (
                  <SmallAuthorLabelBadge
                    label={label}
                    key={label.cts + label.src + label.val}
                  />
                ))}
              </div>
            )}
            {!!feedviewpostreplyhandle && (
              <div
                style={{
                  display: "flex",
                  borderRadius: 12,
                  paddingBottom: 2,
                  fontSize: 14,
                  justifyContent: "flex-start",
                  gap: 4,
                  alignItems: "center",
                  height:
                    !(expanded || isQuote) && !!feedviewpostreplyhandle
                      ? "1rem"
                      : 0,
                  opacity:
                    !(expanded || isQuote) && !!feedviewpostreplyhandle ? 1 : 0,
                }}
                className={`text-gray-500 dark:text-gray-400 ${redactWhileLoading_content && "animate-pulse blur"}`}
              >
                <IconMdiReply /> Reply to @{feedviewpostreplyhandle}
              </div>
            )}
            {/* <ModerationInner subject={post.uri} /> */}
            {/* todo migrate cw stuff to the new useAutoLabels system */}
            {showContentWarning && (
              <ContentWarning
                unauthedgate={hideWarnsWhenUnauthed}
                labels={warnContentLabels}
                isOpen={isOpen}
                onPress={(e) => {
                  e.stopPropagation();
                  setHasUserTouchedToggleYet(true);
                  if (!hideWarnsWhenUnauthed) {
                    setIsOpen(!isOpen);
                  }
                }}
              />
            )}
            {isOpen && (
              <>
                <div
                  style={{
                    fontSize: 16,
                    marginBottom: !post.embed || concise ? 0 : 8,
                    whiteSpace: "pre-wrap",
                    textAlign: "left",
                    overflowWrap: "anywhere",
                    wordBreak: "break-word",
                    ...(concise && {
                      display: "-webkit-box",
                      WebkitBoxOrient: "vertical",
                      WebkitLineClamp: 2,
                      overflow: "hidden",
                    }),
                  }}
                  className={`text-gray-900 dark:text-gray-100 ${redactWhileLoading_content && "animate-pulse blur"}`}
                >
                  {fedi ? (
                    <>
                      <span
                        className="dangerousFediContent"
                        dangerouslySetInnerHTML={{
                          __html: DOMPurify.sanitize(fedi),
                        }}
                      />
                    </>
                  ) : (
                    <>
                      {renderTextWithFacets({
                        text: (post.record as { text?: string }).text ?? "",
                        facets: (post.record.facets as Facet[]) ?? [],
                        navigate: navigate,
                      })}
                    </>
                  )}
                </div>
                {post.embed && depth < 1 && !concise ? (
                  <PostEmbeds
                    redactedLoading={redactWhileLoading_content}
                    embed={post.embed}
                    viewContext={
                      isQuote
                        ? PostEmbedViewContext.Quote
                        : expanded
                          ? PostEmbedViewContext.Anchor
                          : PostEmbedViewContext.Normal
                    }
                    salt={salt}
                    navigate={navigate}
                    postid={{ did: post.author.did, rkey: parsed.rkey }}
                    nopics={nopics}
                    lightboxCallback={lightboxCallback}
                    constellationLinks={constellationLinks}
                    referral={[...(referral || []), "im upr!"]}
                  />
                ) : null}
                {post.embed && depth > 0 && (
                  <>
                    <div
                      className={`border-gray-300 dark:border-gray-800 p-3 rounded-xl border italic text-gray-400 text-[14px] ${redactWhileLoading_content && "animate-pulse blur"}`}
                    >
                      (there is an embed here thats too deep to render)
                    </div>
                  </>
                )}
              </>
            )}
            <div
              style={{
                paddingTop: post.embed && !concise && depth < 1 ? 4 : 0,
              }}
            >
              <>
                {expanded && (
                  <div
                    style={{
                      overflow: "hidden",
                      fontSize: 14,
                      display: "flex",
                      borderBottomStyle: "solid",
                      paddingTop: 4,
                      paddingBottom: 8,
                      borderBottomWidth: 1,
                      marginBottom: 8,
                    }}
                    className={`text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-800 was7 ${redactWhileLoading_content && "animate-pulse blur"}`}
                  >
                    {fullDateTimeFormat(post.indexedAt)}
                  </div>
                )}
              </>
              {!isQuote && (
                <div
                  style={{
                    display: "flex",
                    gap: 32,
                    paddingTop: 8,
                    fontSize: 15,
                    justifyContent: "space-between",
                  }}
                  className="text-gray-500 dark:text-gray-400"
                >
                  <HitSlopButton
                    onClick={() => {
                      setComposerPost({ kind: "reply", parent: post.uri });
                    }}
                    style={{
                      ...btnstyle,
                    }}
                    className={
                      (redactWhileLoading_content && "animate-pulse blur") ||
                      undefined
                    }
                  >
                    <IconMdiCommentOutline />
                    {post.replyCount}
                  </HitSlopButton>
                  <DropdownMenu.Root modal={false}>
                    <DropdownMenu.Trigger asChild>
                      <div
                        style={{
                          ...btnstyle,
                          ...(hasRetweeted ? { color: "#5CEFAA" } : {}),
                        }}
                        aria-label="Repost or quote post"
                        className={
                          (redactWhileLoading_content &&
                            "animate-pulse blur") ||
                          undefined
                        }
                      >
                        {hasRetweeted ? (
                          <IconMdiRepeat color="#5CEFAA" />
                        ) : (
                          <IconMdiRepeat />
                        )}
                        {post.repostCount ?? 0}
                      </div>
                    </DropdownMenu.Trigger>

                    <DropdownMenu.Portal>
                      <DropdownMenu.Content
                        align="start"
                        sideOffset={5}
                        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 w-32 z-50 overflow-hidden"
                      >
                        <DropdownMenu.Item
                          onSelect={repostOrUnrepostPost}
                          className="px-3 py-2 text-sm flex items-center gap-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:bg-gray-100 dark:focus:bg-gray-700"
                        >
                          <IconMdiRepeat
                            className={hasRetweeted ? "text-green-400" : ""}
                          />
                          <span>{hasRetweeted ? "Undo Repost" : "Repost"}</span>
                        </DropdownMenu.Item>

                        <DropdownMenu.Item
                          onSelect={() => {
                            setComposerPost({
                              kind: "quote",
                              subject: post.uri,
                            });
                          }}
                          className="px-3 py-2 text-sm flex items-center gap-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:bg-gray-100 dark:focus:bg-gray-700"
                        >
                          <IconMdiCommentOutline />
                          <span>Quote</span>
                        </DropdownMenu.Item>
                      </DropdownMenu.Content>
                    </DropdownMenu.Portal>
                  </DropdownMenu.Root>
                  <HitSlopButton
                    onClick={() => {
                      toggle();
                    }}
                    style={{
                      ...btnstyle,
                      ...(liked ? { color: "#EC4899" } : {}),
                    }}
                    className={
                      (redactWhileLoading_content && "animate-pulse blur") ||
                      undefined
                    }
                  >
                    {liked ? (
                      <IconMdiCardsHeart />
                    ) : (
                      <IconMdiCardsHeartOutline />
                    )}
                    {(post.likeCount || 0) + (liked ? 1 : 0)}
                  </HitSlopButton>
                  <div style={{ display: "flex", gap: 8 }}>
                    <HitSlopButton
                      onClick={async (e) => {
                        e.stopPropagation();
                        try {
                          await navigator.clipboard.writeText(
                            "https://bsky.app" +
                              "/profile/" +
                              post.author.handle +
                              "/post/" +
                              post.uri.split("/").pop(),
                          );
                          renderSnack({
                            title: "Copied to clipboard!",
                          });
                        } catch (_e) {
                          renderSnack({
                            title: "Failed to copy link",
                          });
                        }
                      }}
                      style={{
                        ...btnstyle,
                      }}
                    >
                      <IconMdiShareVariant />
                    </HitSlopButton>
                    <HitSlopButton
                      onClick={() => {
                        renderSnack({
                          title: "Not implemented yet...",
                        });
                      }}
                    >
                      <span style={btnstyle}>
                        <IconMdiMoreHoriz />
                      </span>
                    </HitSlopButton>
                  </div>
                </div>
              )}
            </div>
            <div
              style={{
                height: isQuote ? 12 : 16,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export function ContentWarning({
  unauthedgate,
  labels,
  isOpen,
  onPress,
}: {
  unauthedgate?: boolean;
  labels: ATPAPI.ComAtprotoLabelDefs.Label[];
  isOpen: boolean;
  onPress: React.MouseEventHandler<HTMLDivElement>;
}) {
  const { getLabelInfo } = useLabelInfo();

  // Pre-calculate text for cleaner JSX
  const labelText = labels
    .map((label) => getLabelInfo(label.src, label.val).name)
    .join(", ");

  return (
    <div className="mb-2 w-full select-none" onClick={onPress}>
      <div
        className={`
          group flex items-center justify-between
          w-full px-4 py-3
          rounded-full
          border border-gray-200 dark:border-gray-700
          bg-gray-100 dark:bg-gray-800
          cursor-pointer
          transition-all duration-200 ease-out
          hover:bg-gray-200 dark:hover:bg-gray-700
        `}
      >
        <div className="flex items-center gap-3 overflow-hidden">
          {/* Icon Container */}
          <div className="flex items-center justify-center text-gray-500 dark:text-gray-400">
            <IconMdiWarning className="text-xl" />
          </div>

          {/* Label Text */}
          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
            {labelText}
          </span>
        </div>

        {/* Chevron */}
        <div className="flex items-center justify-center text-gray-500 dark:text-gray-400 pl-2 gap-2 text-sm">
          {unauthedgate ? "please login to view" : isOpen ? "hide" : "show"}
          {!unauthedgate && (
            <IconMdiChevronDown
              className={`text-xl transition-transform duration-300 ease-[cubic-bezier(0.2,0,0,1)] ${
                isOpen ? "rotate-180" : ""
              }`}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export function SmallAuthorLabelBadge({
  label,
  large,
}: {
  label: LabelWithHydratedLocaleName;
  large?: boolean;
}) {
  /*
   -{" "}
      {ghld(label.src,label.val)?.severity} (from {label.sourceDid})
      */
  //const info = getLabelInfo(label.src, label.val);

  const [imgcdn] = useAtom(imgCDNAtom);

  const { data: opProfile } = useQueryProfile(
    `at://${label.src}/app.bsky.actor.profile/self`,
  );

  const resolvedpfp = getAvatarUrl(imgcdn, opProfile?.value, label.src);

  return (
    <SmallAuthorLabelBadgeInner
      resolvedpfp={resolvedpfp || undefined}
      text={label.name || label.val}
      large={large}
    />
  );
}

// todo add click event to explain the label or soemthing
export function SmallAuthorLabelBadgeInner({
  resolvedpfp,
  text,
  large,
  disablepfp = false,
}: {
  resolvedpfp?: string;
  text: string;
  large?: boolean;
  disablepfp?: boolean;
}) {
  return (
    <div
      className={`text-xs ${large ? "bg-gray-200" : "bg-gray-100"} dark:bg-gray-800 ${large ? "px-2 py-1" : "px-1 py-0.5"} rounded-full flex flex-row items-center gap-1`}
    >
      {!disablepfp && (
        <img
          src={resolvedpfp || defaultpfp}
          alt="avatar"
          className={`rounded-full object-cover border border-gray-300 dark:border-gray-800 bg-gray-300 dark:bg-gray-600`}
          style={{
            width: 12,
            height: 12,
          }}
        />
      )}
      <span className="font-medium">{text}</span>
    </div>
  );
}
