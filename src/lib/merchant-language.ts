import { looksTechnical } from "./error-classify";

const STATUS: Record<string, string> = {
  idle: "Ready",
  received: "Ready to review",
  detected: "Found by PrizeSkout",
  investigating: "Being checked",
  prepared: "Ready for review",
  waiting_approval: "Waiting for your approval",
  approved: "Approved, not sent yet",
  executing: "Updating your store",
  verifying: "Checking the result",
  completed: "Completed and checked",
  needs_attention: "Needs your attention",
  cancelled: "Cancelled",
  pending: "Waiting for the other channel",
  confirmed: "Confirmed in the store",
  failed: "The change did not go through",
  repriced: "Price confirmed in the store",
  evidence_required: "More information needed",
  draft: "Draft — nothing sent",
  ready: "Ready to send",
  submitted_manually: "Sent to the partner",
  platform_review: "Partner is reviewing it",
  accepted: "Accepted by the partner",
  rejected: "Rejected by the partner",
  recovered: "Money recovered",
  closed: "Closed",
};
export function merchantStatus(value: unknown) {
  const key = String(value ?? "").toLowerCase();
  return STATUS[key] ?? key.replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase());
}
export function confidenceLabel(value: unknown) {
  const key = String(value ?? "").toLowerCase();
  return key === "high" || key === "verified" || key === "strong"
    ? "Confirmed from available records"
    : key === "medium" || key === "estimated"
      ? "Best available estimate"
      : "Information still needed";
}
export function merchantDetail(value: unknown) {
  const detail = String(value ?? "").trim();
  if (/approval_expired|approval expired/i.test(detail))
    return "This task's approval expired before it could run. Review the task and approve a fresh request if you still want it completed.";
  if (/authorize_store_manager_task/i.test(detail) && /waiting[_ ]approval/i.test(detail))
    return "This Store Manager task was waiting for merchant approval before it could run.";
  if (/dead letter/i.test(detail) || looksTechnical(detail))
    return "PrizeSkout could not complete this workflow. Review the item or retry it; no store data was changed.";
  return detail;
}
export function workflowStepLabel(step: { execution?: unknown; approval_required?: unknown }) {
  return step.execution === "manual_fallback"
    ? "Someone needs to complete this"
    : step.approval_required
      ? "Needs your approval"
      : "PrizeSkout can check this";
}
