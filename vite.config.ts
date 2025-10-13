import { defineConfig } from "vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { generateMetadataPlugin } from "./oauthdev.mts";

const PROD_URL = "https://reddwarf.whey.party"
const DEV_URL = "https://local3768forumtest.whey.party"

function shp(url: string): string {
  return url.replace(/^https?:\/\//, '');
}

import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import { resolve } from "node:path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    generateMetadataPlugin({
      prod: PROD_URL,
      dev: DEV_URL,
    }),
    TanStackRouterVite({ autoCodeSplitting: true }),
    viteReact(),
    tailwindcss(),
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
