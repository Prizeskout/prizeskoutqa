/**
 * Visual regression screenshots for the dashboard in EN / AR / FR.
 *
 * Auth strategy: injects a minimal Supabase localStorage session so the
 * client-side auth check passes without a real JWT. Supabase data queries
 * fail (fake token), so all cards show empty states — that is fine; we only
 * need to verify layout, RTL, and translation coverage.
 *
 * Run:  npx tsx scripts/screenshot.mts
 * Prereq: dev server running on localhost:3000  (npx vite dev)
 */

import { chromium } from "playwright";
import * as fs from "node:fs";
import * as path from "node:path";

const BASE_URL = "http://localhost:3000";
const PROJECT_ID = "itfhekcvmcbntjndvhzg";
const AUTH_KEY = `sb-${PROJECT_ID}-auth-token`;

const FAKE_SESSION = {
  access_token: "fake.screenshot.token",
  token_type: "bearer",
  expires_at: 9_999_999_999,
  refresh_token: "fake_refresh",
  user: {
    id: "00000000-0000-0000-0000-000000000000",
    aud: "authenticated",
    role: "authenticated",
    email: "evolving134@gmail.com",
    email_confirmed_at: "2024-01-01T00:00:00.000Z",
    phone: "",
    created_at: "2024-01-01T00:00:00.000Z",
    updated_at: "2024-01-01T00:00:00.000Z",
    user_metadata: { display_name: "Demo User" },
    app_metadata: { provider: "email" },
  },
};

const LOCALES = [
  { code: "en", label: "English", storageKey: "ps-locale" },
  { code: "ar", label: "Arabic", storageKey: "ps-locale" },
  { code: "fr", label: "French", storageKey: "ps-locale" },
] as const;

const OUT_DIR = path.join(process.cwd(), "screenshots");

async function main() {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true, channel: "msedge" });

  for (const locale of LOCALES) {
    console.log(`\n📸  ${locale.label} (${locale.code})…`);
    const page = await browser.newPage();
    await page.setViewportSize({ width: 1280, height: 900 });

    // Step 1: visit root to get a page context, then inject auth + locale.
    await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
    await page.evaluate(
      ({ authKey, session, storageKey, localeCode }) => {
        localStorage.setItem(authKey, JSON.stringify(session));
        localStorage.setItem(storageKey, localeCode);
      },
      {
        authKey: AUTH_KEY,
        session: FAKE_SESSION,
        storageKey: locale.storageKey,
        localeCode: locale.code,
      },
    );

    // Step 2: intercept Supabase auth refresh so it doesn't invalidate our fake token.
    await page.route("**/auth/v1/**", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          access_token: FAKE_SESSION.access_token,
          token_type: "bearer",
          expires_in: 3600,
          refresh_token: FAKE_SESSION.refresh_token,
          user: FAKE_SESSION.user,
        }),
      });
    });

    // Step 3: navigate to dashboard (client-side auth check reads localStorage → no redirect).
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "load", timeout: 20000 });

    // Wait for the hero h1 to exist (first render completes).
    await page.waitForSelector("h1", { timeout: 8000 }).catch(() => {});

    // For non-English locales: wait for deterministic proof that i18n has applied.
    // applyLocale() sets document.documentElement.lang synchronously; the React
    // re-render from i18n.changeLanguage() is what makes translated text appear.
    // We wait for BOTH so we know the re-render completed before screenshotting.
    if (locale.code === "ar") {
      const seen = await page.waitForFunction(
        () =>
          document.documentElement.dir === "rtl" &&
          document.body.textContent?.includes("إحاطة"),
        { timeout: 10000 },
      ).then(() => true).catch(() => false);
      console.log(`   ${seen ? "✓" : "⚠ TIMEOUT"} dir=rtl + Arabic text in DOM`);
    } else if (locale.code === "fr") {
      const seen = await page.waitForFunction(
        () =>
          document.documentElement.lang === "fr" &&
          document.body.textContent?.includes("Bulletin"),
        { timeout: 10000 },
      ).then(() => true).catch(() => false);
      console.log(`   ${seen ? "✓" : "⚠ TIMEOUT"} lang=fr + French text in DOM`);
    } else {
      await page.waitForTimeout(400); // EN: just let React settle
    }

    const file = path.join(OUT_DIR, `dashboard-${locale.code}.png`);
    await page.screenshot({ path: file, fullPage: true });
    console.log(`   ✓  saved → ${path.relative(process.cwd(), file)}`);

    // Also capture mobile viewport for RTL check.
    // Reset to the same deterministic wait — viewport change alone must not be
    // what "fixes" the locale; if Arabic appears here but not above, the
    // desktop wait timed out (meaning there IS a bug, not just a Playwright race).
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(300);
    const mobileFile = path.join(OUT_DIR, `dashboard-${locale.code}-mobile.png`);
    await page.screenshot({ path: mobileFile, fullPage: true });
    console.log(`   ✓  saved → ${path.relative(process.cwd(), mobileFile)}`);

    await page.close();
  }

  await browser.close();
  console.log(`\nDone. Screenshots in ./${path.relative(process.cwd(), OUT_DIR)}/`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
