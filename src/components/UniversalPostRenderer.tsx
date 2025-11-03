import * as ATPAPI from "@atproto/api";
import { useNavigate } from "@tanstack/react-router";
import DOMPurify from "dompurify";
import { useAtom } from "jotai";
import { DropdownMenu } from "radix-ui";
import { HoverCard } from "radix-ui";
import * as React from "react";
import { type SVGProps } from "react";

import {
  composerAtom,
  constellationURLAtom,
  enableBridgyTextAtom,
  enableWafrnTextAtom,
  imgCDNAtom,
} from "~/utils/atoms";
import { useHydratedEmbed } from "~/utils/useHydrated";
import {
  useQueryConstellation,
  useQueryIdentity,
  useQueryPost,
  useQueryProfile,
  yknowIReallyHateThisButWhateverGuardedConstructConstellationInfiniteQueryLinks,
} from "~/utils/useQuery";

function asTyped<T extends { $type: string }>(obj: T): $Typed<T> {
  return obj as $Typed<T>;
}

export const CACHE_TIMEOUT = 5 * 60 * 1000;
const HANDLE_DID_CACHE_TIMEOUT = 60 * 60 * 1000; // 1 hour

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

// export async function cachedGetRecord({
//   atUri,
//   cacheTimeout = CACHE_TIMEOUT,
//   get,
//   set,
// }: {
//   atUri: string;
//   //resolved: { pdsUrl: string; did: string } | null | undefined;
//   cacheTimeout?: number;
//   get: (key: string) => any;
//   set: (key: string, value: string) => void;
// }): Promise<any> {
//   const cacheKey = `record:${atUri}`;
//   const cached = get(cacheKey);
//   const now = Date.now();
//   if (
//     cached &&
//     cached.value &&
//     cached.time &&
//     now - cached.time < cacheTimeout
//   ) {
//     try {
//       return JSON.parse(cached.value);
//     } catch {
//       // fall through to fetch
//     }
//   }
//   const parsed = parseAtUri(atUri);
//   if (!parsed) return null;
//   const resolved = await cachedResolveIdentity({
//     didOrHandle: parsed.did,
//     get,
//     set,
//   });
//   if (!resolved?.pdsUrl || !resolved?.did)
//     throw new Error("Missing resolved PDS info");

//   if (!parsed) throw new Error("Invalid atUri");
//   const { collection, rkey } = parsed;
//   const url = `${
//     resolved.pdsUrl
//   }/xrpc/com.atproto.repo.getRecord?repo=${encodeURIComponent(
//     resolved.did,
//   )}&collection=${encodeURIComponent(collection)}&rkey=${encodeURIComponent(
//     rkey,
//   )}`;
//   const res = await fetch(url);
//   if (!res.ok) throw new Error("Failed to fetch base record");
//   const data = await res.json();
//   set(cacheKey, JSON.stringify(data));
//   return data;
// }

