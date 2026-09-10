import { classifyError } from "@/lib/error-classify";

export type MerchantError = {
  error: string;
  code: string;
  action: string;
  support_reference: string;
  retryable: boolean;
};

function reference(): string {
  return `PS-${crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase()}`;
}

/** Converts internal/provider failures into safe, useful merchant language. */
export function toMerchantError(error: unknown, context = "complete that action"): MerchantError {
  const technical = error instanceof Error ? error.message : String(error ?? "");
  const support_reference = reference();
  const result = classifyError(technical, context);

  // Technical detail is kept server-side only, paired with the reference shown
  // to the merchant so support can correlate a report to this log line.
  console.error("[merchant-error]", { support_reference, context, technical });
  return { ...result, support_reference };
}
