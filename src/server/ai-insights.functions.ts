import Anthropic from "@anthropic-ai/sdk";
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const PAGES = ["overview", "pricing", "competitors", "market"] as const;
type Page = (typeof PAGES)[number];

const WINDOWS = ["24h", "7d", "30d"] as const;
export type InsightWindow = (typeof WINDOWS)[number];

const WINDOW_LABEL: Record<InsightWindow, string> = {
  "24h": "last 24 hours",
  "7d": "last 7 days",
  "30d": "last 30 days",
};

const WINDOW_HOURS: Record<InsightWindow, number> = {
  "24h": 24,
  "7d": 24 * 7,
  "30d": 24 * 30,
};

const MODEL = "claude-opus-4-8";

export type Citation = {
  label: string;
  kind:
    | "recommendation"
    | "rule"
    | "metric"
    | "competitor_price"
    | "behavior_pattern"
    | "alert"
    | "channel"
    | "category"
    | "assortment_gap"
    | "cross_border"
    | "trending";
  ref?: string;
};

export type InsightBullet = {
  text: string;
  cites: number[];
};

export type InsightAction = {
  title: string;
  detail: string;
  cites: number[];
};

export type AIInsight = {
  id: string;
  page: Page;
  window: InsightWindow;
  headline: string;
  bullets: InsightBullet[];
  actions: InsightAction[];
  citations: Citation[];
  model: string | null;
  generated_at: string;
  updated_at: string;
};

function isPage(value: unknown): value is Page {
  return typeof value === "string" && (PAGES as readonly string[]).includes(value);
}

function isWindow(value: unknown): value is InsightWindow {
  return typeof value === "string" && (WINDOWS as readonly string[]).includes(value);
}

function normalizeBullets(raw: unknown): InsightBullet[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((b): InsightBullet | null => {
      if (typeof b === "string") return { text: b, cites: [] };
      if (b && typeof b === "object") {
        const text = typeof (b as any).text === "string" ? (b as any).text : "";
        if (!text) return null;
        const citesRaw = (b as any).cites;
        const cites = Array.isArray(citesRaw)
          ? citesRaw.filter((n): n is number => Number.isInteger(n) && n > 0)
          : [];
        return { text, cites };
      }
      return null;
    })
    .filter((b): b is InsightBullet => b !== null);
}

function normalizeActions(raw: unknown): InsightAction[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((a): InsightAction | null => {
      if (!a || typeof a !== "object") return null;
      const title = typeof (a as any).title === "string" ? (a as any).title : "";
      const detail = typeof (a as any).detail === "string" ? (a as any).detail : "";
      if (!title || !detail) return null;
      const citesRaw = (a as any).cites;
      const cites = Array.isArray(citesRaw)
        ? citesRaw.filter((n): n is number => Number.isInteger(n) && n > 0)
        : [];
      return { title, detail, cites };
    })
    .filter((a): a is InsightAction => a !== null);
}

function normalizeCitations(raw: unknown): Citation[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((c): Citation | null => {
      if (!c || typeof c !== "object") return null;
      const label = typeof (c as any).label === "string" ? (c as any).label : "";
      const kind = (c as any).kind;
      if (!label || typeof kind !== "string") return null;
      const ref = typeof (c as any).ref === "string" ? (c as any).ref : undefined;
      return { label, kind: kind as Citation["kind"], ref };
    })
    .filter((c): c is Citation => c !== null);
}

function rowToInsight(row: any): AIInsight {
  const w = isWindow(row.time_window) ? row.time_window : "24h";
  return {
    id: row.id,
    page: row.page,
    window: w,
    headline: row.headline ?? "",
    bullets: normalizeBullets(row.bullets),
    actions: normalizeActions(row.actions),
    citations: normalizeCitations(row.citations),
    model: row.model ?? null,
    generated_at: row.generated_at,
    updated_at: row.updated_at,
  };
}

