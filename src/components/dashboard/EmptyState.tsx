import type { ReactNode } from "react";
import { Inbox } from "lucide-react";

/**
 * Reusable empty state for cards/tables/lists.
 * One icon, one sentence, optional CTA — keeps UI honest when there's no data.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  compact = false,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  compact?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: compact ? "24px 16px" : "40px 20px",
        gap: 10,
      }}
    >
      <span
        aria-hidden
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 44,
          height: 44,
          borderRadius: 12,
          backgroundColor: "var(--color-light-bg, #FAF8F3)",
          color: "var(--color-text-secondary, #6B6B6B)",
          marginBottom: 4,
        }}
      >
        {icon ?? <Inbox size={20} strokeWidth={1.75} />}
      </span>
      <strong
        style={{
          fontSize: 14,
          fontWeight: 600,
          color: "var(--color-text-primary, #1A1A18)",
        }}
      >
        {title}
      </strong>
      {description && (
        <p
          style={{
            margin: 0,
            fontSize: 12.5,
            color: "var(--color-text-secondary, #6B6B6B)",
            lineHeight: 1.5,
            maxWidth: 360,
          }}
        >
          {description}
        </p>
      )}
      {action && <div style={{ marginTop: 6 }}>{action}</div>}
    </div>
  );
}
