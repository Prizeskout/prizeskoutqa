import { toast } from "sonner";
import { apiErrorMessage, friendlyClientMessage, type ApiErrorPayload } from "./api-error";

/**
 * Show an error toast for a caught error. Never leaks technical text: a
 * specific human-readable message is shown when safe, otherwise the caller's
 * (localized) fallback. Use this instead of `toast.error(err.message)`.
 */
export function showError(error: unknown, fallback: string): void {
  toast.error(friendlyClientMessage(error, fallback));
}

/**
 * Show an error toast from a parsed API response body that follows the
 * standard { error, action, support_reference } shape (e.g. from
 * toMerchantError). Falls back to the caller's message when absent.
 */
export function showApiError(payload: ApiErrorPayload | null | undefined, fallback: string): void {
  toast.error(apiErrorMessage(payload, fallback));
}
