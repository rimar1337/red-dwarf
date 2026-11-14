import {
  Agent,
  AtpAgent,
  type AtpPersistSessionHandler,
  type AtpSessionData,
} from "@atproto/api";
import {
  type OAuthSession,
  TokenInvalidError,
  TokenRefreshError,
  TokenRevokedError,
} from "@atproto/oauth-client-browser";
import { useAtom } from "jotai";
import React, {
  createContext,
  use,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { defaultAppviewURL, quickAuthAtom } from "~/utils/atoms";

import { oauthClient, oauthEvents } from "../utils/oauthClient";

type AuthStatus = "loading" | "signedIn" | "signedOut";
type AuthMethod = "password" | "oauth" | null;

interface AuthContextValue {
  agent: Agent | null;
  status: AuthStatus;
  authMethod: AuthMethod;
  loginWithPassword: (
    user: string,
    password: string,
    service?: string,
  ) => Promise<void>;
  loginWithOAuth: (handleOrPdsUrl: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({} as AuthContextValue);

const SERVICE_KEY = "service";
const SESSION_KEY = "sess";

const setStoredService = (service: string | null) => {
  try {
    if (service === null) {
      localStorage.removeItem(SERVICE_KEY);
    } else {
      localStorage.setItem(SERVICE_KEY, service);
    }
  } catch (e) {
    console.error("Failed to store the service.", e);
  }
};

const forgetStoredSession = (refreshJwt: string) => {
  let storedJwt: string | undefined;
  try {
    const stored = localStorage.getItem(SESSION_KEY);
    if (stored) {
      storedJwt = (JSON.parse(stored) as AtpSessionData | null)?.refreshJwt;
    }
  } catch (e) {
    console.error("The stored session could not be read.", e);
  }

  if (storedJwt && storedJwt !== refreshJwt) return;

  try {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(SERVICE_KEY);
  } catch (e) {
    console.error("Failed to forget the session.", e);
  }
};

const createPersistSession = (
  initialSession: AtpSessionData | undefined,
  onExpired: () => void,
): AtpPersistSessionHandler => {
  let refreshJwt = initialSession?.refreshJwt;

  return (event, session) => {
    if (event === "network-error") return;

    if (session) {
      refreshJwt = session.refreshJwt;
      try {
        localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      } catch (e) {
        console.error("Failed to persist the session.", e);
      }
      return;
    }

    if (event !== "expired") return;
    if (refreshJwt) forgetStoredSession(refreshJwt);
    onExpired();
  };
};

let publicAgent: { service: string; agent: AtpAgent } | null = null;

// real bug is equating agent existence with logged in state
// todo: decouple those wrong assumptions across the entire codebase
// temporarily: just invent a new empty unauthed agent once from
// the Unified Auth Provider for these hacky use cases
export function getPublicAgent(service: string = defaultAppviewURL): AtpAgent {
  // whatever the settings say, minus a trailing slash, plus a scheme if the
  // user typed a bare host
  const url = (service.trim() || defaultAppviewURL).replace(/\/+$/, "");
  const withScheme = /^https?:\/\//.test(url) ? url : `https://${url}`;

  if (publicAgent?.service !== withScheme) {
    publicAgent = {
      service: withScheme,
      agent: new AtpAgent({ service: withScheme }),
    };
  }
  return publicAgent.agent;
}

export const UnifiedAuthProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [agent, setAgent] = useState<Agent | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [authMethod, setAuthMethod] = useState<AuthMethod>(null);
  const [oauthSession, setOauthSession] = useState<OAuthSession | null>(null);
  const [, setQuickAuth] = useAtom(quickAuthAtom);

  const clearAuthState = useCallback(() => {
    setAgent(null);
    setAuthMethod(null);
    setOauthSession(null);
    setStatus("signedOut");
    setQuickAuth(null);
  }, [setQuickAuth]);

  const initialize = useCallback(async () => {
    try {
      const oauthResult = await oauthClient.init();
      if (oauthResult) {
        // /*mass comment*/ console.log("OAuth session restored.");
        const apiAgent = new Agent(oauthResult.session);
        setAgent(apiAgent);
        setOauthSession(oauthResult.session);
        setAuthMethod("oauth");
        setStatus("signedIn");
        setQuickAuth(apiAgent?.did || null);
        return;
      }
    } catch (e) {
      console.error("OAuth init failed, checking password session.", e);
    }

    const service = localStorage.getItem(SERVICE_KEY);
    const sessionString = localStorage.getItem(SESSION_KEY);

    if (service && sessionString) {
      let session: AtpSessionData;
      try {
        session = JSON.parse(sessionString) as AtpSessionData;
      } catch (e) {
        console.error("The stored session could not be read.", e);
        localStorage.removeItem(SESSION_KEY);
        localStorage.removeItem(SERVICE_KEY);
        clearAuthState();
        return;
      }

      let apiAgent: AtpAgent;
      try {
        apiAgent = new AtpAgent({
          service,
          persistSession: createPersistSession(session, clearAuthState),
        });
      } catch (e) {
        console.error("The stored service is not a usable URL.", e);
        localStorage.removeItem(SESSION_KEY);
        localStorage.removeItem(SERVICE_KEY);
        clearAuthState();
        return;
      }

      try {
        await apiAgent.resumeSession(session);
      } catch (e) {
        if (!apiAgent.session) {
          console.error("The stored session is no longer valid.", e);
          clearAuthState();
          return;
        }
        console.error(
          "Failed to refresh the stored session; keeping it for a retry.",
          e,
        );
      }

      setAgent(apiAgent);
      setAuthMethod("password");
      setStatus("signedIn");
      setQuickAuth(apiAgent?.did || null);
      return;
    }

    clearAuthState();
  }, [clearAuthState, setQuickAuth]);

  useEffect(() => {
    const handleOAuthSessionDeleted = (
      event: CustomEvent<{
        sub: string;
        cause: TokenRefreshError | TokenRevokedError | TokenInvalidError;
      }>,
    ) => {
      console.error(
        `OAuth Session for ${event.detail.sub} was deleted.`,
        event.detail.cause,
      );
      clearAuthState();
    };

    oauthEvents.addEventListener(
      "deleted",
      handleOAuthSessionDeleted as EventListener,
    );

    return () => {
      oauthEvents.removeEventListener(
        "deleted",
        handleOAuthSessionDeleted as EventListener,
      );
    };
  }, [clearAuthState]);

  const startedRef = useRef(false);
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    initialize().catch((e) => {
      // Whatever threw, `loading` is not a state to leave the UI in.
      console.error("Auth initialization failed.", e);
      clearAuthState();
    });
  }, [initialize, clearAuthState]);

  const loginWithPassword = async (
    user: string,
    password: string,
    service: string = "https://bsky.social",
  ) => {
    if (status !== "signedOut") return;

    const previousService = localStorage.getItem(SERVICE_KEY);
    setStatus("loading");
    setStoredService(service);

    try {
      const apiAgent = new AtpAgent({
        service,
        persistSession: createPersistSession(undefined, clearAuthState),
      });
      await apiAgent.login({ identifier: user, password });

      if (!apiAgent.session) {
        throw new Error("Session data not persisted after login.");
      }

      setAgent(apiAgent);
      setAuthMethod("password");
      setStatus("signedIn");
      setQuickAuth(apiAgent.did || null);
    } catch (e) {
      console.error("Password login failed:", e);
      setStoredService(previousService);
      clearAuthState();
      throw e;
    }
  };

  const loginWithOAuth = useCallback(
    async (handleOrPdsUrl: string) => {
      if (status !== "signedOut") return;
      try {
        sessionStorage.setItem(
          "postLoginRedirect",
          window.location.pathname + window.location.search,
        );
        await oauthClient.signIn(handleOrPdsUrl);
      } catch (err) {
        console.error("OAuth sign-in aborted or failed:", err);
      }
    },
    [status],
  );

  const logout = useCallback(async () => {
    if (status !== "signedIn" || !agent) return;
    setStatus("loading");

    try {
      if (authMethod === "oauth" && oauthSession) {
        await oauthClient.revoke(oauthSession.sub);
        // /*mass comment*/ console.log("OAuth session revoked.");
      } else if (authMethod === "password") {
        await (agent as AtpAgent).logout();
        localStorage.removeItem(SESSION_KEY);
        localStorage.removeItem(SERVICE_KEY);
      }
    } catch (e) {
      console.error("Logout failed:", e);
    } finally {
      clearAuthState();
    }
  }, [status, agent, authMethod, oauthSession, clearAuthState]);

  return (
    <AuthContext
      value={{
        agent,
        status,
        authMethod,
        loginWithPassword,
        loginWithOAuth,
        logout,
      }}
    >
      {children}
    </AuthContext>
  );
};

export const useAuth = () => use(AuthContext);
