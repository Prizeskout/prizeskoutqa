import { type CSSProperties, type ReactNode } from "react";

export type MerchantFieldProps = {
  label: string;
  help: string;
  children: ReactNode;
  source?: "store" | "contract" | "estimate" | "merchant";
  whereToFind?: string;
  consequence?: string;
  required?: boolean;
  style?: CSSProperties;
};

const SOURCE_LABELS = {
  store: "From your store",
  contract: "Check your agreement",
  estimate: "Your estimate",
  merchant: "Entered by you",
};

export function MerchantField({
  label,
  help,
  children,
  source,
  whereToFind,
  consequence,
  required,
  style,
}: MerchantFieldProps) {
  return (
    <label style={{ display: "flex", minWidth: 0, flexDirection: "column", ...style }}>
      <span
        style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 800 }}
      >
        {label}
        {required && (
          <span style={{ color: "#DC2626" }} aria-label="required">
            *
          </span>
        )}
        {source && (
          <span
            style={{
              marginInlineStart: "auto",
              border: "1px solid var(--border)",
              borderRadius: 999,
              padding: "2px 6px",
              color: "var(--muted)",
              fontSize: 8.5,
              fontWeight: 750,
              whiteSpace: "nowrap",
            }}
          >
            {SOURCE_LABELS[source]}
          </span>
        )}
      </span>
      {children}
      <span
        style={{
          marginTop: 5,
          color: "var(--muted)",
          fontSize: 10.5,
          fontWeight: 500,
          lineHeight: 1.4,
        }}
      >
        {help}
        {whereToFind && (
          <>
            {" "}
            <strong>Find it in:</strong> {whereToFind}.
          </>
        )}
      </span>
      {consequence && (
        <span
          style={{
            marginTop: 3,
            color: "#A16207",
            fontSize: 10,
            fontWeight: 650,
            lineHeight: 1.35,
          }}
        >
          {consequence}
        </span>
      )}
    </label>
  );
}

export function inferredMerchantHelp(label: string) {
  const key = label.toLowerCase();
  if (key.includes("product url") || key === "url" || key.includes("endpoint url"))
    return "Paste the complete link, beginning with https://, so PrizeSkout checks the correct page.";
  if (key.includes("company name") || key.includes("brand name"))
    return "The name merchants and your team use to identify this business.";
  if (key.includes("company description") || key === "description")
    return "A short explanation that helps your team understand what this is for.";
  if (key.includes("currency"))
    return "The currency PrizeSkout should use for totals, reports, and recommendations.";
  if (key.includes("country"))
    return "Used for local currency, tax, date, and marketplace settings.";
  if (key.includes("industry"))
    return "Helps PrizeSkout make more relevant comparisons and recommendations.";
  if (key.includes("email"))
    return "PrizeSkout uses this address for important account or team messages.";
  if (key.includes("phone"))
    return "Include the country code so the number works outside your local network.";
  if (key.includes("competitor"))
    return "Use a clear name so you can recognize this competitor in reports and alerts.";
  if (key.includes("product") || key.includes("sku"))
    return "Use the exact product name or SKU to avoid matching the wrong item.";
  if (key.includes("channel"))
    return "Where this product is sold, such as your online store or delivery marketplace.";
  if (key.includes("category"))
    return "Groups similar products so comparisons and recommendations stay relevant.";
  if (key.includes("role")) return "Controls what this team member can view or change.";
  if (key.includes("color"))
    return "Choose the main brand color used in merchant-facing screens and reports.";
  return "This information helps PrizeSkout configure the feature correctly.";
}
