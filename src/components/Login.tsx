// src/components/Login.tsx
import AtpAgent, { Agent } from "@atproto/api";
import { useAtom } from "jotai";
import React, { useEffect, useRef, useState } from "react";

import { useAuth } from "~/providers/UnifiedAuthProvider";
import { imgCDNAtom } from "~/utils/atoms";
import { useQueryIdentity, useQueryProfile } from "~/utils/useQuery";

// --- 1. The Main Component (Orchestrator with `compact` prop) ---
export default function Login({
  compact = false,
  popup = false,
}: {
  compact?: boolean;
  popup?: boolean;
}) {
  const { status, agent, logout } = useAuth();

  // Loading state can be styled differently based on the prop
  if (status === "loading") {
    return (
      <div
        className={
          compact
            ? "flex items-center justify-center p-1"
            : "p-6 bg-gray-100 dark:bg-gray-900 rounded-xl shadow border border-gray-200 dark:border-gray-800 flex justify-center items-center h-[280px]"
        }
      >
        <span
          className={`border-t-transparent rounded-full animate-spin ${
            compact
              ? "w-5 h-5 border-2 border-gray-400"
              : "w-8 h-8 border-4 border-gray-400"
          }`}
        />
      </div>
    );
  }

  // --- LOGGED IN STATE ---
  if (status === "signedIn") {
    // Large view
    if (!compact) {
      return (
        <div className="p-4 bg-gray-100 dark:bg-gray-900 rounded-xl  border-gray-200 dark:border-gray-800">
          <div className="flex flex-col items-center justify-center text-center">
            <p className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-100">
              You are logged in!
            </p>
            <ProfileThing agent={agent} large />
            <button
              onClick={logout}
              className="bg-gray-600 mt-4 hover:bg-gray-700 text-white rounded-full px-6 py-2 font-semibold text-base transition-colors"
            >
              Log out
            </button>
          </div>
        </div>
      );
    }
    // Compact view
    return (
      <div className="flex items-center gap-4">
        <ProfileThing agent={agent} />
        <button
          onClick={logout}
          className="text-sm bg-gray-600 hover:bg-gray-700 text-white rounded px-3 py-1 font-medium transition-colors"
        >
          Log out
        </button>
      </div>
    );
  }

  // --- LOGGED OUT STATE ---
  if (!compact) {
    // Large view renders the form directly in the card
    return (
      <div className="p-4 bg-gray-100 dark:bg-gray-900 rounded-xl  border-gray-200 dark:border-gray-800">
        <UnifiedLoginForm />
      </div>
    );
  }

  // Compact view renders a button that toggles the form in a dropdown
  return <CompactLoginButton popup={popup} />;
}

// --- 2. The Reusable, Self-Contained Login Form Component ---
export function UnifiedLoginForm() {
  const [mode, setMode] = useState<"oauth" | "password">("oauth");

  return (
    <div>
      <div className="flex bg-gray-300 rounded-full dark:bg-gray-700 mb-4">
        <TabButton
          label="OAuth"
          active={mode === "oauth"}
          onClick={() => setMode("oauth")}
        />
        <TabButton
          label="Password"
          active={mode === "password"}
          onClick={() => setMode("password")}
        />
      </div>
      {mode === "oauth" ? <OAuthForm /> : <PasswordForm />}
    </div>
  );
}

// --- 3. Helper components for layouts, forms, and UI ---

// A new component to contain the logic for the compact dropdown
const CompactLoginButton = ({ popup }: { popup?: boolean }) => {
  const [showForm, setShowForm] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (formRef.current && !formRef.current.contains(event.target as Node)) {
        setShowForm(false);
      }
    }
    if (showForm) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showForm]);

  return (
    <div className="relative" ref={formRef}>
      <button
        onClick={() => setShowForm(!showForm)}
        className="text-sm bg-gray-600 hover:bg-gray-700 text-white rounded-full px-3 py-1 font-medium transition-colors"
      >
        Log in
      </button>
      {showForm && (
        <div
          className={`absolute ${popup ? `bottom-[calc(100%)]` : `top-full`} right-0 mt-2 w-80 bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4 z-50`}
        >
          <UnifiedLoginForm />
        </div>
      )}
    </div>
  );
};

