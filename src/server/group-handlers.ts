// ============================================================================
// Group Buying Engine handlers — /v1/group/*  (API 12)
//
// Endpoints:
//   POST /v1/group/campaigns              — create campaign (validates all tier floors)
//   POST /v1/group/join                   — buyer commitment (idempotent, advances tier)
//   GET  /v1/group/campaigns/{id}         — live status: count + current tier
//   GET  /v1/group/campaigns/{id}/buyers  — list buyer commitments
//   POST /v1/group/campaigns/{id}/close   — merchant manual close
//
// Floor invariant:
//   Every tier price is validated against computeFloor() at campaign creation.
//   If ANY tier would sell below the margin floor → 422 rejected.
//   Uses the exact API 07 formula (dynprice-handlers → margin.ts).
//
// Tier advancement:
//   On each join, if current_buyers crosses one or more tier thresholds,
//   current_tier_idx advances and group.tier_unlocked is emitted per tier.
//
// Signals (NOT payment processing):
//   group.tier_unlocked  — a price tier just unlocked (buyer count crossed threshold)
//   group.payment_trigger — campaign completed (locked price + buyer list)
//   group.campaign_expired — campaign expired without meeting minimum threshold
//
// WhatsApp invite:
//   wa.me pre-filled link + SVG QR data URL (data:image/svg+xml;base64,...)
//   GCC family flow: STUB — OTP/SMS integration requires SMS provider credentials.
// ============================================================================

import QRCode from "qrcode";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { r2 } from "./margin";
import { computeFloor } from "./dynprice-handlers";
import { enqueueWebhookEvent } from "@/server/webhook-delivery";
import type { V1Context, V1Result } from "./v1-handlers";

// ─── Scope helpers ────────────────────────────────────────────────────────────

