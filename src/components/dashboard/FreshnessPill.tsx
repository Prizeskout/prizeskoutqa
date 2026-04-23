import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

function formatRelative(seconds: number): string {
  if (seconds < 10) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m} min${m === 1 ? "" : "s"} ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hr${h === 1 ? "" : "s"} ago`;
  const d = Math.floor(h / 24);
  return `${d} day${d === 1 ? "" : "s"} ago`;
}

/**
 * Tiny "Updated 4 min ago" pill rendered next to a card/section title.
 * Shows nothing on the SSR pass to avoid hydration drift; appears after mount.
 */
export function FreshnessPill({
  timestamp,
  prefix = "Updated",
}: {
  // Either a Date, ISO string, or epoch ms. If null, the pill renders nothing.
  timestamp?: string | number | Date | null;
  prefix?: string;
}) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  if (!timestamp || now === null) return null;

  const ts =
    timestamp instanceof Date
      ? timestamp.getTime()
      : typeof timestamp === "number"
        ? timestamp
        : new Date(timestamp).getTime();
  if (Number.isNaN(ts)) return null;

  const seconds = Math.max(0, Math.floor((now - ts) / 1000));

  return (
    <span
      title={new Date(ts).toLocaleString()}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "3px 8px",
        borderRadius: 999,
        backgroundColor: "var(--color-light-bg, #FAF8F3)",
        border: "1px solid var(--color-light-border, #EFEAE0)",
        color: "var(--color-text-secondary, #6B6B6B)",
        fontSize: 10.5,
        fontWeight: 500,
        lineHeight: 1,
        whiteSpace: "nowrap",
      }}
    >
      <Clock size={10} strokeWidth={2} aria-hidden />
      {prefix} {formatRelative(seconds)}
    </span>
  );
}