// export async function cachedResolveIdentity({
//   didOrHandle,
//   cacheTimeout = HANDLE_DID_CACHE_TIMEOUT,
//   get,
//   set,
// }: {
//   didOrHandle: string;
//   cacheTimeout?: number;
//   get: (key: string) => any;
//   set: (key: string, value: string) => void;
// }): Promise<any> {
//   const isDidInput = didOrHandle.startsWith("did:");
//   const cacheKey = `handleDid:${didOrHandle}`;
//   const now = Date.now();
//   const cached = get(cacheKey);
//   if (
//     cached &&
//     cached.value &&
//     cached.time &&
//     now - cached.time < cacheTimeout
//   ) {
//     try {
//       return JSON.parse(cached.value);
//     } catch {}
//   }
//   const url = `https://free-fly-24.deno.dev/?${
//     isDidInput
//       ? `did=${encodeURIComponent(didOrHandle)}`
//       : `handle=${encodeURIComponent(didOrHandle)}`
//   }`;
//   const res = await fetch(url);
//   if (!res.ok) throw new Error("Failed to resolve handle/did");
//   const data = await res.json();
//   set(cacheKey, JSON.stringify(data));
//   if (!isDidInput && data.did) {
//     set(`handleDid:${data.did}`, JSON.stringify(data));
//   }
//   return data;
// }

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
  // todo remove this once tree rendering is implemented, use a prop like isTree
  const TEMPLINEAR = true;
  // /*mass comment*/ console.log("atUri", atUri);
  //const { get, set } = usePersistentStore();
  //const [record, setRecord] = React.useState<any>(null);
  //const [links, setLinks] = React.useState<any>(null);
  //const [error, setError] = React.useState<string | null>(null);
  //const [cacheTime, setCacheTime] = React.useState<number | null>(null);
  //const [resolved, setResolved] = React.useState<any>(null); // { did, pdsUrl, bskyPds, handle }
  //const [opProfile, setOpProfile] = React.useState<any>(null);
  // const [opProfileCacheTime, setOpProfileCacheTime] = React.useState<
  //   number | null
  // >(null);
  //const router = useRouter();

  //const parsed = React.useMemo(() => parseAtUri(atUri), [atUri]);
  const parsed = new AtUri(atUri);
  const did = parsed?.host;
  const rkey = parsed?.rkey;
  // /*mass comment*/ console.log("did", did);
  // /*mass comment*/ console.log("rkey", rkey);

  // React.useEffect(() => {
  //   const checkCache = async () => {
  //     const postUri = atUri;
  //     const cacheKey = `record:${postUri}`;
  //     const cached = await get(cacheKey);
  //     const now = Date.now();
  //     // /*mass comment*/ console.log(
  //       "UniversalPostRenderer checking cache for",
  //       cacheKey,
  //       "cached:",
  //       !!cached,
  //     );
  //     if (
  //       cached &&
  //       cached.value &&
  //       cached.time &&
  //       now - cached.time < CACHE_TIMEOUT
  //     ) {
  //       try {
  //         // /*mass comment*/ console.log("UniversalPostRenderer found cached data for", cacheKey);
  //         setRecord(JSON.parse(cached.value));
  //       } catch {
  //         setRecord(null);
  //       }
  //     }
  //   };
  //   checkCache();
  // }, [atUri, get]);

  const {
    data: postQuery,
    isLoading: isPostLoading,
    isError: isPostError,
  } = useQueryPost(atUri);
  //const record = postQuery?.value;

  // React.useEffect(() => {
  //   if (!did || record) return;
  //   (async () => {
  //     try {
  //       const resolvedData = await cachedResolveIdentity({
  //         didOrHandle: did,
  //         get,
  //         set,
  //       });
  //       setResolved(resolvedData);
  //     } catch (e: any) {
  //       //setError("Failed to resolve handle/did: " + e?.message);
  //     }
  //   })();
  // }, [did, get, set, record]);

  const { data: resolved } = useQueryIdentity(did || "");

  // React.useEffect(() => {
  //   if (!resolved || !resolved.pdsUrl || !resolved.did || !rkey || record)
  //     return;
  //   let ignore = false;
  //   (async () => {
  //     try {
  //       const data = await cachedGetRecord({
  //         atUri,
  //         get,
  //         set,
  //       });
  //       if (!ignore) setRecord(data);
  //     } catch (e: any) {
  //       //if (!ignore) setError("Failed to fetch base record: " + e?.message);
  //     }
  //   })();
  //   return () => {
  //     ignore = true;
  //   };
  // }, [resolved, rkey, atUri, record]);

  // React.useEffect(() => {
  //   if (!resolved || !resolved.did || !rkey) return;
  //   const fetchLinks = async () => {
  //     const postUri = atUri;
  //     const cacheKey = `constellation:${postUri}`;
  //     const cached = await get(cacheKey);
  //     const now = Date.now();
  //     if (
  //       cached &&
  //       cached.value &&
  //       cached.time &&
  //       now - cached.time < CACHE_TIMEOUT
  //     ) {
  //       try {
  //         const data = JSON.parse(cached.value);
  //         setLinks(data);
  //         if (onConstellation) onConstellation(data);
  //       } catch {
  //         setLinks(null);
  //       }
  //       //setCacheTime(cached.time);
  //       return;
  //     }
  //     try {
  //       const url = `https://constellation.microcosm.blue/links/all?target=${encodeURIComponent(
  //         atUri,
  //       )}`;
  //       const res = await fetch(url);
  //       if (!res.ok) throw new Error("Failed to fetch constellation links");
  //       const data = await res.json();
  //       setLinks(data);
  //       //setCacheTime(now);
  //       set(cacheKey, JSON.stringify(data));
  //       if (onConstellation) onConstellation(data);
  //     } catch (e: any) {
  //       //setError("Failed to fetch constellation links: " + e?.message);
  //     }
  //   };
  //   fetchLinks();
  // }, [resolved, rkey, get, set, atUri, onConstellation]);

  const { data: links } = useQueryConstellation({
    method: "/links/all",
    target: atUri,
  });

  // React.useEffect(() => {
  //   if (!record || !resolved || !resolved.did) return;
  //   const fetchOpProfile = async () => {
  //     const opDid = resolved.did;
  //     const postUri = atUri;
  //     const cacheKey = `profile:${postUri}`;
  //     const cached = await get(cacheKey);
  //     const now = Date.now();
  //     if (
  //       cached &&
  //       cached.value &&
  //       cached.time &&
  //       now - cached.time < CACHE_TIMEOUT
  //     ) {
  //       try {
  //         setOpProfile(JSON.parse(cached.value));
  //       } catch {
  //         setOpProfile(null);
  //       }
  //       //setOpProfileCacheTime(cached.time);
  //       return;
  //     }
  //     try {
  //       let opResolvedRaw = await get(`handleDid:${opDid}`);
  //       let opResolved: any = null;
  //       if (
  //         opResolvedRaw &&
  //         opResolvedRaw.value &&
  //         opResolvedRaw.time &&
  //         now - opResolvedRaw.time < HANDLE_DID_CACHE_TIMEOUT
  //       ) {
  //         try {
  //           opResolved = JSON.parse(opResolvedRaw.value);
  //         } catch {
  //           opResolved = null;
  //         }
  //       } else {
  //         const url = `https://free-fly-24.deno.dev/?did=${encodeURIComponent(
  //           opDid,
  //         )}`;
  //         const res = await fetch(url);
  //         if (!res.ok) throw new Error("Failed to resolve OP did");
  //         opResolved = await res.json();
  //         set(`handleDid:${opDid}`, JSON.stringify(opResolved));
  //       }
  //       if (!opResolved || !opResolved.pdsUrl)
  //         throw new Error("OP did resolution failed or missing pdsUrl");
  //       const profileUrl = `${
  //         opResolved.pdsUrl
  //       }/xrpc/com.atproto.repo.getRecord?repo=${encodeURIComponent(
  //         opDid,
  //       )}&collection=app.bsky.actor.profile&rkey=self`;
  //       const profileRes = await fetch(profileUrl);
  //       if (!profileRes.ok) throw new Error("Failed to fetch OP profile");
  //       const profileData = await profileRes.json();
  //       setOpProfile(profileData);
  //       //setOpProfileCacheTime(now);
  //       set(cacheKey, JSON.stringify(profileData));
  //     } catch (e: any) {
  //       //setError("Failed to fetch OP profile: " + e?.message);
  //     }
  //   };
  //   fetchOpProfile();
  // }, [record, get, set, rkey, resolved, atUri]);

  const { data: opProfile } = useQueryProfile(
    resolved ? `at://${resolved?.did}/app.bsky.actor.profile/self` : undefined
  );

  // const displayName =
  //   opProfile?.value?.displayName || resolved?.handle || resolved?.did;
  // const handle = resolved?.handle ? `@${resolved.handle}` : resolved?.did;

  // const postText = record?.value?.text || "";
  // const createdAt = record?.value?.createdAt
  //   ? new Date(record.value.createdAt)
  //   : null;
  // const langTags = record?.value?.langs || [];

  const [likes, setLikes] = React.useState<number | null>(null);
  const [reposts, setReposts] = React.useState<number | null>(null);
  const [replies, setReplies] = React.useState<number | null>(null);

  React.useEffect(() => {
    // /*mass comment*/ console.log(JSON.stringify(links, null, 2));
    setLikes(
      links
        ? links?.links?.["app.bsky.feed.like"]?.[".subject.uri"]?.records || 0
        : null
    );
    setReposts(
      links
        ? links?.links?.["app.bsky.feed.repost"]?.[".subject.uri"]?.records || 0
        : null
    );
    setReplies(
      links
        ? links?.links?.["app.bsky.feed.post"]?.[".reply.parent.uri"]
            ?.records || 0
        : null
    );
  }, [links]);

  // const { data: repliesData } = useQueryConstellation({
  //   method: "/links",
  //   target: atUri,
  //   collection: "app.bsky.feed.post",
  //   path: ".reply.parent.uri",
  // });

  const [constellationurl] = useAtom(constellationURLAtom);

  const infinitequeryresults = useInfiniteQuery({
    ...yknowIReallyHateThisButWhateverGuardedConstructConstellationInfiniteQueryLinks(
      {
        constellation: constellationurl,
        method: "/links",
        target: atUri,
        collection: "app.bsky.feed.post",
        path: ".reply.parent.uri",
      }
    ),
    enabled: !!atUri && !!maxReplies && !isQuote,
  });

  const {
    data: repliesData,
    // fetchNextPage,
    // hasNextPage,
    // isFetchingNextPage,
  } = infinitequeryresults;

  // auto-fetch all pages
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
          : []
      )
    : [];

  //const [oldestOpsReply, setOldestOpsReply] = useState<string | undefined>(undefined);

  const { oldestOpsReply, oldestOpsReplyElseNewestNonOpsReply } = (() => {
    if (isQuote || !replyAturis || replyAturis.length === 0 || !maxReplies)
      return {
        oldestOpsReply: undefined,
        oldestOpsReplyElseNewestNonOpsReply: undefined,
      };

    const opdid = new AtUri(
      //postQuery?.value.reply?.root.uri ?? postQuery?.uri ?? atUri
      atUri
    ).host;

    const opReplies = replyAturis.filter(
      (aturi) => new AtUri(aturi).host === opdid
    );

    if (opReplies.length > 0) {
      const opreply = opReplies[opReplies.length - 1];
      //setOldestOpsReply(opreply);
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

  // const navigateToProfile = (e: React.MouseEvent) => {
  //   e.stopPropagation();
  //   if (resolved?.did) {
  //     router.navigate({
  //       to: "/profile/$did",
  //       params: { did: resolved.did },
  //     });
  //   }
  // };
  if (!postQuery?.value) {
    // deleted post more often than a non-resolvable post
    return <></>;
  }

  return (
    <>
      {/* <span>uprrs {maxReplies} {!!maxReplies&&!!oldestOpsReplyElseNewestNonOpsReply ? "true" : "false"}</span> */}
      <UniversalPostRendererRawRecordShim
        detailed={detailed}
        postRecord={postQuery}
        profileRecord={opProfile}
        aturi={atUri}
        resolved={resolved}
        likesCount={likes}
        repostsCount={reposts}
        repliesCount={replies}
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
        //bottomBorder={maxReplies&&oldestOpsReplyElseNewestNonOpsReply ? false : bottomBorder}
        bottomBorder={
          maxReplies && oldestOpsReplyElseNewestNonOpsReply
            ? false
            : maxReplies === 0
              ? false
              : bottomBorder
        }
        feedviewpost={feedviewpost}
        repostedby={repostedby}
        //style={{...style, background: oldestOpsReply === atUri ? "Red" : undefined}}
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
      <>
        {maxReplies && maxReplies === 0 && replies && replies > 0 ? (
          <>
            {/* <div>hello</div> */}
            <MoreReplies atUri={atUri} />
          </>
        ) : (
          <></>
        )}
      </>
      {!isQuote && oldestOpsReplyElseNewestNonOpsReply && (
        <>
          {/* <span>hello {maxReplies}</span> */}
          <UniversalPostRendererATURILoader
            //detailed={detailed}
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
        })
      }
      className="border-b border-gray-300 dark:border-gray-800 flex flex-row px-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
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
          //className="border-gray-400 dark:border-gray-500"
        />
      </div>

      <div className="flex items-center pl-3 text-sm text-gray-500 dark:text-gray-400 select-none">
        More Replies
      </div>
    </div>
  );
}

function getAvatarUrl(opProfile: any, did: string, cdn: string) {
  const link = opProfile?.value?.avatar?.ref?.["$link"];
  if (!link) return null;
  return `https://${cdn}/img/avatar/plain/${did}/${link}@jpeg`;
}

export function UniversalPostRendererRawRecordShim({
  postRecord,
  profileRecord,
  aturi,
  resolved,
  likesCount,
  repostsCount,
  repliesCount,
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
  postRecord: any;
  profileRecord: any;
  aturi: string;
  resolved: any;
  likesCount?: number | null;
  repostsCount?: number | null;
  repliesCount?: number | null;
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
  // /*mass comment*/ console.log(`received aturi: ${aturi} of post content: ${postRecord}`);
  const navigate = useNavigate();

  //const { get, set } = usePersistentStore();
  // const [hydratedEmbed, setHydratedEmbed] = useState<any>(undefined);

  // useEffect(() => {
  //   const run = async () => {
  //     if (!postRecord?.value?.embed) return;
  //     const embed = postRecord?.value?.embed;
  //     if (!embed || !embed.$type) {
  //       setHydratedEmbed(undefined);
  //       return;
  //     }

  //     try {
  //       let result: any;

  //       if (embed?.$type === "app.bsky.embed.recordWithMedia") {
  //         const mediaEmbed = embed.media;

  //         let hydratedMedia;
  //         if (mediaEmbed?.$type === "app.bsky.embed.images") {
  //           hydratedMedia = hydrateEmbedImages(mediaEmbed, resolved?.did);
  //         } else if (mediaEmbed?.$type === "app.bsky.embed.external") {
  //           hydratedMedia = hydrateEmbedExternal(mediaEmbed, resolved?.did);
  //         } else if (mediaEmbed?.$type === "app.bsky.embed.video") {
  //           hydratedMedia = hydrateEmbedVideo(mediaEmbed, resolved?.did);
  //         } else {
  //           throw new Error("idiot");
  //         }
  //         if (!hydratedMedia) throw new Error("idiot");

  //         // hydrate the outer recordWithMedia now using the hydrated media
  //         result = await hydrateEmbedRecordWithMedia(
  //           embed,
  //           resolved?.did,
  //           hydratedMedia,
  //           get,
  //           set,
  //         );
  //       } else {
  //         const hydrated =
  //           embed?.$type === "app.bsky.embed.images"
  //             ? hydrateEmbedImages(embed, resolved?.did)
  //             : embed?.$type === "app.bsky.embed.external"
  //               ? hydrateEmbedExternal(embed, resolved?.did)
  //               : embed?.$type === "app.bsky.embed.video"
  //                 ? hydrateEmbedVideo(embed, resolved?.did)
  //                 : embed?.$type === "app.bsky.embed.record"
  //                   ? hydrateEmbedRecord(embed, resolved?.did, get, set)
  //                   : undefined;

  //         result = hydrated instanceof Promise ? await hydrated : hydrated;
  //       }

  //       // /*mass comment*/ console.log(
  //         String(result) + " hydrateEmbedRecordWithMedia hey hyeh ye",
  //       );
  //       setHydratedEmbed(result);
  //     } catch (e) {
  //       console.error("Error hydrating embed", e);
  //       setHydratedEmbed(undefined);
  //     }
  //   };

  //   run();
  // }, [postRecord, resolved?.did]);

  const hasEmbed = (postRecord?.value as ATPAPI.AppBskyFeedPost.Record)?.embed;
  const hasImages = hasEmbed?.$type === "app.bsky.embed.images";
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

  const hasMedia =
    hasEmbed &&
    (hasImages || hasVideo || isQuotewithImages || isQuotewithVideo);

  const {
    data: hydratedEmbed,
    isLoading: isEmbedLoading,
    error: embedError,
  } = useHydratedEmbed(postRecord?.value?.embed, resolved?.did);

  const [imgcdn] = useAtom(imgCDNAtom);

  const parsedaturi = new AtUri(aturi); //parseAtUri(aturi);

  const fakeprofileviewbasic = React.useMemo<AppBskyActorDefs.ProfileViewBasic>(
    () => ({
      did: resolved?.did || "",
      handle: resolved?.handle || "",
      displayName: profileRecord?.value?.displayName || "",
      avatar: getAvatarUrl(profileRecord, resolved?.did, imgcdn) || "",
      viewer: undefined,
      labels: profileRecord?.labels || undefined,
      verification: undefined,
    }),
    [imgcdn, profileRecord, resolved?.did, resolved?.handle]
  );

  const fakeprofileviewdetailed =
    React.useMemo<AppBskyActorDefs.ProfileViewDetailed>(
      () => ({
        ...fakeprofileviewbasic,
        $type: "app.bsky.actor.defs#profileViewDetailed",
        description: profileRecord?.value?.description || undefined,
      }),
      [fakeprofileviewbasic, profileRecord?.value?.description]
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
      labels: postRecord?.labels || undefined,
      threadgate: undefined,
    }),
    [
      aturi,
      postRecord?.cid,
      postRecord?.value,
      postRecord?.labels,
      fakeprofileviewbasic,
      hydratedEmbed,
      repliesCount,
      repostsCount,
      likesCount,
    ]
  );

  //const [feedviewpostreplyhandle, setFeedviewpostreplyhandle] = useState<string | undefined>(undefined);

  // useEffect(() => {
  //   if(!feedviewpost) return;
  //   let cancelled = false;

  //   const run = async () => {
  //     const thereply = (fakepost?.record as AppBskyFeedPost.Record)?.reply?.parent?.uri;
  //     const feedviewpostreplydid = thereply ? new AtUri(thereply).host : undefined;

  //     if (feedviewpostreplydid) {
  //       const opi = await cachedResolveIdentity({
  //         didOrHandle: feedviewpostreplydid,
  //         get,
  //         set,
  //       });

  //       if (!cancelled) {
  //         setFeedviewpostreplyhandle(opi?.handle);
  //       }
  //     }
  //   };

  //   run();

  //   return () => {
  //     cancelled = true;
  //   };
  // }, [fakepost, get, set]);
  const thereply = (fakepost?.record as AppBskyFeedPost.Record)?.reply?.parent
    ?.uri;
  const feedviewpostreplydid =
    thereply && !filterNoReplies ? new AtUri(thereply).host : undefined;
  const replyhookvalue = useQueryIdentity(
    feedviewpost ? feedviewpostreplydid : undefined
  );
  const feedviewpostreplyhandle = replyhookvalue?.data?.handle;

  const aturirepostbydid = repostedby ? new AtUri(repostedby).host : undefined;
  const repostedbyhookvalue = useQueryIdentity(
    repostedby ? aturirepostbydid : undefined
  );
  const feedviewpostrepostedbyhandle = repostedbyhookvalue?.data?.handle;

  if (filterNoReplies && thereply) return null;

  if (filterMustHaveMedia && !hasMedia) return null;

  if (filterMustBeReply && !thereply) return null;

  return (
    <>
      {/* <p>
        {postRecord?.value?.embed.$type + " " + JSON.stringify(hydratedEmbed)}
      </p> */}
      {/* <span>filtermustbereply is {filterMustBeReply ? "true" : "false"}</span>
      <span>thereply is {thereply ? "true" : "false"}</span> */}
      <UniversalPostRenderer
        expanded={detailed}
        onPostClick={() =>
          parsedaturi &&
          navigate({
            to: "/profile/$did/post/$rkey",
            params: { did: parsedaturi.host, rkey: parsedaturi.rkey },
          })
        }
        // onProfileClick={() => parsedaturi && navigate({to: "/profile/$did",
        //   params: {did: parsedaturi.did}
        // })}
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
        //extraOptionalItemInfo={{reply: postRecord?.value?.reply as AppBskyFeedDefs.ReplyRef, post: fakepost}}
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
      />
    </>
  );
}

