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

export const isAtTopAtom = atom<boolean>(true);

export const agentAtom = atom<Agent|null>(null);
export const authedAtom = atom<boolean>(false);
