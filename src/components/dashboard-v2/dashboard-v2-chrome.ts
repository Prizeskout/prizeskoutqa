import type { DashboardV2Summary } from "@/server/core/dashboard-v2-summary";
import type { DashboardV2ChromeData } from "./DashboardV2Shell";

const titleCase = (value: string) =>
  value.replace(/[_-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

function money(value: number | null, currency: string | null): string | null {
  if (value == null || !Number.isFinite(value)) return null;
  return `${currency ? `${currency} ` : ""}${new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(value)}`;
}

export function buildDashboardV2ChromeData(
  summary: DashboardV2Summary | null,
): DashboardV2ChromeData {
  const truths = summary ? [summary.truths.orders, summary.truths.contract, summary.truths.payout] : [];
  const verified = truths.filter((truth) => truth.status === "verified").length;
  const confidence = truths.length ? Math.round((verified / truths.length) * 100) : 0;
  const missing = truths
    .filter((truth) => truth.status !== "verified")
    .map((truth) => `${titleCase(truth.key)} ${truth.status}`)
    .join(" · ");

  return {
    confidenceLabel: summary ? `${confidence}%` : "—",
    confidenceDetail: summary
      ? `${verified} of ${truths.length} financial truth layers are verified for this scope.`
      : "Confidence will appear when your financial records finish loading.",
    confidenceMissing: missing || undefined,
    priorityItems: (summary?.priority_decisions.items ?? []).map((item) => ({
      id: item.finding_id,
      title: item.title,
      detail: item.next_safe_action,
      amount: money(item.amount, item.currency),
      state: item.state,
    })),
  };
}