// export function parseAtUri(
//   atUri: string
// ): { did: string; collection: string; rkey: string } | null {
//   const PREFIX = "at://";
//   if (!atUri.startsWith(PREFIX)) {
//     return null;
//   }

//   const parts = atUri.slice(PREFIX.length).split("/");

//   if (parts.length !== 3) {
//     return null;
//   }

//   const [did, collection, rkey] = parts;

//   if (!did || !collection || !rkey) {
//     return null;
//   }

//   return { did, collection, rkey };
// }

export function MdiCommentOutline(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={16}
      height={16}
      viewBox="0 0 24 24"
      {...props}
    >
      <path
        fill="var(--color-gray-400)"
        d="M9 22a1 1 0 0 1-1-1v-3H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-6.1l-3.7 3.71c-.2.19-.45.29-.7.29zm1-6v3.08L13.08 16H20V4H4v12z"
      ></path>
    </svg>
  );
}

export function MdiRepeat(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={16}
      height={16}
      viewBox="0 0 24 24"
      {...props}
    >
      <path
        fill="var(--color-gray-400)"
        d="M17 17H7v-3l-4 4l4 4v-3h12v-6h-2M7 7h10v3l4-4l-4-4v3H5v6h2z"
      ></path>
    </svg>
  );
}

export function MdiRepeatGreen(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={16}
      height={16}
      viewBox="0 0 24 24"
      {...props}
    >
      <path
        fill="#5CEFAA"
        d="M17 17H7v-3l-4 4l4 4v-3h12v-6h-2M7 7h10v3l4-4l-4-4v3H5v6h2z"
      ></path>
    </svg>
  );
}

export function MdiCardsHeart(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={16}
      height={16}
      viewBox="0 0 24 24"
      {...props}
    >
      <path
        fill="#EC4899"
        d="m12 21.35l-1.45-1.32C5.4 15.36 2 12.27 2 8.5C2 5.41 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.08C13.09 3.81 14.76 3 16.5 3C19.58 3 22 5.41 22 8.5c0 3.77-3.4 6.86-8.55 11.53z"
      ></path>
    </svg>
  );
}

export function MdiCardsHeartOutline(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={16}
      height={16}
      viewBox="0 0 24 24"
      {...props}
    >
      <path
        fill="var(--color-gray-400)"
        d="m12.1 18.55l-.1.1l-.11-.1C7.14 14.24 4 11.39 4 8.5C4 6.5 5.5 5 7.5 5c1.54 0 3.04 1 3.57 2.36h1.86C13.46 6 14.96 5 16.5 5c2 0 3.5 1.5 3.5 3.5c0 2.89-3.14 5.74-7.9 10.05M16.5 3c-1.74 0-3.41.81-4.5 2.08C10.91 3.81 9.24 3 7.5 3C4.42 3 2 5.41 2 8.5c0 3.77 3.4 6.86 8.55 11.53L12 21.35l1.45-1.32C18.6 15.36 22 12.27 22 8.5C22 5.41 19.58 3 16.5 3"
      ></path>
    </svg>
  );
}

export function MdiShareVariant(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={16}
      height={16}
      viewBox="0 0 24 24"
      {...props}
    >
      <path
        fill="var(--color-gray-400)"
        d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81a3 3 0 0 0 3-3a3 3 0 0 0-3-3a3 3 0 0 0-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9a3 3 0 0 0-3 3a3 3 0 0 0 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.15c-.05.21-.08.43-.08.66c0 1.61 1.31 2.91 2.92 2.91s2.92-1.3 2.92-2.91A2.92 2.92 0 0 0 18 16.08"
      ></path>
    </svg>
  );
}

