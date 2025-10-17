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
import { type SVGProps, useState } from "react";
import * as React from "react";
import { KeepAliveOutlet, KeepAliveProvider } from "tanstack-router-keepalive";

import { DefaultCatchBoundary } from "~/components/DefaultCatchBoundary";
import Login from "~/components/Login";
import { NotFound } from "~/components/NotFound";
import { UnifiedAuthProvider, useAuth } from "~/providers/UnifiedAuthProvider";
import { seo } from "~/utils/seo";

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
            {isHome ? (
              <TablerHomeFilled width={28} height={28} />
            ) : (
              <TablerHome width={28} height={28} />
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
            {isNotifications ? (
              <TablerBellFilled width={28} height={28} />
            ) : (
              <TablerBell width={28} height={28} />
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
              <TablerHashtagFilled width={28} height={28} />
            ) : (
              <TablerHashtag width={28} height={28} />
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
              <TablerSearchFilled width={28} height={28} />
            ) : (
              <TablerSearch width={28} height={28} />
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
            <TablerUserCircle width={28} height={28} />
            <span>Profile</span>
          </button>
          <Link
            to="/settings"
            className={`py-2 px-4 hover:bg-gray-100 dark:hover:bg-gray-900 text-xl flex items-center gap-3 ${
              location.pathname.startsWith("/settings") ? "font-bold" : ""
            }`}
          >
            {location.pathname.startsWith("/settings") ? (
              <IonSettingsSharp width={28} height={28} />
            ) : (
              <IonSettings width={28} height={28} />
            )}
            <span>Settings</span>
          </Link>
          <button
            className="mt-4 w-full flex items-center justify-center gap-3 py-3 px-0 mb-3 bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100 text-xl font-bold rounded-full transition-colors shadow"
            onClick={() => setPostOpen(true)}
            type="button"
          >
            <TablerEdit
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
          <TablerEdit
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
            {isHome ? (
              <TablerHomeFilled width={24} height={24} />
            ) : (
              <TablerHome width={24} height={24} />
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
            {location.pathname.startsWith("/search") ? (
              <TablerSearchFilled width={24} height={24} />
            ) : (
              <TablerSearch width={24} height={24} />
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
            {isNotifications ? (
              <TablerBellFilled width={24} height={24} />
            ) : (
              <TablerBell width={24} height={24} />
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
            <TablerUserCircle width={24} height={24} />
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
            {location.pathname.startsWith("/settings") ? (
              <IonSettingsSharp width={24} height={24} />
            ) : (
              <IonSettings width={24} height={24} />
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
export function TablerHashtag(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={24}
      height={24}
      viewBox="0 0 24 24"
      {...props}
    >
      <path
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M5 9h14M5 15h14M11 4L7 20M17 4l-4 16"
      ></path>
    </svg>
  );
}

export function TablerHashtagFilled(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={24}
      height={24}
      viewBox="0 0 24 24"
      {...props}
    >
      <path
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={3}
        d="M5 9h14M5 15h14M11 4L7 20M17 4l-4 16"
      ></path>
    </svg>
  );
}
export function TablerEdit(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={24}
      height={24}
      viewBox="0 0 24 24"
      className="text-white"
      {...props}
    >
      <g
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
      >
        <path d="M16.475 5.408a2.36 2.36 0 1 1 3.34 3.34L7.5 21H3v-4.5z"></path>
      </g>
    </svg>
  );
}
export function TablerHome(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={24}
      height={24}
      viewBox="0 0 24 24"
      className="text-gray-900 dark:text-gray-100 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
      {...props}
    >
      <g
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        fill="none"
      >
        <path d="M5 12H3l9-9l9 9h-2M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"></path>
        <path d="M9 21v-6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v6"></path>
      </g>
    </svg>
  );
}
export function TablerHomeFilled(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={24}
      height={24}
      viewBox="0 0 24 24"
      className="text-gray-900 dark:text-gray-100 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
      {...props}
    >
      <path
        fill="currentColor"
        d="m12.707 2.293l9 9c.63.63.184 1.707-.707 1.707h-1v6a3 3 0 0 1-3 3h-1v-7a3 3 0 0 0-2.824-2.995L13 12h-2a3 3 0 0 0-3 3v7H7a3 3 0 0 1-3-3v-6H3c-.89 0-1.337-1.077-.707-1.707l9-9a1 1 0 0 1 1.414 0M13 14a1 1 0 0 1 1 1v7h-4v-7a1 1 0 0 1 .883-.993L11 14z"
      ></path>
    </svg>
  );
}

export function TablerBell(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={24}
      height={24}
      viewBox="0 0 24 24"
      {...props}
    >
      <path
        className="text-gray-900 dark:text-gray-100 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M10 5a2 2 0 1 1 4 0a7 7 0 0 1 4 6v3a4 4 0 0 0 2 3H4a4 4 0 0 0 2-3v-3a7 7 0 0 1 4-6M9 17v1a3 3 0 0 0 6 0v-1"
      ></path>
    </svg>
  );
}
export function TablerBellFilled(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={24}
      height={24}
      viewBox="0 0 24 24"
      className="text-gray-900 dark:text-gray-100 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
      {...props}
    >
      <path
        fill="currentColor"
        stroke="currentColor"
        d="M14.235 19c.865 0 1.322 1.024.745 1.668A4 4 0 0 1 12 22a4 4 0 0 1-2.98-1.332c-.552-.616-.158-1.579.634-1.661l.11-.006zM12 2c1.358 0 2.506.903 2.875 2.141l.046.171l.008.043a8.01 8.01 0 0 1 4.024 6.069l.028.287L19 11v2.931l.021.136a3 3 0 0 0 1.143 1.847l.167.117l.162.099c.86.487.56 1.766-.377 1.864L20 18H4c-1.028 0-1.387-1.364-.493-1.87a3 3 0 0 0 1.472-2.063L5 13.924l.001-2.97A8 8 0 0 1 8.822 4.5l.248-.146l.01-.043a3 3 0 0 1 2.562-2.29l.182-.017z"
      ></path>
    </svg>
  );
}

export function TablerUserCircle(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={24}
      height={24}
      viewBox="0 0 24 24"
      className="text-gray-900 dark:text-gray-100 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
      {...props}
    >
      <g
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
      >
        <path d="M3 12a9 9 0 1 0 18 0a9 9 0 1 0-18 0"></path>
        <path d="M9 10a3 3 0 1 0 6 0a3 3 0 1 0-6 0m-2.832 8.849A4 4 0 0 1 10 16h4a4 4 0 0 1 3.834 2.855"></path>
      </g>
    </svg>
  );
}

export function TablerSearch(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={24}
      height={24}
      viewBox="0 0 24 24"
      //className="text-gray-400 dark:text-gray-500"
      {...props}
    >
      <g
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
      >
        <path d="M3 10a7 7 0 1 0 14 0a7 7 0 1 0-14 0"></path>
        <path d="m21 21l-6-6"></path>
      </g>
    </svg>
  );
}
export function TablerSearchFilled(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={24}
      height={24}
      viewBox="0 0 24 24"
      //className="text-gray-400 dark:text-gray-500"
      {...props}
    >
      <g
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={3}
      >
        <path d="M3 10a7 7 0 1 0 14 0a7 7 0 1 0-14 0"></path>
        <path d="m21 21l-6-6"></path>
      </g>
    </svg>
  );
}

export function IonSettings(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={24}
      height={24}
      viewBox="0 0 512 512"
      {...props}
    >
      <path
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={32}
        d="M262.29 192.31a64 64 0 1 0 57.4 57.4a64.13 64.13 0 0 0-57.4-57.4M416.39 256a154 154 0 0 1-1.53 20.79l45.21 35.46a10.81 10.81 0 0 1 2.45 13.75l-42.77 74a10.81 10.81 0 0 1-13.14 4.59l-44.9-18.08a16.11 16.11 0 0 0-15.17 1.75A164.5 164.5 0 0 1 325 400.8a15.94 15.94 0 0 0-8.82 12.14l-6.73 47.89a11.08 11.08 0 0 1-10.68 9.17h-85.54a11.11 11.11 0 0 1-10.69-8.87l-6.72-47.82a16.07 16.07 0 0 0-9-12.22a155 155 0 0 1-21.46-12.57a16 16 0 0 0-15.11-1.71l-44.89 18.07a10.81 10.81 0 0 1-13.14-4.58l-42.77-74a10.8 10.8 0 0 1 2.45-13.75l38.21-30a16.05 16.05 0 0 0 6-14.08c-.36-4.17-.58-8.33-.58-12.5s.21-8.27.58-12.35a16 16 0 0 0-6.07-13.94l-38.19-30A10.81 10.81 0 0 1 49.48 186l42.77-74a10.81 10.81 0 0 1 13.14-4.59l44.9 18.08a16.11 16.11 0 0 0 15.17-1.75A164.5 164.5 0 0 1 187 111.2a15.94 15.94 0 0 0 8.82-12.14l6.73-47.89A11.08 11.08 0 0 1 213.23 42h85.54a11.11 11.11 0 0 1 10.69 8.87l6.72 47.82a16.07 16.07 0 0 0 9 12.22a155 155 0 0 1 21.46 12.57a16 16 0 0 0 15.11 1.71l44.89-18.07a10.81 10.81 0 0 1 13.14 4.58l42.77 74a10.8 10.8 0 0 1-2.45 13.75l-38.21 30a16.05 16.05 0 0 0-6.05 14.08c.33 4.14.55 8.3.55 12.47"
      ></path>
    </svg>
  );
}
export function IonSettingsSharp(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={24}
      height={24}
      viewBox="0 0 512 512"
      {...props}
    >
      <path
        fill="currentColor"
        d="M256 176a80 80 0 1 0 80 80a80.24 80.24 0 0 0-80-80m172.72 80a165.5 165.5 0 0 1-1.64 22.34l48.69 38.12a11.59 11.59 0 0 1 2.63 14.78l-46.06 79.52a11.64 11.64 0 0 1-14.14 4.93l-57.25-23a176.6 176.6 0 0 1-38.82 22.67l-8.56 60.78a11.93 11.93 0 0 1-11.51 9.86h-92.12a12 12 0 0 1-11.51-9.53l-8.56-60.78A169.3 169.3 0 0 1 151.05 393L93.8 416a11.64 11.64 0 0 1-14.14-4.92L33.6 331.57a11.59 11.59 0 0 1 2.63-14.78l48.69-38.12A175 175 0 0 1 83.28 256a165.5 165.5 0 0 1 1.64-22.34l-48.69-38.12a11.59 11.59 0 0 1-2.63-14.78l46.06-79.52a11.64 11.64 0 0 1 14.14-4.93l57.25 23a176.6 176.6 0 0 1 38.82-22.67l8.56-60.78A11.93 11.93 0 0 1 209.94 26h92.12a12 12 0 0 1 11.51 9.53l8.56 60.78A169.3 169.3 0 0 1 361 119l57.2-23a11.64 11.64 0 0 1 14.14 4.92l46.06 79.52a11.59 11.59 0 0 1-2.63 14.78l-48.69 38.12a175 175 0 0 1 1.64 22.66"
      ></path>
    </svg>
  );
}
