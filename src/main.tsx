import "~/styles/app.css";

import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { persistQueryClient } from "@tanstack/react-query-persist-client";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import { useSetAtom } from "jotai";
import { useEffect } from "react";
//import { StrictMode } from "react";
import ReactDOM from "react-dom/client";

import reportWebVitals from "./reportWebVitals.ts";
// Import the generated route tree
import { routeTree } from "./routeTree.gen";
import { isAtTopAtom } from "./utils/atoms.ts";

//initAtomToCssVar(hueAtom, "--tw-gray-hue")

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 60 * 24 * 24, // 24 days
    },
  },
});
const localStoragePersister = createSyncStoragePersister({
  storage: window.localStorage,
});

persistQueryClient({
  queryClient,
  persister: localStoragePersister,
  dehydrateOptions: {
    shouldDehydrateQuery: (query) => {
      return !query.queryKey.includes('__volatile')
    },
  },
});

// Create a new router instance
const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultPreload: "intent",
  scrollRestoration: true,
  defaultStructuralSharing: true,
  defaultPreloadStaleTime: 0,
});

// Register the router instance for type safety
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

// Render the app
const rootElement = document.getElementById("app");
if (rootElement && !rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    // double queries annoys me
    // <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ScrollTopWatcher />
      <RouterProvider router={router} />
    </QueryClientProvider>
    // </StrictMode>
  );
}

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(// /*mass comment*/ console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();

export default function ScrollTopWatcher() {
  const setIsAtTop = useSetAtom(isAtTopAtom);
  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]');
    let lastAtTop = window.scrollY === 0;
    let timeoutId: number | undefined;

    const setVars = (atTop: boolean) => {
      const root = document.documentElement;
      root.style.setProperty("--is-top", atTop ? "1" : "0");

      const bg = getComputedStyle(root).getPropertyValue("--header-bg").trim();
      if (meta && bg) meta.setAttribute("content", bg);
      setIsAtTop(atTop);
    };

    const check = () => {
      const atTop = window.scrollY === 0;
      if (atTop !== lastAtTop) {
        lastAtTop = atTop;
        setVars(atTop);
      }
    };

    const handleScroll = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = window.setTimeout(check, 2);
    };

    // initialize
    setVars(lastAtTop);
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  return null;
}
