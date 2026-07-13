// POST /api/copilot/compile
//
// Parses a natural-language pricing rule into a deterministic engine config
// JSON using Claude. No auth required — the input is merchant-supplied text
// with no private data read from the DB.
//
// Body:  { prompt: string }
// Returns: { rule: Record<string, unknown>, latency_ms: number }

import { createFileRoute } from "@tanstack/react-router";
import Anthropic from "@anthropic-ai/sdk";

const SYSTEM_PROMPT = `You are a pricing rule compiler for a food and e-commerce margin management platform.
Convert the merchant's natural-language pricing intent into a structured JSON engine config.

Output ONLY a single valid JSON object — no markdown fences, no explanation, no extra text.

Schema (all fields optional except engine_rule and minimum_floor):
{
  "engine_rule": string,           // snake_case rule type: active_margin_defense | competitor_price_match | conditional_floor_raise | moci_ceiling_clamp | price_parity_lock
  "target_category": string,       // e.g. "bakery", "hot_drinks", "dairy", "all_categories"
  "target_sku_class": string,      // e.g. "sourdough", "espresso", "all"
  "minimum_floor": number,         // decimal fraction, e.g. 0.25 for 25%
  "maximum_ceiling": number,       // decimal fraction, optional
  "competitor": string,            // "talabat" | "jahez" | "noon" | "amazon" | other
  "match_direction": string,       // "up" | "down" | "both"
  "trigger": string,               // e.g. "weather.rain_storm" | "time.peak_hours" | "stock.low_inventory"
  "revert_after_hours": number,    // how long the override lasts
  "region": string,                // "Doha" | "Riyadh" | "Dubai" | "all"
  "regional_override_allowed": boolean,
  "latency_budget_ms": number      // always 1850
}

Rules for engine_rule selection:
- If the intent involves matching or beating a specific competitor → "competitor_price_match"
- If the intent involves a weather/event/time-based temporary change → "conditional_floor_raise"
- If the intent involves an absolute MOCI/government price cap → "moci_ceiling_clamp"
- If the intent involves keeping prices equal across channels → "price_parity_lock"
- Otherwise → "active_margin_defense"

Always include latency_budget_ms: 1850.`;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const Route = createFileRoute("/api/copilot/compile")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await request.json().catch(() => null) as { prompt?: string } | null;
        const prompt = body?.prompt?.trim();

        if (!prompt) {
          return json({ error: "prompt is required" }, 400);
        }
        if (prompt.length > 2000) {
          return json({ error: "Prompt too long (max 2000 characters)" }, 400);
        }

        const apiKey = process.env.ANTHROPIC_API_KEY;
        if (!apiKey) {
          return json({ error: "AI service not configured" }, 503);
        }

        const client = new Anthropic({ apiKey });
        const t0 = Date.now();

        try {
          const message = await client.messages.create({
            model: "claude-haiku-4-5-20251001",
            max_tokens: 512,
            system: SYSTEM_PROMPT,
            messages: [
              { role: "user", content: prompt },
            ],
          });

          const raw = message.content
            .filter(b => b.type === "text")
            .map(b => (b as { type: "text"; text: string }).text)
            .join("")
            .trim();

          // Parse JSON — strip markdown fences if model added them
          const jsonStr = raw
            .replace(/^```(?:json)?\s*/i, "")
            .replace(/\s*```\s*$/i, "")
            .trim();

          let rule: Record<string, unknown>;
          try {
            rule = JSON.parse(jsonStr) as Record<string, unknown>;
          } catch {
            // Fallback: extract the first JSON object from the response
            const match = jsonStr.match(/\{[\s\S]*\}/);
            if (!match) {
              return json({ error: "Model returned unparseable output", raw }, 502);
            }
            rule = JSON.parse(match[0]) as Record<string, unknown>;
          }

          // Ensure minimum_floor is a decimal (handle both 0.25 and 25 inputs)
          if (typeof rule.minimum_floor === "number" && rule.minimum_floor > 1) {
            rule.minimum_floor = rule.minimum_floor / 100;
          }
          if (typeof rule.maximum_ceiling === "number" && rule.maximum_ceiling > 1) {
            rule.maximum_ceiling = rule.maximum_ceiling / 100;
          }

          // Always enforce latency_budget_ms
          rule.latency_budget_ms = 1850;

          return json({ rule, latency_ms: Date.now() - t0 });
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          return json({ error: `Compilation failed: ${msg}` }, 500);
        }
      },
    },
  },
});
