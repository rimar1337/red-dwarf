/// <reference types="vite/client" />

// dont forget to run this
// npx @tanstack/router-cli generate
import type { QueryClient } from "@tanstack/react-query";
import {
  createRootRouteWithContext,
  Link,
  // Outlet,
  Scripts,
  useLocation,
  useNavigate,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { useState } from "react";
import * as React from "react";
import { KeepAliveOutlet, KeepAliveProvider } from "tanstack-router-keepalive";

import { DefaultCatchBoundary } from "~/components/DefaultCatchBoundary";
import Login from "~/components/Login";
import { NotFound } from "~/components/NotFound";
import { UnifiedAuthProvider, useAuth } from "~/providers/UnifiedAuthProvider";
import { seo } from "~/utils/seo";
import IconHome from "~icons/material-symbols/home"
import IconHomeOutline from "~icons/material-symbols/home-outline"
import IconNotifications from "~icons/material-symbols/notifications"
import IconNotificationsOutline from "~icons/material-symbols/notifications-outline"
import IconSearch from "~icons/material-symbols/search"
import IconSettings from "~icons/material-symbols/settings"
import IconSettingsOutline from "~icons/material-symbols/settings-outline"
import IconTag from "~icons/material-symbols/tag"
import IconAccountCircleOutline from  "~icons/mdi/account-circle-outline"
import IconPencilOutline from "~icons/mdi/pencil-outline"

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient;
}>()({
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      ...seo({
        title: "Red Dwarf",
        description: `Distributed Bluesky Client`,
      }),
    ],
    links: [
      {
        rel: "apple-touch-icon",
        sizes: "180x180",
        href: "/apple-touch-icon.png",
      },
      {
        rel: "icon",
        type: "image/png",
        sizes: "32x32",
        href: "/redstar.png?whatwg",
      },
      {
        rel: "icon",
        type: "image/png",
        sizes: "16x16",
        href: "/redstar.png?whatwg",
      },
      { rel: "manifest", href: "/site.webmanifest", color: "#fffff" },
      { rel: "icon", href: "/favicon.ico" },
    ],
  }),
  errorComponent: import.meta.env.DEV
    ? undefined
    : (props) => (
        <RootDocument>
          <DefaultCatchBoundary {...props} />
        </RootDocument>
      ),
  notFoundComponent: () => <NotFound />,
  component: RootComponent,
});

function RootComponent() {
  return (
    <UnifiedAuthProvider>
      <RootDocument>
        <KeepAliveProvider>
          <KeepAliveOutlet />
        </KeepAliveProvider>
      </RootDocument>
    </UnifiedAuthProvider>
  );
}

