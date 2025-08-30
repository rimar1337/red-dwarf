import { createFileRoute } from "@tanstack/react-router";
import React, { useEffect, useState, useRef } from "react";
import { useAuth } from "~/providers/PassAuthProvider";
import { usePersistentStore } from "~/providers/PersistentStoreProvider";

const HANDLE_DID_CACHE_TIMEOUT = 60 * 60 * 1000; // 1 hour

export const Route = createFileRoute("/notifications")({
  component: NotificationsComponent,
});

function NotificationsComponent() {
  console.log("NotificationsComponent render");
  const { agent, authed, loading: authLoading } = useAuth();
  const { get, set } = usePersistentStore();
  const [did, setDid] = useState<string | null>(null);
  const [resolving, setResolving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [responses, setResponses] = useState<any[]>([null, null, null]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (authLoading) return;
    if (authed && agent && agent.assertDid) {
      setDid(agent.assertDid);
    }
  }, [authed, agent, authLoading]);

  async function handleSubmit() {
    console.log("handleSubmit called");
    setError(null);
    setResponses([null, null, null]);
    const value = inputRef.current?.value?.trim() || "";
    if (!value) return;
    if (value.startsWith("did:")) {
      setDid(value);
      setError(null);
      return;
    }
    setResolving(true);
    const cacheKey = `handleDid:${value}`;
    const now = Date.now();
    const cached = await get(cacheKey);
    if (
      cached &&
      cached.value &&
      cached.time &&
      now - cached.time < HANDLE_DID_CACHE_TIMEOUT
    ) {
      try {
        const data = JSON.parse(cached.value);
        setDid(data.did);
        setResolving(false);
        return;
      } catch {}
    }
    try {
      const url = `https://free-fly-24.deno.dev/?handle=${encodeURIComponent(value)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to resolve handle");
      const data = await res.json();
      set(cacheKey, JSON.stringify(data));
      setDid(data.did);
    } catch (e: any) {
      setError("Failed to resolve handle: " + (e?.message || e));
    } finally {
      setResolving(false);
    }
  }

  useEffect(() => {
    if (!did) return;
    setLoading(true);
    setError(null);
    const urls = [
      `https://constellation.microcosm.blue/links?target=${encodeURIComponent(did)}&collection=app.bsky.feed.post&path=.facets[app.bsky.richtext.facet].features[app.bsky.richtext.facet%23mention].did`,
      `https://constellation.microcosm.blue/links?target=${encodeURIComponent(did)}&collection=app.bsky.feed.post&path=.facets[].features[app.bsky.richtext.facet%23mention].did`,
      `https://constellation.microcosm.blue/links?target=${encodeURIComponent(did)}&collection=app.bsky.graph.follow&path=.subject`,
    ];
    let ignore = false;
    Promise.all(
      urls.map(async (url) => {
        try {
          const r = await fetch(url);
          if (!r.ok) throw new Error("Failed to fetch");
          const text = await r.text();
          if (!text) return null;
          try {
            return JSON.parse(text);
          } catch {
            return null;
          }
        } catch (e: any) {
          return { error: e?.message || String(e) };
        }
      }),
    )
      .then((results) => {
        if (!ignore) setResponses(results);
      })
      .catch((e) => {
        if (!ignore)
          setError("Failed to fetch notifications: " + (e?.message || e));
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [did]);

  return (
    <div className="flex flex-col divide-y divide-gray-200 dark:divide-gray-800">
      <div className="flex items-center gap-2 px-4 py-2 h-[52px] sticky top-0 bg-white dark:bg-gray-950 z-10 border-b border-gray-200 dark:border-gray-800">
        <span className="text-xl font-bold ml-2">Notifications</span>
        {!authed && (
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Enter handle or DID"
              ref={inputRef}
              className="ml-4 px-2 py-1 rounded border border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100"
              style={{ minWidth: 220 }}
              disabled={resolving}
            />
            <button
              type="button"
              className="px-3 py-1 rounded bg-blue-600 text-white font-semibold disabled:opacity-50"
              disabled={resolving}
              onClick={handleSubmit}
            >
              {resolving ? "Resolving..." : "Submit"}
            </button>
          </div>
        )}
      </div>
      {error && <div className="p-4 text-red-500">{error}</div>}
      {loading && (
        <div className="p-4 text-gray-500">Loading notifications...</div>
      )}
      {!loading &&
        !error &&
        responses.map((resp, i) => (
          <div key={i} className="p-4">
            <div className="font-bold mb-2">Query {i + 1}</div>
            {!resp ||
            (typeof resp === "object" && Object.keys(resp).length === 0) ||
            (Array.isArray(resp) && resp.length === 0) ? (
              <div className="text-gray-500">No notifications found.</div>
            ) : (
              <pre
                style={{
                  background: "#222",
                  color: "#eee",
                  borderRadius: 8,
                  padding: 12,
                  fontSize: 13,
                  overflowX: "auto",
                }}
              >
                {JSON.stringify(resp, null, 2)}
              </pre>
            )}
          </div>
        ))}
      {/* <div className="p-4"> yo this project sucks, ill remake it some other time, like cmon inputting anything into the textbox makes it break. ive warned you</div> */}
    </div>
  );
}