function canGroupWrite(ctx: V1Context): boolean {
  return ctx.scopes.includes("group:write") || ctx.scopes.includes("write") || ctx.scopes.includes("admin");
}
function canGroupRead(ctx: V1Context): boolean {
  return ctx.scopes.includes("group:read") || canGroupWrite(ctx);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function err(code: string, message: string, status: number, extra?: Record<string, unknown>): V1Result {
  return { status, body: { error: { code, message, ...extra } } };
}
function ok(body: unknown, status = 200): V1Result {
  return { status, body };
}
async function readJson(req: Request): Promise<Record<string, unknown> | null> {
  const raw = await req.text();
  if (!raw) return {};
  try {
    const p = JSON.parse(raw);
    return typeof p === "object" && p !== null && !Array.isArray(p)
      ? (p as Record<string, unknown>)
      : null;
  } catch { return null; }
}

// ─── Tier types ───────────────────────────────────────────────────────────────

type Tier = { min_buyers: number; price: number };

function parseTiers(raw: unknown): { tiers: Tier[]; error: string | null } {
  if (!Array.isArray(raw) || raw.length === 0)
    return { tiers: [], error: "tiers must be a non-empty array" };

  const tiers: Tier[] = [];
  for (let i = 0; i < raw.length; i++) {
    const t = raw[i];
    if (typeof t !== "object" || t === null)
      return { tiers: [], error: `tiers[${i}] must be an object` };
    const mb = Number((t as Record<string, unknown>).min_buyers);
    const p  = Number((t as Record<string, unknown>).price);
    if (!Number.isInteger(mb) || mb < 2)
      return { tiers: [], error: `tiers[${i}].min_buyers must be an integer >= 2` };
    if (!isFinite(p) || p <= 0)
      return { tiers: [], error: `tiers[${i}].price must be a positive number` };
    tiers.push({ min_buyers: mb, price: r2(p) });
  }

  // Must be sorted ascending by min_buyers, no duplicates
  for (let i = 1; i < tiers.length; i++) {
    if (tiers[i].min_buyers <= tiers[i - 1].min_buyers)
      return { tiers: [], error: "tiers must be in ascending order by min_buyers with no duplicates" };
    if (tiers[i].price >= tiers[i - 1].price)
      return { tiers: [], error: "tier prices must decrease as min_buyers increases (deeper discount for larger group)" };
  }

  return { tiers, error: null };
}

// ─── WhatsApp invite builder ───────────────────────────────────────────────

async function buildInvite(
  campaignId: string,
  sku: string,
  currentBuyers: number,
  currentPrice: number,
  basePrice: number,
  expiryAt: string,
): Promise<{ wa_link: string; qr_data_url: string }> {
  const savingsPct = Math.round((1 - currentPrice / basePrice) * 100);
  const expiryDate = new Date(expiryAt).toLocaleDateString("en-QA", { dateStyle: "medium" });
  const joinUrl = `${process.env.WORKER_ORIGIN ?? "https://prizeskoutqa.prizeskoutqatar.workers.dev"}/group/${campaignId}`;

  const message = [
    `🛒 Group Buy: ${sku}`,
    `💰 Price drops as more buyers join!`,
    `👥 ${currentBuyers} buyer${currentBuyers !== 1 ? "s" : ""} so far`,
    `✅ Current price: QAR ${currentPrice.toFixed(2)} (save ${savingsPct}% off QAR ${basePrice.toFixed(2)})`,
    `⏰ Offer expires: ${expiryDate}`,
    `🔗 Join here: ${joinUrl}`,
  ].join("\n");

  const waLink = `https://wa.me/?text=${encodeURIComponent(message)}`;

  let qrDataUrl: string;
  try {
    const svg = await QRCode.toString(waLink, { type: "svg", errorCorrectionLevel: "M" });
    qrDataUrl = `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
  } catch {
    qrDataUrl = `data:text/plain;base64,${Buffer.from(waLink).toString("base64")}`;
  }

  return { wa_link: waLink, qr_data_url: qrDataUrl };
}

// ─── Current tier price ────────────────────────────────────────────────────

function tierPriceAt(tiers: Tier[], tierIdx: number, basePrice: number): number {
  return tierIdx >= 0 && tierIdx < tiers.length ? tiers[tierIdx].price : basePrice;
}

// ─── Process expired campaigns (called by hook endpoint) ─────────────────────

export async function processExpiredCampaigns(): Promise<{
  processed: number;
  completed: number;
  expired: number;
  errors: string[];
}> {
  const nowIso = new Date().toISOString();
  const errors: string[] = [];

  // Fetch all active campaigns whose expiry has passed
  const { data: due, error: dueErr } = await supabaseAdmin
    .from("group_campaigns")
    .select("id, account_id, sku, tiers, current_buyers, current_tier_idx, base_price, locked_price, created_by")
    .eq("status", "active")
    .lte("expiry_at", nowIso);

  if (dueErr) {
    return { processed: 0, completed: 0, expired: 0, errors: [dueErr.message] };
  }

  let completed = 0;
  let expired = 0;
  const list = due ?? [];

  for (const campaign of list) {
    const tiers = campaign.tiers as Tier[];
    const tierIdx = campaign.current_tier_idx as number;
    const tierMet = tierIdx >= 0 && tierIdx < tiers.length;

    if (tierMet) {
      // At least one tier was unlocked — complete the campaign
      const lockedPrice = tierPriceAt(tiers, tierIdx, Number(campaign.base_price));

      // Fetch committed buyers
      const { data: buyers } = await supabaseAdmin
        .from("group_buyers")
        .select("buyer_id, buyer_name, phone, joined_at")
        .eq("campaign_id", campaign.id)
        .eq("status", "committed");

      const buyerList = buyers ?? [];

      // Update campaign: status=completed, locked_price
      await supabaseAdmin.from("group_campaigns").update({
        status: "completed",
        locked_price: lockedPrice,
        updated_at: nowIso,
      }).eq("id", campaign.id);

      // Update buyer rows: set locked_price
      await supabaseAdmin.from("group_buyers").update({
        status: "committed",  // stays committed until merchant confirms payment
        locked_price: lockedPrice,
      }).eq("campaign_id", campaign.id).eq("status", "committed");

      // Audit
      await (supabaseAdmin.from("pricing_decisions") as any).insert({
        user_id:           campaign.created_by ?? campaign.account_id,
        product:           campaign.sku,
        category:          null,
        channel:           "Online",
        current_price:     Number(campaign.base_price),
        recommended_price: lockedPrice,
        decision:          "group_buy_completed",
        source:            "group_engine_v1",
        trigger_type:      "group_buy_expiry",
        rule_fired:        `tier_${tierIdx}`,
        rule_reason:       `Group buy completed: ${campaign.current_buyers} buyers locked at QAR ${lockedPrice}`,
        inputs_snapshot:   {
          campaign_id: campaign.id, sku: campaign.sku,
          tier_idx: tierIdx, locked_price: lockedPrice,
          buyer_count: campaign.current_buyers,
        },
        alternatives:      [],
        cost_snapshot:     {},
        note:              `group_engine_v1 | campaign:${campaign.id} | completed | ${campaign.current_buyers} buyers | QAR ${lockedPrice}`,
      });

      // Emit group.payment_trigger (Prizeskout SIGNALS — no payment processing)
      if (campaign.created_by) {
        await enqueueWebhookEvent({
          userId: campaign.created_by,
          eventType: "group.payment_trigger",
          payload: {
            campaign_id:  campaign.id,
            sku:          campaign.sku,
            locked_price: lockedPrice,
            buyer_count:  campaign.current_buyers,
            tier_idx:     tierIdx,
            buyers:       buyerList.map((b) => ({
              buyer_id:  b.buyer_id,
              buyer_name: b.buyer_name,
              phone:     b.phone,
              joined_at: b.joined_at,
            })),
            note: "SIGNAL ONLY — This platform does not process payment. Route this event to your payment system.",
          },
        });
      }

      completed++;
    } else {
      // No tier was unlocked — campaign expired
      await supabaseAdmin.from("group_campaigns").update({
        status: "expired",
        updated_at: nowIso,
      }).eq("id", campaign.id);

      if (campaign.created_by) {
        await enqueueWebhookEvent({
          userId: campaign.created_by,
          eventType: "group.campaign_expired",
          payload: {
            campaign_id:    campaign.id,
            sku:            campaign.sku,
            current_buyers: campaign.current_buyers,
            min_buyers_needed: tiers[0]?.min_buyers ?? 0,
            note:           "Campaign expired without meeting minimum buyer threshold.",
          },
        });
      }

      expired++;
    }
  }

  return { processed: list.length, completed, expired, errors };
}

// ============================================================================
// POST /v1/group/campaigns
// Create a group-buy campaign. Validates EVERY tier against the margin floor.
// Scope: group:write (or write / admin)
// ============================================================================

export async function handleCreateCampaign(
  request: Request,
  ctx: V1Context,
): Promise<V1Result> {
  if (!canGroupWrite(ctx)) return err("forbidden", "scope group:write required", 403);

  const body = await readJson(request);
  if (!body) return err("invalid_request", "request body must be a JSON object", 400);

  const sku             = (body.sku      as string | undefined)?.trim();
  const channel         = ((body.channel as string | undefined)?.trim()) || "Online";
  const base_price_raw  = body.base_price;
  const expiry_at       = (body.expiry_at as string | undefined)?.trim();
  const invite_mechanic = ((body.invite_mechanic as string | undefined)?.trim()) || "link";
  const min_margin_pct_raw = body.min_margin_pct;

  if (!sku)          return err("invalid_request", "sku is required",          400);
  if (!body.tiers)   return err("invalid_request", "tiers is required",        400);
  if (!expiry_at)    return err("invalid_request", "expiry_at is required",    400);

  const base_price = Number(base_price_raw);
  if (!isFinite(base_price) || base_price <= 0)
    return err("invalid_request", "base_price must be a positive number", 400);

  const expiryDate = new Date(expiry_at);
  if (isNaN(expiryDate.getTime()) || expiryDate <= new Date())
    return err("invalid_request", "expiry_at must be a future ISO timestamp", 400);

  if (!["link", "family"].includes(invite_mechanic))
    return err("invalid_request", "invite_mechanic must be 'link' or 'family'", 400);

  const { tiers, error: tierErr } = parseTiers(body.tiers);
  if (tierErr) return err("invalid_request", tierErr, 400);

  const min_margin_pct = typeof min_margin_pct_raw === "number" ? min_margin_pct_raw : 0;

  // ── Resolve catalog product UUID for floor lookup ─────────────────────────

  const { data: catalogProduct } = await supabaseAdmin
    .from("catalog_products")
    .select("id")
    .eq("account_id", ctx.accountId)
    .eq("sku", sku)
    .maybeSingle();

  // ── Validate EVERY tier against margin floor (API 07 formula) ────────────

  const floorPrice = catalogProduct
    ? await computeFloor(ctx.accountId, catalogProduct.id, channel, min_margin_pct)
    : null;

  if (floorPrice !== null) {
    const failedTiers: Array<{ tier_idx: number; min_buyers: number; price: number; floor: number }> = [];
    for (let i = 0; i < tiers.length; i++) {
      if (tiers[i].price < floorPrice) {
        failedTiers.push({ tier_idx: i, min_buyers: tiers[i].min_buyers, price: tiers[i].price, floor: floorPrice });
      }
    }
    if (failedTiers.length > 0) {
      return err(
        "tier_below_floor",
        `${failedTiers.length} tier(s) have prices below the margin floor of QAR ${floorPrice}. Raise these tier prices.`,
        422,
        { floor_price: floorPrice, failed_tiers: failedTiers },
      );
    }
  }

  // ── GCC family config stub ────────────────────────────────────────────────

  let family_config: Record<string, unknown> | null = null;
  if (invite_mechanic === "family") {
    family_config = {
      otp_provider:            null,
      verified_phone_required: true,
      max_family_members:      10,
      stub_note:               "STUB: OTP/SMS verification not implemented. Requires SMS provider (e.g. Twilio, Unifonic, Infobip). Contact your SMS provider for GCC API credentials.",
    };
  }

  // ── Insert campaign ───────────────────────────────────────────────────────

  const { data: campaign, error: camErr } = await (supabaseAdmin.from("group_campaigns") as any)
    .insert({
      account_id:      ctx.accountId,
      licensee_id:     ctx.licenseeId,
      sku,
      channel,
      base_price,
      tiers,
      min_margin_pct,
      expiry_at,
      invite_mechanic,
      family_config,
      created_by:      ctx.userId,
    })
    .select()
    .single();

  if (camErr) return err("internal_error", camErr.message, 500);

  // ── Build WhatsApp invite ─────────────────────────────────────────────────

  const invite = await buildInvite(
    campaign.id, sku, 0, base_price, base_price, expiry_at,
  );

  return ok({
    ...campaign,
    floor_price:      floorPrice,
    invite:           invite,
    note:             family_config
      ? "GCC family flow enabled. OTP/SMS verification is STUBBED — requires SMS provider."
      : undefined,
  }, 201);
}

// ============================================================================
// POST /v1/group/join
// Record a buyer commitment. Idempotent per (buyer_id, campaign_id).
// Advances tier when buyer count crosses a threshold.
// Scope: group:write (or write / admin)
// ============================================================================

export async function handleJoinCampaign(
  request: Request,
  ctx: V1Context,
): Promise<V1Result> {
  if (!canGroupWrite(ctx)) return err("forbidden", "scope group:write required", 403);

  const body = await readJson(request);
  if (!body) return err("invalid_request", "request body must be a JSON object", 400);

  const campaign_id = (body.campaign_id as string | undefined)?.trim();
  const buyer_id    = (body.buyer_id    as string | undefined)?.trim();
  const buyer_name  = (body.buyer_name  as string | undefined)?.trim() || null;
  const phone       = (body.phone       as string | undefined)?.trim() || null;

  if (!campaign_id) return err("invalid_request", "campaign_id is required", 400);
  if (!buyer_id)    return err("invalid_request", "buyer_id is required",    400);

  // ── Load campaign ─────────────────────────────────────────────────────────

  const { data: campaign, error: camErr } = await supabaseAdmin
    .from("group_campaigns")
    .select("id, account_id, sku, base_price, tiers, expiry_at, status, current_buyers, current_tier_idx, created_by")
    .eq("id", campaign_id)
    .eq("account_id", ctx.accountId)
    .maybeSingle();

  if (camErr)   return err("internal_error", camErr.message, 500);
  if (!campaign) return err("not_found", `campaign ${campaign_id} not found`, 404);
  if (campaign.status !== "active")
    return err("campaign_closed", `campaign is ${campaign.status} — no longer accepting buyers`, 409);
  if (new Date(campaign.expiry_at as string) <= new Date())
    return err("campaign_expired", "campaign has expired", 409);

  const tiers = campaign.tiers as Tier[];

  // ── Idempotent insert ─────────────────────────────────────────────────────

  const { data: existing } = await supabaseAdmin
    .from("group_buyers")
    .select("id, joined_at")
    .eq("campaign_id", campaign_id)
    .eq("buyer_id", buyer_id)
    .maybeSingle();

  let joined = false;
  let newBuyerCount = campaign.current_buyers as number;

  if (!existing) {
    // New buyer
    const { error: insertErr } = await supabaseAdmin
      .from("group_buyers")
      .insert({
        campaign_id,
        account_id: ctx.accountId,
        buyer_id,
        buyer_name,
        phone,
        status: "committed",
      });

    if (insertErr) {
      // Race: another request inserted concurrently — treat as idempotent
      if (insertErr.code !== "23505")
        return err("internal_error", insertErr.message, 500);
    } else {
      joined = true;
      newBuyerCount = (campaign.current_buyers as number) + 1;

      // Increment current_buyers on campaign
      await supabaseAdmin
        .from("group_campaigns")
        .update({ current_buyers: newBuyerCount, updated_at: new Date().toISOString() })
        .eq("id", campaign_id);
    }
  }

  // ── Tier advancement check ────────────────────────────────────────────────
  // Find the highest tier whose min_buyers <= newBuyerCount

  let newTierIdx = campaign.current_tier_idx as number;
  const tierUnlockEvents: Array<{ tier_idx: number; min_buyers: number; price: number }> = [];

  for (let i = 0; i < tiers.length; i++) {
    if (newBuyerCount >= tiers[i].min_buyers && i > newTierIdx) {
      tierUnlockEvents.push({ tier_idx: i, min_buyers: tiers[i].min_buyers, price: tiers[i].price });
      newTierIdx = i;
    }
  }

  if (tierUnlockEvents.length > 0) {
    await supabaseAdmin
      .from("group_campaigns")
      .update({ current_tier_idx: newTierIdx, updated_at: new Date().toISOString() })
      .eq("id", campaign_id);

    // Emit group.tier_unlocked for each newly unlocked tier
    for (const ev of tierUnlockEvents) {
      if (campaign.created_by) {
        await enqueueWebhookEvent({
          userId: campaign.created_by as string,
          eventType: "group.tier_unlocked",
          payload: {
            campaign_id,
            sku:            campaign.sku,
            tier_idx:       ev.tier_idx,
            min_buyers:     ev.min_buyers,
            unlocked_price: ev.price,
            current_buyers: newBuyerCount,
            base_price:     Number(campaign.base_price),
          },
        });
      }
    }
  }

  const currentPrice = tierPriceAt(tiers, newTierIdx, Number(campaign.base_price));
  const nextTier = tiers[newTierIdx + 1] ?? null;

  return ok({
    campaign_id,
    buyer_id,
    joined,             // false = already committed (idempotent repeat)
    current_buyers:     newBuyerCount,
    current_tier_idx:   newTierIdx,
    current_price:      currentPrice,
    next_tier:          nextTier
      ? { min_buyers: nextTier.min_buyers, price: nextTier.price, buyers_needed: nextTier.min_buyers - newBuyerCount }
      : null,
    tier_unlocked:      tierUnlockEvents.length > 0 ? tierUnlockEvents[tierUnlockEvents.length - 1] : null,
    webhook_emitted:    tierUnlockEvents.length > 0 ? "group.tier_unlocked" : null,
  });
}

// ============================================================================
// GET /v1/group/campaigns/{id}
// Live status: current buyer count, tier, price, invite links.
// Scope: group:read (or read)
// ============================================================================

export async function handleGetCampaign(
  request: Request,
  ctx: V1Context,
  campaignId: string,
): Promise<V1Result> {
  if (!canGroupRead(ctx)) return err("forbidden", "scope group:read required", 403);

  const { data: campaign, error } = await supabaseAdmin
    .from("group_campaigns")
    .select("*")
    .eq("id", campaignId)
    .eq("account_id", ctx.accountId)
    .maybeSingle();

  if (error)    return err("internal_error", error.message, 500);
  if (!campaign) return err("not_found", `campaign ${campaignId} not found`, 404);

  const tiers     = campaign.tiers as Tier[];
  const tierIdx   = campaign.current_tier_idx as number;
  const currentPrice = tierPriceAt(tiers, tierIdx, Number(campaign.base_price));
  const nextTier  = tiers[tierIdx + 1] ?? null;

  const invite = await buildInvite(
    campaign.id, campaign.sku, campaign.current_buyers, currentPrice,
    Number(campaign.base_price), campaign.expiry_at,
  );

  return ok({
    ...campaign,
    current_price:   currentPrice,
    next_tier:       nextTier
      ? { min_buyers: nextTier.min_buyers, price: nextTier.price, buyers_needed: nextTier.min_buyers - (campaign.current_buyers as number) }
      : null,
    invite,
    polling_note:    "Poll this endpoint for live buyer count. WebSocket/SSE upgrade planned for v2.",
  });
}

// ============================================================================
// GET /v1/group/campaigns/{id}/buyers
// List buyer commitments for a campaign.
// Scope: group:read (or read)
// ============================================================================

export async function handleListBuyers(
  request: Request,
  ctx: V1Context,
  campaignId: string,
): Promise<V1Result> {
  if (!canGroupRead(ctx)) return err("forbidden", "scope group:read required", 403);

  // Verify campaign belongs to this account
  const { data: campaign } = await supabaseAdmin
    .from("group_campaigns")
    .select("id, sku, current_buyers")
    .eq("id", campaignId)
    .eq("account_id", ctx.accountId)
    .maybeSingle();

  if (!campaign) return err("not_found", `campaign ${campaignId} not found`, 404);

  const url    = new URL(request.url);
  const limit  = Math.min(parseInt(url.searchParams.get("limit")  ?? "50", 10), 500);
  const offset = Math.max(parseInt(url.searchParams.get("offset") ?? "0",  10), 0);
  const status = url.searchParams.get("status");

  let q = supabaseAdmin
    .from("group_buyers")
    .select("id, buyer_id, buyer_name, phone, status, locked_price, joined_at")
    .eq("campaign_id", campaignId)
    .order("joined_at", { ascending: true })
    .range(offset, offset + limit - 1);

  if (status) q = q.eq("status", status);

  const { data, error } = await q;
  if (error) return err("internal_error", error.message, 500);

  return ok({
    campaign_id:    campaignId,
    sku:            campaign.sku,
    total_buyers:   campaign.current_buyers,
    data:           data ?? [],
  });
}

// ============================================================================
// POST /v1/group/campaigns/{id}/close
// Manual merchant close. Status transitions:
//   active + tier met   → completed (emits group.payment_trigger)
//   active + no tier    → closed    (no payment trigger)
// Scope: group:write (or write / admin)
// ============================================================================

export async function handleCloseCampaign(
  request: Request,
  ctx: V1Context,
  campaignId: string,
): Promise<V1Result> {
  if (!canGroupWrite(ctx)) return err("forbidden", "scope group:write required", 403);

  const { data: campaign, error: camErr } = await supabaseAdmin
    .from("group_campaigns")
    .select("*")
    .eq("id", campaignId)
    .eq("account_id", ctx.accountId)
    .maybeSingle();

  if (camErr)    return err("internal_error", camErr.message, 500);
  if (!campaign)  return err("not_found", `campaign ${campaignId} not found`, 404);
  if (campaign.status !== "active")
    return err("already_closed", `campaign is already ${campaign.status}`, 409);

  const tiers   = campaign.tiers as Tier[];
  const tierIdx = campaign.current_tier_idx as number;
  const tierMet = tierIdx >= 0 && tierIdx < tiers.length;
  const nowIso  = new Date().toISOString();

  let newStatus: string;
  let lockedPrice: number | null = null;

  if (tierMet) {
    lockedPrice = tiers[tierIdx].price;
    newStatus   = "completed";

    // Update buyers with locked price
    await supabaseAdmin.from("group_buyers")
      .update({ locked_price: lockedPrice })
      .eq("campaign_id", campaignId)
      .eq("status", "committed");

    // Audit
    await (supabaseAdmin.from("pricing_decisions") as any).insert({
      user_id:           ctx.userId,
      product:           campaign.sku,
      category:          null,
      channel:           campaign.channel,
      current_price:     Number(campaign.base_price),
      recommended_price: lockedPrice,
      decision:          "group_buy_closed",
      source:            "group_engine_v1",
      trigger_type:      "manual_close",
      rule_fired:        `tier_${tierIdx}`,
      rule_reason:       `Campaign manually closed: ${campaign.current_buyers} buyers locked at QAR ${lockedPrice}`,
      inputs_snapshot:   { campaign_id: campaignId, sku: campaign.sku, tier_idx: tierIdx, locked_price: lockedPrice },
      alternatives:      [],
      cost_snapshot:     {},
      note:              `group_engine_v1 | campaign:${campaignId} | manual_close | QAR ${lockedPrice}`,
    });

    // Fetch buyers for payload
    const { data: buyers } = await supabaseAdmin
      .from("group_buyers")
      .select("buyer_id, buyer_name, phone, joined_at")
      .eq("campaign_id", campaignId)
      .eq("status", "committed");

    if (campaign.created_by) {
      await enqueueWebhookEvent({
        userId: campaign.created_by as string,
        eventType: "group.payment_trigger",
        payload: {
          campaign_id:  campaignId,
          sku:          campaign.sku,
          locked_price: lockedPrice,
          buyer_count:  campaign.current_buyers,
          tier_idx:     tierIdx,
          close_reason: "manual",
          buyers:       (buyers ?? []).map((b) => ({
            buyer_id: b.buyer_id, buyer_name: b.buyer_name, phone: b.phone, joined_at: b.joined_at,
          })),
          note: "SIGNAL ONLY — This platform does not process payment.",
        },
      });
    }
  } else {
    newStatus = "closed";
  }

  await supabaseAdmin.from("group_campaigns")
    .update({ status: newStatus, locked_price: lockedPrice, updated_at: nowIso })
    .eq("id", campaignId);

  return ok({
    campaign_id:  campaignId,
    status:       newStatus,
    locked_price: lockedPrice,
    tier_idx:     tierIdx,
    buyer_count:  campaign.current_buyers,
    webhook_emitted: tierMet ? "group.payment_trigger" : null,
    note: tierMet
      ? "SIGNAL ONLY: group.payment_trigger emitted to your registered webhook endpoint. This platform does not process payment."
      : "Campaign closed without meeting a tier threshold. No payment trigger emitted.",
  });
}
