import * as ATPAPI from "@atproto/api"
import {
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
  ModerationDecision,
} from "@atproto/api";
import * as React from "react";
import { useEffect, useRef, useState } from "react";
import ReactPlayer from "react-player";

import { FeedItemRenderAturiLoader } from "~/routes/profile.$did";
import type { LightboxProps } from "~/routes/profile.$did/post.$rkey.image.$i";

import { PollEmbed } from "./PollComponents";
import { UniversalPostRenderer, UniversalPostRendererATURILoader } from "./UniversalPostRenderer";

type Embed =
  | AppBskyEmbedRecord.View
  | AppBskyEmbedImages.View
  | AppBskyEmbedVideo.View
  | AppBskyEmbedExternal.View
  | AppBskyEmbedRecordWithMedia.View
  | { $type: string;[k: string]: unknown };

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

export function PostEmbeds({
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
  constellationLinks,
  redactedLoading,
  referral
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
  constellationLinks?: any;
  redactedLoading?: boolean;
  referral?: string[];
}) {
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
    AppBskyFeedPost.isRecord(embed.record.record.value)
  ) {
    const post: AppBskyFeedDefs.PostView = {
      $type: "app.bsky.feed.defs#postView",
      uri: embed.record.record.uri,
      cid: embed.record.record.cid,
      author: embed.record.record.author,
      record: embed.record.record.value as { [key: string]: unknown },
      embed: embed.record.record.embeds
        ? embed.record.record.embeds?.[0]
        : undefined,
      replyCount: embed.record.record.replyCount,
      repostCount: embed.record.record.repostCount,
      likeCount: embed.record.record.likeCount,
      quoteCount: embed.record.record.quoteCount,
      indexedAt: embed.record.record.indexedAt,
      labels: embed.record.record.labels,
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
          constellationLinks={constellationLinks}
          redactedLoading={redactedLoading}
        />
        <div style={{ height: 12 }} />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            borderRadius: 12,
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
              const parsed = new AtUri(post.uri);
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
      </div>
    );
  }

  if (AppBskyEmbedRecord.isView(embed)) {
    const reallybaduri = (embed?.record as any)?.uri as string | undefined;
    const reallybadaturi = reallybaduri ? new AtUri(reallybaduri) : undefined;

    if (AppBskyFeedDefs.isGeneratorView(embed.record)) {
      return <div style={stopgap} className={(redactedLoading ? " blur animate-pulse" : undefined)}>feedgen placeholder</div>;
    } else if (
      !!reallybaduri &&
      !!reallybadaturi &&
      reallybadaturi.collection === "app.bsky.feed.generator"
    ) {
      return (
        <div className={`rounded-xl border` + (redactedLoading ? " blur animate-pulse" : undefined)}>
          <FeedItemRenderAturiLoader aturi={reallybaduri} disableBottomBorder />
        </div>
      );
    }

    if (AppBskyGraphDefs.isListView(embed.record)) {
      return <div style={stopgap} className={(redactedLoading ? " blur animate-pulse" : undefined)}>list placeholder</div>;
    } else if (
      !!reallybaduri &&
      !!reallybadaturi &&
      reallybadaturi.collection === "app.bsky.graph.list"
    ) {
      return (
        <div className={"rounded-xl border" + (redactedLoading ? " blur animate-pulse" : undefined)}>
          <FeedItemRenderAturiLoader
            aturi={reallybaduri}
            disableBottomBorder
            listmode
            disablePropagation
          />
        </div>
      );
    }

    if (AppBskyGraphDefs.isStarterPackViewBasic(embed.record)) {
      return <div style={stopgap} className={(redactedLoading ? " blur animate-pulse" : undefined)}>starter pack card placeholder</div>;
    } else if (
      !!reallybaduri &&
      !!reallybadaturi &&
      reallybadaturi.collection === "app.bsky.graph.starterpack"
    ) {
      return (
        <div className={"rounded-xl border" + (redactedLoading ? " blur animate-pulse" : undefined)}>
          <FeedItemRenderAturiLoader
            aturi={reallybaduri}
            disableBottomBorder
            listmode
            disablePropagation
          />
        </div>
      );
    }

    if (
      AppBskyEmbedRecord.isViewRecord(embed.record) &&
      AppBskyFeedPost.isRecord(embed.record.value)
    ) {
      const post: AppBskyFeedDefs.PostView = {
        $type: "app.bsky.feed.defs#postView",
        uri: embed.record.uri,
        cid: embed.record.cid,
        author: embed.record.author,
        record: embed.record.value as { [key: string]: unknown },
        embed: embed.record.embeds ? embed.record.embeds?.[0] : undefined,
        replyCount: embed.record.replyCount,
        repostCount: embed.record.repostCount,
        likeCount: embed.record.likeCount,
        quoteCount: embed.record.quoteCount,
        indexedAt: embed.record.indexedAt,
        labels: embed.record.labels,
      };

      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            borderRadius: 12,
            overflow: "hidden",
          }}
          className={"shadow border border-gray-200 dark:border-gray-800 was7" + (redactedLoading ? " blur animate-pulse" : undefined)}
        >
          <UniversalPostRenderer
            post={post}
            isQuote
            salt={salt}
            onPostClick={(e) => {
              e.stopPropagation();
              const parsed = new AtUri(post.uri);
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

    } if (AppBskyEmbedRecord.isViewNotFound(embed.record)) {
      return (
        <UniversalPostRendererATURILoader atUri={embed.record.uri} isQuote />
      )
    } else {
      console.log("what the hell is a ", embed);
      return <>sorry</>;
    }
  }

  if (AppBskyEmbedImages.isView(embed)) {
    const { images } = embed;

    const lightboxImages = images.map((img) => ({
      src: img.fullsize,
      alt: img.alt,
    }));

    if (lightboxCallback) {
      lightboxCallback({ images: lightboxImages });
    }

    if (nopics) return;

    if (images.length > 0) {
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
                  : "1 / 1",
                borderRadius: 12,
                overflow: "hidden",
              }}
              className="border border-gray-200 dark:border-gray-800 was7 bg-gray-200 dark:bg-gray-900"
            >
              {redactedLoading ? (
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                  }}
                  className="bg-gray-300 dark:bg-gray-600 blur animate-pulse "
                />
              ) : (
                <img
                  src={image.fullsize}
                  alt={image.alt}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setLightboxIndex(0);
                  }}
                />
              )}
            </div>
          </div>
        );
      }

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
            }}
            className="border border-gray-200 dark:border-gray-800 was7"
          >
            {images.map((img, i) => (
              <div
                key={i}
                style={{ flex: 1, aspectRatio: "1 / 1", position: "relative" }}
              >
                {redactedLoading ? (
                  <div
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      borderRadius: i === 0 ? "12px 0 0 12px" : "0 12px 12px 0",
                    }}
                    className="bg-gray-300 dark:bg-gray-600 blur animate-pulse "
                  />
                ) : (
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
                )}
              </div>
            ))}
          </div>
        );
      }

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
            }}
            className="border border-gray-200 dark:border-gray-800 was7"
          >
            <div
              style={{ flex: 1, aspectRatio: "1 / 1", position: "relative" }}
            >
              {redactedLoading ? (
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    borderRadius: "12px 0 0 12px",
                  }}
                  className="bg-gray-300 dark:bg-gray-600 blur animate-pulse "
                />
              ) : (
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
              )}
            </div>
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
                  {redactedLoading ? (
                    <div
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        borderRadius: i === 1 ? "0 12px 0 0" : "0 0 12px 0",
                      }}
                      className="bg-gray-300 dark:bg-gray-600 blur animate-pulse "
                    />
                  ) : (
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
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      }

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
            }}
            className="border border-gray-200 dark:border-gray-800 was7"
          >
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
                {redactedLoading ? (
                  <div
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
                    className="bg-gray-300 dark:bg-gray-600 blur animate-pulse "
                  />
                ) : (
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
                )}
              </div>
            ))}
          </div>
        );
      }

      return <div style={stopgap}>image count more than one placeholder</div>;
    }
  }

  if (AppBskyEmbedExternal.isView(embed)) {
    const pollLinks = constellationLinks?.links?.["app.reddwarf.embed.poll"];
    const hasPollLink = pollLinks && Object.keys(pollLinks).length > 0;
    const isfromappview = referral?.includes("appview")

    if ((hasPollLink || isfromappview) && postid) {
      // warning: i gave up and warpped it in a div lmao
      return (
        <div className={(redactedLoading ? " blur animate-pulse " : undefined)}>
          <PollEmbed did={postid.did} rkey={postid.rkey} embedtryfall={isfromappview ? {embed, onOpen} : undefined} redactedLoading={redactedLoading}/>
        </div>
      );
    }

    const link = embed.external;
    return (
      <ExternalLinkEmbed link={link} onOpen={onOpen} style={{ marginTop: 0 }} redactedLoading={redactedLoading}/>
    );
  }

  if (AppBskyEmbedVideo.isView(embed)) {
    if (nopics) return;
    const playlist = embed.playlist;
    return (
      <SmartHLSPlayer
        url={playlist}
        thumbnail={embed.thumbnail}
        aspect={embed.aspectRatio}
        redactedLoading={redactedLoading}
      />
    );
  }

  return <div />;
}
export type embedtryfall = {
  embed: ATPAPI.AppBskyEmbedExternal.View,
  onOpen?: () => void;
}

