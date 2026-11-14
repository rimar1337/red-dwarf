import { execSync } from "node:child_process";
import { resolve } from "node:path";

import tailwindcss from "@tailwindcss/vite";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import viteReact from "@vitejs/plugin-react";
import AutoImport from "unplugin-auto-import/vite";
import IconsResolver from "unplugin-icons/resolver";
import Icons from "unplugin-icons/vite";
import { defineConfig, loadEnv } from "vite";

import { generateMetadataPlugin } from "./oauthdev.mts";

const env = loadEnv(process.env.NODE_ENV || "development", process.cwd(), "");
const PROD_URL = env.VITE_PROD_URL;
const DEV_URL = env.VITE_DEV_URL;
const PORT = Number(env.VITE_PORT);

const PROD_HANDLE_RESOLVER_PDS =
  env.VITE_PROD_HANDLE_RESOLVER || "https://selfhosted.social";
const DEV_HANDLE_RESOLVER_PDS =
  env.VITE_DEV_HANDLE_RESOLVER || "https://bsky.social";

if (!PROD_URL || !DEV_URL || !PORT) {
  throw new Error(
    "Set VITE_PROD_URL, VITE_DEV_URL, and VITE_PORT in .env (copy .env.example).",
  );
}
let commitHash = "";
try {
  commitHash = execSync("git rev-parse --short HEAD").toString().trim();
} catch {
  /* empty */
}

function shp(url: string): string {
  return url.replace(/^https?:\/\//, "");
}

// use via `declare const __INSTANCE_MODEL__: boolean`
// feature is not finished, and so is disabled temporarily
const INSTANCE_MODEL = false;
// disable moderation page for current deployment
const MODERATION_PAGE = false;
// todo:
const VERSION_NUMBER = "v0.0.3-preview";

// https://vitejs.dev/config/
export default defineConfig({
  define: {
    __INSTANCE_MODEL__: JSON.stringify(INSTANCE_MODEL),
    __MODERATION_PAGE__: JSON.stringify(MODERATION_PAGE),
    __VERSION_NUMBER__: JSON.stringify(VERSION_NUMBER),
    __COMMIT_HASH__: JSON.stringify(commitHash),
  },
  plugins: [
    generateMetadataPlugin({
      prod: PROD_URL,
      dev: DEV_URL,
      prodResolver: PROD_HANDLE_RESOLVER_PDS,
      devResolver: DEV_HANDLE_RESOLVER_PDS,
    }),
    TanStackRouterVite({ autoCodeSplitting: true }),
    viteReact({
      babel: {
        plugins: ["babel-plugin-react-compiler"],
      },
    }),
    tailwindcss(),
    AutoImport({
      include: [
        /\.[tj]sx?$/, // .ts, .tsx, .js, .jsx
      ],
      resolvers: [
        IconsResolver({
          prefix: "Icon",
          extension: "jsx",
          enabledCollections: ["mdi", "material-symbols"],
        }),
      ],
      dts: "src/auto-imports.d.ts",
    }),
    Icons({
      //autoInstall: true,
      compiler: "jsx",
      jsx: "react",
    }),
  ],
  // test: {
  //   globals: true,
  //   environment: 'jsdom',
  // },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
      "~": resolve(__dirname, "./src"),
    },
  },
  server: {
    allowedHosts: [shp(PROD_URL), shp(DEV_URL)],
    port: PORT,
  },
  preview: {
    port: PORT,
  },
  css: {
    devSourcemap: true,
  },
});
