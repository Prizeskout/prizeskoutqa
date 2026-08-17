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
  const normalized = technical.toLowerCase();
  const support_reference = reference();
  let result: Omit<MerchantError, "support_reference">;

  if (/timeout|timed out|abort|network|fetch|econn|unreachable/.test(normalized)) {
    result = {
      error: `We could not reach the connected platform while trying to ${context}.`,
      code: "platform_temporarily_unavailable",
      action: "Wait a moment and try again. If it continues, check the connection in Settings.",
      retryable: true,
    };
  } else if (/401|403|unauthor|forbidden|credential|token|authentication/.test(normalized)) {
    result = {
      error: `The connected platform did not accept the saved connection while trying to ${context}.`,
      code: "connection_needs_attention",
      action: "Reconnect the platform in Settings, then try again.",
      retryable: false,
    };
  } else if (/economics|approved channel terms|required commercial terms/.test(normalized)) {
    result = {
      error: "PrizeSkout needs approved channel terms before it can calculate a protected price.",
      code: "approved_channel_terms_required",
      action: "Add or review the merchant agreement, then approve its commission and fees.",
      retryable: false,
    };
  } else if (/cost/.test(normalized)) {
    result = {
      error: "PrizeSkout needs a confirmed product cost before it can calculate a protected price.",
      code: "verified_product_cost_required",
      action: "Confirm the product cost and try again.",
      retryable: false,
    };
  } else if (/duplicate|unique constraint|23505/.test(normalized)) {
    result = {
      error: "This information has already been saved.",
      code: "already_saved",
      action: "Refresh the page to see the latest version.",
      retryable: false,
    };
  } else if (/not found|no rows|pgrst116/.test(normalized)) {
    result = {
      error: `We could not find the item needed to ${context}.`,
      code: "record_not_found",
      action: "Refresh the page and try again. It may have been changed in another session.",
      retryable: true,
    };
  } else {
    result = {
      error: `PrizeSkout could not ${context}. Your existing information and prices were not changed.`,
      code: "action_not_completed",
      action: "Try again. If the problem continues, contact support and share the reference below.",
      retryable: true,
    };
  }

  console.error("[merchant-error]", { support_reference, context, technical });
  return { ...result, support_reference };
}