export function MdiMoreHoriz(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={16}
      height={16}
      viewBox="0 0 24 24"
      {...props}
    >
      <path
        fill="var(--color-gray-400)"
        d="M16 12a2 2 0 0 1 2-2a2 2 0 0 1 2 2a2 2 0 0 1-2 2a2 2 0 0 1-2-2m-6 0a2 2 0 0 1 2-2a2 2 0 0 1 2 2a2 2 0 0 1-2 2a2 2 0 0 1-2-2m-6 0a2 2 0 0 1 2-2a2 2 0 0 1 2 2a2 2 0 0 1-2 2a2 2 0 0 1-2-2"
      ></path>
    </svg>
  );
}

export function MdiGlobe(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={12}
      height={12}
      viewBox="0 0 24 24"
      {...props}
    >
      <path
        fill="var(--color-gray-400)"
        d="M17.9 17.39c-.26-.8-1.01-1.39-1.9-1.39h-1v-3a1 1 0 0 0-1-1H8v-2h2a1 1 0 0 0 1-1V7h2a2 2 0 0 0 2-2v-.41a7.984 7.984 0 0 1 2.9 12.8M11 19.93c-3.95-.49-7-3.85-7-7.93c0-.62.08-1.22.21-1.79L9 15v1a2 2 0 0 0 2 2m1-16A10 10 0 0 0 2 12a10 10 0 0 0 10 10a10 10 0 0 0 10-10A10 10 0 0 0 12 2"
      ></path>
    </svg>
  );
}

export function MdiVerified(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={16}
      height={16}
      viewBox="0 0 24 24"
      {...props}
    >
      <path
        fill="#1297ff"
        d="m23 12l-2.44-2.78l.34-3.68l-3.61-.82l-1.89-3.18L12 3L8.6 1.54L6.71 4.72l-3.61.81l.34 3.68L1 12l2.44 2.78l-.34 3.69l3.61.82l1.89 3.18L12 21l3.4 1.46l1.89-3.18l3.61-.82l-.34-3.68zm-13 5l-4-4l1.41-1.41L10 14.17l6.59-6.59L18 9z"
      ></path>
    </svg>
  );
}

export function MdiReply(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={14}
      height={14}
      viewBox="0 0 24 24"
      {...props}
    >
      <path
        fill="var(--color-gray-400)"
        d="M10 9V5l-7 7l7 7v-4.1c5 0 8.5 1.6 11 5.1c-1-5-4-10-11-11"
      ></path>
    </svg>
  );
}

export function LineMdLoadingLoop(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={24}
      height={24}
      viewBox="0 0 24 24"
      {...props}
    >
      <path
        fill="none"
        stroke="#1297ff"
        strokeDasharray={16}
        strokeDashoffset={16}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 3c4.97 0 9 4.03 9 9"
      >
        <animate
          fill="freeze"
          attributeName="stroke-dashoffset"
          dur="0.2s"
          values="16;0"
        ></animate>
        <animateTransform
          attributeName="transform"
          dur="1.5s"
          repeatCount="indefinite"
          type="rotate"
          values="0 12 12;360 12 12"
        ></animateTransform>
      </path>
    </svg>
  );
}

export function MdiRepost(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={14}
      height={14}
      viewBox="0 0 24 24"
      {...props}
    >
      <path
        fill="var(--color-gray-400)"
        d="M17 17H7v-3l-4 4l4 4v-3h12v-6h-2M7 7h10v3l4-4l-4-4v3H5v6h2z"
      ></path>
    </svg>
  );
}

export function MdiRepeatVariant(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={14}
      height={14}
      viewBox="0 0 24 24"
      {...props}
    >
      <path
        fill="var(--color-gray-400)"
        d="M6 5.75L10.25 10H7v6h6.5l2 2H7a2 2 0 0 1-2-2v-6H1.75zm12 12.5L13.75 14H17V8h-6.5l-2-2H17a2 2 0 0 1 2 2v6h3.25z"
      ></path>
    </svg>
  );
}

export function MdiPlayCircle(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={64}
      height={64}
      viewBox="0 0 24 24"
      {...props}
    >
      <path
        fill="#edf2f5"
        d="M10 16.5v-9l6 4.5M12 2A10 10 0 0 0 2 12a10 10 0 0 0 10 10a10 10 0 0 0 10-10A10 10 0 0 0 12 2"
      ></path>
    </svg>
  );
}

/* what imported from testfront */
//import Masonry from "@mui/lab/Masonry";
import {
  type $Typed,
  AppBskyActorDefs,
  AppBskyEmbedDefs,
  AppBskyEmbedExternal,
  AppBskyEmbedImages,
  AppBskyEmbedRecord,
  AppBskyEmbedRecordWithMedia,
  AppBskyEmbedVideo,
  AppBskyFeedDefs,
  AppBskyFeedPost,
  AppBskyGraphDefs,
  AtUri,
  type Facet,
  //AppBskyLabelerDefs,
  //AtUri,
  //ComAtprotoRepoStrongRef,
  ModerationDecision,
} from "@atproto/api";
import type {
  //BlockedPost,
  FeedViewPost,
  //NotFoundPost,
  PostView,
  //ThreadViewPost,
} from "@atproto/api/dist/client/types/app/bsky/feed/defs";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import ReactPlayer from "react-player";

import defaultpfp from "~/../public/favicon.png";
import { useAuth } from "~/providers/UnifiedAuthProvider";
import {
  FeedItemRenderAturiLoader,
  FollowButton,
  Mutual,
} from "~/routes/profile.$did";
import type { LightboxProps } from "~/routes/profile.$did/post.$rkey.image.$i";
import { useFastLike } from "~/utils/likeMutationQueue";
// import type { OutputSchema } from "@atproto/api/dist/client/types/app/bsky/feed/getFeed";
// import type {
//   ViewRecord,
//   ViewNotFound,
//   ViewBlocked,
//   ViewDetached,
// } from "@atproto/api/dist/client/types/app/bsky/embed/record";
//import type { MasonryItemData } from "./onemason/masonry.types";
//import { MasonryLayout } from "./onemason/MasonryLayout";
// const agent = new AtpAgent({
//   service: 'https://public.api.bsky.app'
// })
type HitSlopButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  hitSlop?: number;
};

const HitSlopButtonCustom: React.FC<HitSlopButtonProps> = ({
  children,
  hitSlop = 8,
  style,
  ...rest
}) => (
  <button
    {...rest}
    style={{
      position: "relative",
      background: "none",
      border: "none",
      padding: 0,
      cursor: "pointer",
      ...style,
    }}
  >
    {/* Invisible hit slop area */}
    <span
      style={{
        position: "absolute",
        top: -hitSlop,
        left: -hitSlop,
        right: -hitSlop,
        bottom: -hitSlop,
      }}
    />
    {/* Actual button content stays positioned normally */}
    <span style={{ position: "relative", zIndex: 1 }}>{children}</span>
  </button>
);

const HitSlopButton = ({
  onClick,
  children,
  style = {},
  ...rest
}: React.HTMLAttributes<HTMLSpanElement> & {
  onClick?: (e: React.MouseEvent) => void;
  children: React.ReactNode;
  style?: React.CSSProperties;
}) => (
  <span
    style={{ position: "relative", display: "inline-block", cursor: "pointer" }}
  >
    <span
      style={{
        position: "absolute",
        top: -8,
        left: -8,
        right: -8,
        bottom: -8,
        zIndex: 0,
      }}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(e);
      }}
    />
    <span
      style={{
        ...style,
        position: "relative",
        zIndex: 1,
        pointerEvents: "none",
      }}
      {...rest}
    >
      {children}
    </span>
  </span>
);

const btnstyle = {
  display: "flex",
  gap: 4,
  cursor: "pointer",
  alignItems: "center",
  fontSize: 14,
};
function randomString(length = 8) {
  const chars =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  return Array.from(
    { length },
    () => chars[Math.floor(Math.random() * chars.length)]
  ).join("");
}