function RootDocument({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { agent } = useAuth();
  const authed = !!agent?.did;
  const isHome = location.pathname === "/";
  const isNotifications = location.pathname.startsWith("/notifications");
  const isProfile =
    agent &&
    (location.pathname === `/profile/${agent?.did}` ||
      location.pathname === `/profile/${encodeURIComponent(agent?.did ?? "")}`);

  const [postOpen, setPostOpen] = useState(false);
  const [postText, setPostText] = useState("");
  const [posting, setPosting] = useState(false);
  const [postSuccess, setPostSuccess] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);

  async function handlePost() {
    if (!agent) return;
    setPosting(true);
    setPostError(null);
    try {
      await agent.com.atproto.repo.createRecord({
        collection: "app.bsky.feed.post",
        repo: agent.assertDid,
        record: {
          $type: "app.bsky.feed.post",
          text: postText,
          createdAt: new Date().toISOString(),
        },
      });
      setPostSuccess(true);
      setPostText("");
      setTimeout(() => {
        setPostSuccess(false);
        setPostOpen(false);
      }, 1500);
    } catch (e: any) {
      setPostError(e?.message || "Failed to post");
    } finally {
      setPosting(false);
    }
  }

  return (
    <>
      {postOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6 w-full max-w-md relative">
            <button
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              onClick={() => !posting && setPostOpen(false)}
              disabled={posting}
              aria-label="Close"
            >
              ×
            </button>
            <h2 className="text-lg font-bold mb-2">Create Post</h2>
            {postSuccess ? (
              <div className="flex flex-col items-center justify-center py-8">
                <span className="text-green-500 text-4xl mb-2">✓</span>
                <span className="text-green-600">Posted!</span>
              </div>
            ) : (
              <>
                <textarea
                  className="w-full border rounded p-2 mb-2 dark:bg-gray-800 dark:border-gray-700"
                  rows={4}
                  placeholder="What's on your mind?"
                  value={postText}
                  onChange={(e) => setPostText(e.target.value)}
                  disabled={posting}
                  autoFocus
                />
                {postError && (
                  <div className="text-red-500 text-sm mb-2">{postError}</div>
                )}
                <button
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
                  onClick={handlePost}
                  disabled={posting || !postText.trim()}
                >
                  {posting ? "Posting..." : "Post"}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      <div className="min-h-screen flex justify-center bg-gray-50 dark:bg-gray-950">
        <nav className="hidden lg:flex h-screen w-[250px] flex-col gap-2 p-4 dark:border-gray-800 sticky top-0 self-start">
          <div className="flex items-center gap-3 mb-4">
            <img src="/redstar.png" alt="Red Dwarf Logo" className="w-8 h-8" />
            <span className="font-extrabold text-2xl tracking-tight text-gray-900 dark:text-gray-100">
              Red Dwarf{" "}
              {/* <span className="text-gray-500 dark:text-gray-400 text-sm">
                lite
              </span> */}
            </span>
          </div>
          <Link
            to="/"
            className={
              `py-2 px-4 hover:bg-gray-100 dark:hover:bg-gray-900 text-xl flex items-center gap-3 ` +
              (isHome ? "font-bold" : "")
            }
          >
            {!isHome ? (
              <IconHomeOutline width={28} height={28} />
            ) : (
              <IconHome width={28} height={28} />
            )}
            <span>Home</span>
          </Link>
          <Link
            to="/notifications"
            className={
              `py-2 px-4 hover:bg-gray-100 dark:hover:bg-gray-900 text-xl flex items-center gap-3 ` +
              (isNotifications ? "font-bold" : "")
            }
          >
            {!isNotifications ? (
              <IconNotificationsOutline width={28} height={28} />
            ) : (
              <IconNotifications width={28} height={28} />
            )}
            <span>Notifications</span>
          </Link>
          <Link
            to="/feeds"
            className={`py-2 px-4 hover:bg-gray-100 dark:hover:bg-gray-900 text-xl flex items-center gap-3 ${
              location.pathname.startsWith("/feeds") ? "font-bold" : ""
            }`}
          >
            {location.pathname.startsWith("/feeds") ? (
              <IconTag width={28} height={28} />
            ) : (
              <IconTag width={28} height={28} />
            )}
            <span>Feeds</span>
          </Link>

          <Link
            to="/search"
            className={`py-2 px-4 hover:bg-gray-100 dark:hover:bg-gray-900 text-xl flex items-center gap-3 ${
              location.pathname.startsWith("/search") ? "font-bold" : ""
            }`}
          >
            {location.pathname.startsWith("/search") ? (
              <IconSearch width={28} height={28} />
            ) : (
              <IconSearch width={28} height={28} />
            )}
            <span>Search</span>
          </Link>
          <button
            className={`py-2 px-4 hover:bg-gray-100 dark:hover:bg-gray-900 text-xl flex items-center gap-3 w-full text-left ${
              isProfile ? "bg-gray-100 dark:bg-gray-900 font-bold" : ""
            }`}
            onClick={() => {
              if (authed && agent && agent.assertDid) {
                //window.location.href = `/profile/${agent.assertDid}`;
                navigate({
                  to: "/profile/$did",
                  params: { did: agent.assertDid },
                });
              }
            }}
            type="button"
          >
            <IconAccountCircleOutline width={28} height={28} />
            <span>Profile</span>
          </button>
          <Link
            to="/settings"
            className={`py-2 px-4 hover:bg-gray-100 dark:hover:bg-gray-900 text-xl flex items-center gap-3 ${
              location.pathname.startsWith("/settings") ? "font-bold" : ""
            }`}
          >
            {!location.pathname.startsWith("/settings") ? (
              <IconSettingsOutline width={28} height={28} />
            ) : (
              <IconSettings width={28} height={28} />
            )}
            <span>Settings</span>
          </Link>
          <button
            className="mt-4 w-full flex items-center justify-center gap-3 py-3 px-0 mb-3 bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100 text-xl font-bold rounded-full transition-colors shadow"
            onClick={() => setPostOpen(true)}
            type="button"
          >
            <IconPencilOutline
              width={24}
              height={24}
              className="text-gray-600 dark:text-gray-400"
            />
            <span>Post</span>
          </button>
          <div className="flex-1"></div>
          <a
            href="https://tangled.sh/@whey.party/red-dwarf"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 text-xs text-gray-400 dark:text-gray-500 text-center hover:underline"
          >
            git repo
          </a>
          <a
            href="https://whey.party/"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 text-xs text-gray-400 dark:text-gray-500 text-center hover:underline"
          >
            made by @whey.party
          </a>
          <div className="mt-2 text-xs text-gray-400 dark:text-gray-500 text-center">
            powered by{" "}
            <a
              href="https://microcosm.blue"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-blue-500"
            >
              microcosm.blue
            </a>
          </div>
        </nav>

        <button
          className="lg:hidden fixed bottom-20 right-6 z-50 bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-blue-600 dark:text-blue-400 rounded-full shadow-lg w-16 h-16 flex items-center justify-center border-4 border-white dark:border-gray-950 transition-all"
          style={{ boxShadow: "0 4px 24px 0 rgba(0,0,0,0.12)" }}
          onClick={() => setPostOpen(true)}
          type="button"
          aria-label="Create Post"
        >
          <IconPencilOutline
            width={24}
            height={24}
            className="text-gray-600 dark:text-gray-400"
          />
        </button>

        <main className="w-full max-w-[600px] lg:border-x border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 pb-16 lg:pb-0">
          <div className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950">
            <div className="flex items-center gap-2">
              <img
                src="/redstar.png"
                alt="Red Dwarf Logo"
                className="w-6 h-6"
              />
              <span className="font-bold text-lg text-gray-900 dark:text-gray-100">
                Red Dwarf{" "}
                {/* <span className="text-gray-500 dark:text-gray-400 text-sm">
                  lite
                </span> */}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Login compact={true} />
            </div>
          </div>

          {children}
        </main>

        <aside className="hidden lg:flex h-screen w-[250px] sticky top-0 self-start flex-col">
          <Login />

          <div className="flex-1"></div>
          <p className="text-xs text-gray-400 dark:text-gray-500 text-justify mx-4 mb-4">
            Red Dwarf is a bluesky client that uses Constellation and direct PDS
            queries. Skylite would be a self-hosted bluesky "instance". Stay
            tuned for the release of Skylite.
          </p>
        </aside>
      </div>

      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-950 border-t border-gray-200 dark:border-gray-700 z-40">
        <div className="flex justify-around items-center py-2">
          <Link
            to="/"
            className={`flex flex-col items-center py-2 px-3 rounded-lg transition-colors flex-1 ${
              isHome
                ? "text-gray-900 dark:text-gray-100"
                : "text-gray-600 dark:text-gray-400"
            }`}
          >
            {!isHome ? (
              <IconHomeOutline width={24} height={24} />
            ) : (
              <IconHome width={24} height={24} />
            )}
            <span className="text-xs mt-1">Home</span>
          </Link>
          <Link
            to="/search"
            className={`flex flex-col items-center py-2 px-3 rounded-lg transition-colors flex-1 ${
              location.pathname.startsWith("/search")
                ? "text-gray-900 dark:text-gray-100"
                : "text-gray-600 dark:text-gray-400"
            }`}
          >
            {!location.pathname.startsWith("/search") ? (
              <IconSearch width={24} height={24} />
            ) : (
              <IconSearch width={24} height={24} />
            )}
            <span className="text-xs mt-1">Search</span>
          </Link>
          <Link
            to="/notifications"
            className={`flex flex-col items-center py-2 px-3 rounded-lg transition-colors flex-1 ${
              isNotifications
                ? "text-gray-900 dark:text-gray-100"
                : "text-gray-600 dark:text-gray-400"
            }`}
          >
            {!isNotifications ? (
              <IconNotificationsOutline width={24} height={24} />
            ) : (
              <IconNotifications width={24} height={24} />
            )}
            <span className="text-xs mt-1">Notifications</span>
          </Link>
          <button
            className={`flex flex-col items-center py-2 px-3 rounded-lg transition-colors flex-1 ${
              isProfile
                ? "text-gray-900 dark:text-gray-100"
                : "text-gray-600 dark:text-gray-400"
            }`}
            onClick={() => {
              if (authed && agent && agent.assertDid) {
                //window.location.href = `/profile/${agent.assertDid}`;
                navigate({
                  to: "/profile/$did",
                  params: { did: agent.assertDid },
                });
              }
            }}
            type="button"
          >
            <IconAccountCircleOutline width={24} height={24} />
            <span className="text-xs mt-1">Profile</span>
          </button>
          <Link
            to="/settings"
            className={`flex flex-col items-center py-2 px-3 rounded-lg transition-colors flex-1 ${
              location.pathname.startsWith("/settings")
                ? "text-gray-900 dark:text-gray-100"
                : "text-gray-600 dark:text-gray-400"
            }`}
          >
            {!location.pathname.startsWith("/settings") ? (
              <IconSettingsOutline width={24} height={24} />
            ) : (
              <IconSettings width={24} height={24} />
            )}
            <span className="text-xs mt-1">Settings</span>
          </Link>
        </div>
      </nav>

      <TanStackRouterDevtools position="bottom-right" />
      <Scripts />
    </>
  );
}
