import type Agent from "@atproto/api";
import { atom, createStore } from "jotai";
import { atomWithStorage } from 'jotai/utils';

export const store = createStore();

export const selectedFeedUriAtom = atomWithStorage<string | null>(
  'selectedFeedUri',
  null
);

//export const feedScrollPositionsAtom = atom<Record<string, number>>({});

export const feedScrollPositionsAtom = atomWithStorage<Record<string, number>>(
  'feedscrollpositions',
  {}
);

export const likedPostsAtom = atomWithStorage<Record<string, string>>(
  'likedPosts',
  {}
);

export const defaultconstellationURL = 'constellation.microcosm.blue'
export const constellationURLAtom = atomWithStorage<string>(
  'constellationURL',
  defaultconstellationURL
)
export const defaultslingshotURL = 'slingshot.microcosm.blue'
export const slingshotURLAtom = atomWithStorage<string>(
  'slingshotURL',
  defaultslingshotURL
)
export const defaultImgCDN = 'cdn.bsky.app'
export const imgCDNAtom = atomWithStorage<string>(
  'imgcdnurl',
  defaultImgCDN
)
export const defaultVideoCDN = 'video.bsky.app'
export const videoCDNAtom = atomWithStorage<string>(
  'videocdnurl',
  defaultVideoCDN
)

export const isAtTopAtom = atom<boolean>(true);

type ComposerState =
  | { kind: 'closed' }
  | { kind: 'root' }
  | { kind: 'reply'; parent: string }
  | { kind: 'quote'; subject: string };
export const composerAtom = atom<ComposerState>({ kind: 'closed' });

export const agentAtom = atom<Agent|null>(null);
export const authedAtom = atom<boolean>(false);
