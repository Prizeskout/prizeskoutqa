// Vite + TanStack Start config for Cloudflare Pages deployment.
//
// @cloudflare/vite-plugin needs a Worker entry point during `vite build`.
// Rather than putting it in wrangler.jsonc (which Wrangler rejects for Pages
// projects that also have pages_build_output_dir), we pass it inline via the
// plugin's `config` option. wrangler.jsonc then only contains Pages-valid fields.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  cloudflare: {
    viteEnvironment: { name: "ssr" },
    config: {
      main: "@tanstack/react-start/server-entry",
    },
  },
});
