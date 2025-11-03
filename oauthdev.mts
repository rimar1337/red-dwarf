import fs from "fs";
import path from "path";
//import { generateClientMetadata } from './src/helpers/oauthClient'
export const generateClientMetadata = (appOrigin: string) => {
  const callbackPath = "/callback";

  return {
    client_id: `${appOrigin}/client-metadata.json`,
    client_name: "ForumTest",
    client_uri: appOrigin,
    logo_uri: `${appOrigin}/logo192.png`,
    tos_uri: `${appOrigin}/terms-of-service`,
    policy_uri: `${appOrigin}/privacy-policy`,
    redirect_uris: [`${appOrigin}${callbackPath}`] as [string, ...string[]],
    scope: "atproto transition:generic",
    grant_types: ["authorization_code", "refresh_token"] as [
      "authorization_code",
      "refresh_token",
    ],
    response_types: ["code"] as ["code"],
    token_endpoint_auth_method: "none" as "none",
    application_type: "web" as "web",
    dpop_bound_access_tokens: true,
  };
};

export function generateMetadataPlugin({
  prod,
  dev,
  prodResolver = "https://bsky.social",
  devResolver = prodResolver,
}: {
  prod: string;
  dev: string;
  prodResolver?: string;
  devResolver?: string;
}) {
  return {
    name: "vite-plugin-generate-metadata",
    config(_config: any, { mode }: any) {
      console.log('💡 vite mode =', mode)
      let appOrigin, resolver;
      if (mode === "production") {
        appOrigin = prod;
        resolver = prodResolver;
        if (!appOrigin || !appOrigin.startsWith("https://")) {
          throw new Error(
            "VITE_APP_ORIGIN environment variable must be set to a valid HTTPS URL for production build."
          );
        }
      } else {
        appOrigin = dev;
        resolver = devResolver;
      }

      const metadata = generateClientMetadata(appOrigin);
      const outputPath = path.resolve(
        process.cwd(),
        "public",
        "client-metadata.json"
      );

      fs.writeFileSync(outputPath, JSON.stringify(metadata, null, 2));

      const resolvers = {
        resolver: resolver,
      };
      const resolverOutPath = path.resolve(
        process.cwd(),
        "public",
        "resolvers.json"
      );

      fs.writeFileSync(resolverOutPath, JSON.stringify(resolvers, null, 2));


      // /*mass comment*/ console.log(`✅ Generated client-metadata.json for ${appOrigin}`);
    },
  };
}
