import type { CfoConfidence, CfoInsight } from "@/lib/cfo-insight";

export const CFO_SYSTEM = `You are PrizeSkout CFO Copilot, an evidence-backed financial analyst for Gulf-region food and ecommerce merchants.

Your job is to answer the merchant's financial question from the supplied VERIFIED PRIZESKOUT FINANCIAL EVIDENCE. You explain; PrizeSkout's deterministic evidence systems calculate.

Return ONLY valid JSON with this exact shape:
{
  "conclusion": "direct answer in the merchant's language",
  "impact": { "label": "short impact label", "amount": number|null, "currency": string|null },
  "drivers": [{ "label": "driver", "amount": number|null, "direction": "positive"|"negative"|"neutral"|"unknown", "evidence_refs": ["exact source labels"] }],
  "confidence": "high"|"medium"|"low"|"insufficient",
  "evidence_used": [{ "label": "human-readable evidence", "source": "exact source/table family", "period": string|null, "freshness": string|null }],
  "limitations": ["specific missing evidence or coverage limitation"],
  "actions": [{ "label": "short button label", "prompt": "safe financial follow-up question", "kind": "ask"|"review"|"upload" }]
}

Rules:
- Respond in the same language as the merchant.
- Never invent a cause, amount, trend, date, rate, order, product, or channel.
- Never imply a driver is likely or apparent unless retained evidence supports it.
- If a cause cannot be established, say that directly and set confidence to "insufficient" or "low".
- Use only arithmetic already present in the evidence snapshot. Do not perform hidden estimates.
- Keep conclusion under 80 words, drivers to at most 5, evidence_used to at most 5, limitations to at most 4, and actions to at most 3.
- Actions must remain financial questions, evidence reviews, or evidence uploads. Never propose a store write from the CFO role.
- If the merchant asks to change the store, explain that the AI Store Manager handles protected store operations and suggest a review action instead.
- Use null rather than guessing an amount, currency, period, or freshness value.`;

const text = (value: unknown, fallback = "") =>
  typeof value === "string" ? value.trim().slice(0, 1200) : fallback;
const amount = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? value : null;
const confidence = (value: unknown): CfoConfidence =>
  value === "high" || value === "medium" || value === "low" || value === "insufficient"
    ? value
    : "low";

export function parseCfoInsight(raw: string): CfoInsight {
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();
  let parsed: Record<string, unknown> = {};
  try {
    parsed = JSON.parse(cleaned) as Record<string, unknown>;
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        parsed = JSON.parse(match[0]) as Record<string, unknown>;
      } catch {
        parsed = {};
      }
    }
  }

  const impact =
    parsed.impact && typeof parsed.impact === "object"
      ? (parsed.impact as Record<string, unknown>)
      : {};
  const drivers = Array.isArray(parsed.drivers) ? parsed.drivers : [];
  const evidence = Array.isArray(parsed.evidence_used) ? parsed.evidence_used : [];
  const limitations = Array.isArray(parsed.limitations) ? parsed.limitations : [];
  const actions = Array.isArray(parsed.actions) ? parsed.actions : [];
  const fallbackConclusion =
    cleaned && !cleaned.startsWith("{")
      ? cleaned.slice(0, 1200)
      : "I could not produce a reliable evidence-backed conclusion from the available financial data.";

  return {
    conclusion: text(parsed.conclusion, fallbackConclusion),
    impact: {
      label: text(impact.label, "Financial impact"),
      amount: amount(impact.amount),
      currency: text(impact.currency) || null,
    },
    drivers: drivers.slice(0, 5).map((item) => {
      const row = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
      const direction = ["positive", "negative", "neutral", "unknown"].includes(
        String(row.direction),
      )
        ? (row.direction as "positive" | "negative" | "neutral" | "unknown")
        : "unknown";
      return {
        label: text(row.label, "Unspecified driver"),
        amount: amount(row.amount),
        direction,
        evidence_refs: Array.isArray(row.evidence_refs)
          ? row.evidence_refs
              .map((value) => text(value))
              .filter(Boolean)
              .slice(0, 5)
          : [],
      };
    }),
    confidence: confidence(parsed.confidence),
    evidence_used: evidence.slice(0, 5).map((item) => {
      const row = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
      return {
        label: text(row.label, "Retained financial evidence"),
        source: text(row.source, "PrizeSkout evidence"),
        period: text(row.period) || null,
        freshness: text(row.freshness) || null,
      };
    }),
    limitations: limitations
      .map((value) => text(value))
      .filter(Boolean)
      .slice(0, 4),
    actions: actions.slice(0, 3).map((item) => {
      const row = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
      const kind = row.kind === "review" || row.kind === "upload" ? row.kind : "ask";
      return {
        label: text(row.label, "Ask a follow-up"),
        prompt: text(row.prompt, "What should I review next?"),
        kind,
      };
    }),
  };
}
