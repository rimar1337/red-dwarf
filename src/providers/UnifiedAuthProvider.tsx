import { Agent, AtpAgent, type AtpSessionData } from "@atproto/api";
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
  useState,
} from "react";

import { quickAuthAtom } from "~/utils/atoms";

import { oauthClient } from "../utils/oauthClient";

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

export const UnifiedAuthProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [agent, setAgent] = useState<Agent | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [authMethod, setAuthMethod] = useState<AuthMethod>(null);
  const [oauthSession, setOauthSession] = useState<OAuthSession | null>(null);
  const [quickAuth, setQuickAuth] = useAtom(quickAuthAtom);

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
      if (!quickAuth) {
        // quickAuth restoration. if last used method is oauth we immediately call for oauth redo
        // (and set a persistent atom somewhere to not retry again if it failed)
      }
    }

    try {
      const service = localStorage.getItem("service");
      const sessionString = localStorage.getItem("sess");

      if (service && sessionString) {
        // /*mass comment*/ console.log("Resuming password-based session using AtpAgent...");
        const apiAgent = new AtpAgent({ service });
        const session: AtpSessionData = JSON.parse(sessionString);
        await apiAgent.resumeSession(session);

        // /*mass comment*/ console.log("Password-based session resumed successfully.");
        setAgent(apiAgent);
        setAuthMethod("password");
        setStatus("signedIn");
        setQuickAuth(apiAgent?.did || null);
        return;
      }
    } catch (e) {
      console.error("Failed to resume password-based session.", e);
      localStorage.removeItem("sess");
      localStorage.removeItem("service");
    }

    // /*mass comment*/ console.log("No active session found.");
    setStatus("signedOut");
    setAgent(null);
    setAuthMethod(null);
    // do we want to null it here?
    setQuickAuth(null);
  }, [quickAuth, setQuickAuth]);

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
      setAgent(null);
      setOauthSession(null);
      setAuthMethod(null);
      setStatus("signedOut");
      setQuickAuth(null);
    };

    oauthClient.addEventListener(
      "deleted",
      handleOAuthSessionDeleted as EventListener,
    );
    initialize();

    return () => {
      oauthClient.removeEventListener(
        "deleted",
        handleOAuthSessionDeleted as EventListener,
      );
    };
  }, [initialize, setQuickAuth]);

  const loginWithPassword = async (
    user: string,
    password: string,
    service: string = "https://bsky.social",
  ) => {
    if (status !== "signedOut") return;
    setStatus("loading");
    try {
      let sessionData: AtpSessionData | undefined;
      const apiAgent = new AtpAgent({
        service,
        persistSession: (_evt, sess) => {
          sessionData = sess;
        },
      });
      await apiAgent.login({ identifier: user, password });

      if (sessionData) {
        localStorage.setItem("service", service);
        localStorage.setItem("sess", JSON.stringify(sessionData));
        setAgent(apiAgent);
        setAuthMethod("password");
        setStatus("signedIn");
        setQuickAuth(apiAgent?.did || null);
        // /*mass comment*/ console.log("Successfully logged in with password.");
      } else {
        throw new Error("Session data not persisted after login.");
      }
    } catch (e) {
      console.error("Password login failed:", e);
      setStatus("signedOut");
      setQuickAuth(null);
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
        localStorage.removeItem("service");
        localStorage.removeItem("sess");
        await (agent as AtpAgent).com.atproto.server.deleteSession();
        // /*mass comment*/ console.log("Password-based session deleted.");
      }
    } catch (e) {
      console.error("Logout failed:", e);
    } finally {
      setAgent(null);
      setAuthMethod(null);
      setOauthSession(null);
      setStatus("signedOut");
      setQuickAuth(null);
    }
  }, [status, agent, authMethod, oauthSession, setQuickAuth]);

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
