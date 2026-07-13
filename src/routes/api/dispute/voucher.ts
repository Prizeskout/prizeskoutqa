// POST /api/dispute/voucher
//
// Generates a bilingual (English + Arabic) dispute claim package for a
// payout discrepancy, verified with a SHA-256 content hash.
//
// Body:
//   merchant_id      — merchant UUID
//   access_code      — ps_access_code (validates the caller)
//   partner          — aggregator name (e.g. "Talabat", "Jahez")
//   order_id         — the disputed order/transaction ID
//   place            — branch or location name
//   contracted_rate  — agreed commission rate as a percentage (e.g. 18)
//   charged_amount   — what the aggregator actually charged (numeric)
//   our_price        — the order value / our total (numeric)
//   currency         — e.g. "QAR", "SAR"
//   notes            — any extra context from the merchant

import { createFileRoute } from "@tanstack/react-router";
import Anthropic from "@anthropic-ai/sdk";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(text),
  );
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 16); // first 16 hex chars for display
}

const SYSTEM_PROMPT = `You are a bilingual legal-commerce dispute agent for a Gulf-region merchant platform.
Generate a formal dispute claim package for a payout discrepancy between a merchant and a delivery aggregator.

Output ONLY a valid JSON object with exactly these fields (no markdown, no extra text):
{
  "title_en": string,   // short English title for the discrepancy, 6-10 words
  "title_ar": string,   // short Arabic title for the discrepancy
  "claim_en": string,   // full English claim draft, formal business tone, 100-200 words
  "claim_ar": string,   // full Arabic claim draft, same content as English, formal tone
  "leak_label": string  // concise overcharge description e.g. "QAR 24.50 overcharge (6.3%)"
}

The claim drafts must include:
- Reference to the contracted commission rate
- The actual amount charged
- The calculated discrepancy/overcharge
- A request for reimbursement with supporting documentation
- Professional but assertive language appropriate for a B2B dispute

The Arabic draft must be a proper translation (not a transliteration) in formal Gulf Arabic.`;

export const Route = createFileRoute("/api/dispute/voucher")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await request.json().catch(() => null) as {
          merchant_id?: string;
          access_code?: string;
          partner?: string;
          order_id?: string;
          place?: string;
          contracted_rate?: number;
          charged_amount?: number;
          our_price?: number;
          currency?: string;
          notes?: string;
        } | null;

        const merchantId      = body?.merchant_id?.trim();
        const accessCode      = body?.access_code?.trim().toUpperCase();
        const partner         = body?.partner?.trim();
        const orderId         = body?.order_id?.trim();
        const place           = body?.place?.trim() ?? "Branch";
        const contractedRate  = Number(body?.contracted_rate ?? 0);
        const chargedAmount   = Number(body?.charged_amount ?? 0);
        const ourPrice        = Number(body?.our_price ?? 0);
        const currency        = body?.currency?.trim() ?? "QAR";
        const notes           = body?.notes?.trim() ?? "";

        if (!merchantId || !accessCode) {
          return json({ error: "merchant_id and access_code are required" }, 400);
        }
        if (!partner || !orderId) {
          return json({ error: "partner and order_id are required" }, 400);
        }
        if (contractedRate <= 0 || chargedAmount <= 0) {
          return json({ error: "contracted_rate and charged_amount must be positive" }, 400);
        }

        // Validate access code
        const { data: codeRow } = await supabaseAdmin
          .from("ps_access_codes" as never)
          .select("merchant_id")
          .eq("code", accessCode)
          .maybeSingle() as { data: { merchant_id: string } | null };

        if (!codeRow || codeRow.merchant_id !== merchantId) {
          return json({ error: "Invalid access code" }, 403);
        }

        const apiKey = process.env.ANTHROPIC_API_KEY;
        if (!apiKey) {
          return json({ error: "AI service not configured" }, 503);
        }

        // Compute expected commission and overcharge
        const expectedCommission = (ourPrice * contractedRate) / 100;
        const overcharge = chargedAmount - expectedCommission;
        const overchargePct = ourPrice > 0 ? ((overcharge / ourPrice) * 100).toFixed(1) : "?";

        const userPrompt = `Partner: ${partner}
Order ID: ${orderId}
Location: ${place}
Currency: ${currency}
Order value: ${ourPrice} ${currency}
Contracted commission rate: ${contractedRate}%
Expected commission: ${expectedCommission.toFixed(2)} ${currency}
Actual amount charged: ${chargedAmount} ${currency}
Overcharge / discrepancy: ${overcharge.toFixed(2)} ${currency} (${overchargePct}% of order value)
${notes ? `Merchant notes: ${notes}` : ""}

Generate the bilingual dispute claim package.`;

        const client = new Anthropic({ apiKey });

        try {
          const message = await client.messages.create({
            model: "claude-haiku-4-5-20251001",
            max_tokens: 1024,
            system: SYSTEM_PROMPT,
            messages: [{ role: "user", content: userPrompt }],
          });

          const raw = message.content
            .filter(b => b.type === "text")
            .map(b => (b as { type: "text"; text: string }).text)
            .join("")
            .trim()
            .replace(/^```(?:json)?\s*/i, "")
            .replace(/\s*```\s*$/i, "")
            .trim();

          let parsed: {
            title_en: string;
            title_ar: string;
            claim_en: string;
            claim_ar: string;
            leak_label: string;
          };

          try {
            parsed = JSON.parse(raw) as typeof parsed;
          } catch {
            const match = raw.match(/\{[\s\S]*\}/);
            if (!match) return json({ error: "Model returned unparseable output" }, 502);
            parsed = JSON.parse(match[0]) as typeof parsed;
          }

          // Generate SHA-256 hash over the claim content (first 16 hex chars for display)
          const hashInput = `${orderId}:${partner}:${chargedAmount}:${contractedRate}:${parsed.claim_en}`;
          const hash = await sha256Hex(hashInput);

          return json({
            partner,
            title:    parsed.title_en,
            title_ar: parsed.title_ar,
            order:    orderId,
            place,
            contract: `${contractedRate}%`,
            charged:  `${currency} ${chargedAmount.toFixed(2)}`,
            leak:     parsed.leak_label ?? `${currency} ${overcharge.toFixed(2)} overcharge`,
            hash,
            en:       parsed.claim_en,
            ar:       parsed.claim_ar,
          });
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          return json({ error: `Voucher generation failed: ${msg}` }, 500);
        }
      },
    },
  },
});
