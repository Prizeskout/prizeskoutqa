// POST /api/channels/connect
// Dashboard-facing endpoint — no API key required, uses merchant_id from body.
// Supports: talabat (OAuth BYOK), jahez (secret key BYOK),
//           keeta_shop_id (post-OAuth shop-ID capture for an already-
//           connected Keeta channel — Keeta itself connects via /api/auth/keeta)

import { createFileRoute } from "@tanstack/react-router";
import { connectTalabat, connectJahez, verifyMerchantAccess, setKeetaShopId } from "@/server/core/byok-connect";
import { getMerchantMarginFloor, setMerchantMarginFloor } from "@/server/core/merchant-pricing-config";
import { getTalabatExpectedPayout } from "@/server/core/expected-payout";
import { parseAggregatorDailyCsv } from "@/server/core/payout-csv-parser";
import { parseTalabatPayoutStatementCsv } from "@/server/core/payout-statement-parser";
import { parseSnoonuBrandReportPdf } from "@/server/core/payout-pdf-parser";
import { savePayoutCheck, getPayoutCheckHistory } from "@/server/core/payout-history";
import { getRepricingHistory } from "@/server/core/dispatch-history";

const PAYOUT_UPLOAD_PLATFORMS = ["talabat", "jahez", "snoonu", "deliveroo"] as const;

type Body = Record<string, string>;

