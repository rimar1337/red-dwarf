import { createFileRoute, Link } from "@tanstack/react-router";
import React from "react";
import { UniversalPostRendererATURILoader } from "~/components/UniversalPostRenderer";
import { usePersistentStore } from "~/providers/PersistentStoreProvider";

const HANDLE_DID_CACHE_TIMEOUT = 60 * 60 * 1000; // 1 hour

export const Route = createFileRoute("/profile/$did/post/$rkey")({
  component: RouterWrapper,
});

function RouterWrapper() {
  const { did, rkey } = Route.useParams();

  return (
    <ProfilePostComponent
      key={`/profile/${did}/post/${rkey}`}
      did={did}
      rkey={rkey}
    />
  );
}

function ProfilePostComponent({ did, rkey }: { did: string; rkey: string }) {
  const { get, set } = usePersistentStore();
  const [resolvedDid, setResolvedDid] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [replies, setReplies] = React.useState<any[]>([]);

  React.useEffect(() => {
    let ignore = false;
    async function resolveDidIfNeeded() {
      if (!did) {
        setResolvedDid(null);
        return;
      }
      if (did.startsWith("did:")) {
        setResolvedDid(did);
        return;
      }
      setLoading(true);
      setError(null);
      const cacheKey = `handleDid:${did}`;
      const now = Date.now();
      const cached = await get(cacheKey); // <-- await here
      if (
        cached &&
        cached.value &&
        cached.time &&
        now - cached.time < HANDLE_DID_CACHE_TIMEOUT
      ) {
        try {
          const data = JSON.parse(cached.value);
          if (!ignore) setResolvedDid(data.did);
          setLoading(false);
          return;
        } catch {}
      }
      try {
        const url = `https://free-fly-24.deno.dev/?handle=${encodeURIComponent(did)}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("Failed to resolve handle");
        const data = await res.json();
        await set(cacheKey, JSON.stringify(data)); // <-- await here
        if (!ignore) setResolvedDid(data.did);
      } catch (e: any) {
        if (!ignore) setError("Failed to resolve handle: " + (e?.message || e));
      } finally {
        setLoading(false);
      }
    }
    resolveDidIfNeeded();
    return () => {
      ignore = true;
    };
  }, [did, get, set]);

  const atUri =
    resolvedDid && rkey
      ? `at://${decodeURIComponent(resolvedDid)}/app.bsky.feed.post/${rkey}`
      : "";

  const handleConstellation = React.useCallback((data: any) => {}, []);

  React.useEffect(() => {
    if (!atUri) return;
    let ignore = false;
    async function fetchReplies() {
      try {
        const url = `https://constellation.microcosm.blue/links?target=${encodeURIComponent(atUri)}&collection=app.bsky.feed.post&path=.reply.parent.uri`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("Failed to fetch replies");
        const data = await res.json();
        if (!ignore && data.linking_records) {
          setReplies(data.linking_records.slice(0, 50));
        }
      } catch (e) {
        if (!ignore) setReplies([]);
      }
    }
    fetchReplies();
    return () => {
      ignore = true;
    };
  }, [atUri]);

  if (!did || !rkey) return <div>Invalid post URI</div>;
  if (loading) return <div>Resolving handle...</div>;
  if (error) return <div style={{ color: "red" }}>{error}</div>;
  if (!atUri) return <div>Invalid post URI</div>;

  console.log("atUri", atUri);

  return (
    <>
      <div className="flex items-center gap-2 px-4 py-2 h-[52px] sticky top-0 bg-white dark:bg-gray-950 z-10 border-b border-gray-200 dark:border-gray-700">
        <Link
          to=".."
          className="px-3 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-900 font-bold text-lg"
          onClick={(e) => {
            e.preventDefault();
            window.history.length > 1
              ? window.history.back()
              : window.location.assign("/");
          }}
          aria-label="Go back"
        >
          ←
        </Link>
        <span className="text-xl font-bold ml-2">Post</span>
      </div>
      <UniversalPostRendererATURILoader
        atUri={atUri}
        onConstellation={handleConstellation}
        detailed={true}
      />
      {replies.length > 0 && (
        <div style={{ maxWidth: 600, margin: "0px auto 0", padding: 0 }}>
          <div
            className="text-gray-500 dark:text-gray-400 text-sm font-bold"
            style={{
              fontSize: 18,
              margin: "12px 16px 12px 16px",
              fontWeight: 600,
            }}
          >
            Replies
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {replies.map((reply, i) => {
              const replyAtUri = `at://${reply.did}/app.bsky.feed.post/${reply.rkey}`;
              return (
                <UniversalPostRendererATURILoader
                  key={replyAtUri}
                  atUri={replyAtUri}
                />
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
