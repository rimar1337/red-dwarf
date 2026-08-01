/// <reference types="vite/client" />

// dont forget to run this
// npx @tanstack/router-cli generate
import { AppBskyActorDefs } from "@atproto/api";
import type { QueryClient } from "@tanstack/react-query";
import {
  createRootRouteWithContext,
  Link,
  // Link,
  Outlet,
  Scripts,
  useLocation,
  useNavigate,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { useAtom } from "jotai";
import * as React from "react";
import { toast as sonnerToast } from "sonner";
import { Toaster } from "sonner";

import {
  HOST_ADMIN,
  HOST_CODE_URL,
  HOST_DESCRIPTION,
  HOST_HERO,
  HOST_LOGIN_BLURB,
  HOST_MAIN_TITLE,
  HOST_SIGNUP_PDS,
  HOST_SUB_TITLE,
  HOST_TITLE,
  HOST_UNAUTHED_DEFAULT_FEEDS,
} from "~/../policy";
import { Composer } from "~/components/Composer";
import { DefaultCatchBoundary } from "~/components/DefaultCatchBoundary";
import { Import } from "~/components/Import";
//import Login from "~/components/Login";
import Logo from "~/components/LogoSvg";
//import { ModerationBatcher } from "~/components/ModerationBatcher";
//import { ModerationInitializer } from "~/components/ModerationInitializer";
import { NotFound } from "~/components/NotFound";
import { AutoLabelProvider } from "~/providers/AutoLabelProvider";
import { LikeMutationQueueProvider } from "~/providers/LikeMutationQueueProvider";
import { PollMutationQueueProvider } from "~/providers/PollMutationQueueProvider";
import { UnifiedAuthProvider, useAuth } from "~/providers/UnifiedAuthProvider";
import { FeedTabOnTop } from "~/routes/index";
import {
  composerAtom,
  hueAtom,
  imgCDNAtom,
  quickAuthAtom,
  useAtomCssVar,
} from "~/utils/atoms";
import { seo } from "~/utils/seo";
import { getAvatarUrl } from "~/utils/useHydrated";
import {
  useQueryIdentity,
  useQueryPreferences,
  useQueryProfile,
} from "~/utils/useQuery";

declare const __INSTANCE_MODEL__: boolean;
declare const __MODERATION_PAGE__: boolean;
declare const __VERSION_NUMBER__: string;
declare const __COMMIT_HASH__: string;

export const HARDCODED_TEXT = ` is ${__INSTANCE_MODEL__ ? " a hosted Red Dwarf instance" : " an app"} that you can use to participate in the Bluesky social network.`;

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
        title: HOST_TITLE,
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
    ? (props) => (
        <RootDocument>
          <DefaultCatchBoundary {...props} />
        </RootDocument>
      )
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
      <AutoLabelProvider>
        <LikeMutationQueueProvider>
          <PollMutationQueueProvider>
            {/* <ModerationInitializer />
            <ModerationBatcher /> */}
            <RootDocument>
              <AppToaster />
              <Outlet />
            </RootDocument>
          </PollMutationQueueProvider>
        </LikeMutationQueueProvider>
      </AutoLabelProvider>
    </UnifiedAuthProvider>
  );
}

export function AppToaster() {
  return (
    <Toaster
      position="bottom-center"
      toastOptions={{
        duration: 4000,
      }}
    />
  );
}

export function renderSnack({
  title,
  description,
  button,
}: Omit<ToastProps, "id">) {
  return sonnerToast.custom((id) => (
    <Snack
      id={id}
      title={title}
      description={description}
      button={
        button?.label
          ? {
              label: button?.label,
              onClick: () => {
                button?.onClick?.();
              },
            }
          : undefined
      }
    />
  ));
}

function Snack(props: ToastProps) {
  const { title, description, button, id } = props;

  return (
    <div
      role="status"
      aria-live="polite"
      className="
        w-full md:max-w-[520px]
        flex items-center justify-between
        rounded-md
        px-4 py-3
        shadow-sm
        dark:bg-gray-300 dark:text-gray-900
        bg-gray-700 text-gray-100
        ring-1 dark:ring-gray-200 ring-gray-800
      "
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{title}</p>
        {description ? (
          <p className="mt-1 text-sm dark:text-gray-600 text-gray-300 truncate">
            {description}
          </p>
        ) : null}
      </div>

      {button ? (
        <div className="ml-4 flex-shrink-0">
          <button
            className="
              text-sm font-medium
              px-3 py-1 rounded-md
              bg-gray-200 text-gray-900
              hover:bg-gray-300
              dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700
              focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-300 dark:focus:ring-gray-700
            "
            onClick={() => {
              button.onClick();
              sonnerToast.dismiss(id);
            }}
          >
            {button.label}
          </button>
        </div>
      ) : null}
      <button
        className=" ml-4"
        onClick={() => {
          sonnerToast.dismiss(id);
        }}
      >
        <IconMdiClose />
      </button>
    </div>
  );
}