const TabButton = ({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 text-sm font-medium transition-colors rounded-full flex-1 ${
      active
        ? "text-gray-50 dark:text-gray-200 border-gray-500 bg-gray-400 dark:bg-gray-500"
        : "text-gray-600 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-200"
    }`}
  >
    {label}
  </button>
);

const OAuthForm = () => {
  const { loginWithOAuth } = useAuth();
  const [handle, setHandle] = useState("");

  useEffect(() => {
    const lastHandle = localStorage.getItem("lastHandle");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (lastHandle) setHandle(lastHandle);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (handle.trim()) {
      localStorage.setItem("lastHandle", handle);
      loginWithOAuth(handle);
    }
  };
  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Sign in with AT. Your password is never shared.
      </p>
      {/* <input
        type="text"
        placeholder="handle.bsky.social"
        value={handle}
        onChange={(e) => setHandle(e.target.value)}
        className="px-3 py-2 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-gray-500"
      /> */}
      <div className="flex flex-col gap-3">
        <div className="m3input-field m3input-label m3input-border size-md flex-1">
          <input
            type="text"
            placeholder=" "
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
          />
          <label>AT Handle</label>
        </div>
        <button
          type="submit"
          className="bg-gray-600 hover:bg-gray-700 text-white rounded-full px-4 py-2 font-medium text-sm transition-colors"
        >
          Log in
        </button>
      </div>
    </form>
  );
};

const PasswordForm = () => {
  const { loginWithPassword } = useAuth();
  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");
  const [serviceURL, setServiceURL] = useState("bsky.social");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const lastHandle = localStorage.getItem("lastHandle");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (lastHandle) setUser(lastHandle);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      localStorage.setItem("lastHandle", user);
      await loginWithPassword(user, password, `https://${serviceURL}`);
    } catch (err) {
      setError("Login failed. Check your handle and App Password.");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <p className="text-xs text-red-500 dark:text-red-400">
        Less secure. Do not use your main password, please use an App Password.
      </p>
      {/* <input
        type="text"
        placeholder="handle.bsky.social"
        value={user}
        onChange={(e) => setUser(e.target.value)}
        className="px-3 py-2 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-gray-500"
        autoComplete="username"
      />
      <input
        type="password"
        placeholder="App Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="px-3 py-2 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-gray-500"
        autoComplete="current-password"
      />
      <input
        type="text"
        placeholder="PDS (e.g., bsky.social)"
        value={serviceURL}
        onChange={(e) => setServiceURL(e.target.value)}
        className="px-3 py-2 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-gray-500"
      /> */}
      <div className="m3input-field m3input-label m3input-border size-md flex-1">
          <input
            type="text"
            placeholder=" "
            value={user}
            onChange={(e) => setUser(e.target.value)}
          />
          <label>AT Handle</label>
        </div>
        <div className="m3input-field m3input-label m3input-border size-md flex-1">
          <input
            type="text"
            placeholder=" "
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <label>App Password</label>
        </div>
        <div className="m3input-field m3input-label m3input-border size-md flex-1">
          <input
            type="text"
            placeholder=" "
            value={serviceURL}
            onChange={(e) => setServiceURL(e.target.value)}
          />
          <label>PDS</label>
        </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
      <button
        type="submit"
        className="bg-gray-600 hover:bg-gray-700 text-white rounded-full px-4 py-2 font-medium text-sm transition-colors"
      >
        Log in
      </button>
    </form>
  );
};

// --- Profile Component (now supports a `large` prop for styling) ---
export const ProfileThing = ({
  agent,
  large = false,
}: {
  agent: Agent | null;
  large?: boolean;
}) => {
  const did = ((agent as AtpAgent)?.session?.did ??
    (agent as AtpAgent)?.assertDid ??
    agent?.did) as string | undefined;
  const { data: identity } = useQueryIdentity(did);
  const { data: profiledata } = useQueryProfile(
    `at://${did}/app.bsky.actor.profile/self`
  );
  const profile = profiledata?.value;

  const [imgcdn] = useAtom(imgCDNAtom)

  function getAvatarUrl(p: typeof profile) {
    const link = p?.avatar?.ref?.["$link"];
    if (!link || !did) return null;
    return `https://${imgcdn}/img/avatar/plain/${did}/${link}@jpeg`;
  }

  if (!profiledata) {
    return (
      // Skeleton loader
      <div
        className={`flex items-center gap-2.5 animate-pulse ${large ? "mb-1" : ""}`}
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
      className={`flex flex-row items-center gap-2.5 ${large ? "mb-1" : ""}`}
    >
      <img
        src={getAvatarUrl(profile) ?? undefined}
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
