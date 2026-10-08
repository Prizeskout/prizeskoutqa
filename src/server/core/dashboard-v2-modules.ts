export type DashboardV2OrderModule = {
  state: "available" | "empty" | "unavailable";
  source_status: string | null;
  observed_through: string | null;
  received: number;
  live: number;
  attention: number;
  critical: number;
  automation_rate_pct: number | null;
  demo?: Record<string, unknown>;
  orders: Array<{ id: string; external_order_id: string; branch: string | null; channel: string | null; status: string; risk_level: string; currency: string; order_total: number | null; placed_at: string }>;
  branches: Array<{ branch: string; received: number; live: number; attention: number; critical: number }>;
  blockers: string[];
};

export type DashboardV2PromotionModule = {
  state: "available" | "empty" | "unavailable";
  observed_through: string | null;
  scenarios: Array<{ id: string; name: string; platform: string; status: string; inputs: Record<string, unknown>; results: Record<string, unknown>; created_at: string; evidence_ready: boolean }>;
  counts: { total: number; active: number; pending_approval: number; completed: number };
  blockers: string[];
  demo?: Record<string, unknown>;
};

const terminal = new Set(["ready", "completed", "cancelled", "unable_to_fulfil"]);
const object = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};

export function summarizeOrderModule(input: { available: boolean; source?: Record<string, unknown> | null; rows?: Array<Record<string, unknown>> | null }): DashboardV2OrderModule {
  if (!input.available) return { state: "unavailable", source_status: null, observed_through: null, received: 0, live: 0, attention: 0, critical: 0, automation_rate_pct: null, orders: [], branches: [], blockers: ["Order Guard schema is unavailable or not authorized."] };
  if (!input.source) return { state: "empty", source_status: null, observed_through: null, received: 0, live: 0, attention: 0, critical: 0, automation_rate_pct: null, orders: [], branches: [], blockers: ["No merchant-scoped Order Guard source is provisioned."] };
  const orders = (input.rows ?? []).map((row) => ({ id: String(row.id), external_order_id: String(row.external_order_id), branch: row.external_branch_id ? String(row.external_branch_id) : null, channel: row.channel ? String(row.channel) : null, status: String(row.status), risk_level: String(row.risk_level), currency: String(row.currency || ""), order_total: row.order_total == null ? null : Number(row.order_total), placed_at: String(row.placed_at) }));
  const branchMap = new Map<string, { branch: string; received: number; live: number; attention: number; critical: number }>();
  for (const row of orders) { const key = row.branch ?? "Unassigned"; const current = branchMap.get(key) ?? { branch: key, received: 0, live: 0, attention: 0, critical: 0 }; current.received += 1; if (!terminal.has(row.status)) current.live += 1; if (["attention", "manager", "critical"].includes(row.risk_level)) current.attention += 1; if (row.risk_level === "critical") current.critical += 1; branchMap.set(key, current); }
  return { state: orders.length ? "available" : "empty", source_status: String(input.source.status ?? "unknown"), observed_through: input.source.last_event_at ? String(input.source.last_event_at) : null, received: orders.length, live: orders.filter((row) => !terminal.has(row.status)).length, attention: orders.filter((row) => ["attention", "manager", "critical"].includes(row.risk_level)).length, critical: orders.filter((row) => row.risk_level === "critical").length, automation_rate_pct: null, orders, branches: [...branchMap.values()], blockers: ["Automation rate is not derived because retained orders do not prove whether acceptance was automated or manual."] };
}

export function summarizePromotionModule(input: { available: boolean; rows?: Array<Record<string, unknown>> | null }): DashboardV2PromotionModule {
  if (!input.available) return { state: "unavailable", observed_through: null, scenarios: [], counts: { total: 0, active: 0, pending_approval: 0, completed: 0 }, blockers: ["Promotion scenario schema is unavailable or not authorized."] };
  const scenarios = (input.rows ?? []).map((row) => { const inputs = object(row.inputs), results = object(row.results); return { id: String(row.id), name: String(row.name || "Untitled scenario"), platform: String(row.platform || "unassigned"), status: String(row.status || "draft"), inputs, results, created_at: String(row.created_at), evidence_ready: results.approval_ready === true }; });
  return { state: scenarios.length ? "available" : "empty", observed_through: scenarios[0]?.created_at ?? null, scenarios, counts: { total: scenarios.length, active: scenarios.filter((row) => ["ready_to_launch", "running"].includes(row.status)).length, pending_approval: scenarios.filter((row) => row.status === "pending_approval").length, completed: scenarios.filter((row) => row.status === "completed").length }, blockers: scenarios.length ? [] : ["No merchant-scoped promotion scenarios are retained."] };
}
