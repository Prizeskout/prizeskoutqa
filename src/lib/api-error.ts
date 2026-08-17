export type ApiErrorPayload = {
  error?: string;
  action?: string;
  support_reference?: string;
};

/** Builds one readable UI message from the standard PrizeSkout API error. */
export function apiErrorMessage(payload: ApiErrorPayload | null | undefined, fallback: string): string {
  const message = payload?.error?.trim() || fallback;
  const action = payload?.action?.trim();
  const reference = payload?.support_reference?.trim();
  return [message, action, reference ? `Support reference: ${reference}.` : ""].filter(Boolean).join(" ");
}

export async function readApiJson<T extends ApiErrorPayload>(response: Response, fallback: string): Promise<T> {
  let data: T | null = null;
  try { data = await response.json() as T; } catch { /* handled below */ }
  if (!response.ok || !data) throw new Error(apiErrorMessage(data, fallback));
  return data;
}

export function humanizeAuthError(error: { message?: string } | null | undefined, action: "sign_in" | "sign_up"): string {
  const value = error?.message?.toLowerCase() ?? "";
  if (/invalid login|invalid credentials/.test(value)) return "The email address or password is incorrect.";
  if (/already registered|already exists|user already/.test(value)) return "An account already exists for this email. Sign in instead, or reset your password.";
  if (/email.*invalid|invalid.*email/.test(value)) return "Enter a valid email address.";
  if (/password/.test(value)) return "That password does not meet the security requirements. Use a longer password with letters, numbers, and symbols.";
  if (/rate|too many|security purposes/.test(value)) return "There have been too many attempts. Wait a few minutes, then try again.";
  if (/network|fetch|timeout/.test(value)) return "PrizeSkout could not reach the sign-in service. Check your connection and try again.";
  return action === "sign_in"
    ? "PrizeSkout could not sign you in. Try again, or reset your password if the problem continues."
    : "PrizeSkout could not create the account. Review your details and try again.";
}

export function safeClientErrorMessage(error: unknown, fallback: string): string {
  const value = error instanceof Error
    ? error.message.toLowerCase()
    : typeof error === "object" && error && "message" in error
      ? String((error as { message?: unknown }).message ?? "").toLowerCase()
      : String(error ?? "").toLowerCase();
  if (/duplicate|unique|23505/.test(value)) return "That information has already been saved. Refresh the page to see the latest version.";
  if (/permission|row-level|rls|401|403|unauthor|forbidden/.test(value)) return "Your session does not have permission to make this change. Sign in again and retry.";
  if (/network|fetch|timeout|timed out/.test(value)) return "PrizeSkout could not reach the service. Check your connection and try again.";
  return fallback;
}
