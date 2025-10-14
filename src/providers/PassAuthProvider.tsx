import React, { createContext, useState, useEffect, useContext } from "react";
import { AtpAgent, type AtpSessionData } from "@atproto/api";

interface AuthContextValue {
  agent: AtpAgent | null;
  loginStatus: boolean;
  login: (user: string, password: string, service?: string) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
  authed: boolean | undefined;
}

const AuthContext = createContext<AuthContextValue>({} as AuthContextValue);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [agent, setAgent] = useState<AtpAgent | null>(null);
  const [loginStatus, setLoginStatus] = useState(false);
  const [loading, setLoading] = useState(true);
  const [increment, setIncrement] = useState(0);
  const [authed, setAuthed] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    const initialize = async () => {
      try {
        const service = localStorage.getItem("service");
        // const user = await AsyncStorage.getItem('user');
        // const password = await AsyncStorage.getItem('password');
        const session = localStorage.getItem("sess");

        if (service && session) {
          // /*mass comment*/ console.log("Auto-login service is:", service);
          const apiAgent = new AtpAgent({ service });
          try {
            if (!apiAgent) {
              // /*mass comment*/ console.log("Agent is null or undefined");
              return;
            }
            let sess: AtpSessionData = JSON.parse(session);
            // /*mass comment*/ console.log("resuming session is:", sess);
            const { data } = await apiAgent.resumeSession(sess);
            // /*mass comment*/ console.log("!!!8!!! agent resume session");
            setAgent(apiAgent);
            setLoginStatus(true);
            setLoading(false);
            setAuthed(true);
          } catch (e) {
            // /*mass comment*/ console.log("Failed to resume session" + e);
            setLoginStatus(true);
            localStorage.removeItem("sess");
            localStorage.removeItem("service");
            const apiAgent = new AtpAgent({ service: "https://api.bsky.app" });
            setAgent(apiAgent);
            setLoginStatus(true);
            setLoading(false);
            setAuthed(false);
            return;
          }
        } else {
          const apiAgent = new AtpAgent({ service: "https://api.bsky.app" });
          setAgent(apiAgent);
          setLoginStatus(true);
          setLoading(false);
          setAuthed(false);
        }
      } catch (e) {
        // /*mass comment*/ console.log("Failed to auto-login:", e);
      } finally {
        setLoading(false);
      }
    };

    initialize();
  }, [increment]);

  const login = async (
    user: string,
    password: string,
    service: string = "https://bsky.social",
  ) => {
    try {
      let sessionthing;
      const apiAgent = new AtpAgent({
        service: service,
        persistSession: (evt, sess) => {
          sessionthing = sess;
        },
      });
      await apiAgent.login({ identifier: user, password });
      // /*mass comment*/ console.log("!!!8!!! agent logged on");

      localStorage.setItem("service", service);
      // await AsyncStorage.setItem('user', user);
      // await AsyncStorage.setItem('password', password);
      if (sessionthing) {
        localStorage.setItem("sess", JSON.stringify(sessionthing));
      } else {
        localStorage.setItem("sess", "{}");
      }

      setAgent(apiAgent);
      setLoginStatus(true);
      setAuthed(true);
    } catch (e) {
      console.error("Login failed:", e);
    }
  };

  const logout = async () => {
    if (!agent) {
      console.error("Agent is null or undefined");
      return;
    }
    setLoading(true);
    try {
      // check if its even in async storage before removing
      if (localStorage.getItem("service") && localStorage.getItem("sess")) {
        localStorage.removeItem("service");
        localStorage.removeItem("sess");
      }
      await agent.logout();
      // /*mass comment*/ console.log("!!!8!!! agent logout");
      setLoginStatus(false);
      setAuthed(undefined);
      await agent.com.atproto.server.deleteSession();
      // /*mass comment*/ console.log("!!!8!!! agent deltesession");
      //setAgent(null);
      setIncrement(increment + 1);
    } catch (e) {
      console.error("Logout failed:", e);
    } finally {
      setLoading(false);
    }
  };

  // why the hell are we doing this
  /*if (loading) {
    return <div><span>Laoding...ae</span></div>;
  }*/

  return (
    <AuthContext.Provider
      value={{ agent, loginStatus, login, logout, loading, authed }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
