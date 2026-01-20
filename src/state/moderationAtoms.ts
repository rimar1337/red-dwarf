import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";

import type { ContentLabel, LabelerDefinition } from "~/types/moderation";

// --- Configuration ---
export const CACHE_TIMEOUT_MS = 3600000; // 1 Hour
const MAX_CACHE_ENTRIES = 2000; // Limit to prevent localStorage quota issues
const STORAGE_KEY = "moderation-cache-v1";

// --- Types ---
type CacheEntry = { labels: ContentLabel[]; timestamp: number };
type CacheMap = Map<string, CacheEntry>;

// --- Custom Storage Implementation ---
// We cannot use createJSONStorage because it fails to serialize Maps.
// We must write the storage logic manually.
const mapStorage = {
  getItem: (key: string, initialValue: CacheMap): CacheMap => {
    if (typeof window === "undefined" || !window.localStorage) {
      return initialValue;
    }

    try {
      const item = localStorage.getItem(key);
      if (!item) return initialValue;

      const parsed = JSON.parse(item);
      
      // Ensure it is an array (Map serialization format)
      if (!Array.isArray(parsed)) return initialValue;

      const now = Date.now();
      const map = new Map<string, CacheEntry>();

      parsed.forEach(([uri, data]) => {
        // 1. STALENESS CHECK (On Load)
        // Only load if younger than timeout
        if (data && now - data.timestamp < CACHE_TIMEOUT_MS) {
          map.set(uri, data);
        }
      });

      console.log(`[Cache] Hydrated ${map.size} valid entries.`);
      return map;
    } catch (error) {
      console.error("[Cache] Failed to load:", error);
      return initialValue;
    }
  },

  setItem: (key: string, value: CacheMap) => {
    if (typeof window === "undefined" || !window.localStorage) return;

    try {
      let entries = Array.from(value.entries());

      // 2. SAFETY CAP (On Save)
      // If we have too many entries, keep only the newest ones
      if (entries.length > MAX_CACHE_ENTRIES) {
        // Sort by timestamp descending (newest first)
        entries.sort((a, b) => b[1].timestamp - a[1].timestamp);
        // Keep top N
        entries = entries.slice(0, MAX_CACHE_ENTRIES);
      }

      // Convert Map -> Array -> JSON String
      localStorage.setItem(key, JSON.stringify(entries));
    } catch (error) {
      console.error("[Cache] Failed to save:", error);
    }
  },

  removeItem: (key: string) => {
    if (typeof window !== "undefined" && window.localStorage) {
      localStorage.removeItem(key);
    }
  },
};

// --- Atoms ---

export const labelerConfigAtom = atom<LabelerDefinition[]>([]);

export const moderationCacheAtom = atomWithStorage<CacheMap>(
  STORAGE_KEY,
  new Map(),
  mapStorage // <--- Pass our custom object here
);

export const pendingUriQueueAtom = atom<Set<string>>(new Set<string>());
export const processingUriSetAtom = atom<Set<string>>(new Set<string>());