function DotDivider() {
  return <span> · </span>;
}

/* Types */
interface ToastProps {
  id: string | number;
  title: string;
  description?: string;
  button?: {
    label: string;
    onClick: () => void;
  };
}

function RootDocument({ children }: { children: React.ReactNode }) {
  useAtomCssVar(hueAtom, "--tw-gray-hue");
  const location = useLocation();
  const navigate = useNavigate();
  const { agent } = useAuth();
  const isNotifications = location.pathname.startsWith("/notifications");
  const authed = !!agent?.did;
  const isProfile =
    agent &&
    (location.pathname === `/profile/${agent?.did}` ||
      location.pathname === `/profile/${encodeURIComponent(agent?.did ?? "")}`);
  const isSettings = location.pathname.startsWith("/settings");
  const isSearch = location.pathname.startsWith("/search");
  const isFeeds = location.pathname.startsWith("/feeds");
  const isModeration = location.pathname.startsWith("/moderation");
  const isAbout = location.pathname.startsWith("/about");

  const locationEnum:
    | "feeds"
    | "search"
    | "settings"
    | "notifications"
    | "profile"
    | "moderation"
    | "about"
    | "home" = isFeeds
    ? "feeds"
    : isSearch
      ? "search"
      : isSettings
        ? "settings"
        : isNotifications
          ? "notifications"
          : isProfile
            ? "profile"
            : isModeration
              ? "moderation"
              : isAbout
                ? "about"
                : "home";

  const [, setComposerPost] = useAtom(composerAtom);

  return (
    <>
      <Composer />

      <div className="min-h-screen flex justify-center bg-gray-50 dark:bg-gray-950">
        <nav className="hidden lg:flex h-screen w-[250px] xl:ml-[50px] flex-col gap-0 p-4 dark:border-gray-800 sticky top-0 self-start">
          <div className="flex items-center gap-3 mb-4 pl-3">
            <Logo
              className="h-8 w-8"
              style={{
                color:
                  "oklch(0.6616 0.2249 calc(25.88 + (var(--safe-hue) - 28))",
              }}
            />
            <span className="font-extrabold text-2xl text-gray-900 dark:text-gray-100">
              {HOST_MAIN_TITLE}
              {HOST_SUB_TITLE && (
                <span className="text-gray-500 dark:text-gray-400 text-sm">
                  {HOST_SUB_TITLE}
                </span>
              )}
            </span>
          </div>
          <MaterialNavItem
            InactiveIcon={
              <IconMaterialSymbolsHomeOutline className="w-6 h-6" />
            }
            ActiveIcon={<IconMaterialSymbolsHome className="w-6 h-6" />}
            active={locationEnum === "home"}
            onClickCallbback={() =>
              navigate({
                to: "/",
                //params: { did: agent.assertDid },
              })
            }
            text="Home"
          />

          <MaterialNavItem
            InactiveIcon={<IconMaterialSymbolsSearch className="w-6 h-6" />}
            ActiveIcon={<IconMaterialSymbolsSearch className="w-6 h-6" />}
            active={locationEnum === "search"}
            onClickCallbback={() =>
              navigate({
                to: "/search",
                //params: { did: agent.assertDid },
              })
            }
            text="Explore"
          />
          <MaterialNavItem
            visible={!!agent?.did}
            InactiveIcon={
              <IconMaterialSymbolsNotificationsOutline className="w-6 h-6" />
            }
            ActiveIcon={
              <IconMaterialSymbolsNotifications className="w-6 h-6" />
            }
            active={locationEnum === "notifications"}
            onClickCallbback={() =>
              navigate({
                to: "/notifications",
                //params: { did: agent.assertDid },
              })
            }
            text="Notifications"
          />
          <MaterialNavItem
            visible={!!agent?.did}
            InactiveIcon={<IconMaterialSymbolsTag className="w-6 h-6" />}
            ActiveIcon={<IconMaterialSymbolsTag className="w-6 h-6" />}
            active={locationEnum === "feeds"}
            onClickCallbback={() =>
              navigate({
                to: "/feeds",
                //params: { did: agent.assertDid },
              })
            }
            text="Feeds"
          />
          {__MODERATION_PAGE__ && (
            <MaterialNavItem
              visible={!!agent?.did}
              InactiveIcon={<IconMdiShieldOutline className="w-6 h-6" />}
              ActiveIcon={<IconMdiShield className="w-6 h-6" />}
              active={locationEnum === "moderation"}
              onClickCallbback={() =>
                navigate({
                  to: "/moderation",
                  //params: { did: agent.assertDid },
                })
              }
              text="Moderation"
            />
          )}
          <MaterialNavItem
            visible={!!agent?.did}
            InactiveIcon={
              <IconMaterialSymbolsAccountCircleOutline className="w-6 h-6" />
            }
            ActiveIcon={
              <IconMaterialSymbolsAccountCircle className="w-6 h-6" />
            }
            active={locationEnum === "profile"}
            onClickCallbback={() => {
              if (authed && agent && agent.assertDid) {
                //window.location.href = `/profile/${agent.assertDid}`;
                navigate({
                  to: "/profile/$did",
                  params: { did: agent.assertDid },
                });
              }
            }}
            text="Profile"
          />
          <MaterialNavItem
            InactiveIcon={
              <IconMaterialSymbolsSettingsOutline className="w-6 h-6" />
            }
            ActiveIcon={<IconMaterialSymbolsSettings className="w-6 h-6" />}
            active={locationEnum === "settings"}
            onClickCallbback={() =>
              navigate({
                to: "/settings",
                //params: { did: agent.assertDid },
              })
            }
            text="Settings"
          />
          {!agent?.did && (
            <MaterialNavItem
              InactiveIcon={
                <IconMaterialSymbolsInfoOutline className="w-6 h-6" />
              }
              ActiveIcon={<IconMaterialSymbolsInfo className="w-6 h-6" />}
              active={locationEnum === "about"}
              onClickCallbback={() =>
                navigate({
                  to: "/about",
                  //params: { did: agent.assertDid },
                })
              }
              text="About"
            />
          )}
          {agent?.did && (
            <div className="flex flex-row items-center justify-center mt-3">
              <MaterialPillButton
                InactiveIcon={<IconMdiPencilOutline className="w-6 h-6" />}
                ActiveIcon={<IconMdiPencilOutline className="w-6 h-6" />}
                //active={true}
                onClickCallbback={() => setComposerPost({ kind: "root" })}
                text="Post"
              />
            </div>
          )}
          {!agent?.did && (
            <>
              <div className="mt-4 mb-2 w-full h-[1px] bg-gray-200 dark:bg-gray-800" />
              {/* <Login /> */}
              <LoginRedirect />
            </>
          )}
          {/* <Link
            to="/"
            className={
              `py-2 px-4 hover:bg-gray-100 dark:hover:bg-gray-900 text-xl flex items-center gap-3 ` +
              (isHome ? "font-bold" : "")
            }
          >
            {!isHome ? (
              <IconMaterialSymbolsHomeOutline width={28} height={28} />
            ) : (
              <IconMaterialSymbolsHome width={28} height={28} />
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
              <IconMaterialSymbolsNotificationsOutline width={28} height={28} />
            ) : (
              <IconMaterialSymbolsNotifications width={28} height={28} />
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
              <IconMaterialSymbolsTag width={28} height={28} />
            ) : (
              <IconMaterialSymbolsTag width={28} height={28} />
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
              <IconMaterialSymbolsSearch width={28} height={28} />
            ) : (
              <IconMaterialSymbolsSearch width={28} height={28} />
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
            {!isProfile ? (
              <IconMaterialSymbolsAccountCircleOutline width={28} height={28} />
            ) : (
              <IconMaterialSymbolsAccountCircle width={28} height={28} />
            )}
            <span>Profile</span>
          </button>
          <Link
            to="/settings"
            className={`py-2 px-4 hover:bg-gray-100 dark:hover:bg-gray-900 text-xl flex items-center gap-3 ${
              location.pathname.startsWith("/settings") ? "font-bold" : ""
            }`}
          >
            {!location.pathname.startsWith("/settings") ? (
              <IconMaterialSymbolsSettingsOutline width={28} height={28} />
            ) : (
              <IconMaterialSymbolsSettings width={28} height={28} />
            )}
            <span>Settings</span>
          </Link> */}
          {/* <button
            className="mt-4 w-full flex items-center justify-center gap-3 py-3 px-0 mb-3 bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100 text-xl font-bold rounded-full transition-colors shadow"
            onClick={() => setPostOpen(true)}
            type="button"
          >
            <IconMdiPencilOutline
              width={24}
              height={24}
              className="text-gray-600 dark:text-gray-400"
            />
            <span>Post</span>
          </button> */}
          <div className="flex-1"></div>
          {!!agent?.did && (
            <div className="flex flex-row items-center lg:mb-1">
              <div className="flex p-2 h-12 flex-1 rounded-full hover:dark:bg-gray-800 hover:bg-gray-200">
                <ProfileSmall did={agent.did} />
              </div>
              <Link
                to="/settings"
                className="flex p-3 h-12 w-12 rounded-full hover:dark:bg-gray-800 hover:bg-gray-200 items-center justify-center"
              >
                <IconMaterialSymbolsMoreVert />
              </Link>
            </div>
          )}
          {/* 
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
          */}
        </nav>

        <nav className="hidden sm:flex items-center lg:hidden h-screen  flex-col gap-2 p-4 dark:border-gray-800 sticky top-0 self-start">
          <div className="flex items-center gap-3 mb-4">
            <Logo
              className="h-8 w-8"
              style={{
                color:
                  "oklch(0.6616 0.2249 calc(25.88 + (var(--safe-hue) - 28))",
              }}
            />
          </div>
          <MaterialNavItem
            small
            InactiveIcon={
              <IconMaterialSymbolsHomeOutline className="w-6 h-6" />
            }
            ActiveIcon={<IconMaterialSymbolsHome className="w-6 h-6" />}
            active={locationEnum === "home"}
            onClickCallbback={() =>
              navigate({
                to: "/",
                //params: { did: agent.assertDid },
              })
            }
            text="Home"
          />

          <MaterialNavItem
            small
            InactiveIcon={<IconMaterialSymbolsSearch className="w-6 h-6" />}
            ActiveIcon={<IconMaterialSymbolsSearch className="w-6 h-6" />}
            active={locationEnum === "search"}
            onClickCallbback={() =>
              navigate({
                to: "/search",
                //params: { did: agent.assertDid },
              })
            }
            text="Explore"
          />
          <MaterialNavItem
            small
            visible={!!agent?.did}
            InactiveIcon={
              <IconMaterialSymbolsNotificationsOutline className="w-6 h-6" />
            }
            ActiveIcon={
              <IconMaterialSymbolsNotifications className="w-6 h-6" />
            }
            active={locationEnum === "notifications"}
            onClickCallbback={() =>
              navigate({
                to: "/notifications",
                //params: { did: agent.assertDid },
              })
            }
            text="Notifications"
          />
          <MaterialNavItem
            small
            visible={!!agent?.did}
            InactiveIcon={<IconMaterialSymbolsTag className="w-6 h-6" />}
            ActiveIcon={<IconMaterialSymbolsTag className="w-6 h-6" />}
            active={locationEnum === "feeds"}
            onClickCallbback={() =>
              navigate({
                to: "/feeds",
                //params: { did: agent.assertDid },
              })
            }
            text="Feeds"
          />
          {__MODERATION_PAGE__ && (
            <MaterialNavItem
              small
              visible={!!agent?.did}
              InactiveIcon={<IconMdiShieldOutline className="w-6 h-6" />}
              ActiveIcon={<IconMdiShield className="w-6 h-6" />}
              active={locationEnum === "moderation"}
              onClickCallbback={() =>
                navigate({
                  to: "/moderation",
                  //params: { did: agent.assertDid },
                })
              }
              text="Moderation"
            />
          )}
          <MaterialNavItem
            small
            visible={!!agent?.did}
            InactiveIcon={
              <IconMaterialSymbolsAccountCircleOutline className="w-6 h-6" />
            }
            ActiveIcon={
              <IconMaterialSymbolsAccountCircle className="w-6 h-6" />
            }
            active={locationEnum === "profile"}
            onClickCallbback={() => {
              if (authed && agent && agent.assertDid) {
                //window.location.href = `/profile/${agent.assertDid}`;
                navigate({
                  to: "/profile/$did",
                  params: { did: agent.assertDid },
                });
              }
            }}
            text="Profile"
          />
          <MaterialNavItem
            small
            InactiveIcon={
              <IconMaterialSymbolsSettingsOutline className="w-6 h-6" />
            }
            ActiveIcon={<IconMaterialSymbolsSettings className="w-6 h-6" />}
            active={locationEnum === "settings"}
            onClickCallbback={() =>
              navigate({
                to: "/settings",
                //params: { did: agent.assertDid },
              })
            }
            text="Settings"
          />

          {!agent?.did && (
            <MaterialNavItem
              small
              InactiveIcon={
                <IconMaterialSymbolsInfoOutline className="w-6 h-6" />
              }
              ActiveIcon={<IconMaterialSymbolsInfo className="w-6 h-6" />}
              active={locationEnum === "about"}
              onClickCallbback={() =>
                navigate({
                  to: "/about",
                  //params: { did: agent.assertDid },
                })
              }
              text="About"
            />
          )}
          {!!agent?.did && (
            <div className="flex flex-row items-center justify-center mt-3">
              <MaterialPillButton
                small
                InactiveIcon={<IconMdiPencilOutline className="w-6 h-6" />}
                ActiveIcon={<IconMdiPencilOutline className="w-6 h-6" />}
                //active={true}
                onClickCallbback={() => setComposerPost({ kind: "root" })}
                text="Post"
              />
            </div>
          )}
        </nav>

        {agent?.did && (
          <button
            className="lg:hidden fixed bottom-22 right-4 z-50 bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 rounded-2xl w-14 h-14 flex items-center justify-center transition-all"
            style={{ boxShadow: "0 4px 24px 0 rgba(0,0,0,0.12)" }}
            onClick={() => setComposerPost({ kind: "root" })}
            type="button"
            aria-label="Create Post"
          >
            <IconMdiPencilOutline
              width={24}
              height={24}
              className="text-gray-600 dark:text-gray-400"
            />
          </button>
        )}

        <main className="w-full max-w-[600px] sm:border-x border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 pb-16 lg:pb-0 overflow-x-clip">
          {children}
        </main>

        <aside className="hidden lg:flex h-screen xl:w-[300px] w-[250px] sticky top-0 self-start flex-col">
          <div className="px-4 pt-4 gap-4 flex flex-col">
            <Import />
          </div>
          <div className="px-4 pt-4 gap-4 flex flex-col max-h-[calc(100dvh - 80px)] overflow-y-auto">
            {((!agent?.did && HOST_UNAUTHED_DEFAULT_FEEDS.length > 0) ||
              !!agent?.did) && <FeedListDesktopSidebar />}
            {!agent?.did && (
              <>
                <span className=" text-gray-500 dark:text-gray-400 text-sm leading-tight">
                  <span className=" font-bold">
                    {__INSTANCE_MODEL__ ? window.location.host : "Red Dwarf"}
                  </span>
                  {HARDCODED_TEXT}
                </span>
                <img className="rounded-sm" src={HOST_HERO} />
                {__INSTANCE_MODEL__ && (
                  <span className=" text-gray-500 dark:text-gray-400 text-sm">
                    {HOST_DESCRIPTION}
                  </span>
                )}
                <div className="flex flex-col gap-1 ">
                  <span className="text-gray-500 dark:text-gray-400 text-sm font-bold">
                    {__INSTANCE_MODEL__ ? "ADMINISTERED BY:" : "APP PROFILE:"}
                  </span>
                  <ProfileSmall
                    did={
                      __INSTANCE_MODEL__
                        ? HOST_ADMIN
                        : "did:plc:tufumi46dykq4fzwtp2ur6kx"
                    }
                  />
                </div>
              </>
            )}
          </div>
          <div className="flex-1"></div>
          {/* todo */}
          <div className="px-4 py-4 flex flex-row items-center gap-1 flex-wrap text-[13px] leading-3 text-gray-500 dark:text-gray-400">
            {/* TODO: add red dwarf the software policy along with instance policy
            here */}
            <span className="shrink-0 font-bold">Red Dwarf:</span>
            <Link to="/about">
              <span className=" underline">About</span>
            </Link>
            <DotDivider />
            <a
              href={HOST_CODE_URL}
              rel="noopener"
              target="_blank"
              className="underline wrap-anywhere break-all"
            >
              View source code
            </a>
            <DotDivider />
            <span className="shrink-0">{__VERSION_NUMBER__ || "v????"}</span>
            {__COMMIT_HASH__ && (
              <>
                <DotDivider />
                <span className="shrink-0">{__COMMIT_HASH__ || "????"}</span>
              </>
            )}
          </div>
        </aside>
      </div>

      {agent?.did ? (
        <nav className="sm:hidden fixed bottom-0 left-0 right-0 bg-gray-50 dark:bg-gray-900 border-0 border-t-1 dark:border-t-0 shadow border-gray-200 dark:border-gray-700 z-40">
          <div className="flex justify-around items-center p-2">
            <MaterialNavItem
              small
              InactiveIcon={
                <IconMaterialSymbolsHomeOutline className="w-6 h-6" />
              }
              ActiveIcon={<IconMaterialSymbolsHome className="w-6 h-6" />}
              active={locationEnum === "home"}
              onClickCallbback={() =>
                navigate({
                  to: "/",
                  //params: { did: agent.assertDid },
                })
              }
              text="Home"
            />
            {/* <Link
              to="/"
              className={`flex flex-col items-center py-2 px-3 rounded-lg transition-colors flex-1 ${
                isHome
                  ? "text-gray-900 dark:text-gray-100"
                  : "text-gray-600 dark:text-gray-400"
              }`}
            >
              {!isHome ? (
                <IconMaterialSymbolsHomeOutline width={24} height={24} />
              ) : (
                <IconMaterialSymbolsHome width={24} height={24} />
              )}
              <span className="text-xs mt-1">Home</span>
            </Link> */}
            <MaterialNavItem
              small
              InactiveIcon={<IconMaterialSymbolsSearch className="w-6 h-6" />}
              ActiveIcon={<IconMaterialSymbolsSearch className="w-6 h-6" />}
              active={locationEnum === "search"}
              onClickCallbback={() =>
                navigate({
                  to: "/search",
                  //params: { did: agent.assertDid },
                })
              }
              text="Explore"
            />
            {/* <Link
              to="/search"
              className={`flex flex-col items-center py-2 px-3 rounded-lg transition-colors flex-1 ${
                location.pathname.startsWith("/search")
                  ? "text-gray-900 dark:text-gray-100"
                  : "text-gray-600 dark:text-gray-400"
              }`}
            >
              {!location.pathname.startsWith("/search") ? (
                <IconMaterialSymbolsSearch width={24} height={24} />
              ) : (
                <IconMaterialSymbolsSearch width={24} height={24} />
              )}
              <span className="text-xs mt-1">Search</span>
            </Link> */}
            <MaterialNavItem
              small
              InactiveIcon={
                <IconMaterialSymbolsNotificationsOutline className="w-6 h-6" />
              }
              ActiveIcon={
                <IconMaterialSymbolsNotifications className="w-6 h-6" />
              }
              active={locationEnum === "notifications"}
              onClickCallbback={() =>
                navigate({
                  to: "/notifications",
                  //params: { did: agent.assertDid },
                })
              }
              text="Notifications"
            />
            {/* <Link
              to="/notifications"
              className={`flex flex-col items-center py-2 px-3 rounded-lg transition-colors flex-1 ${
                isNotifications
                  ? "text-gray-900 dark:text-gray-100"
                  : "text-gray-600 dark:text-gray-400"
              }`}
            >
              {!isNotifications ? (
                <IconMaterialSymbolsNotificationsOutline
                  width={24}
                  height={24}
                />
              ) : (
                <IconMaterialSymbolsNotifications width={24} height={24} />
              )}
              <span className="text-xs mt-1">Notifications</span>
            </Link> */}
            <MaterialNavItem
              small
              InactiveIcon={
                <IconMaterialSymbolsAccountCircleOutline className="w-6 h-6" />
              }
              ActiveIcon={
                <IconMaterialSymbolsAccountCircle className="w-6 h-6" />
              }
              active={locationEnum === "profile"}
              onClickCallbback={() => {
                if (authed && agent && agent.assertDid) {
                  //window.location.href = `/profile/${agent.assertDid}`;
                  navigate({
                    to: "/profile/$did",
                    params: { did: agent.assertDid },
                  });
                }
              }}
              text="Profile"
            />
            {/* <button
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
              <IconMaterialSymbolsAccountCircleOutline width={24} height={24} />
              <span className="text-xs mt-1">Profile</span>
            </button> */}
            <MaterialNavItem
              small
              InactiveIcon={
                <IconMaterialSymbolsSettingsOutline className="w-6 h-6" />
              }
              ActiveIcon={<IconMaterialSymbolsSettings className="w-6 h-6" />}
              active={
                locationEnum === "settings" ||
                locationEnum === "feeds" ||
                locationEnum === "moderation"
              }
              onClickCallbback={() =>
                navigate({
                  to: "/settings",
                  //params: { did: agent.assertDid },
                })
              }
              text="Settings"
            />
            {/* <Link
              to="/settings"
              className={`flex flex-col items-center py-2 px-3 rounded-lg transition-colors flex-1 ${
                location.pathname.startsWith("/settings")
                  ? "text-gray-900 dark:text-gray-100"
                  : "text-gray-600 dark:text-gray-400"
              }`}
            >
              {!location.pathname.startsWith("/settings") ? (
                <IconMaterialSymbolsSettingsOutline width={24} height={24} />
              ) : (
                <IconMaterialSymbolsSettings width={24} height={24} />
              )}
              <span className="text-xs mt-1">Settings</span>
            </Link> */}
          </div>
        </nav>
      ) : (
        <div className="lg:hidden flex items-center fixed bottom-0 left-0 right-0 justify-between px-4 py-3 border-0 border-t-1 dark:border-t-0 shadow border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 z-10">
          <div className="flex items-center gap-2">
            <Logo
              className="h-6 w-6"
              style={{
                color:
                  "oklch(0.6616 0.2249 calc(25.88 + (var(--safe-hue) - 28))",
              }}
            />
            <span className="font-bold text-lg text-gray-900 dark:text-gray-100">
              {HOST_MAIN_TITLE}
              {HOST_SUB_TITLE && (
                <span className="text-gray-500 dark:text-gray-400 text-sm">
                  {HOST_SUB_TITLE}
                </span>
              )}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {/* <Login compact={true} popup={true} /> */}
            <Link
              to="/settings"
              className="rounded-full bg-gray-600 text-gray-100 dark:bg-gray-400 dark:text-gray-900 px-4 py-2 text-sm font-medium text-center"
            >
              Log in
            </Link>
          </div>
        </div>
      )}

      <TanStackRouterDevtools position="bottom-left" />
      <Scripts />
    </>
  );
}

