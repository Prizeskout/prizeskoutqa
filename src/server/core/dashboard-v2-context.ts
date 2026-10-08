export type DashboardV2Context = {
  state: "available" | "partial" | "unavailable";
  merchant_label: string;
  brand_label: string;
  location_label: string;
  channel_label: string;
  currency: string | null;
  brands: Array<{ id: string; name: string }>;
  branches: Array<{ id: string; name: string }>;
  channels: string[];
  blockers: string[];
  functional_role: "finance" | "operations" | "management" | "accounting" | null;
  role_label: string;
  role_description: string;
};

const clean = (value: unknown): string | null => typeof value === "string" && value.trim() ? value.trim() : null;
const countryNames: Record<string, string> = { QA: "Qatar", SA: "Saudi Arabia", AE: "UAE", KW: "Kuwait", BH: "Bahrain", OM: "Oman", EG: "Egypt", JO: "Jordan" };

export function summarizeDashboardV2Context(input: {
  workspace?: Record<string, unknown> | null;
  settings?: Record<string, unknown> | null;
  entities?: Array<Record<string, unknown>> | null;
  channels?: Array<Record<string, unknown>> | null;
  errors?: string[];
  functionalRole?: unknown;
}): DashboardV2Context {
  const workspace = input.workspace ?? {};
  const settings = input.settings ?? {};
  const entities = input.entities ?? [];
  const brands = entities.filter((row) => row.entity_type === "brand" && row.active !== false).map((row) => ({ id: String(row.id), name: clean(row.name) ?? "Unnamed brand" }));
  const branches = entities.filter((row) => row.entity_type === "branch" && row.active !== false).map((row) => ({ id: String(row.id), name: clean(row.name) ?? "Unnamed branch" }));
  const channels = [...new Set((input.channels ?? []).filter((row) => row.status === "connected").map((row) => clean(row.platform)).filter((value): value is string => Boolean(value)))];
  const countryCode = clean(workspace.country_code)?.toUpperCase() ?? null;
  const country = countryCode ? countryNames[countryCode] ?? countryCode : clean(settings.country);
  const merchant = clean(workspace.name) ?? clean(settings.company_name);
  const blockers = [...(input.errors ?? [])];
  if (!merchant) blockers.push("Merchant display name is not retained.");
  const functionalRole = ["finance", "operations", "management", "accounting"].includes(String(input.functionalRole))
    ? input.functionalRole as DashboardV2Context["functional_role"]
    : null;
  const roleCopy = {
    finance: ["Finance officer", "Profit, settlements, reporting, and audit evidence"],
    accounting: ["Accounting officer", "Reconciliation, settlements, reporting, and audit evidence"],
    operations: ["Operations manager", "Orders, channels, automation, and store operations"],
    management: ["General manager", "Executive performance, priorities, and governed decisions"],
  } as const;
  const [roleLabel, roleDescription] = functionalRole ? roleCopy[functionalRole] : ["Merchant operator", "Merchant-wide operating context"];

  return {
    state: merchant ? (blockers.length ? "partial" : "available") : "unavailable",
    merchant_label: merchant ?? "Merchant account",
    brand_label: brands.length === 1 ? brands[0].name : brands.length > 1 ? `All ${brands.length} brands` : "Brand scope unavailable",
    location_label: `${country ? `${country} · ` : ""}${branches.length ? `${branches.length} ${branches.length === 1 ? "branch" : "branches"}` : "branch scope unavailable"}`,
    channel_label: channels.length ? `${channels.length} connected ${channels.length === 1 ? "channel" : "channels"}` : "No connected channels",
    currency: clean(workspace.currency)?.toUpperCase() ?? clean(settings.currency)?.toUpperCase() ?? null,
    brands,
    branches,
    channels,
    blockers,
    functional_role: functionalRole,
    role_label: roleLabel,
    role_description: roleDescription,
  };
}
