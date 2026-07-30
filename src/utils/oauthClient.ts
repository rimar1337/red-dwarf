import {
  BrowserOAuthClient,
  type ClientMetadata,
} from "@atproto/oauth-client-browser";

import resolvers from "../../public/resolvers.json" with { type: "json" };
const handleResolverPDS = resolvers.resolver || "https://bsky.social";

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore this should be fine ? the vite plugin should generate this before errors
import clientMetadata from "../../public/client-metadata.json" with { type: "json" };

export const oauthEvents = new EventTarget()

export const oauthClient = new BrowserOAuthClient({
  // The type assertion is needed because the static import isn't strictly typed
  clientMetadata: clientMetadata as ClientMetadata,
  handleResolver: handleResolverPDS,
  onDelete: (sub, cause) => {
    oauthEvents.dispatchEvent(
      new CustomEvent('deleted', { detail: { sub, cause } }),
    )
  },
});