function UniversalPostRenderer({
  post,
  uprrrsauthor,
  //setMainItem,
  //isMainItem,
  onPostClick,
  onProfileClick,
  expanded,
  //expanded,
  isQuote,
  //isQuote,
  extraOptionalItemInfo,
  bottomReplyLine,
  topReplyLine,
  salt,
  bottomBorder = true,
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
}: {
  post: PostView;
  uprrrsauthor?: AppBskyActorDefs.ProfileViewDetailed;
  // optional for now because i havent ported every use to this yet
  // setMainItem?: React.Dispatch<
  //   React.SetStateAction<AppBskyFeedDefs.FeedViewPost>
  // >;
  //isMainItem?: boolean;
  onPostClick?: (e: React.MouseEvent) => void;
  onProfileClick?: (e: React.MouseEvent) => void;
  expanded?: boolean;
  isQuote?: boolean;
  extraOptionalItemInfo?: FeedViewPost;
  bottomReplyLine?: boolean;
  topReplyLine?: boolean;
  salt: string;
  bottomBorder?: boolean;
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
}) {
  const parsed = new AtUri(post.uri);
  const navigate = useNavigate();
  const [hasRetweeted, setHasRetweeted] = useState<boolean>(
    post.viewer?.repost ? true : false
  );
  const [, setComposerPost] = useAtom(composerAtom);
  const { agent } = useAuth();
  const [retweetUri, setRetweetUri] = useState<string | undefined>(
    post.viewer?.repost
  );
  const { liked, toggle, backfill } = useFastLike(post.uri, post.cid);
  // const bovref = useBackfillOnView(post.uri, post.cid);
  // React.useLayoutEffect(()=>{
  //   if (expanded && !isQuote) {
  //     backfill();
  //   }
  // },[backfill, expanded, isQuote])

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
          return `<a href="https://${undfediwafrnHost}/search/${encoded}" target="_blank">#${tag.replaceAll(' ','-')}</a>`;
        })
        .join("<br>")
    : "";

  const unfediwafrn = unfediwafrnPartial
    ? unfediwafrnPartial + (links ? `<br>${links}` : "")
    : undefined;

  const fedi =
    (showBridgyText ? unfedibridgy : undefined) ??
    (showWafrnText ? unfediwafrn : undefined);

  /* fuck you */
  const isMainItem = false;
  const setMainItem = (any: any) => {};
  // eslint-disable-next-line react-hooks/refs
  //console.log("Received ref in UniversalPostRenderer:", usedref);
  return (
    <div ref={ref} style={style} data-index={dataIndexPropPass}>
      <div
        //ref={ref}
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
          //...style,
          //border: "1px solid #e1e8ed",
          //borderRadius: 12,
          opacity: "1 !important",
          background: "transparent",
          paddingLeft: isQuote ? 12 : 16,
          paddingRight: isQuote ? 12 : 16,
          //paddingTop: 16,
          paddingTop: isRepost ? 10 : isQuote ? 12 : topReplyLine ? 8 : 16,
          //paddingBottom: bottomReplyLine ? 0 : 16,
          paddingBottom: 0,
          fontFamily: "system-ui, sans-serif",
          //boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
          position: "relative",
          // dont cursor: "pointer",
          borderBottomWidth: bottomBorder ? (isQuote ? 0 : 1) : 0,
        }}
        className="border-gray-300 dark:border-gray-800"
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
              //color: theme.textSecondary,
              gap: 4,
              alignItems: "center",
            }}
            className="text-gray-500 dark:text-gray-400"
          >
            <MdiRepost /> Reposted by @{isRepost}{" "}
          </div>
        )}
        {!isQuote && (
          <div
            style={{
              opacity:
                topReplyLine || isReply /*&& (true || expanded)*/ ? 0.5 : 0,
              position: "absolute",
              top: 0,
              left: 36, // why 36 ???
              //left: 16 + (42 / 2),
              width: 2,
              //height: "100%",
              height: isRepost
                ? "calc(16px + 1rem - 6px)"
                : topReplyLine
                  ? 8 - 6
                  : 16 - 6,
              // background: theme.textSecondary,
              //opacity: 0.5,
              // no flex here
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
              <img
                src={post.author.avatar || defaultpfp}
                alt="avatar"
                className={`rounded-full object-cover border border-gray-300 dark:border-gray-800 bg-gray-300 dark:bg-gray-600`}
                style={{
                  width: isQuote ? 16 : 42,
                  height: isQuote ? 16 : 42,
                }}
              />
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
                  <img
                    src={post.author.avatar || defaultpfp}
                    alt="avatar"
                    className="rounded-full w-[58px] h-[58px] object-cover border border-gray-300 dark:border-gray-800 bg-gray-300 dark:bg-gray-600"
                  />
                  <div className=" flex-1 flex flex-row align-middle justify-end">
                    <FollowButton targetdidorhandle={post.author.did} />
                  </div>
                </div>
                <div className="flex flex-col gap-3">
                  <div>
                    <div className="text-gray-900 dark:text-gray-100 font-medium text-md">
                      {post.author.displayName || post.author.handle}{" "}
                    </div>
                    <div className="text-gray-500 dark:text-gray-400 text-md flex flex-row gap-1">
                      <Mutual targetdidorhandle={post.author.did} />@
                      {post.author.handle}{" "}
                    </div>
                  </div>
                  {uprrrsauthor?.description && (
                    <div className="text-gray-700 dark:text-gray-300 text-sm text-left break-words line-clamp-3">
                      {uprrrsauthor.description}
                    </div>
                  )}
                  {/* <div className="flex gap-4">
                    <div className="flex gap-1">
                      <div className="font-medium text-gray-900 dark:text-gray-100">
                        0
                      </div>
                      <div className="text-gray-500 dark:text-gray-400">
                        Following
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <div className="font-medium text-gray-900 dark:text-gray-100">
                        2,900
                      </div>
                      <div className="text-gray-500 dark:text-gray-400">
                        Followers
                      </div>
                    </div>
                  </div> */}
                </div>
              </div>

              {/* <HoverCard.Arrow className="fill-gray-50 dark:fill-gray-900" /> */}
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
          >
            {/* dummy for later use */}
            <div style={{ width: 42, height: 42 + 6, minHeight: 42 + 6 }} />
            {/* reply line !!!!  bottomReplyLine */}
            {bottomReplyLine && (
              <div
                style={{
                  width: 2,
                  height: "100%",
                  //background: theme.textSecondary,
                  opacity: 0.5,
                  // no flex here
                  //color: "Red",
                  //zIndex: 99
                }}
                className="bg-gray-500 dark:bg-gray-400"
              />
            )}
            {/* <div
            layout
            transition={{ duration: 0.2 }}
            animate={{ height: expanded ? 0 : '100%' }}
            style={{
              width: 2.4,
              background: theme.border,
              // no flex here
            }}
          /> */}
          </div>
          <div style={{ flex: 1, maxWidth: "100%" }}>
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
                  //overflow: "hidden", // hey why is overflow hidden unapplied
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  flexShrink: 1,
                  flexGrow: 1,
                  flexBasis: 0,
                  width: 0,
                  gap: expanded ? 0 : 6,
                  alignItems: expanded ? "flex-start" : "center",
                  flexDirection: expanded ? "column" : "row",
                  height: expanded ? 42 : "1rem",
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
                    //color: theme.text,
                  }}
                  className="text-gray-900 dark:text-gray-100"
                >
                  {/* verified checkmark */}
                  {post.author.displayName || post.author.handle}{" "}
                  {post.author.verification?.verifiedStatus == "valid" && (
                    <MdiVerified />
                  )}
                </span>

                <span
                  style={{
                    //color: theme.textSecondary,
                    fontSize: 16,
                    overflowX: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    flexShrink: 1,
                    flexGrow: 0,
                    minWidth: 0,
                  }}
                  className="text-gray-500 dark:text-gray-400"
                >
                  @{post.author.handle}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  height: "1rem",
                }}
              >
                <span
                  style={{
                    //color: theme.textSecondary,
                    fontSize: 16,
                    marginLeft: 8,
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                    maxWidth: "100%",
                  }}
                  className="text-gray-500 dark:text-gray-400"
                >
                  · {/* time placeholder */}
                  {shortTimeAgo(post.indexedAt)}
                </span>
              </div>
            </div>
            {/* reply indicator */}
            {!!feedviewpostreplyhandle && (
              <div
                style={{
                  display: "flex",
                  borderRadius: 12,
                  paddingBottom: 2,
                  fontSize: 14,
                  justifyContent: "flex-start",
                  //color: theme.textSecondary,
                  gap: 4,
                  alignItems: "center",
                  //marginLeft: 36,
                  height:
                    !(expanded || isQuote) && !!feedviewpostreplyhandle
                      ? "1rem"
                      : 0,
                  opacity:
                    !(expanded || isQuote) && !!feedviewpostreplyhandle ? 1 : 0,
                }}
                className="text-gray-500 dark:text-gray-400"
              >
                <MdiReply /> Reply to @{feedviewpostreplyhandle}
              </div>
            )}
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
              className="text-gray-900 dark:text-gray-100"
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
                embed={post.embed}
                //moderation={moderation}
                viewContext={PostEmbedViewContext.Feed}
                salt={salt}
                navigate={navigate}
                postid={{ did: post.author.did, rkey: parsed.rkey }}
                nopics={nopics}
                lightboxCallback={lightboxCallback}
              />
            ) : null}
            {post.embed && depth > 0 && (
              /*  pretty bad hack imo. its trying to sync up with how the embed shim doesnt
                hydrate embeds this deep but the connection here is implicit
                todo: idk make this a real part of the embed shim so its not implicit */
              <>
                <div className="border-gray-300 dark:border-gray-800 p-3 rounded-xl border italic text-gray-400 text-[14px]">
                  (there is an embed here thats too deep to render)
                </div>
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
                      //color: theme.textSecondary,
                      fontSize: 14,
                      display: "flex",
                      borderBottomStyle: "solid",
                      //borderBottomColor: theme.border,
                      //background: "#f00",
                      // height: "1rem",
                      paddingTop: 4,
                      paddingBottom: 8,
                      borderBottomWidth: 1,
                      marginBottom: 8,
                    }} // important for height animation
                    className="text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-800 was7"
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
                    //color: theme.textSecondary,
                    fontSize: 15,
                    justifyContent: "space-between",
                    //background: "#0f0",
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
                  >
                    <MdiCommentOutline />
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
                      >
                        {hasRetweeted ? <MdiRepeatGreen /> : <MdiRepeat />}
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
                          <MdiRepeat
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
                          {/* You might want a specific quote icon here */}
                          <MdiCommentOutline />
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
                  >
                    {liked ? <MdiCardsHeart /> : <MdiCardsHeartOutline />}
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
                              post.uri.split("/").pop()
                          );
                        } catch (_e) {
                          // idk
                        }
                      }}
                      style={{
                        ...btnstyle,
                      }}
                    >
                      <MdiShareVariant />
                    </HitSlopButton>
                    <span style={btnstyle}>
                      <MdiMoreHoriz />
                    </span>
                  </div>
                </div>
              )}
            </div>
            <div
              style={{
                //height: bottomReplyLine ? 16 : 0
                height: isQuote ? 12 : 16,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

const fullDateTimeFormat = (iso: string) => {
  const date = new Date(iso);
  return date.toLocaleString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};
const shortTimeAgo = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
};

// const toAtUri = (url: string) =>
//   url
//     .replace("https://bsky.app/profile/", "at://")
//     .replace("/feed/", "/app.bsky.feed.generator/");

// function PostSizedElipsis() {
//   return (
//     <div
//       style={{ display: "flex", flexDirection: "row", alignItems: "center" }}
//     >
//       <div
//         style={{
//           width: 2,
//           height: 40,
//           //background: theme.textSecondary,
//           background: `repeating-linear-gradient(to bottom, var(--color-gray-400) 0px, var(--color-gray-400) 6px, transparent 6px, transparent 10px)`,
//           backgroundSize: "100% 10px",
//           opacity: 0.5,
//           marginLeft: 36, // why 36 ???
//         }}
//       />
//       <span
//         style={{
//           //color: theme.textSecondary,
//           marginLeft: 34,
//         }}
//         className="text-gray-500 dark:text-gray-400"
//       >
//         more posts
//       </span>
//     </div>
//   );
// }

type Embed =
  | AppBskyEmbedRecord.View
  | AppBskyEmbedImages.View
  | AppBskyEmbedVideo.View
  | AppBskyEmbedExternal.View
  | AppBskyEmbedRecordWithMedia.View
  | { $type: string; [k: string]: unknown };

enum PostEmbedViewContext {
  ThreadHighlighted = "ThreadHighlighted",
  Feed = "Feed",
  FeedEmbedRecordWithMedia = "FeedEmbedRecordWithMedia",
}
const stopgap = {
  display: "flex",
  justifyContent: "center",
  padding: "32px 12px",
  borderRadius: 12,
  border: "1px solid rgba(161, 170, 174, 0.38)",
};

function PostEmbeds({
  embed,
  moderation,
  onOpen,
  allowNestedQuotes,
  viewContext,
  salt,
  navigate,
  postid,
  nopics,
  lightboxCallback,
}: {
  embed?: Embed;
  moderation?: ModerationDecision;
  onOpen?: () => void;
  allowNestedQuotes?: boolean;
  viewContext?: PostEmbedViewContext;
  salt: string;
  navigate: (_: any) => void;
  postid?: { did: string; rkey: string };
  nopics?: boolean;
  lightboxCallback?: (d: LightboxProps) => void;
}) {
  //const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  function setLightboxIndex(number: number) {
    navigate({
      to: "/profile/$did/post/$rkey/image/$i",
      params: {
        did: postid?.did,
        rkey: postid?.rkey,
        i: number.toString(),
      },
    });
  }
  if (
    AppBskyEmbedRecordWithMedia.isView(embed) &&
    AppBskyEmbedRecord.isViewRecord(embed.record.record) &&
    AppBskyFeedPost.isRecord(embed.record.record.value) //&&
    //AppBskyFeedPost.validateRecord(embed.record.record.value).success
  ) {
    const post: PostView = {
      $type: "app.bsky.feed.defs#postView", // lmao lies
      uri: embed.record.record.uri,
      cid: embed.record.record.cid,
      author: embed.record.record.author,
      record: embed.record.record.value as { [key: string]: unknown },
      embed: embed.record.record.embeds
        ? embed.record.record.embeds?.[0]
        : undefined, // quotes handles embeds differently, its an array for some reason
      replyCount: embed.record.record.replyCount,
      repostCount: embed.record.record.repostCount,
      likeCount: embed.record.record.likeCount,
      quoteCount: embed.record.record.quoteCount,
      indexedAt: embed.record.record.indexedAt,
      // we dont have a viewer, so this is a best effort conversion, still requires full query later on
      labels: embed.record.record.labels,
      // neither do we have threadgate. remember to please fetch the full post later
    };
    return (
      <div>
        <PostEmbeds
          embed={embed.media}
          moderation={moderation}
          onOpen={onOpen}
          viewContext={viewContext}
          salt={salt}
          navigate={navigate}
          postid={postid}
          nopics={nopics}
          lightboxCallback={lightboxCallback}
        />
        {/* padding empty div of 8px height */}
        <div style={{ height: 12 }} />
        {/* stopgap sorry*/}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            borderRadius: 12,
            //border: `1px solid ${theme.border}`,
            //boxShadow: theme.cardShadow,
            overflow: "hidden",
          }}
          className="shadow border border-gray-200 dark:border-gray-800 was7"
        >
          <UniversalPostRenderer
            post={post}
            isQuote
            salt={salt}
            onPostClick={(e) => {
              e.stopPropagation();
              const parsed = new AtUri(post.uri); //parseAtUri(post.uri);
              if (parsed) {
                navigate({
                  to: "/profile/$did/post/$rkey",
                  params: { did: parsed.host, rkey: parsed.rkey },
                });
              }
            }}
            depth={1}
          />
        </div>
        {/* <QuotePostRenderer
          record={embed.record.record}
          moderation={moderation}
        /> */}
        {/* stopgap sorry */}
        {/* <div style={stopgap}>quote post placeholder</div> */}
        {/* {<MaybeQuoteEmbed
          embed={embed.record}
          onOpen={onOpen}
          viewContext={
            viewContext === PostEmbedViewContext.Feed
              ? QuoteEmbedViewContext.FeedEmbedRecordWithMedia
              : undefined
          }
        {/* <div style={stopgap}>quote post placeholder</div> */}
        {/* {<MaybeQuoteEmbed
          embed={embed.record}
          onOpen={onOpen}
          viewContext={
            viewContext === PostEmbedViewContext.Feed
              ? QuoteEmbedViewContext.FeedEmbedRecordWithMedia
              : undefined
          }
        />} */}
      </div>
    );
  }

  if (AppBskyEmbedRecord.isView(embed)) {
    // hey im really lazy and im gonna do it the bad way
    const reallybaduri = (embed?.record as any)?.uri as string | undefined;
    const reallybadaturi = reallybaduri ? new AtUri(reallybaduri) : undefined;

    // custom feed embed (i.e. generator view)
    if (AppBskyFeedDefs.isGeneratorView(embed.record)) {
      // stopgap sorry
      return <div style={stopgap}>feedgen placeholder</div>;
      // return (
      //   <div style={{ marginTop: '1rem' }}>
      //     <MaybeFeedCard view={embed.record} />
      //   </div>
      // )
    } else if (
      !!reallybaduri &&
      !!reallybadaturi &&
      reallybadaturi.collection === "app.bsky.feed.generator"
    ) {
      return (
        <div className="rounded-xl border">
          <FeedItemRenderAturiLoader aturi={reallybaduri} disableBottomBorder />
        </div>
      );
    }

    // list embed
    if (AppBskyGraphDefs.isListView(embed.record)) {
      // stopgap sorry
      return <div style={stopgap}>list placeholder</div>;
      // return (
      //   <div style={{ marginTop: '1rem' }}>
      //     <MaybeListCard view={embed.record} />
      //   </div>
      // )
    } else if (
      !!reallybaduri &&
      !!reallybadaturi &&
      reallybadaturi.collection === "app.bsky.graph.list"
    ) {
      return (
        <div className="rounded-xl border">
          <FeedItemRenderAturiLoader
            aturi={reallybaduri}
            disableBottomBorder
            listmode
            disablePropagation
          />
        </div>
      );
    }

    // starter pack embed
    if (AppBskyGraphDefs.isStarterPackViewBasic(embed.record)) {
      // stopgap sorry
      return <div style={stopgap}>starter pack card placeholder</div>;
      // return (
      //   <div style={{ marginTop: '1rem' }}>
      //     <StarterPackCard starterPack={embed.record} />
      //   </div>
      // )
    } else if (
      !!reallybaduri &&
      !!reallybadaturi &&
      reallybadaturi.collection === "app.bsky.graph.starterpack"
    ) {
      return (
        <div className="rounded-xl border">
          <FeedItemRenderAturiLoader
            aturi={reallybaduri}
            disableBottomBorder
            listmode
            disablePropagation
          />
        </div>
      );
    }

    // quote post
    // =
    // stopgap sorry

    if (
      AppBskyEmbedRecord.isViewRecord(embed.record) &&
      AppBskyFeedPost.isRecord(embed.record.value) // &&
      //AppBskyFeedPost.validateRecord(embed.record.value).success
    ) {
      const post: PostView = {
        $type: "app.bsky.feed.defs#postView", // lmao lies
        uri: embed.record.uri,
        cid: embed.record.cid,
        author: embed.record.author,
        record: embed.record.value as { [key: string]: unknown },
        embed: embed.record.embeds ? embed.record.embeds?.[0] : undefined, // quotes handles embeds differently, its an array for some reason
        replyCount: embed.record.replyCount,
        repostCount: embed.record.repostCount,
        likeCount: embed.record.likeCount,
        quoteCount: embed.record.quoteCount,
        indexedAt: embed.record.indexedAt,
        // we dont have a viewer, so this is a best effort conversion, still requires full query later on
        labels: embed.record.labels,
        // neither do we have threadgate. remember to please fetch the full post later
      };

      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            borderRadius: 12,
            //border: `1px solid ${theme.border}`,
            //boxShadow: theme.cardShadow,
            overflow: "hidden",
          }}
          className="shadow border border-gray-200 dark:border-gray-800 was7"
        >
          <UniversalPostRenderer
            post={post}
            isQuote
            salt={salt}
            onPostClick={(e) => {
              e.stopPropagation();
              const parsed = new AtUri(post.uri); //parseAtUri(post.uri);
              if (parsed) {
                navigate({
                  to: "/profile/$did/post/$rkey",
                  params: { did: parsed.host, rkey: parsed.rkey },
                });
              }
            }}
            depth={1}
          />
        </div>
      );
    } else {
      console.log("what the hell is a ", embed);
      return <>sorry</>;
    }
    //return <QuotePostRenderer record={embed.record} moderation={moderation} />;

    //return <div style={stopgap}>quote post placeholder</div>;
    // return (
    //   <MaybeQuoteEmbed
    //     embed={embed}
    //     onOpen={onOpen}
    //     allowNestedQuotes={allowNestedQuotes}
    //   />
    // )
  }

  // image embed
  // =
  if (AppBskyEmbedImages.isView(embed)) {
    const { images } = embed;

    const lightboxImages = images.map((img) => ({
      src: img.fullsize,
      alt: img.alt,
    }));
    console.log("rendering images");
    if (lightboxCallback) {
      lightboxCallback({ images: lightboxImages });
      console.log("rendering images");
    }

    if (nopics) return;

    if (images.length > 0) {
      // const items = embed.images.map(img => ({
      //   uri: img.fullsize,
      //   thumbUri: img.thumb,
      //   alt: img.alt,
      //   dimensions: img.aspectRatio ?? null,
      // }))

      if (images.length === 1) {
        const image = images[0];
        return (
          <div style={{ marginTop: 0 }}>
            <div
              style={{
                position: "relative",
                width: "100%",
                aspectRatio: image.aspectRatio
                  ? (() => {
                      const { width, height } = image.aspectRatio;
                      const ratio = width / height;
                      return ratio < 0.5 ? "1 / 2" : `${width} / ${height}`;
                    })()
                  : "1 / 1", // fallback to square
                //backgroundColor: theme.background, // fallback letterboxing color
                borderRadius: 12,
                //border: `1px solid ${theme.border}`,
                overflow: "hidden",
              }}
              className="border border-gray-200 dark:border-gray-800 was7 bg-gray-200 dark:bg-gray-900"
            >
              {/* {lightboxIndex !== null && (
                <Lightbox
                  images={lightboxImages}
                  index={lightboxIndex}
                  onClose={() => setLightboxIndex(null)}
                  onNavigate={(newIndex) => setLightboxIndex(newIndex)}
                  post={postid}
                />
              )} */}
              <img
                src={image.fullsize}
                alt={image.alt}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain", // letterbox or scale to fit
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxIndex(0);
                }}
              />
            </div>
          </div>
        );
      }
      // 2 images: side by side, both 1:1, cropped
      if (images.length === 2) {
        return (
          <div
            style={{
              display: "flex",
              gap: 4,
              marginTop: 0,
              width: "100%",
              borderRadius: 12,
              overflow: "hidden",
              //border: `1px solid ${theme.border}`,
            }}
            className="border border-gray-200 dark:border-gray-800 was7"
          >
            {/* {lightboxIndex !== null && (
              <Lightbox
                images={lightboxImages}
                index={lightboxIndex}
                onClose={() => setLightboxIndex(null)}
                onNavigate={(newIndex) => setLightboxIndex(newIndex)}
                post={postid}
              />
            )} */}
            {images.map((img, i) => (
              <div
                key={i}
                style={{ flex: 1, aspectRatio: "1 / 1", position: "relative" }}
              >
                <img
                  src={img.fullsize}
                  alt={img.alt}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    borderRadius: i === 0 ? "12px 0 0 12px" : "0 12px 12px 0",
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setLightboxIndex(i);
                  }}
                />
              </div>
            ))}
          </div>
        );
      }

      // 3 images: left is 1:1, right is two stacked 2:1
      if (images.length === 3) {
        return (
          <div
            style={{
              display: "flex",
              gap: 4,
              marginTop: 0,
              width: "100%",
              borderRadius: 12,
              overflow: "hidden",
              //border: `1px solid ${theme.border}`,
              // height: 240, // fixed height for cropping
            }}
            className="border border-gray-200 dark:border-gray-800 was7"
          >
            {/* {lightboxIndex !== null && (
              <Lightbox
                images={lightboxImages}
                index={lightboxIndex}
                onClose={() => setLightboxIndex(null)}
                onNavigate={(newIndex) => setLightboxIndex(newIndex)}
                post={postid}
              />
            )} */}
            {/* Left: 1:1 */}
            <div
              style={{ flex: 1, aspectRatio: "1 / 1", position: "relative" }}
            >
              <img
                src={images[0].fullsize}
                alt={images[0].alt}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  borderRadius: "12px 0 0 12px",
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxIndex(0);
                }}
              />
            </div>
            {/* Right: two stacked 2:1 */}
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                gap: 4,
              }}
            >
              {[1, 2].map((i) => (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    aspectRatio: "2 / 1",
                    position: "relative",
                  }}
                >
                  <img
                    src={images[i].fullsize}
                    alt={images[i].alt}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      borderRadius: i === 1 ? "0 12px 0 0" : "0 0 12px 0",
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setLightboxIndex(i + 1);
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        );
      }

      // 4 images: 2x2 grid, all 3:2
      if (images.length === 4) {
        return (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gridTemplateRows: "1fr 1fr",
              gap: 4,
              marginTop: 0,
              width: "100%",
              borderRadius: 12,
              overflow: "hidden",
              //border: `1px solid ${theme.border}`,
              //aspectRatio: "3 / 2", // overall grid aspect
            }}
            className="border border-gray-200 dark:border-gray-800 was7"
          >
            {/* {lightboxIndex !== null && (
              <Lightbox
                images={lightboxImages}
                index={lightboxIndex}
                onClose={() => setLightboxIndex(null)}
                onNavigate={(newIndex) => setLightboxIndex(newIndex)}
                post={postid}
              />
            )} */}
            {images.map((img, i) => (
              <div
                key={i}
                style={{
                  width: "100%",
                  height: "100%",
                  aspectRatio: "3 / 2",
                  position: "relative",
                }}
              >
                <img
                  src={img.fullsize}
                  alt={img.alt}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    borderRadius:
                      i === 0
                        ? "12px 0 0 0"
                        : i === 1
                          ? "0 12px 0 0"
                          : i === 2
                            ? "0 0 0 12px"
                            : "0 0 12px 0",
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setLightboxIndex(i);
                  }}
                />
              </div>
            ))}
          </div>
        );
      }

      // stopgap sorry
      return <div style={stopgap}>image count more than one placeholder</div>;
      // return (
      //   <div style={{ marginTop: '1rem' }}>
      //     <ImageLayoutGrid
      //       images={images}
      //       viewContext={viewContext}
      //     />
      //   </div>
      // )
    }
  }

  // external link embed
  // =
  if (AppBskyEmbedExternal.isView(embed)) {
    const link = embed.external;
    return (
      <ExternalLinkEmbed link={link} onOpen={onOpen} style={{ marginTop: 0 }} />
    );
  }

  // video embed
  // =
  if (AppBskyEmbedVideo.isView(embed)) {
    // hls playlist
    if (nopics) return;
    const playlist = embed.playlist;
    return (
      <SmartHLSPlayer
        url={playlist}
        thumbnail={embed.thumbnail}
        aspect={embed.aspectRatio}
      />
    );
    // stopgap sorry
    //return (<div>video</div>)
    // return (
    //   <VideoEmbed
    //     embed={embed}
    //     crop={
    //       viewContext === PostEmbedViewContext.ThreadHighlighted
    //         ? 'none'
    //         : viewContext === PostEmbedViewContext.FeedEmbedRecordWithMedia
    //         ? 'square'
    //         : 'constrained'
    //     }
    //   />
    // )
  }

  return <div />;
}

