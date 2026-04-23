import { useEffect, useState } from "react";
import { Sparkles, X } from "lucide-react";

const STORAGE_PREFIX = "prizeskout:lastVisit:";

/**
 * Shows a one-time banner like "3 new since your last visit" when the user
 * deep-links from another page (?from=overview) and there are unseen items.
 *
 * Tracks per-page last-visit timestamps in localStorage so the banner only
 * appears when there's something genuinely new.
 */
export function NewSinceBanner({
  pageKey,
  count,
  label,
  fromParam,
}: {
  pageKey: string;
  count: number;
  // e.g. "pricing recommendation" — pluralized automatically.
  label: string;
  // Only render when navigated with this ?from value (e.g. "overview").
  fromParam?: string;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Only show when explicitly deep-linked from the source page.
    if (fromParam) {
      const params = new URLSearchParams(window.location.search);
      if (params.get("from") !== fromParam) {
        // Not a deep-link visit — silently update last-seen so the next
        // deep-link compares against this moment.
        window.localStorage.setItem(STORAGE_PREFIX + pageKey, String(Date.now()));
        return;
      }
    }

    const key = STORAGE_PREFIX + pageKey;
    const last = window.localStorage.getItem(key);
    const lastTs = last ? Number(last) : 0;
    // First-time visitors get the banner if there's anything to see.
    const isFirstVisit = !last;
    const hoursSince = lastTs ? (Date.now() - lastTs) / (1000 * 60 * 60) : Infinity;

    // Show if first visit OR it's been more than 1 hour since last visit
    // AND there are items to surface.
    if (count > 0 && (isFirstVisit || hoursSince > 1)) {
      setVisible(true);
    }

    // Update last-visit stamp now so subsequent loads don't re-show.
    window.localStorage.setItem(key, String(Date.now()));
  }, [pageKey, count, fromParam]);

  if (!visible || count <= 0) return null;

  const noun = count === 1 ? label : `${label}s`;

  return (
    <div
      role="status"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        backgroundColor: "rgba(124,58,237,0.06)",
        border: "1px solid rgba(124,58,237,0.18)",
        borderRadius: "var(--radius-card, 12px)",
        padding: "10px 14px",
        marginBottom: 14,
      }}
    >
      <span
        aria-hidden
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 26,
          height: 26,
          borderRadius: 8,
          backgroundColor: "rgba(124,58,237,0.12)",
          color: "#7C3AED",
          flexShrink: 0,
        }}
      >
        <Sparkles size={14} strokeWidth={2.25} />
      </span>
      <span
        style={{
          fontSize: 13,
          color: "var(--color-text-primary, #1A1A18)",
          fontWeight: 500,
          flex: 1,
          minWidth: 0,
        }}
      >
        <strong style={{ fontWeight: 700 }}>{count}</strong> new {noun} since your last visit.
      </span>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => setVisible(false)}
        style={{
          background: "transparent",
          border: "none",
          color: "var(--color-text-secondary, #6B6B6B)",
          cursor: "pointer",
          padding: 4,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 6,
        }}
      >
        <X size={14} />
      </button>
    </div>
  );
}
