import { BrowserOAuthClient, type ClientMetadata } from '@atproto/oauth-client-browser';

// i tried making this https://pds-nd.whey.party but cors is annoying as fuck
const handleResolverPDS = 'https://bsky.social'; 

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore this should be fine ? the vite plugin should generate this before errors
import clientMetadata from '../../public/client-metadata.json' with { type: 'json' };

export const oauthClient = new BrowserOAuthClient({
  // The type assertion is needed because the static import isn't strictly typed
  clientMetadata: clientMetadata as ClientMetadata, 
  handleResolver: handleResolverPDS,
});