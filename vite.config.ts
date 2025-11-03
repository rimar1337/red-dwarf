import { resolve } from "node:path";

import tailwindcss from "@tailwindcss/vite";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import viteReact from "@vitejs/plugin-react";
import AutoImport from 'unplugin-auto-import/vite'
import IconsResolver from 'unplugin-icons/resolver'
import Icons from 'unplugin-icons/vite'
import { defineConfig } from "vite";

import { generateMetadataPlugin } from "./oauthdev.mts";

const PROD_URL = "https://reddwarf.app"
const DEV_URL = "https://local3768forumtest.whey.party"

const PROD_HANDLE_RESOLVER_PDS = "https://pds-nd.whey.party"
const DEV_HANDLE_RESOLVER_PDS = "https://bsky.social"

function shp(url: string): string {
  return url.replace(/^https?:\/\//, '');
}

// https://vitejs.dev/config/
export default defineConfig({
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
        plugins: ['babel-plugin-react-compiler'],
      },
    }),
    tailwindcss(),
    AutoImport({
      include: [
        /\.[tj]sx?$/, // .ts, .tsx, .js, .jsx
      ],
      resolvers: [
        IconsResolver({
          prefix: 'Icon',
          extension: 'jsx',
          enabledCollections: ['mdi','material-symbols'],
        }),
      ],
      dts: 'src/auto-imports.d.ts',
    }),
    Icons({
      //autoInstall: true,
      compiler: 'jsx',
      jsx: 'react'
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
    allowedHosts: [shp(PROD_URL),shp(DEV_URL)],
  },
  css: {
    devSourcemap: true,
  },
});