export function ExternalLinkEmbed({
  link,
  onOpen,
  style,
  redactedLoading,
  referral
}: {
  link: AppBskyEmbedExternal.ViewExternal;
  onOpen?: () => void;
  style?: React.CSSProperties;
  redactedLoading?: boolean;
  referral?: string[];
}) {
  //const fromappview = referral?.includes("appview")
  //const []
  const { uri, title, description, thumb } = link;
  const thumbAspectRatio = 1.91;

  const titleStyle = {
    fontSize: 16,
    fontWeight: 700,
    marginBottom: 4,
    wordBreak: "break-word",
    textAlign: "left",
    maxHeight: "4em",
    display: "-webkit-box",
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
    WebkitLineClamp: 2,
  };

  const descriptionStyle = {
    fontSize: 14,
    marginBottom: 8,
    wordBreak: "break-word",
    textAlign: "left",
    maxHeight: "5em",
    display: "-webkit-box",
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
    WebkitLineClamp: 3,
  };

  const linkStyle = {
    textDecoration: "none",
    wordBreak: "break-all",
    textAlign: "left",
  };

  const containerStyle = {
    display: "flex",
    flexDirection: "column",
    borderRadius: 12,
    maxWidth: "100%",
    overflow: "hidden",
    ...style,
  };

  return (
    <a
      href={redactedLoading ? undefined : uri}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => {
        e.stopPropagation();
        if (onOpen) onOpen();
      }}
      style={linkStyle as React.CSSProperties}
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
            }}
            className="border-b border-gray-200 dark:border-gray-800 was7"
          >
            {redactedLoading ? (
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
                className="bg-gray-300 dark:bg-gray-600 blur animate-pulse "
              />
            ) : (
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
            )}
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
          <div
            style={titleStyle as React.CSSProperties}
            className={"text-gray-900 dark:text-gray-100 " + (redactedLoading ? " blur animate-pulse " : undefined)}
          >
            {title}
          </div>
          <div
            style={descriptionStyle as React.CSSProperties}
            className={"text-gray-500 dark:text-gray-400 " + (redactedLoading ? " blur animate-pulse " : undefined)}
          >
            {description}
          </div>
          <div
            style={{
              height: 1,
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
            <div className={redactedLoading ? "blur animate-pulse" : undefined}>
              <IconMdiGlobe />
            </div>
            <span
              style={{
                fontSize: 12,
              }}
              className={"text-gray-500 dark:text-gray-400 " + (redactedLoading ? " blur animate-pulse " : undefined)}
            >
              {getDomain(uri)}
            </span>
          </div>
        </div>
      </div>
    </a>
  );
}

