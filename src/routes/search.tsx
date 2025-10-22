import { createFileRoute } from "@tanstack/react-router";

import { Header } from "~/components/Header";
import { Import } from "~/components/Import";

export const Route = createFileRoute("/search")({
  component: Search,
});

export function Search() {
  return (
    <>
      <Header
        title="Explore"
        backButtonCallback={() => {
          if (window.history.length > 1) {
            window.history.back();
          } else {
            window.location.assign("/");
          }
        }}
      />
      <div className=" flex flex-col items-center mt-4 mx-4 gap-4">
        <Import />
        <div className="flex flex-col">
          <p className="text-gray-600 dark:text-gray-400">
            Sorry we dont have search. But instead, you can load some of these
            types of content into Red Dwarf:
          </p>
          <ul className="list-disc list-inside mt-2 text-gray-600 dark:text-gray-400">
            <li>
              Bluesky URLs from supported clients (like{" "}
              <code className="text-sm">bsky.app</code> or{" "}
              <code className="text-sm">deer.social</code>).
            </li>
            <li>
              AT-URIs (e.g.,{" "}
              <code className="text-sm">at://did:example/collection/item</code>
              ).
            </li>
            <li>
              Plain handles (like{" "}
              <code className="text-sm">@username.bsky.social</code>).
            </li>
            <li>
              Direct DIDs (Decentralized Identifiers, starting with{" "}
              <code className="text-sm">did:</code>).
            </li>
          </ul>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Simply paste one of these into the import field above and press
            Enter to load the content.
          </p>
        </div>
      </div>
    </>
  );
}