function getDomain(url: string) {
  try {
    const { hostname } = new URL(url);
    return hostname;
  } catch (e) {
    // In case it's a bare domain like "example.com"
    if (!url.startsWith("http")) {
      try {
        const { hostname } = new URL("http://" + url);
        return hostname;
      } catch {
        return null;
      }
    }
    return null;
  }
}
function getByteToCharMap(text: string): number[] {
  const encoder = new TextEncoder();
  //const utf8 = encoder.encode(text);

  const map: number[] = [];
  let byteIndex = 0;
  let charIndex = 0;

  for (const char of text) {
    const bytes = encoder.encode(char);
    for (let i = 0; i < bytes.length; i++) {
      map[byteIndex++] = charIndex;
    }
    charIndex += char.length;
  }

  return map;
}

function facetByteRangeToCharRange(
  byteStart: number,
  byteEnd: number,
  byteToCharMap: number[]
): [number, number] {
  return [
    byteToCharMap[byteStart] ?? 0,
    byteToCharMap[byteEnd - 1]! + 1, // inclusive end -> exclusive char end
  ];
}

interface FacetRange {
  start: number;
  end: number;
  feature: Facet["features"][number];
}

function extractFacetRanges(text: string, facets: Facet[]): FacetRange[] {
  const map = getByteToCharMap(text);
  return facets.map((f) => {
    const [start, end] = facetByteRangeToCharRange(
      f.index.byteStart,
      f.index.byteEnd,
      map
    );
    return { start, end, feature: f.features[0] };
  });
}
export function renderTextWithFacets({
  text,
  facets,
  navigate,
}: {
  text: string;
  facets: Facet[];
  navigate: (_: any) => void;
}) {
  const ranges = extractFacetRanges(text, facets).sort(
    (a: any, b: any) => a.start - b.start
  );

  const result: React.ReactNode[] = [];
  let current = 0;

  for (const { start, end, feature } of ranges) {
    if (current < start) {
      result.push(<span key={current}>{text.slice(current, start)}</span>);
    }

    const fragment = text.slice(start, end);
    // @ts-expect-error i didnt bother with the correct types here sorry. bsky api types are cursed
    if (feature.$type === "app.bsky.richtext.facet#link" && feature.uri) {
      result.push(
        <a
          // @ts-expect-error i didnt bother with the correct types here sorry. bsky api types are cursed
          href={feature.uri}
          key={start}
          className="link"
          style={{
            textDecoration: "none",
            color: "var(--link-text-color)",
            wordBreak: "break-all",
          }}
          target="_blank"
          rel="noreferrer"
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          {fragment}
        </a>
      );
    } else if (
      feature.$type === "app.bsky.richtext.facet#mention" &&
      // @ts-expect-error i didnt bother with the correct types here sorry. bsky api types are cursed
      feature.did
    ) {
      result.push(
        <span
          key={start}
          style={{ color: "var(--link-text-color)" }}
          className=" cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            navigate({
              to: "/profile/$did",
              // @ts-expect-error i didnt bother with the correct types here sorry. bsky api types are cursed
              params: { did: feature.did },
            });
          }}
        >
          {fragment}
        </span>
      );
    } else if (feature.$type === "app.bsky.richtext.facet#tag") {
      result.push(
        <span
          key={start}
          style={{ color: "var(--link-text-color)" }}
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          {fragment}
        </span>
      );
    } else {
      result.push(<span key={start}>{fragment}</span>);
    }

    current = end;
  }

  if (current < text.length) {
    result.push(<span key={current}>{text.slice(current)}</span>);
  }

  return result;
}
function ExternalLinkEmbed({
  link,
  onOpen,
  style,
}: {
  link: AppBskyEmbedExternal.ViewExternal;
  onOpen?: () => void;
  style?: React.CSSProperties;
}) {
  //const { theme } = useTheme();
  const { uri, title, description, thumb } = link;
  const thumbAspectRatio = 1.91;
  const titleStyle = {
    fontSize: 16,
    fontWeight: 700,
    marginBottom: 4,
    //color: theme.text,
    wordBreak: "break-word",
    textAlign: "left",
    maxHeight: "4em", // 2 lines * 1.5em line-height
    // stupid shit
    display: "-webkit-box",
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
    WebkitLineClamp: 2,
  };
  const descriptionStyle = {
    fontSize: 14,
    //color: theme.textSecondary,
    marginBottom: 8,
    wordBreak: "break-word",
    textAlign: "left",
    maxHeight: "5em", // 3 lines * 1.5em line-height
    // stupid shit
    display: "-webkit-box",
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
    WebkitLineClamp: 3,
  };
  const linkStyle = {
    textDecoration: "none",
    //color: theme.textSecondary,
    wordBreak: "break-all",
    textAlign: "left",
  };
  const containerStyle = {
    display: "flex",
    flexDirection: "column",
    //backgroundColor: theme.background,
    //background: '#eee',
    borderRadius: 12,
    //border: `1px solid ${theme.border}`,
    //boxShadow: theme.cardShadow,
    maxWidth: "100%",
    overflow: "hidden",
    ...style,
  };
  return (
    <a
      href={uri}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => {
        e.stopPropagation();
        if (onOpen) onOpen();
      }}
      /* @ts-expect-error css arent typed or something idk fuck you */
      style={linkStyle}
      className="text-gray-500 dark:text-gray-400"
    >
      <div
        style={containerStyle as React.CSSProperties}
        className="border border-gray-200 dark:border-gray-800 was7"
      >
        {thumb && (
          <div
            style={{
              position: "relative",
              width: "100%",
              aspectRatio: thumbAspectRatio,
              overflow: "hidden",
              borderTopLeftRadius: 12,
              borderTopRightRadius: 12,
              marginBottom: 8,
              //borderBottom: `1px solid ${theme.border}`,
            }}
            className="border-b border-gray-200 dark:border-gray-800 was7"
          >
            <img
              src={thumb}
              alt={description}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
          </div>
        )}
        <div
          style={{
            paddingBottom: 12,
            paddingLeft: 12,
            paddingRight: 12,
            paddingTop: thumb ? 0 : 12,
          }}
        >
          {/* @ts-expect-error css */}
          <div style={titleStyle} className="text-gray-900 dark:text-gray-100">
            {title}
          </div>
          <div
            style={descriptionStyle as React.CSSProperties}
            className="text-gray-500 dark:text-gray-400"
          >
            {description}
          </div>
          {/* small 1px divider here */}
          <div
            style={{
              height: 1,
              //backgroundColor: theme.border,
              marginBottom: 8,
            }}
            className="bg-gray-200 dark:bg-gray-700"
          />
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <MdiGlobe />
            <span
              style={{
                fontSize: 12,
                //color: theme.textSecondary
              }}
              className="text-gray-500 dark:text-gray-400"
            >
              {getDomain(uri)}
            </span>
          </div>
        </div>
      </div>
    </a>
  );
}