/** Read cached insight for a page+window (returns null if none exists yet). */
export const getInsight = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { page: string; window?: string }) => {
    if (!isPage(input.page)) throw new Error("Invalid page");
    const w: InsightWindow = isWindow(input.window) ? input.window : "24h";
    return { page: input.page, window: w };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await (supabase as any)
      .from("ai_insights")
      .select("*")
      .eq("user_id", userId)
      .eq("page", data.page)
      .eq("time_window", data.window)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { insight: row ? rowToInsight(row) : null };
  });

async function gatherContext(
  supabase: any,
  userId: string,
  page: Page,
  window: InsightWindow,
): Promise<string> {
  const limit = 50;
  const sinceIso = new Date(
    Date.now() - WINDOW_HOURS[window] * 60 * 60 * 1000,
  ).toISOString();

  if (page === "overview") {
    const [m, a, c] = await Promise.all([
      supabase.from("overview_metrics").select("label,value,footer_text").eq("user_id", userId),
      supabase
        .from("overview_alerts")
        .select("alert_type,channel,severity,message,occurred_at")
        .eq("user_id", userId)
        .gte("occurred_at", sinceIso)
        .order("occurred_at", { ascending: false })
        .limit(limit),
      supabase.from("overview_channels").select("label,amount,share_text,percent").eq("user_id", userId),
    ]);
    return JSON.stringify({
      window: WINDOW_LABEL[window],
      metrics: m.data ?? [],
      recent_alerts: a.data ?? [],
      channel_mix: c.data ?? [],
    });
  }
  if (page === "pricing") {
    const [m, r, rules] = await Promise.all([
      supabase.from("pricing_metrics").select("label,value,footer_text").eq("user_id", userId),
      supabase
        .from("pricing_recommendations")
        .select(
          "product,category,channel,current_price,recommended_price,reason,unit_impact,margin_impact,net_monthly,confidence,updated_at",
        )
        .eq("user_id", userId)
        .order("position", { ascending: true })
        .limit(limit),
      supabase.from("pricing_rules").select("rule_text,enabled").eq("user_id", userId),
    ]);
    return JSON.stringify({
      window: WINDOW_LABEL[window],
      metrics: m.data ?? [],
      recommendations: r.data ?? [],
      rules: rules.data ?? [],
    });
  }
  if (page === "competitors") {
    const [m, p, patterns, scrapes] = await Promise.all([
      supabase.from("competitor_metrics").select("label,value,footer_text").eq("user_id", userId),
      supabase
        .from("competitor_prices")
        .select("product,category,channel,your_price,signal,talabat,carrefour,lulu,amazon,noon")
        .eq("user_id", userId)
        .order("position", { ascending: true })
        .limit(limit),
      supabase
        .from("behavior_patterns")
        .select("competitor,channel,category,pattern,confidence,impact,recommendation")
        .eq("user_id", userId)
        .order("position", { ascending: true })
        .limit(20),
      supabase
        .from("competitor_scrapes")
        .select("product,competitor,price,currency,scraped_at,status")
        .eq("user_id", userId)
        .eq("status", "success")
        .gte("scraped_at", sinceIso)
        .order("scraped_at", { ascending: false })
        .limit(50),
    ]);
    return JSON.stringify({
      window: WINDOW_LABEL[window],
      metrics: m.data ?? [],
      price_grid: p.data ?? [],
      patterns: patterns.data ?? [],
      recent_competitor_scrapes: scrapes.data ?? [],
    });
  }
  // market
  const [m, cats, gaps, cb, trend] = await Promise.all([
    supabase.from("market_metrics").select("label,value,footer_text").eq("user_id", userId),
    supabase
      .from("category_performance")
      .select("category,growth,avg_discount,volatility,top_mover,market_position,direction")
      .eq("user_id", userId)
      .order("position", { ascending: true })
      .limit(limit),
    supabase
      .from("assortment_gaps")
      .select("product,competitors,price,searches,missed,demand")
      .eq("user_id", userId)
      .order("position", { ascending: true })
      .limit(limit),
    supabase
      .from("cross_border_radar")
      .select("product,your_price,intl_price,platform,delivery,gap,risk")
      .eq("user_id", userId)
      .order("position", { ascending: true })
      .limit(limit),
    supabase
      .from("trending_products")
      .select("name,category,growth,status")
      .eq("user_id", userId)
      .order("position", { ascending: true })
      .limit(20),
  ]);
  return JSON.stringify({
    window: WINDOW_LABEL[window],
    metrics: m.data ?? [],
    categories: cats.data ?? [],
    assortment_gaps: gaps.data ?? [],
    cross_border: cb.data ?? [],
    trending: trend.data ?? [],
  });
}

