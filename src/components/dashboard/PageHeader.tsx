import { useEffect, useRef, useState, type ReactNode } from "react";
import { HelpCircle, X } from "lucide-react";

export type PageHeaderProps = {
  title: string;
  subtitle?: string;
  primaryAction?: ReactNode;
  // 3-bullet "How to use this page" content surfaced in a slide-over.
  helpItems?: string[];
  // Status chips rendered under the subtitle (e.g. "12 competitors tracked").
  statusChips?: ReactNode;
};

/**
 * PageHeader — the top of every dashboard page.
 * Renders title, one-sentence purpose, optional status, primary action,
 * and an optional "How to use" popover so new users get oriented.
 *
 * Use via <DashboardLayout subtitle=... primaryAction=... helpItems=... />.
 */
export function PageHeader({
  title,
  subtitle,
  primaryAction,
  helpItems,
  statusChips,
}: PageHeaderProps) {
  return (
    <header
      style={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 16,
        marginBottom: "var(--space-section)",
        flexWrap: "wrap",
      }}
    >
      <div style={{ minWidth: 0, flex: "1 1 360px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <h1
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: "var(--color-text-primary)",
              margin: 0,
              letterSpacing: "-0.015em",
              lineHeight: 1.2,
            }}
          >
            {title}
          </h1>
          {helpItems && helpItems.length > 0 && <HelpPopover title={title} items={helpItems} />}
        </div>
        {subtitle && (
          <p
            style={{
              fontSize: 13,
              color: "var(--color-text-secondary)",
              margin: "4px 0 0",
              lineHeight: 1.5,
              maxWidth: 640,
            }}
          >
            {subtitle}
          </p>
        )}
        {statusChips && (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 6,
              marginTop: 10,
            }}
          >
            {statusChips}
          </div>
        )}
      </div>
      {primaryAction && (
        <div style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 8 }}>
          {primaryAction}
        </div>
      )}
    </header>
  );
}

function HelpPopover({ title, items }: { title: string; items: string[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`How to use ${title}`}
        aria-expanded={open}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 26,
          height: 26,
          borderRadius: 8,
          border: "1px solid var(--color-light-border)",
          background: "transparent",
          color: "var(--color-text-secondary)",
          cursor: "pointer",
        }}
      >
        <HelpCircle size={14} strokeWidth={2} />
      </button>
      {open && (
        <div
          role="dialog"
          aria-label={`How to use ${title}`}
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            insetInlineStart: 0,
            zIndex: 40,
            width: 320,
            backgroundColor: "var(--color-light-surface)",
            border: "1px solid var(--color-light-border)",
            borderRadius: "var(--radius-card)",
            boxShadow: "var(--shadow-card-hover)",
            padding: 14,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 8,
            }}
          >
            <strong style={{ fontSize: 12, color: "var(--color-text-primary)" }}>
              How to use {title}
            </strong>
            <button
              type="button"
              aria-label="Close"
              onClick={() => setOpen(false)}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--color-text-secondary)",
                cursor: "pointer",
                padding: 2,
              }}
            >
              <X size={14} />
            </button>
          </div>
          <ol
            style={{
              listStyle: "decimal",
              paddingInlineStart: 18,
              margin: 0,
              fontSize: 12.5,
              color: "var(--color-text-primary)",
              lineHeight: 1.55,
            }}
          >
            {items.map((it, i) => (
              <li key={i} style={{ marginBottom: 4 }}>
                {it}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

export function PageStatusChip({
  dotColor,
  children,
}: {
  dotColor?: string;
  children: ReactNode;
}) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        backgroundColor: "#FAF8F3",
        border: "1px solid #EFEAE0",
        borderRadius: 999,
        padding: "3px 10px",
        fontSize: 11.5,
        fontWeight: 500,
        color: "var(--color-text-primary)",
      }}
    >
      {dotColor && (
        <span
          aria-hidden
          style={{
            width: 6,
            height: 6,
            borderRadius: 9999,
            backgroundColor: dotColor,
          }}
        />
      )}
      {children}
    </span>
  );
}
