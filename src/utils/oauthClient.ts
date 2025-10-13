// src/helpers/oauthClient.ts
import { BrowserOAuthClient, type ClientMetadata } from '@atproto/oauth-client-browser';

// This is your app's PDS for resolving handles if not provided.
// You might need to host your own or use a public one.
const handleResolverPDS = 'https://bsky.social'; 

// This assumes your client-metadata.json is in the /public folder
// and will be served at the root of your domain.
import clientMetadata from '../../public/client-metadata.json' assert { type: 'json' };

export const oauthClient = new BrowserOAuthClient({
  // The type assertion is needed because the static import isn't strictly typed
  clientMetadata: clientMetadata as ClientMetadata, 
  handleResolver: handleResolverPDS,
});