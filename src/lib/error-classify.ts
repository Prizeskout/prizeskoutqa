// Shared, dependency-free error classifier used by BOTH the server
// (src/server/merchant-errors.ts) and the client error-toast helper. Keeping
// it here — not under src/server — means the browser bundle can humanize any
// message at the point of display without importing server code.

export type ErrorClassification = {
  error: string;
  code: string;
  action: string;
  retryable: boolean;
};

/**
 * Maps an internal/provider failure message to safe, useful merchant language.
 * Pure: no logging, no reference generation, no side effects.
 */
export function classifyError(technical: string, context = "complete that action"): ErrorClassification {
  const normalized = (technical ?? "").toLowerCase();

  if (/timeout|timed out|abort|network|fetch|econn|enotfound|unreachable/.test(normalized)) {
    return {
      error: `We could not reach the connected platform while trying to ${context}.`,
      code: "platform_temporarily_unavailable",
      action: "Wait a moment and try again. If it continues, check the connection in Settings.",
      retryable: true,
    };
  }
  if (/401|403|unauthor|forbidden|credential|token|authentication/.test(normalized)) {
    return {
      error: `The connected platform did not accept the saved connection while trying to ${context}.`,
      code: "connection_needs_attention",
      action: "Reconnect the platform in Settings, then try again.",
      retryable: false,
    };
  }
  if (/economics|approved channel terms|required commercial terms/.test(normalized)) {
    return {
      error: "PrizeSkout needs approved channel terms before it can calculate a protected price.",
      code: "approved_channel_terms_required",
      action: "Add or review the merchant agreement, then approve its commission and fees.",
      retryable: false,
    };
  }
  if (/cost/.test(normalized)) {
    return {
      error: "PrizeSkout needs a confirmed product cost before it can calculate a protected price.",
      code: "verified_product_cost_required",
      action: "Confirm the product cost and try again.",
      retryable: false,
    };
  }
  if (/duplicate|unique constraint|23505/.test(normalized)) {
    return {
      error: "This information has already been saved.",
      code: "already_saved",
      action: "Refresh the page to see the latest version.",
      retryable: false,
    };
  }
  if (/cannot move from|already (?:complete|completed|cancelled)|invalid task (?:state|transition)/.test(normalized)) {
    return {
      error: "This task has already moved on and cannot perform that action from its current state.",
      code: "task_state_conflict",
      action: "Refresh the task list to see its latest status.",
      retryable: false,
    };
  }
  if (/not found|no rows|pgrst116/.test(normalized)) {
    return {
      error: `We could not find the item needed to ${context}.`,
      code: "record_not_found",
      action: "Refresh the page and try again. It may have been changed in another session.",
      retryable: true,
    };
  }
  return {
    error: `PrizeSkout could not ${context}. Your existing information and prices were not changed.`,
    code: "action_not_completed",
    action: "Try again. If the problem continues, contact support and share the reference below.",
    retryable: true,
  };
}

/**
 * Heuristic: does this message look like raw technical/developer text that must
 * never be shown to a merchant? Hand-written user-facing messages (e.g.
 * "You can't remove the last owner.") return false and are safe to show as-is.
 */
export function looksTechnical(message: string): boolean {
  const m = (message ?? "").trim();
  if (!m) return false;
  if (m.length > 180) return true;
  return /(pgrst\d|violates|constraint|duplicate key|syntax error|econn|enotfound|fetch failed|failed to fetch|is not a function|is not defined|cannot read propert|undefined is not|null is not|typeerror|referenceerror|\bat [a-z0-9_.$]+ ?\(|\n\s+at |supabase|postgres|relation "|column "|invalid input syntax|unexpected token|json\.parse|stack trace|\{[\s\S]*".+":)/i.test(
    m,
  );
}
