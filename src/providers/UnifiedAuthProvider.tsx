// src/providers/UnifiedAuthProvider.tsx
import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  useCallback,
} from "react";
// Import both Agent and the (soon to be deprecated) AtpAgent
import { Agent, AtpAgent, type AtpSessionData } from "@atproto/api";
import { oauthClient } from "../utils/oauthClient"; // Adjust path if needed
import {
  type OAuthSession,
  TokenInvalidError,
  TokenRefreshError,
  TokenRevokedError,
} from "@atproto/oauth-client-browser";

// Define the unified status and authentication method
type AuthStatus = "loading" | "signedIn" | "signedOut";
type AuthMethod = "password" | "oauth" | null;

interface AuthContextValue {
  agent: Agent | null; // The agent is typed as the base class `Agent`
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
  // The state is typed as the base class `Agent`, which accepts both `Agent` and `AtpAgent` instances.
  const [agent, setAgent] = useState<Agent | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [authMethod, setAuthMethod] = useState<AuthMethod>(null);
  const [oauthSession, setOauthSession] = useState<OAuthSession | null>(null);

  // Unified Initialization Logic
  const initialize = useCallback(async () => {
    // --- 1. Try OAuth initialization first ---
    try {
      const oauthResult = await oauthClient.init();
      if (oauthResult) {
        console.log("OAuth session restored.");
        const apiAgent = new Agent(oauthResult.session); // Standard Agent
        setAgent(apiAgent);
        setOauthSession(oauthResult.session);
        setAuthMethod("oauth");
        setStatus("signedIn");
        return; // Success
      }
    } catch (e) {
      console.error("OAuth init failed, checking password session.", e);
    }

    // --- 2. If no OAuth, try password-based session using AtpAgent ---
    try {
      const service = localStorage.getItem("service");
      const sessionString = localStorage.getItem("sess");

      if (service && sessionString) {
        console.log("Resuming password-based session using AtpAgent...");
        // Use the original, working AtpAgent logic
        const apiAgent = new AtpAgent({ service });
        const session: AtpSessionData = JSON.parse(sessionString);
        await apiAgent.resumeSession(session);

        console.log("Password-based session resumed successfully.");
        setAgent(apiAgent); // This works because AtpAgent is a subclass of Agent
        setAuthMethod("password");
        setStatus("signedIn");
        return; // Success
      }
    } catch (e) {
      console.error("Failed to resume password-based session.", e);
      localStorage.removeItem("sess");
      localStorage.removeItem("service");
    }

    // --- 3. If neither worked, user is signed out ---
    console.log("No active session found.");
    setStatus("signedOut");
    setAgent(null);
    setAuthMethod(null);
  }, []);

  useEffect(() => {
    const handleOAuthSessionDeleted = (
      event: CustomEvent<{ sub: string; cause: TokenRefreshError | TokenRevokedError | TokenInvalidError }>,
    ) => {
      console.error(`OAuth Session for ${event.detail.sub} was deleted.`, event.detail.cause);
      setAgent(null);
      setOauthSession(null);
      setAuthMethod(null);
      setStatus("signedOut");
    };

    oauthClient.addEventListener("deleted", handleOAuthSessionDeleted as EventListener);
    initialize();

    return () => {
      oauthClient.removeEventListener("deleted", handleOAuthSessionDeleted as EventListener);
    };
  }, [initialize]);

  // --- Login Methods ---
  const loginWithPassword = async (
    user: string,
    password: string,
    service: string = "https://bsky.social",
  ) => {
    if (status !== "signedOut") return;
    setStatus("loading");
    try {
      let sessionData: AtpSessionData | undefined;
      // Use the AtpAgent for its simple login and session persistence
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
        setAgent(apiAgent); // Store the AtpAgent instance in our state
        setAuthMethod("password");
        setStatus("signedIn");
        console.log("Successfully logged in with password.");
      } else {
        throw new Error("Session data not persisted after login.");
      }
    } catch (e) {
      console.error("Password login failed:", e);
      setStatus("signedOut");
      throw e;
    }
  };

  const loginWithOAuth = useCallback(async (handleOrPdsUrl: string) => {
    if (status !== "signedOut") return;
    try {
      sessionStorage.setItem("postLoginRedirect", window.location.pathname + window.location.search);
      await oauthClient.signIn(handleOrPdsUrl);
    } catch (err) {
      console.error("OAuth sign-in aborted or failed:", err);
    }
  }, [status]);

  // --- Unified Logout ---
  const logout = useCallback(async () => {
    if (status !== "signedIn" || !agent) return;
    setStatus("loading");

    try {
      if (authMethod === "oauth" && oauthSession) {
        await oauthClient.revoke(oauthSession.sub);
        console.log("OAuth session revoked.");
      } else if (authMethod === "password") {
        localStorage.removeItem("service");
        localStorage.removeItem("sess");
        // AtpAgent has its own logout methods
        await (agent as AtpAgent).com.atproto.server.deleteSession();
        console.log("Password-based session deleted.");
      }
    } catch (e) {
      console.error("Logout failed:", e);
    } finally {
      setAgent(null);
      setAuthMethod(null);
      setOauthSession(null);
      setStatus("signedOut");
    }
  }, [status, authMethod, agent, oauthSession]);

  return (
    <AuthContext.Provider
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
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);