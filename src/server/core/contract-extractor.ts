import Anthropic from "@anthropic-ai/sdk";

const MODEL = "claude-haiku-4-5-20251001";
const MAX_DOCUMENT_CHARS = 80_000;

export type ContractClauseEvidence = {
  field: string;
  value: string;
  source_quote: string;
  page: number | null;
  confidence: number;
};

export type ContractExtraction = {
  contract_name: string | null;
  platform: string | null;
  commission_rate_pct: number | null;
  vat_on_fees_pct: number | null;
  payment_fee_pct: number | null;
  fixed_order_fee: number | null;
  delivery_contribution: number | null;
  commission_base: "gross_before_discount"|"net_after_discount"|"eligible_sales"|"unknown";
  promotion_funding_platform_pct: number | null;
  refund_liability: "merchant"|"platform"|"shared"|"conditional"|"unknown";
  cancellation_liability: "merchant"|"platform"|"shared"|"conditional"|"unknown";
  settlement_frequency: string | null;
  settlement_days: number | null;
  dispute_deadline_days: number | null;
  advertising_commitment: number | null;
  minimum_spend: number | null;
  coverage_legal_entity: string | null;
  coverage_brands: string[];
  coverage_branches: string[];
  effective_from: string | null;
  effective_to: string | null;
  currency: string | null;
  confidence: number;
  clauses: ContractClauseEvidence[];
  missing_terms: string[];
  warnings: string[];
};

export type ExtractContractResult =
  | { ok: true; extraction: ContractExtraction; model: string }
  | { ok: false; error: string };

export type ContractDocumentImage = {
  page: number;
  media_type: "image/jpeg" | "image/png";
  data: string;
};

const SYSTEM = `You extract commercial terms from marketplace and delivery-platform agreements for an independent payout-audit system.

Rules:
- Extract only terms explicitly supported by the supplied document.
- Never infer a standard market rate. A common rate such as 19% is not evidence.
- Return null for every value that is absent, ambiguous, illegible, conditional without a single applicable value, or unsupported.
- Percentages must be ordinary percentage numbers: 19 means 19%, not 0.19.
- Distinguish commission from VAT on fees, payment fees, fixed per-order fees, and merchant delivery contributions.
- Capture the commission calculation base, promotion funding split, refund and cancellation responsibility, settlement cadence, dispute deadline, advertising/minimum-spend commitments, and covered legal entities, brands, and branches.
- For settlement_days, record the explicit number of calendar days only. Keep descriptive cadence such as "weekly on Thursday" in settlement_frequency.
- A source quote must be short and copied from the supplied text. Never invent a quote.
- Page numbers may only come from [PAGE n] markers. Otherwise use null.
- Surface tiered rates, category exceptions, minimum fees, promotional terms, exclusivity, retroactive changes, and unclear effective dates as warnings.
- This extraction is a draft. It is never an approval or legal conclusion.
Return only a tool call to record_contract_terms.`;

