import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const PAGES = ["overview", "pricing", "competitors", "market"] as const;
type Page = (typeof PAGES)[number];

const MODEL = "google/gemini-3-flash-preview";

export type AIInsight = {
  id: string;
  page: Page;
  headline: string;
  bullets: string[];
  actions: { title: string; detail: string }[];
  model: string | null;
  generated_at: string;
  updated_at: string;
};

function isPage(value: unknown): value is Page {
  return typeof value === "string" && (PAGES as readonly string[]).includes(value);
}

function rowToInsight(row: any): AIInsight {
  return {
    id: row.id,
    page: row.page,
    headline: row.headline ?? "",
    bullets: Array.isArray(row.bullets) ? row.bullets : [],
    actions: Array.isArray(row.actions) ? row.actions : [],
    model: row.model ?? null,
    generated_at: row.generated_at,
    updated_at: row.updated_at,
  };
}

/** Read cached insight for a page (returns null if none exists yet). */
export const getInsight = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { page: string }) => {
    if (!isPage(input.page)) throw new Error("Invalid page");
    return { page: input.page };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("ai_insights")
      .select("*")
      .eq("user_id", userId)
      .eq("page", data.page)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { insight: row ? rowToInsight(row) : null };
  });

async function gatherContext(
  supabase: any,
  userId: string,
  page: Page,
): Promise<string> {
  // Pull a compact snapshot of each page's data for the AI.
  const limit = 50;
  if (page === "overview") {
    const [m, a, c] = await Promise.all([
      supabase.from("overview_metrics").select("label,value,footer_text").eq("user_id", userId),
      supabase
        .from("overview_alerts")
        .select("alert_type,channel,severity,message,occurred_at")
        .eq("user_id", userId)
        .order("occurred_at", { ascending: false })
        .limit(limit),
      supabase.from("overview_channels").select("label,amount,share_text,percent").eq("user_id", userId),
    ]);
    return JSON.stringify({
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
          "product,category,channel,current_price,recommended_price,reason,unit_impact,margin_impact,net_monthly,confidence",
        )
        .eq("user_id", userId)
        .order("position", { ascending: true })
        .limit(limit),
      supabase.from("pricing_rules").select("rule_text,enabled").eq("user_id", userId),
    ]);
    return JSON.stringify({
      metrics: m.data ?? [],
      recommendations: r.data ?? [],
      rules: rules.data ?? [],
    });
  }
  if (page === "competitors") {
    const [m, p, patterns] = await Promise.all([
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
    ]);
    return JSON.stringify({
      metrics: m.data ?? [],
      price_grid: p.data ?? [],
      patterns: patterns.data ?? [],
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
    metrics: m.data ?? [],
    categories: cats.data ?? [],
    assortment_gaps: gaps.data ?? [],
    cross_border: cb.data ?? [],
    trending: trend.data ?? [],
  });
}

const SYSTEM_PROMPT = `You are a senior retail pricing & e-commerce analyst for PrizeSkout, a competitive intelligence platform for grocery & retail brands in Qatar.

You will receive a JSON snapshot of one dashboard page. Generate concise, decision-ready insights for the brand operator viewing this page.

Rules:
- Be specific. Reference actual products, competitors, categories, and numbers from the data.
- Use Qatari Riyal (QAR) when referring to money.
- Tone: confident, executive, no fluff, no hedging language like "consider".
- 3-5 bullets, each one short (max ~22 words).
- 2-4 actions. Each action has a short title (max 6 words) and a detail (one sentence).
- Headline: one bold-friendly sentence (max 14 words) summarizing the most important read.

Return ONLY a tool call to "emit_insights".`;

const TOOL_SCHEMA = {
  type: "function" as const,
  function: {
    name: "emit_insights",
    description: "Emit dashboard insights for the operator.",
    parameters: {
      type: "object",
      properties: {
        headline: { type: "string", maxLength: 200 },
        bullets: {
          type: "array",
          minItems: 3,
          maxItems: 5,
          items: { type: "string", maxLength: 200 },
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
            },
            required: ["title", "detail"],
            additionalProperties: false,
          },
        },
      },
      required: ["headline", "bullets", "actions"],
      additionalProperties: false,
    },
  },
};

async function callLovableAI(page: Page, contextJson: string) {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("LOVABLE_API_KEY is not configured");

  const userPrompt = `Page: ${page}\n\nData snapshot:\n${contextJson}\n\nProduce insights now.`;

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      tools: [TOOL_SCHEMA],
      tool_choice: { type: "function", function: { name: "emit_insights" } },
    }),
  });

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error("AI rate limit reached. Please wait a moment and try again.");
    }
    if (response.status === 402) {
      throw new Error("AI credits exhausted. Add credits in Settings → Workspace → Usage.");
    }
    const text = await response.text();
    console.error("Lovable AI error", response.status, text);
    throw new Error(`AI gateway error (${response.status})`);
  }

  const json = await response.json();
  const toolCall = json?.choices?.[0]?.message?.tool_calls?.[0];
  const argsRaw = toolCall?.function?.arguments;
  if (!argsRaw) throw new Error("AI returned no insights");
  let parsed: { headline: string; bullets: string[]; actions: { title: string; detail: string }[] };
  try {
    parsed = typeof argsRaw === "string" ? JSON.parse(argsRaw) : argsRaw;
  } catch {
    throw new Error("AI returned malformed insights");
  }
  return parsed;
}

/** Generate fresh insights for a page and cache them. */
export const generateInsight = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { page: string }) => {
    if (!isPage(input.page)) throw new Error("Invalid page");
    return { page: input.page };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const contextJson = await gatherContext(supabase, userId, data.page);
    const result = await callLovableAI(data.page, contextJson);

    const payload = {
      user_id: userId,
      page: data.page,
      headline: result.headline,
      bullets: result.bullets,
      actions: result.actions,
      model: MODEL,
      generated_at: new Date().toISOString(),
    };

    const { data: row, error } = await supabase
      .from("ai_insights")
      .upsert(payload, { onConflict: "user_id,page" })
      .select("*")
      .single();
    if (error) throw new Error(error.message);

    return { insight: rowToInsight(row) };
  });
