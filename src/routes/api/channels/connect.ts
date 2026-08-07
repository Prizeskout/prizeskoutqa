// POST /api/channels/connect
// Dashboard-facing endpoint — no API key required, uses merchant_id from body.
// Supports: talabat (OAuth BYOK), jahez (secret key BYOK),
//           keeta_shop_id (post-OAuth shop-ID capture for an already-
//           connected Keeta channel — Keeta itself connects via /api/auth/keeta)

import { createFileRoute } from "@tanstack/react-router";
import { connectTalabat, connectJahez, verifyMerchantAccess, setKeetaShopId } from "@/server/core/byok-connect";
import { activateMerchantMarginPolicy, getMerchantMarginPolicy, listMerchantMarginPolicyVersions, type ApprovalMode } from "@/server/core/merchant-pricing-config";
import { getTalabatExpectedPayout, type ExpectedPayoutResult } from "@/server/core/expected-payout";
import { parseAggregatorDailyCsv } from "@/server/core/payout-csv-parser";
import { parseTalabatPayoutStatementCsv } from "@/server/core/payout-statement-parser";
import { parseSnoonuBrandReportPdf } from "@/server/core/payout-pdf-parser";
import { savePayoutCheck, getPayoutCheckHistory, deletePayoutCheck } from "@/server/core/payout-history";
import { getRepricingHistory, deleteRepricingEvent } from "@/server/core/dispatch-history";
import { getDashboardStats } from "@/server/core/dashboard-stats";
import { getDefendLoopHealth } from "@/server/core/defend-loop-health";
import { syncPlatformCatalog } from "@/server/core/platform-sync";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { approveContractTerm, listContractTerms, saveContractDraft } from "@/server/core/contract-terms";
import { savePayoutAudit, getAuditHistory, deletePayoutAudit, type SavePayoutAuditInput } from "@/server/core/payout-audit-history";
import { classifyUpload, buildParsedSummary } from "@/server/core/upload-classifier";
import { classifyResult } from "@/lib/commission-audit";
import { extractContractTerms, type ContractDocumentImage } from "@/server/core/contract-extractor";
import { createRecoveryCase, listRecoveryCases, recordRecoverySubmission, updateRecoveryCase } from "@/server/core/recovery-cases";
import { approvePromotionScenario, confirmPromotionChannelLaunch, listPromotionScenarios, preparePromotionLaunch, savePromotionScenario, updatePromotionScenario } from "@/server/core/promotion-scenarios";
import { approveChannelPricePlan, listChannelPricePlans, saveChannelPricePlan, publishChannelPricePlan } from "@/server/core/channel-price-plans";
import { activateGroupPolicy, approveGroupControls, getGroupControls, saveGroupControls } from "@/server/core/group-controls";
import { advanceMonthEndClose, listMonthEndCloses, saveMonthEndClose } from "@/server/core/month-end-close";
import { getMerchantExperience, saveExperienceSettings, trackMerchantEngagement, updateAttention } from "@/server/core/merchant-experience";
import { confirmZidJahezPropagation, getZidJahezBridgeSettings, listZidJahezPropagationEvents, saveZidJahezBridgeSettings } from "@/server/core/zid-jahez-bridge";
import { createStoreManagerTask, getStoreManager, saveStoreManagerPolicy, saveStoreManagerProfile, transitionStoreManagerTask } from "@/server/core/store-manager";
import { runScrape } from "@/server/scrape-runner";

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
              const result = await activateMerchantMarginPolicy(merchant_id,{
                marginFloorPct:Number(body.margin_floor_pct),
                maxPriceIncreasePct:Number(body.max_price_increase_pct),
                approvalMode:body.approval_mode as ApprovalMode,
                activatedBy:(body.activated_by||"merchant").slice(0,160),
              });
              return result.ok
                ? resp({ ok: true, policy:result.policy }, 200)
                : resp({ ok: false, error: result.error }, 400);
            }
            const policy=await getMerchantMarginPolicy(merchant_id);
            const versions=await listMerchantMarginPolicyVersions(merchant_id);
            return resp({ ok: true, policy, versions }, 200);
          }

          if (platform === "zid_jahez_bridge") {
            if (body.action === "get") return resp({ ok: true, settings: await getZidJahezBridgeSettings(merchant_id), events: await listZidJahezPropagationEvents(merchant_id) }, 200);
            if (body.action === "save") {
              const raw = body as unknown as Record<string, unknown>;
              const commission = raw.mazeed_commission_pct == null || raw.mazeed_commission_pct === "" ? null : Number(raw.mazeed_commission_pct);
              const skus = Array.isArray(raw.eligible_skus) ? raw.eligible_skus.filter(value => typeof value === "string") as string[] : [];
              try {
                const settings = await saveZidJahezBridgeSettings(merchant_id, {
                  mazeed_active: raw.mazeed_active === true,
                  jahez_active: raw.jahez_active === true,
                  mazeed_commission_pct: commission,
                  vat_mode: raw.vat_mode === "mazeed_adds_vat" ? "mazeed_adds_vat" : "store_includes_vat",
                  eligible_skus: skus,
                  confirmed_by: String(raw.confirmed_by ?? "").trim().slice(0, 160),
                });
                return resp({ ok: true, settings }, 200);
              } catch (error) {
                return resp({ error: error instanceof Error ? error.message : "Could not save Zid–Jahez settings." }, 400);
              }
            }
            if(body.action==="confirm_propagation"){
              const observed=Number(body.observed_price);
              try{return resp({ok:true,event:await confirmZidJahezPropagation(merchant_id,body.id,observed,body.verified_by)},200);}
              catch(error){return resp({error:error instanceof Error?error.message:"Could not verify Jahez propagation."},400);}
            }
            return resp({ error: "Unsupported Zid–Jahez bridge action." }, 400);
          }

          if (platform === "locations") {
            if (body.action === "list") {
              const { data, error } = await supabaseAdmin.from("ps_merchant_locations").select("id,name,city,region,active").eq("account_id", merchant_id).order("created_at");
              if (error) throw error;
              return resp({ ok:true, locations:data ?? [] }, 200);
            }
            if (body.action === "create") {
              const name=(body.name ?? "").trim().slice(0,160),city=(body.city ?? "").trim().slice(0,120),region=(body.region ?? "").trim();
              if (!name || !city || !["Qatar","Saudi Arabia","UAE","Kuwait","Bahrain","Oman"].includes(region)) return resp({error:"Name, city, and a supported region are required."},400);
              const {data,error}=await supabaseAdmin.from("ps_merchant_locations").insert({account_id:merchant_id,name,city,region,active:true}).select("id,name,city,region,active").single();
              if(error)throw error;
              return resp({ok:true,location:data},200);
            }
            if (body.action === "toggle") {
              const {data,error}=await supabaseAdmin.from("ps_merchant_locations").update({active:body.active==="true"}).eq("account_id",merchant_id).eq("id",body.id).select("id,name,city,region,active").maybeSingle();
              if(error)throw error;
              if(!data)return resp({error:"Location not found."},404);
              return resp({ok:true,location:data},200);
            }
            if (body.action === "delete") {
              const {error}=await supabaseAdmin.from("ps_merchant_locations").delete().eq("account_id",merchant_id).eq("id",body.id);
              if(error)throw error;
              return resp({ok:true},200);
            }
            return resp({error:"Unsupported location action."},400);
          }

          if (platform === "notification_preferences") {
            const allowed = new Set(["margin_breach","reprice_applied","channel_down","competitor_drop","promo_overlap","weekly_digest"]);
            if (body.action === "list") {
              const { data, error } = await supabaseAdmin.from("ps_merchant_notification_settings").select("pref_key,enabled").eq("account_id", merchant_id);
              if (error) throw error;
              return resp({ ok:true, preferences:data ?? [] }, 200);
            }
            if (body.action === "set") {
              if (!allowed.has(body.pref_key ?? "") || !["true","false"].includes(body.enabled ?? "")) return resp({ error:"A valid notification preference and enabled value are required." }, 400);
              const { data, error } = await supabaseAdmin.from("ps_merchant_notification_settings")
                .upsert({ account_id:merchant_id, pref_key:body.pref_key, enabled:body.enabled === "true" }, { onConflict:"account_id,pref_key" })
                .select("pref_key,enabled").single();
              if (error) throw error;
              return resp({ ok:true, preference:data }, 200);
            }
            return resp({ error:"Unsupported notification preference action." }, 400);
          }

          if(platform==="merchant_experience"){
            if(body.action==="get")return resp({ok:true,...await getMerchantExperience(merchant_id),manager:await getStoreManager(merchant_id)},200);
            if(body.action==="attention"){
              if(!body.id||!["resolve","dismiss","assign","request_approval","snooze"].includes(body.attention_action))return resp({error:"Attention item and valid action are required."},400);
              return resp({ok:true,item:await updateAttention(merchant_id,{id:body.id,action:body.attention_action,value:body.value})},200);
            }
            if(body.action==="settings")return resp({ok:true,settings:await saveExperienceSettings(merchant_id,{automationLevel:body.automation_level,weeklyReview:body.weekly_review_enabled!=="false",progressiveMode:body.progressive_mode!=="false"})},200);
            if(body.action==="track"){await trackMerchantEngagement(merchant_id,body.event_name,body.object_id);return resp({ok:true},200);}
            if(body.action==="manager_profile")return resp({ok:true,profile:await saveStoreManagerProfile(merchant_id,{operatingMode:body.operating_mode,dailyBriefEnabled:body.daily_brief_enabled!=="false",dailyBriefHour:Number(body.daily_brief_hour),timezone:body.timezone||"Asia/Riyadh",language:body.language||"en"})},200);
            if(body.action==="manager_policy")return resp({ok:true,policy:await saveStoreManagerPolicy(merchant_id,{key:body.policy_key,enabled:body.enabled!=="false",behavior:body.behavior,description:body.description||body.policy_key,config:{approval_required:body.approval_required!=="false"}})},200);
            if(body.action==="manager_task_create"){const raw=body as unknown as Record<string,unknown>;return resp({ok:true,task:await createStoreManagerTask(merchant_id,{title:body.title,detail:body.detail,taskType:body.task_type,priority:body.priority,dueAt:body.due_at,approvalRequired:body.approval_required!=="false",riskLevel:String(raw.risk_level??"read_only"),workflow:raw.workflow&&typeof raw.workflow==="object"?raw.workflow as Record<string,unknown>:undefined})},200);}
            if(body.action==="manager_task_transition")return resp({ok:true,task:await transitionStoreManagerTask(merchant_id,{id:body.id,toStatus:body.to_status,actor:body.actor||"Merchant",note:body.value})},200);
            return resp({error:"Unsupported merchant experience action."},400);
          }

          if(platform==="competitor_radar"){
            if(body.action==="list"){
              const [{data:targets,error:targetError},{data:scrapes,error:scrapeError}]=await Promise.all([
                (supabaseAdmin.from("competitor_product_urls") as any).select("id,product,competitor,url,category,channel,match_status,match_confidence,created_at,updated_at").eq("user_id",merchant_id).order("created_at",{ascending:false}),
                (supabaseAdmin.from("competitor_scrapes") as any).select("url,price,currency,availability,status,scraped_at,evidence").eq("user_id",merchant_id).order("scraped_at",{ascending:false}).limit(500),
              ]);
              if(targetError)throw targetError;if(scrapeError)throw scrapeError;
              const latest=new Map<string,Record<string,unknown>>();for(const row of scrapes??[])if(!latest.has(row.url))latest.set(row.url,row);
              return resp({ok:true,targets:(targets??[]).map((target:Record<string,unknown>)=>({...target,latest_scrape:latest.get(String(target.url))??null}))},200);
            }
            if(body.action==="add"){
              const product=(body.product??"").trim(),competitor=(body.competitor??"").trim(),channel=(body.channel??"online").trim().toLowerCase(),category=(body.category??"").trim()||null;
              if(!product||!competitor)return resp({error:"Product and competitor names are required."},400);
              let parsed:URL;try{parsed=new URL(body.url??"");}catch{return resp({error:"Enter a valid public HTTPS product URL."},400);}
              if(parsed.protocol!=="https:"||/^(localhost|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.)/i.test(parsed.hostname))return resp({error:"Enter a public HTTPS product URL."},400);
              if(!/^[a-z0-9][a-z0-9_-]{1,39}$/.test(channel))return resp({error:"Channel must use letters, numbers, hyphens, or underscores."},400);
              const {data,error}=await (supabaseAdmin.from("competitor_product_urls") as any).insert({user_id:merchant_id,product:product.slice(0,240),competitor:competitor.slice(0,120),url:parsed.toString(),category,channel,match_status:"manual_confirmed",match_confidence:1}).select("id,product,competitor,url,category,channel,match_status,match_confidence,created_at").single();
              if(error){if(error.code==="23505")return resp({error:"That competitor product is already tracked in this channel."},409);throw error;}return resp({ok:true,target:data},200);
            }
            if(body.action==="remove"){
              if(!body.id)return resp({error:"Tracked product ID is required."},400);
              const {data,error}=await (supabaseAdmin.from("competitor_product_urls") as any).delete().eq("user_id",merchant_id).eq("id",body.id).select("id").maybeSingle();if(error)throw error;if(!data)return resp({error:"Tracked competitor product was not found."},404);return resp({ok:true},200);
            }
            if(body.action==="refresh"){
              if(!body.id)return resp({error:"Tracked product ID is required."},400);
              const {data:target,error}=await (supabaseAdmin.from("competitor_product_urls") as any).select("id,product,competitor,url,channel,match_confidence").eq("user_id",merchant_id).eq("id",body.id).maybeSingle();if(error)throw error;if(!target)return resp({error:"Tracked competitor product was not found."},404);
              const result=await runScrape(supabaseAdmin,{userId:merchant_id,url:target.url,product:target.product,competitor:target.competitor,channel:target.channel,matchConfidence:Number(target.match_confidence??1)});return result.ok?resp({ok:true,scrape:{url:result.url,price:result.price,currency:result.currency}},200):resp({error:result.error},502);
            }
            return resp({error:"Unsupported Competitor Radar action."},400);
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
                assurance: (raw.assurance as SavePayoutAuditInput["assurance"]) ?? null,
                four_way: (raw.four_way as SavePayoutAuditInput["four_way"]) ?? null,
                cross_check_windows: (raw.cross_check_windows as SavePayoutAuditInput["cross_check_windows"]) ?? null,
                net_sales_override_docs: (raw.net_sales_override_docs as SavePayoutAuditInput["net_sales_override_docs"]) ?? null,
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

          if (platform === "defend_loop_health") {
            const health = await getDefendLoopHealth(merchant_id);
            return resp({ ok: true, ...health }, 200);
          }

          if (platform === "copilot_operation") {
            if (body.action !== "sync_catalog") {
              return resp({ error: "Unsupported Copilot operation." }, 400);
            }
            const sourcePlatform = (body.source_platform || "zid").toLowerCase();
            if (!["zid", "salla", "foodics"].includes(sourcePlatform)) {
              return resp({ error: "Catalogue sync supports Zid, Salla, and Foodics." }, 400);
            }
            const { data: channel } = await supabaseAdmin
              .from("ps_merchant_channels")
              .select("bearer_token, manager_token, status, metadata")
              .eq("account_id", merchant_id)
              .eq("platform", sourcePlatform)
              .maybeSingle();
            if (!channel || channel.status !== "connected" || !channel.bearer_token) {
              return resp({ error: `${sourcePlatform} is not connected.` }, 400);
            }
            const result = await syncPlatformCatalog({
              platform: sourcePlatform,
              creds: {
                bearer_token: channel.bearer_token,
                manager_token: channel.manager_token,
                store_id: String((channel.metadata as Record<string, unknown> | null)?.store_id ?? "") || null,
              },
              accountId: merchant_id,
              licenseeId: merchant_id,
              merchantId: merchant_id,
              region: sourcePlatform === "zid" ? "SA" : "QA",
            });
            return resp({ ok: true, result }, 200);
          }

          if (platform === "contract_terms") {
            if (body.action === "list") {
              return resp({ ok: true, terms: await listContractTerms(merchant_id) }, 200);
            }
            if (body.action === "save_draft") {
              const raw = body as unknown as Record<string, unknown>;
              const commission = Number(body.commission_rate_pct);
              const vat = Number(body.vat_on_fees_pct || 0);
              const payment = Number(body.payment_fee_pct || 0);
              const fixed = Number(body.fixed_order_fee || 0);
              const delivery = Number(body.delivery_contribution || 0);
              if (!body.contract_name?.trim() || !body.source_platform?.trim() || !body.effective_from) {
                return resp({ error: "Contract name, platform, and effective date are required." }, 400);
              }
              if (![commission, vat, payment, fixed, delivery].every(Number.isFinite) || commission < 0 || commission >= 100) {
                return resp({ error: "Commercial terms contain an invalid amount or percentage." }, 400);
              }
              const optionalNumbers = [
                body.promotion_funding_platform_pct, body.settlement_days,
                body.dispute_deadline_days, body.advertising_commitment, body.minimum_spend,
              ].filter(value=>value !== "" && value != null).map(Number);
              if (!optionalNumbers.every(value=>Number.isFinite(value)&&value>=0)
                || (body.promotion_funding_platform_pct !== "" && Number(body.promotion_funding_platform_pct)>100)) {
                return resp({ error: "An optional contract obligation contains an invalid value." }, 400);
              }
              const term = await saveContractDraft(merchant_id, {
                platform: body.source_platform.trim().toLowerCase(),
                contract_name: body.contract_name.trim().slice(0, 160),
                commission_rate_pct: commission,
                vat_on_fees_pct: vat,
                payment_fee_pct: payment,
                fixed_order_fee: fixed,
                delivery_contribution: delivery,
                commission_base: ["gross_before_discount","net_after_discount","eligible_sales"].includes(body.commission_base)
                  ? body.commission_base as "gross_before_discount"|"net_after_discount"|"eligible_sales"
                  : "unknown",
                promotion_funding_platform_pct: body.promotion_funding_platform_pct === "" || body.promotion_funding_platform_pct == null
                  ? null : Number(body.promotion_funding_platform_pct),
                refund_liability: ["merchant","platform","shared","conditional"].includes(body.refund_liability)
                  ? body.refund_liability as "merchant"|"platform"|"shared"|"conditional" : "unknown",
                cancellation_liability: ["merchant","platform","shared","conditional"].includes(body.cancellation_liability)
                  ? body.cancellation_liability as "merchant"|"platform"|"shared"|"conditional" : "unknown",
                settlement_frequency: body.settlement_frequency?.trim().slice(0, 100) || null,
                settlement_days: body.settlement_days === "" || body.settlement_days == null ? null : Number(body.settlement_days),
                dispute_deadline_days: body.dispute_deadline_days === "" || body.dispute_deadline_days == null ? null : Number(body.dispute_deadline_days),
                advertising_commitment: body.advertising_commitment === "" || body.advertising_commitment == null ? null : Number(body.advertising_commitment),
                minimum_spend: body.minimum_spend === "" || body.minimum_spend == null ? null : Number(body.minimum_spend),
                currency: body.currency?.trim().toUpperCase().slice(0, 8) || null,
                coverage_legal_entity: body.coverage_legal_entity?.trim().slice(0, 180) || null,
                coverage_brands: typeof body.coverage_brands === "string" ? body.coverage_brands.split(",").map(v=>v.trim()).filter(Boolean).slice(0,100) : [],
                coverage_branches: typeof body.coverage_branches === "string" ? body.coverage_branches.split(",").map(v=>v.trim()).filter(Boolean).slice(0,250) : [],
                effective_from: body.effective_from,
                effective_to: body.effective_to || null,
                source_file_name: body.source_file_name?.trim().slice(0, 220) || null,
                source_sha256: /^[a-f0-9]{64}$/i.test(body.source_sha256 || "") ? body.source_sha256.toLowerCase() : null,
                notes: body.notes?.trim().slice(0, 1200) || null,
                extraction_json: raw.extraction && typeof raw.extraction === "object"
                  ? raw.extraction as Record<string, unknown>
                  : null,
                extraction_model: body.extraction_model?.trim().slice(0, 120) || null,
                extraction_confidence: Number.isFinite(Number(body.extraction_confidence))
                  ? Number(body.extraction_confidence)
                  : null,
                extracted_at: body.extracted_at || null,
              });
              return resp({ ok: true, term }, 200);
            }
            if (body.action === "extract") {
              const raw = body as unknown as Record<string, unknown>;
              const documentText = typeof raw.document_text === "string" ? raw.document_text : "";
              const documentImages = Array.isArray(raw.document_images) ? raw.document_images : [];
              if (documentText.length > 100_000) {
                return resp({ error: "Agreement text is too large (maximum 100,000 characters)." }, 413);
              }
              if (documentImages.length > 15) {
                return resp({ error: "A maximum of 15 scanned pages can be analysed at once." }, 413);
              }
              const result = await extractContractTerms(documentText, documentImages as ContractDocumentImage[]);
              return result.ok
                ? resp({ ok: true, extraction: result.extraction, model: result.model }, 200)
                : resp({ ok: false, error: result.error }, 422);
            }
            if (body.action === "approve") {
              if (!body.id || !body.reviewed_by?.trim()) {
                return resp({ error: "Contract draft and reviewer name are required." }, 400);
              }
              const term = await approveContractTerm(merchant_id, body.id, body.reviewed_by.trim().slice(0, 160));
              const { data: channel } = await supabaseAdmin
                .from("ps_merchant_channels")
                .select("id, metadata")
                .eq("account_id", merchant_id)
                .eq("platform", term.platform)
                .maybeSingle();
              if (channel) {
                await supabaseAdmin
                  .from("ps_merchant_channels")
                  .update({
                    metadata: {
                      ...((channel.metadata as Record<string, unknown> | null) ?? {}),
                      commission_rate_pct: term.commission_rate_pct,
                      vat_on_fees_pct: term.vat_on_fees_pct,
                      payment_fee_pct: term.payment_fee_pct,
                      fixed_order_fee: term.fixed_order_fee,
                      delivery_contribution: term.delivery_contribution,
                      commission_base: term.commission_base,
                      promotion_funding_platform_pct: term.promotion_funding_platform_pct,
                      refund_liability: term.refund_liability,
                      cancellation_liability: term.cancellation_liability,
                      settlement_frequency: term.settlement_frequency,
                      settlement_days: term.settlement_days,
                      dispute_deadline_days: term.dispute_deadline_days,
                      contract_currency: term.currency,
                      contract_coverage_legal_entity: term.coverage_legal_entity,
                      contract_coverage_brands: term.coverage_brands,
                      contract_coverage_branches: term.coverage_branches,
                      commercial_terms_source: "reviewed_contract",
                      contract_term_id: term.id,
                      contract_effective_from: term.effective_from,
                      contract_approved_at: term.approved_at,
                    },
                  })
                  .eq("id", channel.id);
              }
              return resp({ ok: true, term }, 200);
            }
            return resp({ error: "Unsupported contract-terms action." }, 400);
          }

          if(platform==="recovery_cases"){
            if(body.action==="list")return resp({ok:true,cases:await listRecoveryCases(merchant_id)},200);
            const raw=body as unknown as Record<string,unknown>;
            if(body.action==="create"){
              if(!body.exception_key||!body.title||!body.explanation_en||!body.explanation_ar)return resp({error:"Exception identity and bilingual explanations are required."},400);
              const exceptionAmount=raw.exception_amount==null?null:Number(raw.exception_amount);
              const claimsReady=Number(raw.claims_ready_amount??0);
              const recovered=Number(raw.recovered_amount??0);
              if((exceptionAmount!=null&&!Number.isFinite(exceptionAmount))||![claimsReady,recovered].every(Number.isFinite))return resp({error:"Recovery case contains an invalid amount."},400);
              const item=await createRecoveryCase(merchant_id,{
                platform:(body.source_platform||"talabat").toLowerCase(),exception_key:body.exception_key.slice(0,180),title:body.title.slice(0,240),
                status:body.case_status==="ready"?"ready":"evidence_required",severity:body.severity||"warning",
                exception_amount:exceptionAmount,claims_ready_amount:claimsReady,confidence:body.confidence||"low",
                affected_orders:raw.affected_orders==null?null:Number(raw.affected_orders),
                contract_term_id:body.contract_term_id||null,contract_clause:body.contract_clause?.slice(0,500)||null,
                regulatory_reference:body.regulatory_reference?.slice(0,500)||null,
                evidence_sources:Array.isArray(raw.evidence_sources)?raw.evidence_sources.filter(v=>typeof v==="string").slice(0,50) as string[]:[],
                calculation:raw.calculation&&typeof raw.calculation==="object"?raw.calculation as Record<string,unknown>:{},
                explanation_en:body.explanation_en.slice(0,3000),explanation_ar:body.explanation_ar.slice(0,3000),
                submission_deadline:body.submission_deadline||null,owner:body.owner?.slice(0,160)||null,
                platform_response:null,recovered_amount:recovered,
              });
              return resp({ok:true,case:item},200);
            }
            if(body.action==="update"){
              if(!body.id)return resp({error:"Recovery case id is required."},400);
              const allowed=["evidence_required","draft","ready","submitted_manually","platform_review","accepted","rejected","recovered","closed"];
              const item=await updateRecoveryCase(merchant_id,body.id,{
                status:allowed.includes(body.case_status)?body.case_status as any:undefined,
                owner:body.owner?.slice(0,160)||null,submission_deadline:body.submission_deadline||null,
                platform_response:body.platform_response?.slice(0,3000)||null,
                recovered_amount:Number.isFinite(Number(raw.recovered_amount))?Number(raw.recovered_amount):0,
              });
              return resp({ok:true,case:item},200);
            }
            if(body.action==="record_submission"){
              if(!body.id||!body.submission_reference?.trim()||!body.submitted_by?.trim())return resp({error:"Case id, platform reference, and submitter are required."},400);
              try{return resp({ok:true,case:await recordRecoverySubmission(merchant_id,body.id,body.submission_reference.trim().slice(0,200),body.submitted_by.trim().slice(0,160))},200);}
              catch(err){return resp({error:err instanceof Error?err.message:"Could not record submission."},400);}
            }
            return resp({error:"Unsupported recovery-case action."},400);
          }

          if(platform==="promotion_scenarios"){
            if(body.action==="list")return resp({ok:true,scenarios:await listPromotionScenarios(merchant_id)},200);
            const raw=body as unknown as Record<string,unknown>;
            if(body.action==="create"){
              if(!body.name?.trim()||!body.source_platform?.trim())return resp({error:"Campaign name and platform are required."},400);
              if(!raw.inputs||typeof raw.inputs!=="object"||!raw.results||typeof raw.results!=="object")return resp({error:"Simulation inputs and deterministic results are required."},400);
              const item=await savePromotionScenario(merchant_id,{
                name:body.name.trim().slice(0,180),platform:body.source_platform.trim().toLowerCase(),status:"draft",
                inputs:raw.inputs as Record<string,unknown>,results:raw.results as Record<string,unknown>,
                promised_platform_funding:null,actual_platform_funding:null,funding_variance:null,
              });
              return resp({ok:true,scenario:item},200);
            }
            if(body.action==="approve"){
              if(!body.id||!["finance","operations"].includes(body.approval_role)||!body.reviewer?.trim())return resp({error:"Scenario id, approval role, and reviewer are required."},400);
              try{return resp({ok:true,scenario:await approvePromotionScenario(merchant_id,body.id,body.approval_role as "finance"|"operations",body.reviewer.trim().slice(0,160))},200);}
              catch(err){return resp({error:err instanceof Error?err.message:"Could not approve campaign."},400);}
            }
            if(body.action==="activate"){
              const marginFloor=Number(body.margin_floor_pct);
              try{return resp({ok:true,group:await activateGroupPolicy(merchant_id,marginFloor)},200);}
              catch(err){return resp({error:err instanceof Error?err.message:"Could not activate group policy."},400);}
            }
            if(body.action==="prepare_launch"){
              if(!body.id||!Array.isArray(raw.target_channels))return resp({error:"Scenario id and target channels are required."},400);
              try{return resp({ok:true,scenario:await preparePromotionLaunch(merchant_id,body.id,(raw.target_channels as unknown[]).filter(value=>typeof value==="string") as string[])},200);}
              catch(err){return resp({error:err instanceof Error?err.message:"Could not prepare campaign launch."},400);}
            }
            if(body.action==="confirm_channel_launch"){
              if(!body.id||!body.target_channel?.trim()||!body.partner_campaign_id?.trim())return resp({error:"Scenario id, target channel, and partner campaign id are required."},400);
              try{return resp({ok:true,scenario:await confirmPromotionChannelLaunch(merchant_id,body.id,body.target_channel,body.partner_campaign_id.trim().slice(0,200))},200);}
              catch(err){return resp({error:err instanceof Error?err.message:"Could not confirm channel launch."},400);}
            }
            if(body.action==="update"){
              if(!body.id)return resp({error:"Scenario id is required."},400);
              const allowed=["draft","approved","running","completed","cancelled"];
              if(body.scenario_status&&!allowed.includes(body.scenario_status))return resp({error:"Invalid campaign status."},400);
              const promised=raw.promised_platform_funding==null?null:Number(raw.promised_platform_funding);
              const actual=raw.actual_platform_funding==null?null:Number(raw.actual_platform_funding);
              if((promised!=null&&!Number.isFinite(promised))||(actual!=null&&!Number.isFinite(actual)))return resp({error:"Funding amounts must be valid numbers."},400);
              const item=await updatePromotionScenario(merchant_id,body.id,{
                ...(body.scenario_status?{status:body.scenario_status as "draft"|"approved"|"running"|"completed"|"cancelled"}:{}),
                promised_platform_funding:promised,actual_platform_funding:actual,
                funding_variance:promised!=null&&actual!=null?Math.round((actual-promised)*100)/100:null,
                ...(body.scenario_status==="approved"?{approved_by:body.approved_by?.trim().slice(0,160)||"Merchant approver",approved_at:new Date().toISOString()}:{}),
              });
              return resp({ok:true,scenario:item},200);
            }
            return resp({error:"Unsupported promotion-scenario action."},400);
          }

          if(platform==="channel_price_plans"){
            if(body.action==="list")return resp({ok:true,plans:await listChannelPricePlans(merchant_id)},200);
            const raw=body as unknown as Record<string,unknown>;
            if(body.action==="create"){
              if(!body.name?.trim()||!Array.isArray(raw.channel_config)||!Array.isArray(raw.rows))return resp({error:"Plan name, channel configuration, and price rows are required."},400);
              if(raw.rows.length>5000)return resp({error:"A price plan can contain at most 5,000 rows."},400);
              return resp({ok:true,plan:await saveChannelPricePlan(merchant_id,body.name.trim().slice(0,180),raw.channel_config,raw.rows)},200);
            }
            if(body.action==="approve"){
              if(!body.id||!body.approved_by?.trim())return resp({error:"Plan id and approver name are required."},400);
              return resp({ok:true,plan:await approveChannelPricePlan(merchant_id,body.id,body.approved_by.trim().slice(0,160))},200);
            }
            if(body.action==="publish"){
              if(!body.id)return resp({error:"Plan id is required."},400);
              try{
                const {plan,results}=await publishChannelPricePlan(merchant_id,body.id);
                return resp({ok:true,plan,results},200);
              }catch(err){
                return resp({error:err instanceof Error?err.message:"Could not publish plan."},400);
              }
            }
            return resp({error:"Unsupported channel-price-plan action."},400);
          }

          if(platform==="group_controls"){
            if(body.action==="get")return resp({ok:true,group:await getGroupControls(merchant_id)},200);
            const raw=body as unknown as Record<string,unknown>;
            if(body.action==="save"){
              if(!body.group_name?.trim())return resp({error:"Group name is required."},400);
              for(const key of ["legal_entities","brands","branches","members"]){
                if(!Array.isArray(raw[key]))return resp({error:`${key} must be an array.`},400);
              }
              return resp({ok:true,group:await saveGroupControls(merchant_id,{
                group_name:body.group_name.trim().slice(0,180),legal_entities:(raw.legal_entities as unknown[]).slice(0,50),
                brands:(raw.brands as unknown[]).slice(0,100),branches:(raw.branches as unknown[]).slice(0,500),members:(raw.members as unknown[]).slice(0,250),
              })},200);
            }
            if(body.action==="approve"){
              if(!["finance","operations"].includes(body.approval_role)||!body.reviewer?.trim())return resp({error:"Approval role and reviewer are required."},400);
              return resp({ok:true,group:await approveGroupControls(merchant_id,body.approval_role as "finance"|"operations",body.reviewer.trim().slice(0,160))},200);
            }
            return resp({error:"Unsupported group-controls action."},400);
          }

          if(platform==="month_end_close"){
            if(body.action==="list")return resp({ok:true,closes:await listMonthEndCloses(merchant_id)},200);
            const raw=body as unknown as Record<string,unknown>;
            if(body.action==="save"){
              if(!body.currency||!Array.isArray(raw.schedules)||!Array.isArray(raw.journals)||!Array.isArray(raw.limitations))return resp({error:"Currency, schedules, journals, and limitations are required."},400);
              return resp({ok:true,close:await saveMonthEndClose(merchant_id,{
                period_start:body.period_start||null,period_end:body.period_end||null,currency:body.currency.slice(0,8),
                status:"draft",schedules:(raw.schedules as unknown[]).slice(0,100),journals:(raw.journals as unknown[]).slice(0,250),
                limitations:(raw.limitations as unknown[]).slice(0,100),prepared_by:body.prepared_by?.trim().slice(0,160)||"PrizeSkout close engine",
              })},200);
            }
            if(body.action==="advance"){
              if(!body.id||!["reviewed","approved","locked"].includes(body.close_status)||!body.reviewer?.trim())return resp({error:"Close id, valid status, and reviewer are required."},400);
              return resp({ok:true,close:await advanceMonthEndClose(merchant_id,body.id,body.close_status as "reviewed"|"approved"|"locked",body.reviewer.trim().slice(0,160))},200);
            }
            return resp({error:"Unsupported month-end-close action."},400);
          }

          return resp({ error: `Unsupported platform: ${platform}.` }, 400);
        } catch (err) {
          console.error("[connect] unhandled error:", err);
          return resp({ ok: false, error: "Unexpected error. Please try again." }, 500);
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
