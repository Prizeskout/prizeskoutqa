// Vite + TanStack Start config preset.
// The shared preset already includes tanstackStart, viteReact, tailwindcss,
// tsConfigPaths, the Cloudflare build adapter, dev-only component tagging,
// VITE_* env injection, the @ path alias, React/TanStack dedupe, and sandbox
// detection (port/host/strictPort). Do not add those plugins manually or the
// app will break with duplicates.
// Pass additional options via defineConfig({ vite: { ... } }) when needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig();
