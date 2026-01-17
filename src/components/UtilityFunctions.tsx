import type { $Typed,Facet } from "@atproto/api";
import * as React from "react";

export const CACHE_TIMEOUT = 5 * 60 * 1000;
const HANDLE_DID_CACHE_TIMEOUT = 60 * 60 * 1000; // 1 hour

export function asTyped<T extends { $type: string }>(obj: T): $Typed<T> {
  return obj as $Typed<T>;
}

export const fullDateTimeFormat = (iso: string) => {
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

export const shortTimeAgo = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
};

export function getByteToCharMap(text: string): number[] {
  const encoder = new TextEncoder();

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

export function facetByteRangeToCharRange(
  byteStart: number,
  byteEnd: number,
  byteToCharMap: number[],
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

export function extractFacetRanges(
  text: string,
  facets: Facet[],
): FacetRange[] {
  const map = getByteToCharMap(text);
  return facets.map((f) => {
    const [start, end] = facetByteRangeToCharRange(
      f.index.byteStart,
      f.index.byteEnd,
      map,
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
    (a: any, b: any) => a.start - b.start,
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
        </a>,
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
        </span>,
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
        </span>,
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

export function getDomain(url: string) {
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

export function randomString(length = 8) {
  const chars =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  return Array.from(
    { length },
    () => chars[Math.floor(Math.random() * chars.length)],
  ).join("");
}

export function HitSlopButton({
  onClick,
  children,
  style = {},
  ...rest
}: React.HTMLAttributes<HTMLSpanElement> & {
  onClick?: (e: React.MouseEvent) => void;
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <span
      style={{
        position: "relative",
        display: "inline-block",
        cursor: "pointer",
      }}
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
}

export const btnstyle = {
  display: "flex",
  gap: 4,
  cursor: "pointer",
  alignItems: "center",
  fontSize: 14,
};