const TOOL: Anthropic.Tool = {
  name: "record_contract_terms",
  description: "Record evidence-backed commercial terms extracted from a contract.",
  input_schema: {
    type: "object",
    properties: {
      contract_name: { type: ["string", "null"] },
      platform: { type: ["string", "null"] },
      commission_rate_pct: { type: ["number", "null"] },
      vat_on_fees_pct: { type: ["number", "null"] },
      payment_fee_pct: { type: ["number", "null"] },
      fixed_order_fee: { type: ["number", "null"] },
      delivery_contribution: { type: ["number", "null"] },
      commission_base: { type: "string", enum: ["gross_before_discount", "net_after_discount", "eligible_sales", "unknown"] },
      promotion_funding_platform_pct: { type: ["number", "null"] },
      refund_liability: { type: "string", enum: ["merchant", "platform", "shared", "conditional", "unknown"] },
      cancellation_liability: { type: "string", enum: ["merchant", "platform", "shared", "conditional", "unknown"] },
      settlement_frequency: { type: ["string", "null"] },
      settlement_days: { type: ["integer", "null"] },
      dispute_deadline_days: { type: ["integer", "null"] },
      advertising_commitment: { type: ["number", "null"] },
      minimum_spend: { type: ["number", "null"] },
      coverage_legal_entity: { type: ["string", "null"] },
      coverage_brands: { type: "array", items: { type: "string" }, maxItems: 100 },
      coverage_branches: { type: "array", items: { type: "string" }, maxItems: 250 },
      effective_from: { type: ["string", "null"], description: "YYYY-MM-DD when explicit" },
      effective_to: { type: ["string", "null"], description: "YYYY-MM-DD when explicit" },
      currency: { type: ["string", "null"] },
      confidence: { type: "number", minimum: 0, maximum: 1 },
      clauses: {
        type: "array",
        maxItems: 20,
        items: {
          type: "object",
          properties: {
            field: { type: "string" },
            value: { type: "string" },
            source_quote: { type: "string", maxLength: 400 },
            page: { type: ["integer", "null"] },
            confidence: { type: "number", minimum: 0, maximum: 1 },
          },
          required: ["field", "value", "source_quote", "page", "confidence"],
          additionalProperties: false,
        },
      },
      missing_terms: { type: "array", items: { type: "string" }, maxItems: 12 },
      warnings: { type: "array", items: { type: "string" }, maxItems: 12 },
    },
    required: [
      "contract_name", "platform", "commission_rate_pct", "vat_on_fees_pct",
      "payment_fee_pct", "fixed_order_fee", "delivery_contribution",
      "commission_base", "promotion_funding_platform_pct", "refund_liability",
      "cancellation_liability", "settlement_frequency", "settlement_days",
      "dispute_deadline_days", "advertising_commitment", "minimum_spend",
      "coverage_legal_entity", "coverage_brands", "coverage_branches",
      "effective_from", "effective_to", "currency", "confidence", "clauses",
      "missing_terms", "warnings",
    ],
    additionalProperties: false,
  },
};

const finiteOrNull = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? value : null;
const textOrNull = (value: unknown, max = 200) =>
  typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null;
const dateOrNull = (value: unknown) => {
  const text = textOrNull(value, 10);
  return text && /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null;
};

