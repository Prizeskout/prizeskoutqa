export type ReportIdentity = {
  reportId: string;
  generatedAt: string;
  timezone: string;
  merchantId: string;
};

export function getReportIdentity(prefix = "PS"): ReportIdentity {
  const now = new Date();
  const merchantId = typeof window === "undefined" ? "Not available" : (localStorage.getItem("ps_merchant_id") || "Not available");
  const merchantSuffix = merchantId === "Not available" ? "UNASSIGNED" : merchantId.replace(/[^a-z0-9]/gi, "").slice(-8).toUpperCase();
  const stamp = now.toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
  return {
    reportId: `${prefix}-${merchantSuffix}-${stamp}`,
    generatedAt: now.toLocaleString("en-US", { dateStyle: "long", timeStyle: "short" }),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    merchantId,
  };
}