const SmartHLSPlayer = ({
  url,
  thumbnail,
  aspect,
}: {
  url: string;
  thumbnail?: string;
  aspect?: AppBskyEmbedDefs.AspectRatio;
}) => {
  const [playing, setPlaying] = useState(false);
  const containerRef = useRef(null);

  // pause the player if it goes out of viewport
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting && playing) {
          setPlaying(false);
        }
      },
      {
        root: null,
        threshold: 0.25,
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      if (containerRef.current) {
        observer.unobserve(containerRef.current);
      }
    };
  }, [playing]);

  return (
    <div
      ref={containerRef}
      style={{
        position: "relative",
        width: "100%",
        maxWidth: 640,
        cursor: "pointer",
      }}
    >
      {!playing && (
        <>
          <img
            src={thumbnail}
            alt="Video thumbnail"
            style={{
              width: "100%",
              display: "block",
              aspectRatio: aspect ? aspect?.width / aspect?.height : 16 / 9,
              borderRadius: 12,
              //border: `1px solid ${theme.border}`,
            }}
            className="border border-gray-200 dark:border-gray-800 was7"
            onClick={async (e) => {
              e.stopPropagation();
              setPlaying(true);
            }}
          />
          <div
            onClick={async (e) => {
              e.stopPropagation();
              setPlaying(true);
            }}
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              //fontSize: 48,
              color: "white",
              //textShadow: theme.cardShadow,
              pointerEvents: "none",
              userSelect: "none",
            }}
            className="text-shadow-md"
          >
            {/*▶️*/}
            <MdiPlayCircle />
          </div>
        </>
      )}
      {playing && (
        <div
          style={{
            position: "relative",
            width: "100%",
            borderRadius: 12,
            overflow: "hidden",
            //border: `1px solid ${theme.border}`,
            paddingTop: `${
              100 / (aspect ? aspect.width / aspect.height : 16 / 9)
            }%`, // 16:9 = 56.25%, 4:3 = 75%
          }}
          className="border border-gray-200 dark:border-gray-800 was7"
        >
          <ReactPlayer
            src={url}
            playing={true}
            controls={true}
            width="100%"
            height="100%"
            style={{ position: "absolute", top: 0, left: 0 }}
          />
          {/* <ReactPlayer
            url={url}
            playing={true}
            controls={true}
            width="100%"
            style={{width: "100% !important", aspectRatio: aspect ? aspect?.width/aspect?.height : 16/9}}
            onPause={() => setPlaying(false)}
            onEnded={() => setPlaying(false)}
          /> */}
        </div>
      )}
    </div>
  );
};
