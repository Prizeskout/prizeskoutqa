#!/usr/bin/env node
/**
 * Post-build fix for Cloudflare Pages deployment.
 *
 * @cloudflare/vite-plugin serialises the full WorkerConfig (including `main`)
 * into wrangler.json files it generates inside dist/. When `wrangler pages deploy`
 * reads one of those files it rejects the Workers-only fields:
 *
 *   "Configuration file cannot contain both main and pages_build_output_dir"
 *   "Configuration file for Pages projects does not support rules, main, assets"
 *
 * This script strips those invalid fields from every generated wrangler.json
 * after `vite build` finishes, so the deploy step sees a clean Pages config.
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

// Fields explicitly rejected by Wrangler for Pages projects:
// https://developers.cloudflare.com/pages/functions/wrangler-configuration/
const PAGES_INVALID_FIELDS = ["main", "rules", "assets"];

// All locations @cloudflare/vite-plugin may write a wrangler.json
const CANDIDATES = [
  resolve(root, "dist/server/wrangler.json"),
  resolve(root, "dist/client/wrangler.json"),
];

let anyFixed = false;

for (const target of CANDIDATES) {
  if (!existsSync(target)) {
    console.log(`skip  ${target}`);
    continue;
  }

  const config = JSON.parse(readFileSync(target, "utf8"));
  const removed = PAGES_INVALID_FIELDS.filter((f) => f in config);

  if (removed.length === 0) {
    console.log(`ok    ${target}`);
    continue;
  }

  for (const f of removed) delete config[f];
  writeFileSync(target, JSON.stringify(config, null, 2) + "\n");
  console.log(`fixed ${target}  — removed: ${removed.join(", ")}`);
  anyFixed = true;
}

console.log(
  anyFixed
    ? "\n✅  Generated wrangler configs patched for Cloudflare Pages."
    : "\n✅  No changes needed."
);
