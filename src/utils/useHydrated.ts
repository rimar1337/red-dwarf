import {
  type $Typed,
  AppBskyActorDefs,
  AppBskyEmbedExternal,
  AppBskyEmbedImages,
  AppBskyEmbedRecord,
  AppBskyEmbedRecordWithMedia,
  AppBskyEmbedVideo,
  AppBskyFeedPost,
  AtUri,
} from "@atproto/api";
import { useMemo } from "react";

import { useQueryIdentity,useQueryPost, useQueryProfile } from "./useQuery";

type QueryResultData<T extends (...args: any) => any> = ReturnType<T> extends
  | { data: infer D }
  | undefined
  ? D
  : never;

function asTyped<T extends { $type: string }>(obj: T): $Typed<T> {
  return obj as $Typed<T>;
}

export function hydrateEmbedImages(
  embed: AppBskyEmbedImages.Main,
  did: string,
): $Typed<AppBskyEmbedImages.View> {
  return asTyped({
    $type: "app.bsky.embed.images#view" as const,
    images: embed.images
      .map((img) => {
        const link = img.image.ref?.["$link"];
        if (!link) return null;
        return {
          thumb: `https://cdn.bsky.app/img/feed_thumbnail/plain/${did}/${link}@jpeg`,
          fullsize: `https://cdn.bsky.app/img/feed_fullsize/plain/${did}/${link}@jpeg`,
          alt: img.alt || "",
          aspectRatio: img.aspectRatio,
        };
      })
      .filter(Boolean) as AppBskyEmbedImages.ViewImage[],
  });
}

export function hydrateEmbedExternal(
  embed: AppBskyEmbedExternal.Main,
  did: string,
): $Typed<AppBskyEmbedExternal.View> {
  return asTyped({
    $type: "app.bsky.embed.external#view" as const,
    external: {
      uri: embed.external.uri,
      title: embed.external.title,
      description: embed.external.description,
      thumb: embed.external.thumb?.ref?.$link
        ? `https://cdn.bsky.app/img/feed_thumbnail/plain/${did}/${embed.external.thumb.ref.$link}@jpeg`
        : undefined,
    },
  });
}

export function hydrateEmbedVideo(
  embed: AppBskyEmbedVideo.Main,
  did: string,
): $Typed<AppBskyEmbedVideo.View> {
  const videoLink = embed.video.ref.$link;
  return asTyped({
    $type: "app.bsky.embed.video#view" as const,
    playlist: `https://video.bsky.app/watch/${did}/${videoLink}/playlist.m3u8`,
    thumbnail: `https://video.bsky.app/watch/${did}/${videoLink}/thumbnail.jpg`,
    aspectRatio: embed.aspectRatio,
    cid: videoLink,
  });
}

function hydrateEmbedRecord(
  embed: AppBskyEmbedRecord.Main,
  quotedPost: QueryResultData<typeof useQueryPost>,
  quotedProfile: QueryResultData<typeof useQueryProfile>,
  quotedIdentity: QueryResultData<typeof useQueryIdentity>,
): $Typed<AppBskyEmbedRecord.View> | undefined {
  if (!quotedPost || !quotedProfile || !quotedIdentity) {
    return undefined;
  }

  const author: $Typed<AppBskyActorDefs.ProfileViewBasic> = asTyped({
    $type: "app.bsky.actor.defs#profileViewBasic" as const,
    did: quotedIdentity.did,
    handle: quotedIdentity.handle,
    displayName: quotedProfile.value.displayName ?? quotedIdentity.handle,
    avatar: quotedProfile.value.avatar?.ref?.$link
      ? `https://cdn.bsky.app/img/avatar/plain/${quotedIdentity.did}/${quotedProfile.value.avatar.ref.$link}@jpeg`
      : undefined,
    viewer: {},
    labels: [],
  });

  const viewRecord: $Typed<AppBskyEmbedRecord.ViewRecord> = asTyped({
    $type: "app.bsky.embed.record#viewRecord" as const,
    uri: quotedPost.uri,
    cid: quotedPost.cid,
    author,
    value: quotedPost.value,
    indexedAt: quotedPost.value.createdAt,
    embeds: quotedPost.value.embed ? [quotedPost.value.embed] : undefined,
  });

  return asTyped({
    $type: "app.bsky.embed.record#view" as const,
    record: viewRecord,
  });
}

