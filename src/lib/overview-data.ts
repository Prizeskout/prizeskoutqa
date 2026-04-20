// Shared types + helpers used by the Overview tab on the client.
// The actual data fetch lives in src/routes/dashboard.index.tsx loader,
// which queries Supabase directly (RLS scopes results to the signed-in user).

export type OverviewMetric = {
  id: string;
  slug: string;
  label: string;
  value: string;
  value_color: string | null;
  footer_text: string | null;
  footer_color: string | null;
  position: number;
};

export type OverviewAlert = {
  id: string;
  alert_type: "price" | "stock" | "promo" | "pattern" | "insight";
  channel: "online" | "in-store";
  message: string;
  severity: "action" | "opportunity" | "intel";
  occurred_at: string;
};

export type OverviewChannel = {
  id: string;
  label: string;
  amount: string;
  share_text: string;
  percent: number;
  color: string;
  position: number;
};

export type OverviewQuickAction = {
  id: string;
  icon: string;
  title: string;
  description: string;
  link_text: string;
  link_href: string | null;
  position: number;
};

export type OverviewData = {
  metrics: OverviewMetric[];
  alerts: OverviewAlert[];
  channels: OverviewChannel[];
  quickActions: OverviewQuickAction[];
};

export function formatRelativeTime(iso: string, now: number = Date.now()) {
  const ts = new Date(iso).getTime();
  const seconds = Math.max(0, Math.floor((now - ts) / 1000));
  if (seconds < 60) return `${Math.max(seconds, 1)} sec ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}
