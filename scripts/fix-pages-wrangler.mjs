#!/usr/bin/env node
/**
 * Post-build assembly script for Cloudflare Pages + TanStack Start.
 *
 * What @cloudflare/vite-plugin produces after `vite build`:
 *   dist/server/          ← Cloudflare Worker bundle (entry + JS chunks)
 *     index.js            ← Worker entry (name comes from "main" in wrangler.json)
 *     assets/             ← Server-side JS chunks (route handlers, server fns, …)
 *     wrangler.json       ← Worker config, includes "main" and other Workers-only fields
 *   dist/client/          ← Static assets only (CSS, client JS, images, fonts)
 *     assets/
 *
 * Cloudflare Pages needs ONE output directory containing:
 *   _worker.js            ← SSR Worker entry (picked up by Pages automatically)
 *   assets/               ← ALL JS chunks the Worker imports dynamically
 *   (static files …)
 *
 * This script bridges the gap:
 *   1. Copies dist/server/<main> → dist/client/_worker.js
 *   2. Merges dist/server/assets/ → dist/client/assets/ (server JS chunks)
 *   3. Strips Workers-only fields (main, rules, assets) from all generated
 *      wrangler.json files so `wrangler pages deploy` doesn't reject them.
 */

import {
  existsSync,
  readFileSync,
  writeFileSync,
  readdirSync,
  mkdirSync,
  copyFileSync,
} from "node:fs";
import { resolve, dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const serverDir = resolve(root, "dist/server");
const clientDir = resolve(root, "dist/client");

// Fields rejected by Wrangler for Pages projects:
// https://developers.cloudflare.com/pages/functions/wrangler-configuration/
const PAGES_INVALID_FIELDS = ["main", "rules", "assets"];

// ── helpers ──────────────────────────────────────────────────────────────────

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function writeJson(path, data) {
  writeFileSync(path, JSON.stringify(data, null, 2) + "\n");
}

/** Recursively copy src dir into dest dir, skipping files that already exist. */
function mergeDir(src, dest) {
  if (!existsSync(src)) return 0;
  mkdirSync(dest, { recursive: true });
  let count = 0;
  for (const entry of readdirSync(src, { withFileTypes: true })) {
    const srcPath = join(src, entry.name);
    const destPath = join(dest, entry.name);
    if (entry.isDirectory()) {
      count += mergeDir(srcPath, destPath);
    } else if (!existsSync(destPath)) {
      copyFileSync(srcPath, destPath);
      count++;
    }
  }
  return count;
}

// ── 1. Read dist/server/wrangler.json ────────────────────────────────────────

const serverWranglerPath = join(serverDir, "wrangler.json");

if (!existsSync(serverWranglerPath)) {
  console.error("ERROR: dist/server/wrangler.json not found.");
  console.error("       Run `npm run build` first, or check that @cloudflare/vite-plugin is active.");
  process.exit(1);
}

const serverConfig = readJson(serverWranglerPath);
const workerEntryName = serverConfig.main; // e.g. "index.js"

// ── 2. Copy Worker entry → dist/client/_worker.js ────────────────────────────

if (!workerEntryName) {
  console.warn("WARN: No 'main' field in dist/server/wrangler.json — skipping _worker.js copy.");
} else {
  const workerSrc = resolve(serverDir, workerEntryName);
  const workerDest = join(clientDir, "_worker.js");

  if (!existsSync(workerSrc)) {
    console.error(`ERROR: Worker entry not found: ${workerSrc}`);
    process.exit(1);
  }

  mkdirSync(clientDir, { recursive: true });
  copyFileSync(workerSrc, workerDest);
  console.log(`copied  dist/server/${workerEntryName} → dist/client/_worker.js`);
}

// ── 3. Merge dist/server/assets/ → dist/client/assets/ ───────────────────────
// The Worker entry imports route-handler chunks from ./assets/ at runtime.
// Those server-side chunks live in dist/server/assets/ and are not moved by
// the plugin (it only moves binary assets, not JS chunks).

const serverAssets = join(serverDir, "assets");
const clientAssets = join(clientDir, "assets");
const copied = mergeDir(serverAssets, clientAssets);
if (copied > 0) {
  console.log(`merged  dist/server/assets/ → dist/client/assets/  (${copied} new files)`);
} else {
  console.log(`ok      dist/client/assets/ already up to date`);
}

// ── 4. Strip Workers-only fields from generated wrangler.json files ───────────

for (const wranglerPath of [serverWranglerPath, join(clientDir, "wrangler.json")]) {
  if (!existsSync(wranglerPath)) {
    console.log(`skip    ${relative(root, wranglerPath)} (not found)`);
    continue;
  }
  const config = readJson(wranglerPath);
  const removed = PAGES_INVALID_FIELDS.filter((f) => f in config);
  if (removed.length === 0) {
    console.log(`ok      ${relative(root, wranglerPath)}`);
  } else {
    for (const f of removed) delete config[f];
    writeJson(wranglerPath, config);
    console.log(`fixed   ${relative(root, wranglerPath)}  — removed: ${removed.join(", ")}`);
  }
}

console.log("\n✅  dist/client/ is ready for Cloudflare Pages deployment.");
console.log("    _worker.js  ← SSR Worker entry");
console.log("    assets/     ← client + server JS chunks");
