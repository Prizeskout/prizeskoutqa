// 24-hour competitor price changes card. Pulls the user's recent
// competitor_scrapes and computes price deltas per (product, competitor)
// between the latest scrape inside the window and the latest scrape before it.

import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Minus, TrendingDown, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { InsightWindow } from "@/server/ai-insights.functions";

type ScrapeRow = {
  product: string | null;
  competitor: string | null;
  price: number | null;
  currency: string | null;
  scraped_at: string;
  status: string;
};

const WINDOWS: { value: InsightWindow; label: string; hours: number }[] = [
  { value: "24h", label: "24h", hours: 24 },
  { value: "7d", label: "7d", hours: 24 * 7 },
  { value: "30d", label: "30d", hours: 24 * 30 },
];

type Diff = {
  key: string;
  product: string;
  competitor: string;
  before: number;
  after: number;
  currency: string;
  delta: number; // after - before
  pct: number | null;
  scrapedAt: string;
};

export function CompetitorPriceChanges() {
  const [window, setWindow] = useState<InsightWindow>("24h");
  const [rows, setRows] = useState<ScrapeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    // Pull last 60 days of successful scrapes once. Window filtering happens
    // in-memory so switching 24h/7d/30d is instant and re-uses the same fetch.
    const cutoff = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
    supabase
      .from("competitor_scrapes")
      .select("product,competitor,price,currency,scraped_at,status")
      .eq("status", "success")
      .gte("scraped_at", cutoff)
      .not("price", "is", null)
      .order("scraped_at", { ascending: false })
      .limit(500)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          setError(error.message);
          setRows([]);
        } else {
          setRows((data ?? []) as ScrapeRow[]);
        }
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const diffs = useMemo<Diff[]>(() => {
    const sinceMs =
      Date.now() - (WINDOWS.find((w) => w.value === window)?.hours ?? 24) * 60 * 60 * 1000;

    type Group = { latestIn: ScrapeRow | null; latestBefore: ScrapeRow | null };
    const groups = new Map<string, Group>();
    for (const r of rows) {
      if (!r.product || !r.competitor || r.price == null) continue;
      const key = `${r.competitor}|${r.product}`;
      const g = groups.get(key) ?? { latestIn: null, latestBefore: null };
      const ts = new Date(r.scraped_at).getTime();
      if (ts >= sinceMs) {
        if (!g.latestIn || new Date(g.latestIn.scraped_at).getTime() < ts) g.latestIn = r;
      } else {
        if (!g.latestBefore || new Date(g.latestBefore.scraped_at).getTime() < ts)
          g.latestBefore = r;
      }
      groups.set(key, g);
    }

    const out: Diff[] = [];
    for (const [key, g] of groups) {
      if (!g.latestIn || g.latestIn.price == null) continue;
      const after = Number(g.latestIn.price);
      const before = g.latestBefore?.price != null ? Number(g.latestBefore.price) : null;
      const delta = before == null ? 0 : after - before;
      const pct = before == null || before === 0 ? null : (delta / before) * 100;
      // Hide entries with no baseline AND no movement (we want signal, not new tracking entries).
      if (before == null) continue;
      if (Math.abs(delta) < 0.001) continue;
      out.push({
        key,
        product: g.latestIn.product!,
        competitor: g.latestIn.competitor!,
        before,
        after,
        currency: g.latestIn.currency ?? "QAR",
        delta,
        pct,
        scrapedAt: g.latestIn.scraped_at,
      });
    }
    // Largest absolute % change first.
    out.sort((a, b) => Math.abs(b.pct ?? 0) - Math.abs(a.pct ?? 0));
    return out;
  }, [rows, window]);

  const drops = diffs.filter((d) => d.delta < 0).length;
  const rises = diffs.filter((d) => d.delta > 0).length;

  return (
    <div
      style={{
        backgroundColor: "#FFFFFF",
        border: "1px solid #E5E2DB",
        borderRadius: 12,
        padding: "18px 20px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 14,
          flexWrap: "wrap",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#1A1A18", lineHeight: 1.2 }}>
            Competitor price changes
          </div>
          <div style={{ fontSize: 11, color: "#9A9A9A", marginTop: 3 }}>
            What moved in the {windowSentence(window)} · {drops} drops · {rises} rises
          </div>
        </div>
        <WindowPill value={window} onChange={setWindow} />
      </div>

      {loading ? (
        <SkeletonRows />
      ) : error ? (
        <EmptyState>Could not load price history.</EmptyState>
      ) : diffs.length === 0 ? (
        <EmptyState>
          No competitor price movements detected in the {windowSentence(window)}. As scrapes run,
          changes will appear here.
        </EmptyState>
      ) : (
        <ul
          style={{
            listStyle: "none",
            padding: 0,
            margin: 0,
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          {diffs.slice(0, 10).map((d) => (
            <DiffRow key={d.key} diff={d} />
          ))}
        </ul>
      )}
    </div>
  );
}

function DiffRow({ diff }: { diff: Diff }) {
  const isDrop = diff.delta < 0;
  const isFlat = diff.delta === 0;
  const color = isFlat ? "#6B6B6B" : isDrop ? "#22C55E" : "#EF4444";
  const tint = isFlat ? "#F5F2EC" : isDrop ? "#ECFDF5" : "#FEF2F2";
  const Icon = isFlat ? Minus : isDrop ? TrendingDown : TrendingUp;
  const Arrow = isFlat ? Minus : isDrop ? ArrowDown : ArrowUp;
  const pct = diff.pct == null ? "" : `${diff.delta > 0 ? "+" : ""}${diff.pct.toFixed(1)}%`;
  const deltaAbs = Math.abs(diff.delta);

  return (
    <li
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "10px 12px",
        backgroundColor: "#FAFAF8",
        border: "1px solid #EFEAE0",
        borderRadius: 8,
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          backgroundColor: tint,
          color,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Icon size={16} strokeWidth={2.2} />
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "#1A1A18",
            lineHeight: 1.3,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {diff.product}
        </div>
        <div style={{ fontSize: 11, color: "#6B6B6B", marginTop: 2 }}>
          {diff.competitor} · {timeAgo(diff.scrapedAt)}
        </div>
      </div>
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <div
          style={{
            fontSize: 12,
            color: "#6B6B6B",
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          <span style={{ textDecoration: "line-through" }}>
            {fmtMoney(diff.before, diff.currency)}
          </span>
          <Arrow size={11} color={color} strokeWidth={2.4} />
          <span style={{ color: "#1A1A18", fontWeight: 600 }}>
            {fmtMoney(diff.after, diff.currency)}
          </span>
        </div>
        <div
          style={{
            fontSize: 11,
            color,
            fontWeight: 700,
            marginTop: 2,
          }}
        >
          {pct} ({diff.delta > 0 ? "+" : "-"}
          {fmtMoney(deltaAbs, diff.currency)})
        </div>
      </div>
    </li>
  );
}

function WindowPill({
  value,
  onChange,
}: {
  value: InsightWindow;
  onChange: (w: InsightWindow) => void;
}) {
  return (
    <div
      role="tablist"
      style={{
        display: "inline-flex",
        border: "1px solid #E5E2DB",
        borderRadius: 8,
        padding: 2,
        backgroundColor: "#FFFFFF",
      }}
    >
      {WINDOWS.map((w) => {
        const active = value === w.value;
        return (
          <button
            key={w.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(w.value)}
            style={{
              padding: "4px 10px",
              borderRadius: 6,
              border: "none",
              backgroundColor: active ? "#1A1A18" : "transparent",
              color: active ? "#FFFFFF" : "#6B6B6B",
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.02em",
              cursor: "pointer",
            }}
          >
            {w.label}
          </button>
        );
      })}
    </div>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        padding: "20px 16px",
        textAlign: "center",
        backgroundColor: "#FAF8F3",
        borderRadius: 10,
        border: "1px dashed #E5E2DB",
        fontSize: 12,
        color: "#6B6B6B",
        lineHeight: 1.5,
      }}
    >
      {children}
    </div>
  );
}

function SkeletonRows() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          style={{
            height: 52,
            borderRadius: 8,
            background:
              "linear-gradient(90deg, #F5F2EC 0%, #FAFAF8 50%, #F5F2EC 100%)",
            backgroundSize: "200% 100%",
            animation: "diff-shimmer 1.4s ease-in-out infinite",
          }}
        />
      ))}
      <style>{`@keyframes diff-shimmer { 0% { background-position: 200% 0;} 100% { background-position: -200% 0;} }`}</style>
    </div>
  );
}

function fmtMoney(n: number, currency: string): string {
  return `${currency} ${n.toLocaleString("en-US", {
    minimumFractionDigits: n % 1 ? 2 : 0,
    maximumFractionDigits: 2,
  })}`;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function windowSentence(w: InsightWindow): string {
  if (w === "24h") return "last 24 hours";
  if (w === "7d") return "last 7 days";
  return "last 30 days";
}
