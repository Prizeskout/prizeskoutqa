import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";

function formatRelative(seconds: number, t: TFunction): string {
  if (seconds < 10) return t("freshness.justNow");
  if (seconds < 60) return t("freshness.secsAgo", { count: seconds });
  const m = Math.floor(seconds / 60);
  if (m < 60) return m === 1 ? t("freshness.minAgo") : t("freshness.minsAgo", { count: m });
  const h = Math.floor(m / 60);
  if (h < 24) return h === 1 ? t("freshness.hrAgo") : t("freshness.hrsAgo", { count: h });
  const d = Math.floor(h / 24);
  return d === 1 ? t("freshness.dayAgo") : t("freshness.daysAgo", { count: d });
}

/**
 * Tiny "Updated 4 min ago" pill rendered next to a card/section title.
 * Shows nothing on the SSR pass to avoid hydration drift; appears after mount.
 */
export function FreshnessPill({
  timestamp,
  prefix,
}: {
  timestamp?: string | number | Date | null;
  prefix?: string;
}) {
  const { t } = useTranslation();
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
  const resolvedPrefix = prefix ?? t("freshness.updated");

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
      {resolvedPrefix} {formatRelative(seconds, t)}
    </span>
  );
}