export async function extractContractTerms(
  documentText: string,
  documentImages: ContractDocumentImage[] = [],
): Promise<ExtractContractResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { ok: false, error: "AI contract extraction is not configured." };
  const clean = documentText.replace(/\0/g, "").trim().slice(0, MAX_DOCUMENT_CHARS);
  const images = documentImages.slice(0, 15).filter(image =>
    Number.isInteger(image.page)
    && ["image/jpeg", "image/png"].includes(image.media_type)
    && /^[A-Za-z0-9+/=]+$/.test(image.data)
    && image.data.length <= 2_800_000,
  );
  if (clean.length < 100 && images.length === 0) {
    return { ok: false, error: "The agreement contains too little readable text to analyse." };
  }
  if (images.reduce((sum, image) => sum + image.data.length, 0) > 18_000_000) {
    return { ok: false, error: "Scanned agreement images exceed the safe analysis limit." };
  }

  try {
    const client = new Anthropic({ apiKey });
    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 2_500,
      system: SYSTEM,
      messages: [{
        role: "user",
        content: [
          {
            type: "text",
            text: clean.length >= 100
              ? `Extract the commercial terms from this agreement text:\n\n${clean}`
              : "This is a scanned agreement. Extract only terms visibly supported by the supplied page images.",
          },
          ...images.flatMap(image => ([
            { type: "text" as const, text: `[PAGE ${image.page}]` },
            {
              type: "image" as const,
              source: {
                type: "base64" as const,
                media_type: image.media_type,
                data: image.data,
              },
            },
          ])),
        ],
      }],
      tools: [TOOL],
      tool_choice: { type: "tool", name: "record_contract_terms" },
    });
    const block = message.content.find((item): item is Anthropic.ToolUseBlock => item.type === "tool_use");
    if (!block) return { ok: false, error: "The extraction service returned no structured terms." };
    const raw = block.input as Record<string, unknown>;
    const clauses = Array.isArray(raw.clauses) ? raw.clauses.slice(0, 20).flatMap(item => {
      if (!item || typeof item !== "object") return [];
      const clause = item as Record<string, unknown>;
      const field = textOrNull(clause.field, 80);
      const value = textOrNull(clause.value, 160);
      const source_quote = textOrNull(clause.source_quote, 400);
      // Text contracts get an exact anti-hallucination quote check. For image
      // contracts the quote originates from vision OCR, so it remains
      // review-required and is anchored by the supplied page number instead.
      if (!field || !value || !source_quote || (clean.length >= 100 && !clean.includes(source_quote))) return [];
      const page = Number.isInteger(clause.page) ? clause.page as number : null;
      if (clean.length < 100 && (!page || !images.some(image => image.page === page))) return [];
      return [{
        field, value, source_quote,
        page,
        confidence: Math.max(0, Math.min(1, finiteOrNull(clause.confidence) ?? 0)),
      }];
    }) : [];
    const extraction: ContractExtraction = {
      contract_name: textOrNull(raw.contract_name),
      platform: textOrNull(raw.platform, 80)?.toLowerCase() ?? null,
      commission_rate_pct: finiteOrNull(raw.commission_rate_pct),
      vat_on_fees_pct: finiteOrNull(raw.vat_on_fees_pct),
      payment_fee_pct: finiteOrNull(raw.payment_fee_pct),
      fixed_order_fee: finiteOrNull(raw.fixed_order_fee),
      delivery_contribution: finiteOrNull(raw.delivery_contribution),
      commission_base: ["gross_before_discount","net_after_discount","eligible_sales"].includes(String(raw.commission_base))
        ? raw.commission_base as ContractExtraction["commission_base"] : "unknown",
      promotion_funding_platform_pct: finiteOrNull(raw.promotion_funding_platform_pct),
      refund_liability: ["merchant","platform","shared","conditional"].includes(String(raw.refund_liability))
        ? raw.refund_liability as ContractExtraction["refund_liability"] : "unknown",
      cancellation_liability: ["merchant","platform","shared","conditional"].includes(String(raw.cancellation_liability))
        ? raw.cancellation_liability as ContractExtraction["cancellation_liability"] : "unknown",
      settlement_frequency: textOrNull(raw.settlement_frequency, 100),
      settlement_days: finiteOrNull(raw.settlement_days),
      dispute_deadline_days: finiteOrNull(raw.dispute_deadline_days),
      advertising_commitment: finiteOrNull(raw.advertising_commitment),
      minimum_spend: finiteOrNull(raw.minimum_spend),
      coverage_legal_entity: textOrNull(raw.coverage_legal_entity, 180),
      coverage_brands: Array.isArray(raw.coverage_brands) ? raw.coverage_brands.filter(v=>typeof v==="string").slice(0,100) as string[] : [],
      coverage_branches: Array.isArray(raw.coverage_branches) ? raw.coverage_branches.filter(v=>typeof v==="string").slice(0,250) as string[] : [],
      effective_from: dateOrNull(raw.effective_from),
      effective_to: dateOrNull(raw.effective_to),
      currency: textOrNull(raw.currency, 12)?.toUpperCase() ?? null,
      confidence: Math.max(0, Math.min(1, finiteOrNull(raw.confidence) ?? 0)),
      clauses,
      missing_terms: Array.isArray(raw.missing_terms) ? raw.missing_terms.filter(v => typeof v === "string").slice(0, 12) as string[] : [],
      warnings: Array.isArray(raw.warnings) ? raw.warnings.filter(v => typeof v === "string").slice(0, 12) as string[] : [],
    };
    return { ok: true, extraction, model: MODEL };
  } catch (error) {
    console.error("[contract-extractor] extraction failed", error);
    if (error instanceof Anthropic.APIError && error.status === 429) {
      return { ok: false, error: "AI extraction is busy. Try again in a moment." };
    }
    return { ok: false, error: "The agreement could not be analysed." };
  }
}
