// Vite + TanStack Start config preset for Vercel deployment.
// The Cloudflare adapter is explicitly disabled so that TanStack Start
// produces a standard Node.js server bundle (dist/server/) alongside
// the client bundle (dist/client/).  The Vercel function in api/server.ts
// wraps that Node.js bundle.  Do not re-enable the Cloudflare adapter
// unless deploying to Cloudflare Workers/Pages.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({ cloudflare: false });
