import { createFileRoute } from "@tanstack/react-router";
import {
  CACHE_TIMEOUT,
  cachedGetRecord,
  cachedResolveIdentity,
  UniversalPostRendererATURILoader,
} from "~/components/UniversalPostRenderer";
import * as React from "react";
import { useAuth } from "~/providers/PassAuthProvider";
import { usePersistentStore } from "~/providers/PersistentStoreProvider";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  const {
    agent,
    loginStatus,
    login,
    logout,
    loading: loadering,
    authed,
  } = useAuth();
  const { get, set } = usePersistentStore();
  const [feed, setFeed] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [prefs, setPrefs] = React.useState<any>({});
  React.useEffect(() => {
    if (!loadering && authed && agent && agent.did) {
      const run = async () => {
        try {
          if (!agent.did) return;
          const prefs = await cachedGetPrefs({
            did: agent.did,
            agent,
            get,
            set,
          });

          console.log("alistoffeeds", prefs);
          setPrefs(prefs || {});
        } catch (err) {
          console.error("alistoffeeds Fetch error in preferences effect:", err);
        }
      };

      run();
    }
  }, [loadering, authed, agent]);

  const savedFeedsPref = React.useMemo(() => {
    if (!prefs?.preferences) return null;
    return prefs.preferences.find(
      (p: any) => p?.$type === "app.bsky.actor.defs#savedFeedsPrefV2",
    );
  }, [prefs]);

  const savedFeeds = savedFeedsPref?.items || [];

  const [selectedFeed, setSelectedFeed] = React.useState<string | null>(null);

  React.useEffect(() => {
    const fallbackFeed =
      "at://did:plc:z72i7hdynmk6r22z27h6tvur/app.bsky.feed.generator/wh-hot";
    if (authed) {
      if (savedFeeds.length > 0) {
        setSelectedFeed((prev) =>
          prev && savedFeeds.some((f: any) => f.value === prev)
            ? prev
            : savedFeeds[0].value,
        );
      } else {
        setSelectedFeed(fallbackFeed);
      }
    } else {
      setSelectedFeed(fallbackFeed);
    }
  }, [savedFeeds, authed]);

  React.useEffect(() => {
    if (loadering || !selectedFeed) return;

    let ignore = false;

    const run = async () => {
      setLoading(true);
      setError(null);

      try {
        if (authed && agent) {
          if (!agent.did) return;

          const pdsurl = await cachedResolveIdentity({
            didOrHandle: agent.did,
            get,
            set,
          });

          const fetchstringcomplex = `${pdsurl.pdsUrl}/xrpc/app.bsky.feed.getFeedSkeleton?feed=${selectedFeed}`;
          console.log("fetching feed authed: " + fetchstringcomplex);

          const feeddef = await cachedGetRecord({
            atUri: selectedFeed,
            get,
            set,
          });

          const feedservicedid = feeddef.value.did;

          const res = await agent.fetchHandler(fetchstringcomplex, {
            method: "GET",
            headers: {
              "atproto-proxy": `${feedservicedid}#bsky_fg`,
              "Content-Type": "application/json",
            },
          });

          if (!res.ok) throw new Error("Failed to fetch feed");
          const data = await res.json();

          if (!ignore) setFeed(data.feed || []);
        } else {
          console.log("falling back");
          // always use fallback feed for not logged in
          const fallbackFeed =
            "at://did:plc:z72i7hdynmk6r22z27h6tvur/app.bsky.feed.generator/whats-hot";
          // const feeddef = await cachedGetRecord({
          //   atUri: fallbackFeed,
          //   get,
          //   set,
          // });

          //const feedservicedid = "did:web:discover.bsky.app" //feeddef.did;
          const fetchstringsimple = `https://discover.bsky.app/xrpc/app.bsky.feed.getFeedSkeleton?feed=${fallbackFeed}`;
          console.log("fetching feed unauthed: " + fetchstringsimple);

          const res = await fetch(fetchstringsimple);
          if (!res.ok) throw new Error("Failed to fetch feed");
          const data = await res.json();

          if (!ignore) setFeed(data.feed || []);
        }
      } catch (e) {
        if (!ignore) {
          if (e instanceof Error) {
            setError(e.message);
          } else {
            setError("Unknown error");
          }
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    run();

    return () => {
      ignore = true;
    };
  }, [authed, agent, loadering, selectedFeed, get, set]);

  return (
    <div className="flex flex-col divide-y divide-gray-200 dark:divide-gray-800">
      <div className="flex items-center gap-2 px-4 py-2 h-[52px] sticky top-0 bg-white dark:bg-gray-950 z-10 border-b border-gray-200 dark:border-gray-700 overflow-x-auto overflow-y-hidden scroll-thin">
        {savedFeeds.length > 0 ? (
          savedFeeds.map((item: any, idx: number) => {
            const label = item.value.split("/").pop() || item.value;
            const isActive = selectedFeed === item.value;
            return (
              <button
                key={item.value || idx}
                className={`px-3 py-1 rounded-full whitespace-nowrap font-medium transition-colors ${
                  isActive
                    ? "bg-gray-600 text-white"
                    : item.pinned
                      ? "bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200"
                      : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200"
                }`}
                onClick={() => setSelectedFeed(item.value)}
                title={item.value}
              >
                {label}
                {item.pinned && (
                  <span className="ml-1 text-xs text-gray-700 dark:text-gray-200">
                    ★
                  </span>
                )}
              </button>
            );
          })
        ) : (
          <span className="text-xl font-bold ml-2">Home</span>
        )}
      </div>
      {loading && <div className="p-4 text-gray-500">Loading...</div>}
      {error && <div className="p-4 text-red-500">{error}</div>}
      {!loading && !error && feed.length === 0 && (
        <div className="p-4 text-gray-500">No posts found.</div>
      )}
      {feed.map((item, i) => (
        <UniversalPostRendererATURILoader
          key={item.post || i}
          atUri={item.post}
        />
      ))}
    </div>
  );
}

export async function cachedResolveDIDWEBDOC({
  didweb,
  cacheTimeout = CACHE_TIMEOUT,
  get,
  set,
}: {
  didweb: string;
  cacheTimeout?: number;
  get: (key: string) => any;
  set: (key: string, value: string) => void;
}): Promise<any> {
  const isDidInput = didweb.startsWith("did:web:");
  const cacheKey = `didwebdoc:${didweb}`;
  const now = Date.now();
  const cached = get(cacheKey);
  if (
    cached &&
    cached.value &&
    cached.time &&
    now - cached.time < cacheTimeout
  ) {
    try {
      return JSON.parse(cached.value);
    } catch {}
  }
  const url = `https://free-fly-24.deno.dev/resolve-did-web?did=${encodeURIComponent(
    didweb,
  )}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to resolve didwebdoc");
  const data = await res.json();
  set(cacheKey, JSON.stringify(data));
  if (!isDidInput && data.did) {
    set(`didwebdoc:${data.did}`, JSON.stringify(data));
  }
  return data;
}

export async function cachedGetPrefs({
  did,
  agent,
  get,
  set,
  cacheTimeout = CACHE_TIMEOUT,
}: {
  did: string;
  agent: any; // or type properly if available
  get: (key: string) => any;
  set: (key: string, value: string) => void;
  cacheTimeout?: number;
}): Promise<any> {
  const cacheKey = `prefs:${did}`;
  const cached = get(cacheKey);
  const now = Date.now();

  if (
    cached &&
    cached.value &&
    cached.time &&
    now - cached.time < cacheTimeout
  ) {
    try {
      return JSON.parse(cached.value);
    } catch {
      // fall through to fetch
    }
  }

  const resolved = await cachedResolveIdentity({
    didOrHandle: did,
    get,
    set,
  });

  if (!resolved?.pdsUrl) throw new Error("Missing resolved PDS info");

  const fetchUrl = `${resolved.pdsUrl}/xrpc/app.bsky.actor.getPreferences`;

  const res = await agent.fetchHandler(fetchUrl, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) throw new Error(`Failed to fetch preferences: ${res.status}`);

  const text = await res.text();

  let data: any;
  try {
    data = JSON.parse(text);
  } catch (err) {
    console.error("Failed to parse preferences JSON:", err);
    throw err;
  }

  set(cacheKey, JSON.stringify(data));
  return data;
}