function hydrateEmbedRecordWithMedia(
  embed: AppBskyEmbedRecordWithMedia.Main,
  mediaHydratedEmbed:
    | $Typed<AppBskyEmbedImages.View>
    | $Typed<AppBskyEmbedVideo.View>
    | $Typed<AppBskyEmbedExternal.View>,
  quotedPost: QueryResultData<typeof useQueryPost>,
  quotedProfile: QueryResultData<typeof useQueryProfile>,
  quotedIdentity: QueryResultData<typeof useQueryIdentity>,
): $Typed<AppBskyEmbedRecordWithMedia.View> | undefined {
  const hydratedRecord = hydrateEmbedRecord(
    embed.record,
    quotedPost,
    quotedProfile,
    quotedIdentity,
  );

  if (!hydratedRecord) return undefined;

  return asTyped({
    $type: "app.bsky.embed.recordWithMedia#view" as const,
    record: hydratedRecord,
    media: mediaHydratedEmbed,
  });
}

type HydratedEmbedView =
  | $Typed<AppBskyEmbedImages.View>
  | $Typed<AppBskyEmbedExternal.View>
  | $Typed<AppBskyEmbedVideo.View>
  | $Typed<AppBskyEmbedRecord.View>
  | $Typed<AppBskyEmbedRecordWithMedia.View>;

export function useHydratedEmbed(
  embed: AppBskyFeedPost.Record["embed"],
  postAuthorDid: string | undefined,
) {
  const recordInfo = useMemo(() => {
    if (AppBskyEmbedRecordWithMedia.isMain(embed)) {
      const recordUri = embed.record.record.uri;
      const quotedAuthorDid = new AtUri(recordUri).hostname;
      return { recordUri, quotedAuthorDid, isRecordType: true };
    } else if (AppBskyEmbedRecord.isMain(embed)) {
      const recordUri = embed.record.uri;
      const quotedAuthorDid = new AtUri(recordUri).hostname;
      return { recordUri, quotedAuthorDid, isRecordType: true };
    }
    return {
      recordUri: undefined,
      quotedAuthorDid: undefined,
      isRecordType: false,
    };
  }, [embed]);

  const { isRecordType, recordUri, quotedAuthorDid } = recordInfo;

  const usequerypostresults = useQueryPost(recordUri);

  const profileUri = quotedAuthorDid
    ? `at://${quotedAuthorDid}/app.bsky.actor.profile/self`
    : undefined;

  const {
    data: quotedProfile,
    isLoading: isLoadingProfile,
    error: profileError,
  } = useQueryProfile(profileUri);

  const queryidentityresult = useQueryIdentity(quotedAuthorDid);

  const hydratedEmbed: HydratedEmbedView | undefined = (() => {
    if (!embed || !postAuthorDid) return undefined;

    if (isRecordType && (!usequerypostresults?.data || !quotedProfile || !queryidentityresult?.data)) {
      return undefined;
    }

    try {
      if (AppBskyEmbedImages.isMain(embed)) {
        return hydrateEmbedImages(embed, postAuthorDid);
      } else if (AppBskyEmbedExternal.isMain(embed)) {
        return hydrateEmbedExternal(embed, postAuthorDid);
      } else if (AppBskyEmbedVideo.isMain(embed)) {
        return hydrateEmbedVideo(embed, postAuthorDid);
      } else if (AppBskyEmbedRecord.isMain(embed)) {
        return hydrateEmbedRecord(
          embed,
          usequerypostresults?.data,
          quotedProfile,
          queryidentityresult?.data,
        );
      } else if (AppBskyEmbedRecordWithMedia.isMain(embed)) {
        let hydratedMedia:
          | $Typed<AppBskyEmbedImages.View>
          | $Typed<AppBskyEmbedVideo.View>
          | $Typed<AppBskyEmbedExternal.View>
          | undefined;

        if (AppBskyEmbedImages.isMain(embed.media)) {
          hydratedMedia = hydrateEmbedImages(embed.media, postAuthorDid);
        } else if (AppBskyEmbedExternal.isMain(embed.media)) {
          hydratedMedia = hydrateEmbedExternal(embed.media, postAuthorDid);
        } else if (AppBskyEmbedVideo.isMain(embed.media)) {
          hydratedMedia = hydrateEmbedVideo(embed.media, postAuthorDid);
        }

        if (hydratedMedia) {
          return hydrateEmbedRecordWithMedia(
            embed,
            hydratedMedia,
            usequerypostresults?.data,
            quotedProfile,
            queryidentityresult?.data,
          );
        }
      }
    } catch (e) {
      console.error("Error hydrating embed", e);
      return undefined;
    }
  })();

  const isLoading = isRecordType
    ? usequerypostresults?.isLoading || isLoadingProfile || queryidentityresult?.isLoading
    : false;

  const error = usequerypostresults?.error || profileError || queryidentityresult?.error;

  return { data: hydratedEmbed, isLoading, error };
}