export function MaterialNavItem({
  visible = true,
  InactiveIcon,
  ActiveIcon,
  text,
  active,
  onClickCallbback,
  small,
}: {
  visible?: boolean;
  InactiveIcon: React.ReactElement;
  ActiveIcon: React.ReactElement;
  text: string;
  active: boolean;
  onClickCallbback: () => void;
  small?: boolean | string;
}) {
  if (!visible) return null;
  if (small)
    return (
      <button
        className={`flex flex-col items-center rounded-lg transition-colors ${small} gap-1 ${
          active
            ? "text-gray-900 dark:text-gray-100"
            : "text-gray-600 dark:text-gray-400"
        }`}
        onClick={() => {
          onClickCallbback();
        }}
      >
        <div
          className={`px-4 py-1 rounded-full flex items-center justify-center ${active ? " bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 hover:dark:bg-gray-700" : "hover:bg-gray-50 hover:dark:bg-gray-900"}`}
        >
          {active ? ActiveIcon : InactiveIcon}
        </div>
        <span
          className={`text-[12.8px] text-roboto ${active ? "font-medium" : ""}`}
        >
          {text}
        </span>
      </button>
    );

  return (
    <button
      className={`flex flex-row h-12 min-h-12 max-h-12 px-4 py-0.5 w-full items-center rounded-full transition-colors flex-1 gap-1 ${
        active
          ? "text-gray-900 dark:text-gray-100 hover:bg-gray-300 dark:bg-gray-800 bg-gray-200 hover:dark:bg-gray-700"
          : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 hover:dark:bg-gray-900"
      }`}
      onClick={() => {
        onClickCallbback();
      }}
    >
      <div className={`mr-4 ${active ? " " : " "}`}>
        {active ? ActiveIcon : InactiveIcon}
      </div>
      <span
        className={`text-[17px] text-roboto ${active ? "font-medium" : ""}`}
      >
        {text}
      </span>
    </button>
  );
}