const ALLOWED_KINDS = [
  "recommendation",
  "rule",
  "metric",
  "competitor_price",
  "behavior_pattern",
  "alert",
  "channel",
  "category",
  "assortment_gap",
  "cross_border",
  "trending",
] as const;

const SYSTEM_PROMPT = `You are a senior retail pricing & e-commerce analyst for PrizeSkout, a competitive intelligence platform for grocery & retail brands in Qatar.

You will receive a JSON snapshot of one dashboard page, scoped to a specific time window (e.g. last 24 hours, 7 days, 30 days). Generate concise, decision-ready insights for the brand operator viewing this page, framed against that window.

SPARSE OR EMPTY DATA — strict rules:
- If the snapshot contains empty arrays or only zero-value metrics, state what is observed ("no competitor prices, alerts, or channel data arrived in the last Xh") and list 2-3 neutral possible reasons WITHOUT asserting any one cause as fact. Example neutral reasons: no competitor URLs have been added yet, no price changes occurred in this window, the account was recently set up.
- NEVER diagnose a specific technical failure (e.g. "pipeline broken", "crawlers failed", "ingestion stopped", "restart any crawlers") solely from an absence of data. Absence of data cannot distinguish between "nothing happened" and "something is broken." If you cannot tell which it is, say so explicitly.
- Do NOT invent products, competitor names, prices, or error records that are not in the snapshot.
- When data is absent, cite the observable facts (empty array, zero count) as your citations rather than fabricating specific failure records.

Rules (when data is present):
- Reference the time window naturally in the headline or first bullet (for example, "In the last 24 hours...").
- Be specific. Reference actual products, competitors, categories, and numbers from the data.
- Use Qatari Riyal (QAR) when referring to money.
- Tone: confident, direct, plain English. No fluff. No hedging words like "consider" or "leverage". No corporate jargon. Write like a sharp human analyst, not a chatbot.
- Punctuation: never use em dashes or en dashes. Use commas, full stops, or split into two sentences instead.
- 3 to 5 bullets, each one short (max ~22 words).
- 2 to 4 actions. Each action has a short title (max 6 words) and a detail (one sentence).
- Headline: one bold-friendly sentence (max 16 words) summarising the most important read.

CITATIONS - required:
- Build a "citations" array listing the specific records you used (products, rules, competitor rows, patterns, categories, etc.). For empty snapshots, cite the observable absence (e.g. label: "Overview metrics", kind: "metric", ref: "0 records returned").
- Each citation has { label, kind, ref }. Use the exact product name, competitor name, rule text or category from the snapshot in "label". Put numeric evidence (price, gap %, confidence, etc.) in "ref".
- "kind" MUST be one of: ${ALLOWED_KINDS.join(", ")}.
- Every bullet and every action MUST include a "cites" array of 1-indexed positions into "citations" identifying the records that back it. Use 1-3 cites per item.
- Do not invent products, competitors or numbers that are not in the snapshot.

Return ONLY a tool call to "emit_insights".`;

