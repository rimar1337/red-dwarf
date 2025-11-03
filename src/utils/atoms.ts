import { atom, createStore, useAtomValue } from "jotai";
import { atomWithStorage } from "jotai/utils";
import { useEffect } from "react";

import { type ProfilePostsFilter } from "~/routes/profile.$did";

export const store = createStore();

export const quickAuthAtom = atomWithStorage<string | null>(
  "quickAuth",
  null
);

export const selectedFeedUriAtom = atomWithStorage<string | null>(
  "selectedFeedUri",
  null
);

//export const feedScrollPositionsAtom = atom<Record<string, number>>({});

export const feedScrollPositionsAtom = atomWithStorage<Record<string, number>>(
  "feedscrollpositions",
  {}
);

type TabRouteScrollState = {
  activeTab: string;
  scrollPositions: Record<string, number>;
};
/**
 * @deprecated should be safe to remove i think
 */
export const notificationsScrollAtom = atom<TabRouteScrollState>({
  activeTab: "mentions",
  scrollPositions: {},
});

export type InteractionFilter = {
  likes: boolean;
  reposts: boolean;
  quotes: boolean;
  replies: boolean;
  showAll: boolean;
};
const defaultFilters: InteractionFilter = {
  likes: true,
  reposts: true,
  quotes: true,
  replies: true,
  showAll: false,
};
export const postInteractionsFiltersAtom = atomWithStorage<InteractionFilter>(
  "postInteractionsFilters",
  defaultFilters
);

export const reusableTabRouteScrollAtom = atom<Record<string, TabRouteScrollState | undefined> | undefined>({});

export const likedPostsAtom = atomWithStorage<Record<string, string>>(
  "likedPosts",
  {}
);

export type LikeRecord = {
  uri: string; // at://did/collection/rkey
  target: string;
  cid: string;
};

export const internalLikedPostsAtom = atomWithStorage<Record<string, LikeRecord | null>>(
  "internal-liked-posts",
  {}
);

export const profileChipsAtom = atom<Record<string, ProfilePostsFilter | null>>({})

export const defaultconstellationURL = "constellation.microcosm.blue";
export const constellationURLAtom = atomWithStorage<string>(
  "constellationURL",
  defaultconstellationURL
);
export const defaultslingshotURL = "slingshot.microcosm.blue";
export const slingshotURLAtom = atomWithStorage<string>(
  "slingshotURL",
  defaultslingshotURL
);
export const defaultImgCDN = "cdn.bsky.app";
export const imgCDNAtom = atomWithStorage<string>("imgcdnurl", defaultImgCDN);
export const defaultVideoCDN = "video.bsky.app";
export const videoCDNAtom = atomWithStorage<string>(
  "videocdnurl",
  defaultVideoCDN
);

export const defaulthue = 28;
export const hueAtom = atomWithStorage<number>("hue", defaulthue);

export const isAtTopAtom = atom<boolean>(true);

type ComposerState =
  | { kind: "closed" }
  | { kind: "root" }
  | { kind: "reply"; parent: string }
  | { kind: "quote"; subject: string };
export const composerAtom = atom<ComposerState>({ kind: "closed" });

//export const agentAtom = atom<Agent | null>(null);
//export const authedAtom = atom<boolean>(false);

export function useAtomCssVar(atom: typeof hueAtom, cssVar: string) {
  const value = useAtomValue(atom);

  useEffect(() => {
    document.documentElement.style.setProperty(cssVar, value.toString());
  }, [value, cssVar]);

  useEffect(() => {
    document.documentElement.style.setProperty(cssVar, value.toString());
  }, []);
}

hueAtom.onMount = (setAtom) => {
  const stored = localStorage.getItem("hue");
  if (stored != null) setAtom(Number(stored));
};
// export function initAtomToCssVar(atom: typeof hueAtom, cssVar: string) {
//   const initial = store.get(atom);
//   console.log("atom get ", initial);
//   document.documentElement.style.setProperty(cssVar, initial.toString());
// }



// fun stuff

export const enableBitesAtom = atomWithStorage<boolean>(
  "enableBitesAtom",
  false
);
