import { atom, createStore, useAtomValue } from "jotai";
import { atomWithStorage } from "jotai/utils";
import { useEffect } from "react";

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

type NotificationsScrollState = {
  activeTab: string;
  scrollPositions: Record<string, number>;
};
export const notificationsScrollAtom = atom<NotificationsScrollState>({
  activeTab: "mentions",
  scrollPositions: {},
});

export const likedPostsAtom = atomWithStorage<Record<string, string>>(
  "likedPosts",
  {}
);

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