export const SmartHLSPlayer = ({
  url,
  thumbnail,
  aspect,
  redactedLoading,
}: {
  url: string;
  thumbnail?: string;
  aspect?: AppBskyEmbedDefs.AspectRatio;
  redactedLoading?: boolean;
}) => {
  const [playing, setPlaying] = useState(false);
  const containerRef = useRef(null);

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
      },
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
          {redactedLoading ? (
            <div
              style={{
                width: "100%",
                display: "block",
                aspectRatio: aspect ? aspect?.width / aspect?.height : 16 / 9,
                borderRadius: 12,
              }}
              className="border border-gray-200 dark:border-gray-800 was7 bg-gray-300 dark:bg-gray-600 blur animate-pulse "
            />
          ) : (
            <img
              src={thumbnail}
              alt="Video thumbnail"
              style={{
                width: "100%",
                display: "block",
                aspectRatio: aspect ? aspect?.width / aspect?.height : 16 / 9,
                borderRadius: 12,
              }}
              className="border border-gray-200 dark:border-gray-800 was7"
              onClick={async (e) => {
                e.stopPropagation();
                if (redactedLoading) return;
                setPlaying(true);
              }}
            />
          )}
          <div
            onClick={async (e) => {
              e.stopPropagation();
              if (redactedLoading) return;
              setPlaying(true);
            }}
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              color: "white",
              pointerEvents: "none",
              userSelect: "none",
            }}
          //className="text-shadow-md"
          >
            <IconMdiPlayCircle className="h-14 w-14 drop-shadow-xl drop-shadow-gray-950/10 text-gray-50" />
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
            paddingTop: `${100 / (aspect ? aspect.width / aspect.height : 16 / 9)
              }%`,
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
        </div>
      )}
    </div>
  );
};

function getDomain(url: string) {
  try {
    const { hostname } = new URL(url);
    return hostname;
  } catch (e) {
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