export const Route = createFileRoute("/api/channels/connect")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const json = () => new Response(
          JSON.stringify({ error: "Request body must be valid JSON." }),
          { status: 422, headers: { "Content-Type": "application/json" } },
        );

        let body: Body;
        try { body = await request.json() as Body; }
        catch { return json(); }

        const { merchant_id, access_code, platform } = body;
        if (!merchant_id) return resp({ error: "merchant_id is required." }, 400);
        if (!platform)    return resp({ error: "platform is required." }, 400);

        const authorized = await verifyMerchantAccess(merchant_id, access_code ?? "");
        if (!authorized) return resp({ error: "Unauthorized." }, 401);

        try {
          if (platform === "talabat") {
            const { client_id, client_secret, vendor_id, chain_id, commission_rate_pct } = body;
            if (!client_id || !client_secret || !vendor_id || !chain_id || !commission_rate_pct) {
              return resp({ error: "Talabat requires client_id, client_secret, vendor_id, chain_id, and commission_rate_pct." }, 400);
            }
            const result = await connectTalabat({ merchantId: merchant_id, clientId: client_id, clientSecret: client_secret, vendorId: vendor_id, chainId: chain_id, commissionRatePct: commission_rate_pct });
            return result.ok
              ? resp({ ok: true, platform }, 200)
              : resp({ ok: false, error: result.message }, 200);
          }

          if (platform === "jahez") {
            const { api_key, secret_code, branch_id } = body;
            if (!api_key || !secret_code || !branch_id) {
              return resp({ error: "Jahez requires api_key, secret_code, and branch_id." }, 400);
            }
            const result = await connectJahez({ merchantId: merchant_id, apiKey: api_key, secretCode: secret_code, branchId: branch_id });
            return result.ok
              ? resp({ ok: true, platform }, 200)
              : resp({ ok: false, error: result.message }, 200);
          }

          if (platform === "keeta_shop_id") {
            // Synthetic platform key, deliberately not "keeta" — Keeta itself
            // can only ever be connected via OAuth (/api/auth/keeta), never
            // through a credential-paste flow. This branch only finishes an
            // already-connected Keeta channel by capturing its Shop ID.
            const { shop_id } = body;
            if (!shop_id) return resp({ error: "Keeta requires shop_id." }, 400);
            const result = await setKeetaShopId(merchant_id, shop_id);
            return result.ok
              ? resp({ ok: true, platform }, 200)
              : resp({ ok: false, error: result.message }, 200);
          }

          if (platform === "margin_floor") {
            // Not a real "channel" — multiplexed onto this endpoint because
            // PipeOps' production routing (separate from the Cloudflare
            // Worker deploy) blocks any brand-new URL path outright, even
            // under an already-working prefix. Reusing this proven path
            // until that's resolved on PipeOps' side. See merchant-pricing-
            // config.ts for what actually enforces this value.
            if (body.action === "set") {
              const pct = Number(body.margin_floor_pct);
              if (!(pct > 0 && pct < 1)) {
                return resp({ error: "margin_floor_pct must be between 0 and 1 (exclusive)." }, 400);
              }
              const result = await setMerchantMarginFloor(merchant_id, pct);
              return result.ok
                ? resp({ ok: true, margin_floor_pct: pct }, 200)
                : resp({ ok: false, error: result.error }, 400);
            }
            const pct = await getMerchantMarginFloor(merchant_id);
            return resp({ ok: true, margin_floor_pct: pct }, 200);
          }

          if (platform === "talabat_expected_payout") {
            // Also multiplexed here, same reason as margin_floor above.
            if (body.action === "upload") {
              // Demo/no-live-connection path — parses a daily-totals CSV the
              // merchant can already download themselves, for any connected
              // or not-yet-connected platform. Not the real product
              // mechanism (see payout-csv-parser.ts header comment); doesn't
              // require that platform to be connected at all.
              const { csv_text, pdf_text, commission_rate_pct, upload_platform, file_kind } = body;
              const rate = Number(commission_rate_pct);
              if (!Number.isFinite(rate)) {
                return resp({ error: "commission_rate_pct is required for an upload check." }, 400);
              }

              if (file_kind === "pdf") {
                // Only verified against Snoonu's Brand Performance Report —
                // see payout-pdf-parser.ts header comment for why this isn't
                // opened up to other platforms yet.
                if (upload_platform !== "snoonu") {
                  return resp({ error: "PDF upload is only supported for Snoonu's Brand Performance Report right now." }, 400);
                }
                if (!pdf_text) {
                  return resp({ error: "pdf_text is required for a PDF upload check." }, 400);
                }
                const result = parseSnoonuBrandReportPdf(pdf_text, rate);
                if (result.ok) await savePayoutCheck(merchant_id, result);
                return result.ok
                  ? resp({ ...result, ok: true }, 200)
                  : resp({ ok: false, error: result.error }, 400);
              }

              const platformName = (PAYOUT_UPLOAD_PLATFORMS as readonly string[]).includes(upload_platform ?? "")
                ? upload_platform
                : "talabat";
              if (!csv_text) {
                return resp({ error: "csv_text is required for an upload check." }, 400);
              }

              // Talabat's real payout export ("Payout Metadata" CSV) states
              // its own Total Payout directly — see payout-statement-parser.ts
              // header comment for why a flat commission% estimate is wrong
              // for Talabat specifically. Every other platform still uses the
              // generic daily-totals parser (no real export sample yet).
              const result = platformName === "talabat"
                ? parseTalabatPayoutStatementCsv(csv_text, rate)
                : parseAggregatorDailyCsv(csv_text, rate, platformName);
              if (result.ok) await savePayoutCheck(merchant_id, result);
              return result.ok
                ? resp({ ...result, ok: true }, 200)
                : resp({ ok: false, error: result.error }, 400);
            }

            // Live path — pulls the merchant's real Talabat order history
            // and computes what they should have been paid, see
            // expected-payout.ts.
            const windowDays = Number(body.window_days);
            const result = await getTalabatExpectedPayout(merchant_id, Number.isFinite(windowDays) && windowDays > 0 ? windowDays : 30);
            if (result.ok) await savePayoutCheck(merchant_id, result);
            return result.ok
              ? resp({ ...result, ok: true }, 200)
              : resp({ ok: false, error: result.error }, 400);
          }

          if (platform === "history") {
            // Also multiplexed here, same PipeOps-routing reason as
            // margin_floor/talabat_expected_payout above. Read-only: lists
            // what already happened, nothing here writes.
            const limitRaw = Number(body.limit);
            const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 100) : 30;
            const items = body.action === "repricings"
              ? await getRepricingHistory(merchant_id, limit)
              : await getPayoutCheckHistory(merchant_id, limit);
            return resp({ ok: true, items }, 200);
          }

          return resp({ error: `Unsupported platform: ${platform}. Supported: talabat, jahez, keeta_shop_id, margin_floor, talabat_expected_payout, history.` }, 400);
        } catch (err) {
          console.error("[connect] unhandled error:", err);
          return resp({ ok: false, error: "Unexpected error. Please try again." }, 200);
        }
      },
    },
  },
});

function resp(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
