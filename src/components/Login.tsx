import React, { useEffect, useState, useRef } from "react";
import { useAuth } from "~/providers/PassAuthProvider";

interface LoginProps {
  compact?: boolean;
}

export default function Login({ compact = false }: LoginProps) {
  const { loginStatus, login, logout, loading, authed } = useAuth();
  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");
  const [serviceURL, setServiceURL] = useState("bsky.social");
  const [showLoginForm, setShowLoginForm] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (formRef.current && !formRef.current.contains(event.target as Node)) {
        setShowLoginForm(false);
      }
    }

    if (showLoginForm) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showLoginForm]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-6 text-gray-500 dark:text-gray-400">
        Loading...
      </div>
    );
  }

  if (compact) {
    if (authed) {
      return (
        <button
          onClick={logout}
          className="text-sm bg-gray-600 hover:bg-gray-700 text-white rounded px-3 py-1 font-medium transition-colors"
        >
          Log out
        </button>
      );
    } else {
      return (
        <div className="relative" ref={formRef}>
          <button
            onClick={() => setShowLoginForm(!showLoginForm)}
            className="text-sm bg-gray-600 hover:bg-gray-700 text-white rounded px-3 py-1 font-medium transition-colors"
          >
            Log in
          </button>
          {showLoginForm && (
            <div className="absolute top-full right-0 mt-2 w-80 bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4 z-50">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  login(user, password, `https://${serviceURL}`);
                  setShowLoginForm(false);
                }}
                className="flex flex-col gap-3"
              >
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  sorry for the temporary login,
                  <br />
                  oauth will come soon enough i swear
                </p>
                <input
                  type="text"
                  placeholder="Username"
                  value={user}
                  onChange={(e) => setUser(e.target.value)}
                  className="px-3 py-2 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoComplete="username"
                />
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="px-3 py-2 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoComplete="current-password"
                />
                <input
                  type="text"
                  placeholder="bsky.social"
                  value={serviceURL}
                  onChange={(e) => setServiceURL(e.target.value)}
                  className="px-3 py-2 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  className="bg-gray-600 hover:bg-gray-700 text-white rounded px-4 py-2 font-medium text-sm transition-colors"
                >
                  Log in
                </button>
              </form>
            </div>
          )}
        </div>
      );
    }
  }

  return (
    <div className="p-6 bg-gray-100 dark:bg-gray-900 rounded-xl shadow border border-gray-200 dark:border-gray-800 mt-6 mx-4">
      {authed ? (
        <div className="flex flex-col items-center justify-center text-center">
          <p className="text-lg font-semibold mb-6 text-gray-800 dark:text-gray-100">
            You are logged in!
          </p>
          <button
            onClick={logout}
            className="bg-gray-600 hover:bg-gray-700 text-white rounded px-6 py-2 font-semibold text-base transition-colors"
          >
            Log out
          </button>
        </div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            login(user, password, `https://${serviceURL}`);
          }}
          className="flex flex-col gap-4"
        >
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
            sorry for the temporary login,
            <br />
            oauth will come soon enough i swear
          </p>
          <input
            type="text"
            placeholder="Username"
            value={user}
            onChange={(e) => setUser(e.target.value)}
            className="px-3 py-2 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoComplete="username"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="px-3 py-2 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoComplete="current-password"
          />
          <input
            type="text"
            placeholder="bsky.social"
            value={serviceURL}
            onChange={(e) => setServiceURL(e.target.value)}
            className="px-3 py-2 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="bg-gray-600 hover:bg-gray-700 text-white rounded px-6 py-2 font-semibold text-base transition-colors mt-2"
          >
            Log in
          </button>
        </form>
      )}
    </div>
  );
}

export const ProfileThing = () => {
  const { agent, loading, loginStatus, authed } = useAuth();
  const [response, setResponse] = useState<any>(null);

  useEffect(() => {
    if (loginStatus && agent && !loading && authed) {
      fetchUser();
    }
    // eslint-disable-next-line
  }, [loginStatus, agent, loading, authed]);

  const fetchUser = async () => {
    if (!agent) {
      console.error("Agent is null or undefined");
      return;
    }
    const res = await agent.app.bsky.actor.getProfile({
      actor: agent.assertDid,
    });
    setResponse(res.data);
  };

  if (!authed) {
    return (
      <div className="inline-block">
        <span className="text-gray-100 text-base font-medium px-1.5">
          Login
        </span>
      </div>
    );
  }

  if (!response) {
    return (
      <div className="flex flex-col items-start gap-1.5">
        <span className="w-5 h-5 border-2 border-gray-200 dark:border-gray-600 border-t-transparent rounded-full animate-spin inline-block" />
        <span className="text-gray-100">Loading... </span>
      </div>
    );
  }

  return (
    <div className="flex flex-row items-start gap-1.5">
      <img
        src={response?.avatar}
        alt="avatar"
        className="w-[30px] h-[30px] rounded-full object-cover"
      />
      <div>
        <div className="text-gray-100 text-xs">{response?.displayName}</div>
        <div className="text-gray-100 text-xs">@{response?.handle}</div>
      </div>
    </div>
  );
};