function MaterialPillButton({
  InactiveIcon,
  ActiveIcon,
  text,
  //active,
  onClickCallbback,
  small,
}: {
  InactiveIcon: React.ReactElement;
  ActiveIcon: React.ReactElement;
  text: string;
  //active: boolean;
  onClickCallbback: () => void;
  small?: boolean | string;
}) {
  const active = false;
  return (
    <button
      className={`flex border border-gray-400 dark:border-gray-400 flex-row h-12 min-h-12 max-h-12 ${small ? "p-3 w-12" : "px-4 py-0.5"} items-center rounded-full transition-colors gap-1 ${
        active
          ? "text-gray-900 dark:text-gray-100 hover:bg-gray-300 dark:bg-gray-700 bg-gray-200 hover:dark:bg-gray-600"
          : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 hover:dark:bg-gray-800"
      }`}
      onClick={() => {
        onClickCallbback();
      }}
    >
      <div className={`${!small && "mr-2"} ${active ? " " : " "}`}>
        {active ? ActiveIcon : InactiveIcon}
      </div>
      {!small && (
        <span
          className={`text-[17px] text-roboto ${active ? "font-medium" : ""}`}
        >
          {text}
        </span>
      )}
    </button>
  );
}

export const ProfileSmall = ({
  did,
  large = false,
}: {
  did: string;
  large?: boolean;
}) => {
  const navigate = useNavigate();
  const { data: identity } = useQueryIdentity(did);
  const { data: profiledata } = useQueryProfile(
    `at://${did}/app.bsky.actor.profile/self`,
  );
  const profile = profiledata?.value;

  const [imgcdn] = useAtom(imgCDNAtom);

  const onProfileClick = (e: React.MouseEvent<Element, MouseEvent>) => {
    e.stopPropagation();
    navigate({
      to: "/profile/$did",
      params: { did: did },
    });
  };

  if (!profiledata) {
    return (
      // Skeleton loader
      <div
        onClick={onProfileClick}
        className={`hover:cursor-pointer flex items-center gap-2.5 animate-pulse ${large ? "mb-1" : ""}`}
      >
        <div
          className={`rounded-full bg-gray-300 dark:bg-gray-700 ${large ? "w-10 h-10" : "w-[30px] h-[30px]"}`}
        />
        <div className="flex flex-col gap-2">
          <div
            className={`bg-gray-300 dark:bg-gray-700 rounded ${large ? "h-4 w-28" : "h-3 w-20"}`}
          />
          <div
            className={`bg-gray-300 dark:bg-gray-700 rounded ${large ? "h-4 w-20" : "h-3 w-16"}`}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={onProfileClick}
      className={`hover:cursor-pointer flex flex-row items-center gap-2.5 ${large ? "mb-1" : ""}`}
    >
      <img
        src={getAvatarUrl(imgcdn, profile, did) ?? undefined}
        alt="avatar"
        className={`object-cover rounded-full ${large ? "w-10 h-10" : "w-[30px] h-[30px]"}`}
      />
      <div className="flex flex-col items-start text-left">
        <div
          className={`font-medium ${large ? "text-gray-800 dark:text-gray-100 text-md" : "text-gray-800 dark:text-gray-100 text-sm"}`}
        >
          {profile?.displayName}
        </div>
        <div
          className={` ${large ? "text-gray-500 dark:text-gray-400 text-sm" : "text-gray-500 dark:text-gray-400 text-xs"}`}
        >
          @{identity?.handle}
        </div>
      </div>
    </div>
  );
};

function FeedListDesktopSidebar() {
  const { agent, status } = useAuth();
  const [quickAuth] = useAtom(quickAuthAtom);
  const isAuthRestoring = quickAuth ? status === "loading" : false;

  const identityresultmaybe = useQueryIdentity(
    !isAuthRestoring ? agent?.did : undefined,
  );
  const identity = identityresultmaybe?.data;

  const prefsresultmaybe = useQueryPreferences({
    agent: !isAuthRestoring ? (agent ?? undefined) : undefined,
    pdsUrl: !isAuthRestoring ? identity?.pds : undefined,
  });
  const prefs = prefsresultmaybe?.data;

  const savedFeeds = React.useMemo(() => {
    const savedFeedsPref = prefs?.preferences?.find(
      AppBskyActorDefs.isSavedFeedsPrefV2,
    );
    return savedFeedsPref?.items || [];
  }, [prefs]);

  const pinnedFeeds = React.useMemo(() => {
    return savedFeeds.filter((feed: any) => feed.pinned);
  }, [savedFeeds]);

  const shimmedunautheddefault = HOST_UNAUTHED_DEFAULT_FEEDS.map(
    (aturi: string, idx: number) => {
      return {
        value: aturi,
        pinned: true,
      };
    },
  );

  const feedsmap = agent?.did ? pinnedFeeds : shimmedunautheddefault;

  return (
    <div className="flex flex-col gap-1 items-start ">
      {feedsmap.map((item: any, idx: number) => {
        return (
          <FeedTabOnTop
            key={item}
            item={item}
            idx={idx}
            rightDesktopSidebar={true}
          />
        );
      })}
    </div>
  );
}

function LoginRedirect() {
  const location = useLocation();
  const dontShowLoginButton = location.pathname === "/settings";
  return (
    <div className="">
      <span className="text-gray-500 dark:text-gray-400 text-sm leading-tight">
        {HOST_LOGIN_BLURB}
      </span>

      <div className="flex flex-col gap-2 my-4">
        {!dontShowLoginButton && (
          <Link
            to="/settings"
            className="w-full rounded-full bg-gray-600 text-gray-100 dark:bg-gray-400 dark:text-gray-900 px-4 py-2 text-sm font-medium text-center"
          >
            Log in
          </Link>
        )}

        {HOST_SIGNUP_PDS && (
          // todo make signup actually work
          <button className="w-full rounded-sm border border-gray-300 dark:border-gray-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            Sign up
          </button>
        )}
      </div>
    </div>
  );
}
