import type { CSSProperties } from "react";
import { DashboardLayout } from "./DashboardLayout";

const SHIMMER_KEYFRAMES = `
  @keyframes prizeskoutShimmer {
    0% { background-position: -400px 0; }
    100% { background-position: 400px 0; }
  }
`;

function shimmerStyle(extra: CSSProperties = {}): CSSProperties {
  return {
    background:
      "linear-gradient(90deg, #F1EEE7 0%, #E5E2DB 50%, #F1EEE7 100%)",
    backgroundSize: "800px 100%",
    animation: "prizeskoutShimmer 1.4s ease-in-out infinite",
    borderRadius: 6,
    ...extra,
  };
}

export function SkeletonBlock({
  width = "100%",
  height = 14,
  radius = 6,
  style,
}: {
  width?: number | string;
  height?: number | string;
  radius?: number;
  style?: CSSProperties;
}) {
  return (
    <div
      aria-hidden="true"
      style={shimmerStyle({ width, height, borderRadius: radius, ...style })}
    />
  );
}

function SkeletonMetricCard() {
  return (
    <div
      style={{
        backgroundColor: "#FFFFFF",
        border: "1px solid #E5E2DB",
        borderRadius: 10,
        padding: "18px 22px",
        flex: 1,
        minWidth: 0,
      }}
    >
      <SkeletonBlock width={120} height={12} />
      <div style={{ marginTop: 12 }}>
        <SkeletonBlock width={100} height={28} />
      </div>
      <div style={{ marginTop: 12 }}>
        <SkeletonBlock width={140} height={11} />
      </div>
    </div>
  );
}

export function SkeletonMetricsRow({ count = 4 }: { count?: number }) {
  return (
    <div className="metrics-row">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonMetricCard key={i} />
      ))}
    </div>
  );
}

export function SkeletonCard({
  height = 200,
  title,
}: {
  height?: number;
  title?: boolean;
}) {
  return (
    <div
      style={{
        backgroundColor: "#FFFFFF",
        border: "1px solid #E5E2DB",
        borderRadius: 10,
        padding: 22,
        minHeight: height,
      }}
    >
      {title ? (
        <div style={{ marginBottom: 18 }}>
          <SkeletonBlock width={180} height={16} />
        </div>
      ) : null}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <SkeletonBlock height={12} width="92%" />
        <SkeletonBlock height={12} width="78%" />
        <SkeletonBlock height={12} width="85%" />
        <SkeletonBlock height={12} width="60%" />
      </div>
    </div>
  );
}

export function SkeletonRows({
  rows = 5,
  rowHeight = 18,
}: {
  rows?: number;
  rowHeight?: number;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonBlock key={i} height={rowHeight} />
      ))}
    </div>
  );
}

export function SkeletonStyles() {
  return <style>{SHIMMER_KEYFRAMES}</style>;
}

/* ---------- Page-level pending layouts ---------- */

export function OverviewPendingPage() {
  return (
    <DashboardLayout title="Overview">
      <SkeletonStyles />
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <SkeletonMetricsRow count={4} />
        <SkeletonCard title height={220} />
        <div style={{ display: "flex", gap: 14, alignItems: "stretch" }}>
          <div style={{ flex: "0 0 60%", minWidth: 0 }}>
            <SkeletonCard title height={260} />
          </div>
          <div style={{ flex: "0 0 calc(40% - 14px)", minWidth: 0 }}>
            <SkeletonCard title height={260} />
          </div>
        </div>
        <SkeletonCard title height={180} />
      </div>
    </DashboardLayout>
  );
}

export function PricingPendingPage() {
  return (
    <DashboardLayout title="Pricing">
      <SkeletonStyles />
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <SkeletonMetricsRow count={4} />
        <SkeletonCard height={80} />
        <SkeletonCard title height={260} />
        <SkeletonCard title height={180} />
        <SkeletonCard height={100} />
      </div>
    </DashboardLayout>
  );
}

export function CompetitorsPendingPage() {
  return (
    <DashboardLayout title="Competitors">
      <SkeletonStyles />
      <div style={{ marginBottom: 14 }}>
        <SkeletonBlock width={260} height={32} radius={8} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <SkeletonMetricsRow count={4} />
        <SkeletonCard height={64} />
        <SkeletonCard title height={300} />
        <SkeletonCard title height={220} />
        <SkeletonCard title height={160} />
      </div>
    </DashboardLayout>
  );
}

export function FieldIntelPendingPage() {
  return (
    <DashboardLayout title="Field Intel">
      <SkeletonStyles />
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <SkeletonMetricsRow count={4} />
        <div style={{ display: "flex", gap: 14, alignItems: "stretch" }}>
          <div style={{ flex: "0 0 calc(55% - 7px)", minWidth: 0 }}>
            <SkeletonCard title height={420} />
          </div>
          <div style={{ flex: "0 0 calc(45% - 7px)", minWidth: 0 }}>
            <SkeletonCard title height={420} />
          </div>
        </div>
        <SkeletonCard title height={260} />
        <SkeletonCard title height={220} />
      </div>
    </DashboardLayout>
  );
}

export function MarketPendingPage() {
  return (
    <DashboardLayout title="Market">
      <SkeletonStyles />
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <SkeletonMetricsRow count={4} />
        <SkeletonCard title height={300} />
        <SkeletonCard title height={280} />
        <SkeletonCard title height={240} />
        <SkeletonCard title height={200} />
      </div>
    </DashboardLayout>
  );
}

export function PromotionsPendingPage() {
  return (
    <DashboardLayout title="Promotions">
      <SkeletonStyles />
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <SkeletonMetricsRow count={4} />
        <SkeletonCard title height={320} />
        <SkeletonCard title height={260} />
        <SkeletonCard title height={300} />
        <SkeletonCard height={80} />
      </div>
    </DashboardLayout>
  );
}
