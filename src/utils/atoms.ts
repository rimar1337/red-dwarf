import { atom } from "jotai";

export const selectedFeedUriAtom = atom<string | null>(null);

export const feedScrollPositionsAtom = atom<Record<string, number>>({});