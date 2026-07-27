// POST /api/channels/connect
// Dashboard-facing endpoint — no API key required, uses merchant_id from body.
// Supports: talabat (OAuth BYOK), jahez (secret key BYOK),
//           keeta_shop_id (post-OAuth shop-ID capture for an already-
//           connected Keeta channel — Keeta itself connects via /api/auth/keeta)

import { createFileRoute } from "@tanstack/react-router";
import { connectTalabat, connectJahez, verifyMerchantAccess, setKeetaShopId } from "@/server/core/byok-connect";
import { getMerchantMarginFloor, setMerchantMarginFloor } from "@/server/core/merchant-pricing-config";
import { getTalabatExpectedPayout, type ExpectedPayoutResult } from "@/server/core/expected-payout";
import { parseAggregatorDailyCsv } from "@/server/core/payout-csv-parser";
import { parseTalabatPayoutStatementCsv } from "@/server/core/payout-statement-parser";
import { parseSnoonuBrandReportPdf } from "@/server/core/payout-pdf-parser";
import { savePayoutCheck, getPayoutCheckHistory, deletePayoutCheck } from "@/server/core/payout-history";
import { getRepricingHistory, deleteRepricingEvent } from "@/server/core/dispatch-history";
import { getDashboardStats } from "@/server/core/dashboard-stats";
import { savePayoutAudit, getAuditHistory, deletePayoutAudit, type SavePayoutAuditInput } from "@/server/core/payout-audit-history";
import { classifyUpload, buildParsedSummary } from "@/server/core/upload-classifier";
import { classifyResult } from "@/lib/commission-audit";

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
            const { client_id, client_secret, vendor_id, chain_id, commission_rate_pct, vat_on_fees_pct, payment_fee_pct, fixed_order_fee, delivery_contribution } = body;
            if (!client_id || !client_secret || !vendor_id || !chain_id || !commission_rate_pct) {
              return resp({ error: "Talabat requires client_id, client_secret, vendor_id, chain_id, and commission_rate_pct." }, 400);
            }
            const result = await connectTalabat({
              merchantId: merchant_id, clientId: client_id, clientSecret: client_secret,
              vendorId: vendor_id, chainId: chain_id, commissionRatePct: commission_rate_pct,
              vatOnFeesPct: vat_on_fees_pct, paymentFeePct: payment_fee_pct,
              fixedOrderFee: fixed_order_fee, deliveryContribution: delivery_contribution,
            });
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
              const { csv_text, pdf_text, commission_rate_pct, upload_platform, file_kind, description } = body;
              const rate = Number(commission_rate_pct);
              if (!Number.isFinite(rate)) {
                return resp({ error: "commission_rate_pct is required for an upload check." }, 400);
              }

              // Shared by both the PDF and CSV branches below: persists the
              // check, then — only if the merchant typed a description —
              // asks the LLM classifier to interpret it (see upload-
              // classifier.ts). A classification failure never fails the
              // upload itself; it's a soft-fail passenger on the response.
              const respondWithClassification = async (result: ExpectedPayoutResult) => {
                if (!result.ok) return resp({ ok: false, error: result.error }, 400);
                await savePayoutCheck(merchant_id, result);
                const trimmedDescription = (description ?? "").trim().slice(0, 500);
                if (!trimmedDescription) return resp({ ...result, ok: true }, 200);
                const classification = await classifyUpload({
                  description: trimmedDescription,
                  parsedSummary: buildParsedSummary(result),
                  structuralHint: classifyResult(result),
                });
                return resp({ ...result, ok: true, classification }, 200);
              };

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
                return await respondWithClassification(parseSnoonuBrandReportPdf(pdf_text, rate));
              }

              const platformName = (PAYOUT_UPLOAD_PLATFORMS as readonly string[]).includes(upload_platform ?? "")
                ? upload_platform
                : "talabat";
              if (!csv_text) {
                return resp({ error: "csv_text is required for an upload check." }, 400);
              }

              // Route by the file's actual content, not the selected
              // platform — a merchant can select "Talabat" and still upload
              // either Talabat's real payout statement ("Payout Metadata"
              // CSV, states its own Total Payout directly — see payout-
              // statement-parser.ts) or a plain daily orders-per-day export.
              // Keying this off `platformName` alone previously meant a
              // Talabat daily-log upload was force-routed to the statement
              // parser and hard-failed for missing statement columns.
              const looksLikeStatement = /earnings range/i.test(csv_text) && /total payout/i.test(csv_text);
              const result = looksLikeStatement
                ? parseTalabatPayoutStatementCsv(csv_text, rate)
                : parseAggregatorDailyCsv(csv_text, rate, platformName);
              return await respondWithClassification(result);
            }

            if (body.action === "manual_entry") {
              // "What I actually received" — a merchant-typed record, never
              // a parsed file (see commission-audit.ts's computeMerchant-
              // ReceivedFindings for why: there's no reliable way to parse
              // an arbitrary bank-export format the way Talabat's own
              // consistent CSV exports are parsed, so this stays a plain
              // amount + period rather than fabricating parsing confidence).
              const description = (body.description ?? "").trim().slice(0, 500);
              const amount = Number(body.amount);
              const { period_start, period_end } = body;
              if (!Number.isFinite(amount) || amount <= 0) {
                return resp({ error: "A valid amount is required for a manual entry." }, 400);
              }
              if (!period_start || !period_end) {
                return resp({ error: "period_start and period_end are required for a manual entry." }, 400);
              }
              if (!body.bank_transaction_date) {
                return resp({ error: "bank_transaction_date is required for a bank settlement entry." }, 400);
              }
              const hasDocumentEvidence = !!body.evidence_file_name && /^[a-f0-9]{64}$/i.test(body.evidence_sha256 ?? "");

              const uploadPlatform = (PAYOUT_UPLOAD_PLATFORMS as readonly string[]).includes(body.upload_platform ?? "")
                ? body.upload_platform
                : undefined;

              let platformGuess: string | null = uploadPlatform ?? null;
              let classification: unknown;
              if (description) {
                const outcome = await classifyUpload({
                  description,
                  parsedSummary: `Merchant-entered amount ${amount}, period ${period_start} to ${period_end}.`,
                  structuralHint: "manual_entry",
                });
                // The classifier's `role` is intentionally discarded here —
                // a manual entry is always merchant_received by
                // construction; never let the LLM override something
                // already known structurally. Only platform/restated are
                // used, and only to fill in what wasn't already selected.
                if (outcome.ok) {
                  platformGuess = platformGuess ?? outcome.classification.platform;
                  classification = { ok: true, restated: outcome.classification.restated, confidence: outcome.classification.confidence };
                } else {
                  classification = outcome;
                }
              }

              return resp({
                ok: true,
                source: "manual",
                role: "merchant_received",
                received_amount: Math.round(amount * 100) / 100,
                period_start,
                period_end,
                platform: platformGuess,
                bank_transaction_date: body.bank_transaction_date,
                bank_reference: (body.bank_reference ?? "").trim().slice(0, 120),
                deposit_type: body.deposit_type ?? "regular_payout",
                currency: body.currency ?? "QAR",
                evidence_file_name: hasDocumentEvidence ? body.evidence_file_name.slice(0, 200) : undefined,
                evidence_sha256: hasDocumentEvidence ? body.evidence_sha256 : undefined,
                evidence_level: hasDocumentEvidence ? "document_supported" : "manual_assertion",
                ...(classification ? { classification } : {}),
              }, 200);
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
            // margin_floor/talabat_expected_payout above.
            if (body.action === "save_payout_audit") {
              // Only a persist — the audit itself (findings/ledger) was
              // already computed client-side by src/lib/commission-audit.ts;
              // this endpoint doesn't recompute anything, just stores what's
              // handed to it. Cast needed: these fields are structured JSON,
              // not the flat strings the rest of this route's Body assumes.
              const raw = body as unknown as Record<string, unknown>;
              const rate = Number(raw.commission_rate_pct);
              if (!Number.isFinite(rate)) {
                return resp({ error: "commission_rate_pct is required to save an audit." }, 400);
              }
              const input: SavePayoutAuditInput = {
                commission_rate_pct: rate,
                documents: (raw.documents as SavePayoutAuditInput["documents"]) ?? [],
                findings: (raw.findings as SavePayoutAuditInput["findings"]) ?? [],
                ledger: (raw.ledger as SavePayoutAuditInput["ledger"]) ?? [],
                ledger_totals: (raw.ledger_totals as SavePayoutAuditInput["ledger_totals"]) ?? null,
                period_start: (raw.period_start as string) ?? null,
                period_end: (raw.period_end as string) ?? null,
              };
              const result = await savePayoutAudit(merchant_id, input);
              return result.ok
                ? resp({ ok: true }, 200)
                : resp({ ok: false, error: result.error }, 400);
            }

            if (body.action === "delete_payout_check" || body.action === "delete_repricing" || body.action === "delete_payout_audit") {
              const id = body.id;
              if (!id) return resp({ error: "id is required to delete a record." }, 400);
              const result = body.action === "delete_payout_check"
                ? await deletePayoutCheck(merchant_id, id)
                : body.action === "delete_repricing"
                ? await deleteRepricingEvent(merchant_id, id)
                : await deletePayoutAudit(merchant_id, id);
              return result.ok
                ? resp({ ok: true }, 200)
                : resp({ ok: false, error: result.error }, 400);
            }

            const limitRaw = Number(body.limit);
            const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 100) : 30;
            const items = body.action === "repricings"
              ? await getRepricingHistory(merchant_id, limit)
              : body.action === "payout_audits"
              ? await getAuditHistory(merchant_id, limit)
              : await getPayoutCheckHistory(merchant_id, limit);
            return resp({ ok: true, items }, 200);
          }

          if (platform === "dashboard_stats") {
            // Also multiplexed here, same PipeOps-routing reason as above.
            // Read-only aggregation over ps_aggregator_dispatch_log for the
            // Revenue Hub hero + stat tiles — see dashboard-stats.ts.
            const stats = await getDashboardStats(merchant_id);
            return resp({ ok: true, ...stats }, 200);
          }

          return resp({ error: `Unsupported platform: ${platform}. Supported: talabat, jahez, keeta_shop_id, margin_floor, talabat_expected_payout, history, dashboard_stats.` }, 400);
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
