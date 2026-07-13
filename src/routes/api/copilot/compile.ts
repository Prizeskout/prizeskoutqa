// POST /api/copilot/compile
//
// Dual-mode CFO Copilot:
//   - Pricing intent  → compiles to deterministic engine config JSON
//   - Questions/chat  → responds conversationally about pricing strategy
//
// Body:  { prompt: string }
// Returns:
//   { type: "rule",    rule: Record<string,unknown>, latency_ms: number }
//   { type: "chat",    message: string,             latency_ms: number }

import { createFileRoute } from "@tanstack/react-router";
import Anthropic from "@anthropic-ai/sdk";

// Used only when the input is a conversational question.
// No JSON schema — model outputs plain text, we return it as-is.
const CHAT_SYSTEM = `You are the CFO Copilot, a friendly expert pricing strategist built into PrizeSkout — a margin management platform for food and e-commerce merchants in the Gulf region (Qatar, Saudi Arabia, UAE).

Answer the merchant's question in plain, conversational prose. Be practical and specific to Gulf-region food/e-commerce contexts.

FORMATTING RULES — strictly follow these:
- No markdown. No asterisks, no hashes, no bold, no headers, no bullet dashes.
- Write in flowing sentences and short paragraphs only.
- Use a blank line to separate paragraphs if needed.
- No lists. If you need to enumerate things, write them inline: "I can help with X, Y, and Z."

Keep your answer under 100 words. Respond in the same language the merchant used.`;

// Used when the input looks like a pricing rule intent.
// Model must output pure JSON — no markdown, no prose.
const RULE_SYSTEM = `You are a pricing rule compiler for PrizeSkout, a margin management platform for Gulf-region merchants.

Convert the merchant's pricing intent into a JSON engine config. Output ONLY valid JSON — no markdown, no explanation, no extra text.

Schema:
{
  "engine_rule": "active_margin_defense" | "competitor_price_match" | "conditional_floor_raise" | "moci_ceiling_clamp" | "price_parity_lock",
  "target_category": string,
  "target_sku_class": string,
  "minimum_floor": number,
  "maximum_ceiling": number,
  "competitor": string,
  "match_direction": "up" | "down" | "both",
  "trigger": string,
  "revert_after_hours": number,
  "region": string,
  "regional_override_allowed": boolean,
  "latency_budget_ms": 1850
}

Rules:
- minimum_floor and maximum_ceiling are decimal fractions (0.25 = 25%)
- latency_budget_ms is always 1850
- competitor matching/beating → "competitor_price_match"
- weather/event/time triggered → "conditional_floor_raise"
- government price cap → "moci_ceiling_clamp"
- cross-channel parity → "price_parity_lock"
- default → "active_margin_defense"`;

// Detect conversational questions vs pricing rule intents.
// Strategy: look for HARD RULE SIGNALS; anything without them is conversational.
function isQuestion(text: string): boolean {
  // A specific percentage → pricing rule
  if (/\d+(\.\d+)?%/.test(text)) return false;

  // A named platform → pricing rule
  if (/\b(talabat|jahez|noon|salla|zid|foodics|amazon)\b/i.test(text)) return false;

  // A pricing action verb paired with a pricing noun → pricing rule
  const ACTION  = /\b(lock|match|beat|raise|lower|drop|cap|clamp|enforce|parity|set|apply|trigger|push)\b/i;
  const NOUN    = /\b(price|prices|margin|margins|floor|ceiling|cost|rate|markup)\b/i;
  if (ACTION.test(text) && NOUN.test(text)) return false;

  // Everything else is conversational
  return true;
}

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
        const chatMode = isQuestion(prompt);

        try {
          const message = await client.messages.create({
            model: "claude-haiku-4-5-20251001",
            max_tokens: chatMode ? 512 : 768,
            system: chatMode ? CHAT_SYSTEM : RULE_SYSTEM,
            messages: [{ role: "user", content: prompt }],
          });

          const raw = message.content
            .filter(b => b.type === "text")
            .map(b => (b as { type: "text"; text: string }).text)
            .join("")
            .trim();

          const latency_ms = Date.now() - t0;

          // Chat mode: raw text IS the message — no JSON parsing needed.
          // Also include a `rule` shim so older cached UI builds don't show
          // an error when data.rule is undefined.
          if (chatMode) {
            return json({
              type: "chat",
              message: raw,
              rule: { _type: "chat", response: raw },
              latency_ms,
            });
          }

          // Rule mode: parse JSON output
          const cleaned = raw
            .replace(/^```(?:json)?\s*/i, "")
            .replace(/\s*```\s*$/i, "")
            .trim();

          let rule: Record<string, unknown>;
          try {
            rule = JSON.parse(cleaned) as Record<string, unknown>;
          } catch {
            const match = cleaned.match(/\{[\s\S]*\}/);
            if (!match) {
              return json({ error: "Model returned unparseable output" }, 502);
            }
            rule = JSON.parse(match[0]) as Record<string, unknown>;
          }

          // Normalise percentages if model returns e.g. 25 instead of 0.25
          if (typeof rule.minimum_floor === "number" && rule.minimum_floor > 1) {
            rule.minimum_floor = rule.minimum_floor / 100;
          }
          if (typeof rule.maximum_ceiling === "number" && rule.maximum_ceiling > 1) {
            rule.maximum_ceiling = rule.maximum_ceiling / 100;
          }
          rule.latency_budget_ms = 1850;

          return json({ type: "rule", rule, latency_ms });
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          return json({ error: `Request failed: ${msg}` }, 500);
        }
      },
    },
  },
});
