// Vite + TanStack Start config for Cloudflare Pages deployment.
//
// @cloudflare/vite-plugin needs a Worker entry point during `vite build`.
// Rather than putting it in wrangler.jsonc (which Wrangler rejects for Pages
// projects that also have pages_build_output_dir), we pass it inline via the
// plugin's `config` option. wrangler.jsonc then only contains Pages-valid fields.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { loadEnv, type Plugin } from "vite";

const REQUIRED_CLIENT_BUILD_ENV = [
  "VITE_SUPABASE_URL",
  "VITE_SUPABASE_PUBLISHABLE_KEY",
  "VITE_SUPABASE_PROJECT_ID",
] as const;

function requireClientBuildEnvironment(): Plugin {
  return {
    name: "prizeskout-required-client-build-environment",
    config(_config, environment) {
      if (environment.command !== "build") return;
      const values = loadEnv(environment.mode, process.cwd(), "");
      const missing = REQUIRED_CLIENT_BUILD_ENV.filter((name) => !values[name]?.trim());
      if (missing.length) {
        throw new Error(
          `Refusing to build a broken client bundle. Configure these build-time variables: ${missing.join(", ")}.`,
        );
      }
    },
  };
}

export default defineConfig({
  plugins: [requireClientBuildEnvironment()],
  cloudflare: {
    viteEnvironment: { name: "ssr" },
    config: {
      main: "./src/worker-entry.ts",
    },
  },
});