const TOOL_SCHEMA: Anthropic.Tool = {
  name: "emit_insights",
  description: "Emit dashboard insights for the operator with citations.",
  input_schema: {
    type: "object",
    properties: {
      headline: { type: "string", maxLength: 200 },
      citations: {
        type: "array",
        minItems: 2,
        maxItems: 12,
        items: {
          type: "object",
          properties: {
            label: { type: "string", maxLength: 120 },
            kind: { type: "string", enum: [...ALLOWED_KINDS] },
            ref: { type: "string", maxLength: 160 },
          },
          required: ["label", "kind"],
          additionalProperties: false,
        },
      },
      bullets: {
        type: "array",
        minItems: 3,
        maxItems: 5,
        items: {
          type: "object",
          properties: {
            text: { type: "string", maxLength: 220 },
            cites: {
              type: "array",
              minItems: 1,
              maxItems: 3,
              items: { type: "integer", minimum: 1 },
            },
          },
          required: ["text", "cites"],
          additionalProperties: false,
        },
      },
      actions: {
        type: "array",
        minItems: 2,
        maxItems: 4,
        items: {
          type: "object",
          properties: {
            title: { type: "string", maxLength: 60 },
            detail: { type: "string", maxLength: 240 },
            cites: {
              type: "array",
              minItems: 1,
              maxItems: 3,
              items: { type: "integer", minimum: 1 },
            },
          },
          required: ["title", "detail", "cites"],
          additionalProperties: false,
        },
      },
    },
    required: ["headline", "bullets", "actions", "citations"],
    additionalProperties: false,
  },
};

type RawInsightPayload = {
  headline: string;
  bullets: unknown;
  actions: unknown;
  citations: unknown;
};

async function callAnthropicAI(
  page: Page,
  window: InsightWindow,
  contextJson: string,
): Promise<RawInsightPayload> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not configured");

  const client = new Anthropic({ apiKey });
  const userPrompt = `Page: ${page}\nTime window: ${WINDOW_LABEL[window]}\n\nData snapshot:\n${contextJson}\n\nProduce insights now.`;

  let response: Anthropic.Message;
  try {
    response = await client.messages.create({
      model: MODEL,
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
      tools: [TOOL_SCHEMA],
      tool_choice: { type: "tool", name: "emit_insights" },
    });
  } catch (err: unknown) {
    if (err instanceof Anthropic.APIError) {
      if (err.status === 429) throw new Error("AI rate limit reached. Please wait a moment and try again.");
      if (err.status === 402 || err.status === 529) throw new Error("AI credits exhausted. Add credits in Settings → Workspace → Usage.");
      const body = (err as any).error;
      const isLowBalance =
        err.status === 400 &&
        typeof body?.message === "string" &&
        body.message.includes("credit balance");
      if (isLowBalance || err.status === 402 || err.status === 529) {
        throw new Error("AI credits exhausted. Add credits at console.anthropic.com/settings/billing.");
      }
      console.error("Anthropic API error", err.status, err.message);
      throw new Error(`AI gateway error (${err.status}): ${err.message}`);
    }
    throw err;
  }

  const toolUse = response.content.find((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
  if (!toolUse) throw new Error("AI returned no insights");
  return toolUse.input as RawInsightPayload;
}

/** Generate fresh insights for a page+window and cache them. */
export const generateInsight = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { page: string; window?: string }) => {
    if (!isPage(input.page)) throw new Error("Invalid page");
    const w: InsightWindow = isWindow(input.window) ? input.window : "24h";
    return { page: input.page, window: w };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const contextJson = await gatherContext(supabase, userId, data.page, data.window);
    const result = await callAnthropicAI(data.page, data.window, contextJson);

    const citations = normalizeCitations(result.citations);
    const maxIdx = citations.length;

    const clampCites = (cites: number[]) =>
      cites.filter((n) => n >= 1 && n <= maxIdx);

    const bullets = normalizeBullets(result.bullets).map((b) => ({
      ...b,
      cites: clampCites(b.cites),
    }));
    const actions = normalizeActions(result.actions).map((a) => ({
      ...a,
      cites: clampCites(a.cites),
    }));

    const payload: any = {
      user_id: userId,
      page: data.page,
      time_window: data.window,
      headline: result.headline,
      bullets,
      actions,
      citations,
      model: MODEL,
      generated_at: new Date().toISOString(),
    };

    const { data: row, error } = await (supabase as any)
      .from("ai_insights")
      .upsert(payload, { onConflict: "user_id,page,time_window" })
      .select("*")
      .single();
    if (error) throw new Error(error.message);

    return { insight: rowToInsight(row) };
  });
