import { AtUri } from "@atproto/api";
import { useNavigate, type UseNavigateResult } from "@tanstack/react-router";
import { useState } from "react";

/**
 * Basically the best equivalent to Search that i can do
 */
export function Import() {
  const [textInput, setTextInput] = useState<string | undefined>();
  const navigate = useNavigate();

  const handleEnter = () => {
    if (!textInput) return;
    handleImport({
      text: textInput,
      navigate,
    });
  };

  return (
    <div className="w-full relative">
      <IconMaterialSymbolsSearch className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />

      <input
        type="text"
        placeholder="Import..."
        value={textInput}
        onChange={(e) => setTextInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleEnter();
        }}
        className="w-full h-12 pl-12 pr-4 rounded-full  bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500 box-border transition"
      />
    </div>
  );
}

function handleImport({
  text,
  navigate,
}: {
  text: string;
  navigate: UseNavigateResult<string>;
}) {
  const trimmed = text.trim();
  // parse text
  /**
   * text might be
   * 1. bsky dot app url (reddwarf link segments might be uri encoded,)
   * 2. aturi
   * 3. plain handle
   * 4. plain did
   */

  // 1. Check if it’s a URL
  try {
    const url = new URL(text);
    const knownHosts = [
      "bsky.app",
      "social.daniela.lol",
      "deer.social",
      "reddwarf.whey.party",
      "reddwarf.app",
      "main.bsky.dev",
      "catsky.social",
      "blacksky.community",
      "red-dwarf-social-app.whey.party",
      "zeppelin.social",
    ];
    if (knownHosts.includes(url.hostname)) {
      // parse path to get URI or handle
      const path = decodeURIComponent(url.pathname.slice(1)); // remove leading /
      console.log("BSky URL path:", path);
      navigate({
        to: `/${path}`,
      });
      return;
    }
  } catch {
    // not a URL, continue
  }

  // 2. Check if text looks like an at-uri
  try {
    if (text.startsWith("at://")) {
      console.log("AT URI detected:", text);
      const aturi = new AtUri(text);
      switch (aturi.collection) {
        case "app.bsky.feed.post": {
          navigate({
            to: "/profile/$did/post/$rkey",
            params: {
              did: aturi.host,
              rkey: aturi.rkey,
            },
          });
          return;
        }
        case "app.bsky.actor.profile": {
          navigate({
            to: "/profile/$did",
            params: {
              did: aturi.host,
            },
          });
          return;
        }
        // todo add more handlers as more routes are added. like feeds, lists, etc etc thanks!
        default: {
          // continue
        }
      }
    }
  } catch {
    // continue
  }

  // 3. Plain handle (starts with @)
  try {
    if (text.startsWith("@")) {
      const handle = text.slice(1);
      console.log("Handle detected:", handle);
      navigate({ to: "/profile/$did", params: { did: handle } });
      return;
    }
  } catch {
    // continue
  }

  // 4. Plain DID (starts with did:)
  try {
    if (text.startsWith("did:")) {
      console.log("did detected:", text);
      navigate({ to: "/profile/$did", params: { did: text } });
      return;
    }
  } catch {
    // continue
  }

  // if all else fails

  // try {
  //   // probably a user?
  //   navigate({ to: "/profile/$did", params: { did: text } });
  //   return;
  // } catch {
  //   // continue
  // }
}
