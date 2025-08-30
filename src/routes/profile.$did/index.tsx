import { createFileRoute, Link } from "@tanstack/react-router";
import React from "react";
import { UniversalPostRendererATURILoader } from "~/components/UniversalPostRenderer";
import { usePersistentStore } from "~/providers/PersistentStoreProvider";

const HANDLE_DID_CACHE_TIMEOUT = 60 * 60 * 1000; // 1 hour
const CACHE_TIMEOUT = 5 * 60 * 1000; // 5 minutes

export const Route = createFileRoute("/profile/$did/")({
  component: ProfileComponent,
});

function ProfileComponent() {
  const { did } = Route.useParams();
  const { get, set } = usePersistentStore();
  const [resolvedDid, setResolvedDid] = React.useState<string | null>(null);
  const [resolvedHandle, setResolvedHandle] = React.useState<string | null>(
    null,
  );
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [profile, setProfile] = React.useState<any>(null);
  const [posts, setPosts] = React.useState<any[]>([]);
  const [postsLoading, setPostsLoading] = React.useState(false);
  const [cursor, setCursor] = React.useState<string | null>(null);
  const [hasMore, setHasMore] = React.useState(true);
  const [postsCached, setPostsCached] = React.useState(false);

  React.useEffect(() => {
    let ignore = false;
    async function resolveDidIfNeeded() {
      if (!did) {
        setResolvedDid(null);
        setResolvedHandle(null);
        return;
      }
      if (did.startsWith("did:")) {
        setResolvedDid(did);
        setLoading(true);
        setError(null);
        const cacheKey = `handleDid:${did}`;
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
            if (!ignore) {
              setResolvedDid(data.did);
              setResolvedHandle(data.handle || null);
            }
            setLoading(false);
            return;
          } catch {}
        }
        try {
          const url = `https://free-fly-24.deno.dev/?did=${encodeURIComponent(did)}`;
          const res = await fetch(url);
          if (!res.ok) throw new Error("Failed to resolve DID");
          const data = await res.json();
          set(cacheKey, JSON.stringify(data));
          if (!ignore) {
            setResolvedDid(data.did);
            setResolvedHandle(data.handle || null);
          }
        } catch (e: any) {
          if (!ignore)
            setError("Failed to resolve handle: " + (e?.message || e));
        } finally {
          setLoading(false);
        }
        return;
      }
      setLoading(true);
      setError(null);
      const cacheKey = `handleDid:${did}`;
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
          if (!ignore) {
            setResolvedDid(data.did);
            setResolvedHandle(data.handle || did);
          }
          setLoading(false);
          return;
        } catch {}
      }
      try {
        const url = `https://free-fly-24.deno.dev/?handle=${encodeURIComponent(did)}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("Failed to resolve handle");
        const data = await res.json();
        set(cacheKey, JSON.stringify(data));
        if (!ignore) {
          setResolvedDid(data.did);
          setResolvedHandle(data.handle || did);
        }
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

  React.useEffect(() => {
    if (!resolvedDid) return;
    let ignore = false;
    async function fetchProfile() {
      const cacheKey = `profile:${resolvedDid}`;
      const now = Date.now();
      const cached = await get(cacheKey);
      if (
        cached &&
        cached.value &&
        cached.time &&
        now - cached.time < CACHE_TIMEOUT
      ) {
        try {
          if (!ignore) setProfile(JSON.parse(cached.value));
          return;
        } catch {}
      }
      try {
        if (!resolvedDid) return;
        let resolvedRaw = await get(`handleDid:${resolvedDid}`);
        let resolved: any = null;
        if (
          resolvedRaw &&
          resolvedRaw.value &&
          resolvedRaw.time &&
          now - resolvedRaw.time < HANDLE_DID_CACHE_TIMEOUT
        ) {
          try {
            resolved = JSON.parse(resolvedRaw.value);
          } catch {
            resolved = null;
          }
        } else {
          const url = `https://free-fly-24.deno.dev/?did=${encodeURIComponent(resolvedDid)}`;
          const res = await fetch(url);
          if (!res.ok) throw new Error("Failed to resolve DID");
          resolved = await res.json();
          set(`handleDid:${resolvedDid}`, JSON.stringify(resolved));
        }
        if (!resolved || !resolved.pdsUrl)
          throw new Error("DID resolution failed or missing pdsUrl");

        const profileUrl = `${resolved.pdsUrl}/xrpc/com.atproto.repo.getRecord?repo=${encodeURIComponent(resolvedDid)}&collection=app.bsky.actor.profile&rkey=self`;
        const profileRes = await fetch(profileUrl);
        if (!profileRes.ok) throw new Error("Failed to fetch profile");
        const profileData = await profileRes.json();
        if (!ignore) {
          setProfile(profileData);
          set(cacheKey, JSON.stringify(profileData));
        }
      } catch (e: any) {
        if (!ignore) setError("Failed to fetch profile: " + (e?.message || e));
      }
    }
    fetchProfile();
    return () => {
      ignore = true;
    };
  }, [resolvedDid, get, set]);

  React.useEffect(() => {
    if (!resolvedDid) return;
    let ignore = false;
    async function fetchPosts() {
      setPostsLoading(true);
      setPostsCached(false);
      try {
        if (!resolvedDid) return;
        let resolvedRaw = await get(`handleDid:${resolvedDid}`);
        let resolved: any = null;
        const now = Date.now();
        if (
          resolvedRaw &&
          resolvedRaw.value &&
          resolvedRaw.time &&
          now - resolvedRaw.time < HANDLE_DID_CACHE_TIMEOUT
        ) {
          try {
            resolved = JSON.parse(resolvedRaw.value);
          } catch {
            resolved = null;
          }
        } else {
          const url = `https://free-fly-24.deno.dev/?did=${encodeURIComponent(resolvedDid)}`;
          const res = await fetch(url);
          if (!res.ok) throw new Error("Failed to resolve DID");
          resolved = await res.json();
          set(`handleDid:${resolvedDid}`, JSON.stringify(resolved));
        }
        if (!resolved || !resolved.pdsUrl)
          throw new Error("DID resolution failed or missing pdsUrl");

        const postsUrl = `${resolved.pdsUrl}/xrpc/com.atproto.repo.listRecords?repo=${resolvedDid}&collection=app.bsky.feed.post${cursor && false ? `&cursor=${cursor}` : ""}&limit=20`;
        const postsRes = await fetch(postsUrl);
        if (!postsRes.ok) throw new Error("Failed to fetch posts");
        const postsData = await postsRes.json();

        if (postsData.records) {
          await Promise.all(
            postsData.records.map(async (post: any) => {
              if (post.uri && post.value) {
                const postCacheKey = `record:${post.uri}`;
                console.log(
                  "caching post",
                  postCacheKey,
                  JSON.stringify(post, null, 2),
                );
                await set(postCacheKey, JSON.stringify(post));
              }
            }),
          );
        }

        if (!ignore) {
          setPosts((prev) =>
            cursor ? [...prev, ...postsData.records] : postsData.records,
          );
          setCursor(postsData.cursor || null);
          setHasMore(postsData.records.length === 20);
          setPostsCached(true);
        }
      } catch (e: any) {
        if (!ignore) setError("Failed to fetch posts: " + (e?.message || e));
      } finally {
        if (!ignore) setPostsLoading(false);
      }
    }
    fetchPosts();
    return () => {
      ignore = true;
    };
  }, [resolvedDid, cursor, get, set]);

  function getAvatarUrl(profile: any) {
    const link = profile?.value?.avatar?.ref?.["$link"];
    if (!link || !resolvedDid) return null;
    return `https://cdn.bsky.app/img/avatar/plain/${resolvedDid}/${link}@jpeg`;
  }
  function getBannerUrl(profile: any) {
    const link = profile?.value?.banner?.ref?.["$link"];
    if (!link || !resolvedDid) return null;
    return `https://cdn.bsky.app/img/banner/plain/${resolvedDid}/${link}@jpeg`;
  }

  const displayName =
    profile?.value?.displayName ||
    (resolvedHandle ? `@${resolvedHandle}` : did);
  let handle: string;
  if (resolvedHandle) {
    handle = `@${resolvedHandle}`;
  } else if (did && !did.startsWith("did:")) {
    handle = `@${did}`;
  } else {
    handle = resolvedDid || did;
  }
  const description = profile?.value?.description || "";

  if (!did) return <div>Invalid profile</div>;
  if (loading) return <div>Resolving handle...</div>;
  if (error) return <div style={{ color: "red" }}>{error}</div>;
  if (!resolvedDid) return <div>Invalid profile</div>;

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
        <span className="text-xl font-bold ml-2">Profile</span>
      </div>

      {/* Profile Header */}
      <div
        style={{
          width: "100%",
          maxWidth: 600,
          margin: "0 auto",
          boxShadow: "0 2px 12px #0002",
          padding: 0,
          color: "#eee",
          fontFamily: "system-ui, sans-serif",
          // marginTop: 20,
          //background: '#181a20',
          borderRadius: 16,
          overflow: "hidden",
          position: "relative",
        }}
        className="bg-gray-200 dark:bg-gray-900"
      >
        {/* Banner */}
        <div
          style={{
            width: "100%",
            height: 160,
            background: `#222 url(${getBannerUrl(profile)}) center/cover no-repeat`,
            position: "relative",
          }}
        />
        {/* Avatar (PFP) */}
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: 120,
            transform: "translateX(-50%)",
            zIndex: 2,
            borderRadius: "50%",
            border: "4px solid #181a20",
            boxShadow: "0 2px 8px #0006",
            background: "#222",
          }}
        >
          <img
            src={getAvatarUrl(profile) || "/favicon.png"}
            alt="avatar"
            style={{
              width: 112,
              height: 112,
              borderRadius: "50%",
              objectFit: "cover",
              display: "block",
            }}
          />
        </div>
        {/* Info Card */}
        <div
          style={{
            marginTop: 72,
            padding: "0 24px 24px 24px",
            textAlign: "center",
          }}
        >
          <div style={{ fontWeight: 700, fontSize: 24, marginBottom: 4 }}>
            {displayName}
          </div>
          <div style={{ color: "#aaa", fontSize: 16, marginBottom: 12 }}>
            {handle}
          </div>
          {description && (
            <div
              style={{
                fontSize: 16,
                lineHeight: 1.5,
                color: "#ddd",
                marginBottom: 20,
              }}
            >
              {description}
            </div>
          )}
          {!profile && !error && (
            <div style={{ color: "#888", padding: 16 }}>Loading profile...</div>
          )}
        </div>
      </div>

      {/* Posts */}
      <div style={{ maxWidth: 600, margin: "0px auto 0", padding: 0 }}>
        <div
          className="text-gray-500 dark:text-gray-400 text-sm font-bold"
          style={{
            fontSize: 18,
            margin: "12px 16px 12px 16px",
            fontWeight: 600,
          }}
        >
          Posts
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {postsCached &&
            posts.map((post) => {
              return (
                <UniversalPostRendererATURILoader
                  key={post.uri}
                  atUri={post.uri}
                />
              );
            })}
        </div>
        {postsLoading && (
          <div style={{ color: "#888", padding: 16, textAlign: "center" }}>
            Loading posts...
          </div>
        )}
        {hasMore && !postsLoading && (
          <button
            onClick={() => setCursor(cursor)}
            style={{
              width: "100%",
              padding: 12,
              background: "#222",
              color: "#eee",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
              fontSize: 16,
              marginTop: 16,
            }}
          >
            Load More Posts
          </button>
        )}
        {posts.length === 0 && !postsLoading && !error && (
          <div style={{ color: "#888", padding: 16, textAlign: "center" }}>
            No posts found
          </div>
        )}
      </div>
    </>
  );
}
