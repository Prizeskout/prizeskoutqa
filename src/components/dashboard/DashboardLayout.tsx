import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation, useRouter } from "@tanstack/react-router";
import { ChevronRight, RefreshCw, FlaskConical, ArrowRight } from "lucide-react";
import { Trans, useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { Sidebar, MobileSidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { PageHeader } from "./PageHeader";
import { PlanGateModal } from "./PlanGateModal";
import type { Channel } from "./ChannelFilter";
import { SidebarCollapseProvider, useSidebarCollapse } from "./SidebarCollapseContext";
import { ModeProvider, useModeContext } from "@/lib/mode-context";
import { i18n, getStoredLocale, applyLocale } from "@/lib/i18n";

// Ensure i18n module is initialized by importing it.
void i18n;

function SandboxBanner() {
  const { t } = useTranslation();
  return (
    <div
      role="status"
      aria-label="Sandbox mode active"
      style={{
        backgroundColor: "#FFFBEB",
        borderBottom: "1px solid #FDE68A",
        color: "#92400E",
        fontSize: 12.5,
        lineHeight: 1.45,
      }}
    >
      <div
        style={{
          maxWidth: 1080,
          margin: "0 auto",
          padding: "8px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          <FlaskConical size={14} strokeWidth={2} aria-hidden />
          <span style={{ fontWeight: 700, color: "#78350F" }}>{t("layout.sandbox")}</span>
          <span style={{ color: "#92400E" }}>
            <Trans
              i18nKey="layout.sandboxDesc"
              components={{ code: <code style={{ fontFamily: "ui-monospace, SFMono-Regular, monospace", fontSize: 12 }} /> }}
            />
          </span>
        </div>
        <Link
          to="/contact"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            color: "#78350F",
            fontWeight: 600,
            textDecoration: "none",
            whiteSpace: "nowrap",
          }}
        >
          {t("topbar.contactSupport")} <ArrowRight size={12} aria-hidden />
        </Link>
      </div>
    </div>
  );
}

function formatRelative(ts: number, now: number, t: TFunction): string {
  const seconds = Math.max(0, Math.floor((now - ts) / 1000));
  if (seconds < 10) return t("layout.justNow");
  if (seconds < 60) return t("layout.secondsAgo", { count: seconds });
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return minutes === 1 ? t("layout.minuteAgo") : t("layout.minutesAgo", { count: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return hours === 1 ? t("layout.hourAgo") : t("layout.hoursAgo", { count: hours });
  const days = Math.floor(hours / 24);
  return days === 1 ? t("layout.dayAgo") : t("layout.daysAgo", { count: days });
}

function LastUpdated({ pathname }: { pathname: string }) {
  const { t } = useTranslation();
  const [mounted, setMounted] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<number>(() => Date.now());
  const [now, setNow] = useState<number>(() => Date.now());
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    setUpdatedAt(Date.now());
    setNow(Date.now());
  }, [pathname]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const absolute = mounted
    ? new Date(updatedAt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
    : "";

  const handleRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await router.invalidate({ sync: true });
      setUpdatedAt(Date.now());
      setNow(Date.now());
    } finally {
      setRefreshing(false);
    }
  };

  if (!mounted) {
    return (
      <span aria-hidden="true" style={{ fontSize: 11, color: "transparent", userSelect: "none" }}>
        {t("layout.lastUpdated")}
      </span>
    );
  }

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        fontSize: 11,
        color: "#9A9A9A",
        fontWeight: 500,
      }}
      title={t("layout.lastRefreshedAt", { time: absolute })}
    >
      <span>
        {t("layout.lastUpdated")}{" "}
        <span style={{ color: "#6B6B6B" }}>{formatRelative(updatedAt, now, t)}</span>
      </span>
      <button
        type="button"
        onClick={handleRefresh}
        aria-label={t("layout.refreshData")}
        aria-busy={refreshing}
        disabled={refreshing}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 22,
          height: 22,
          padding: 0,
          background: "transparent",
          border: "1px solid #E5E2DB",
          borderRadius: 6,
          cursor: refreshing ? "wait" : "pointer",
          color: "#6B6B6B",
          opacity: refreshing ? 0.6 : 1,
          transition: "color 0.15s, border-color 0.15s, opacity 0.15s",
        }}
        onMouseEnter={(e) => {
          if (refreshing) return;
          e.currentTarget.style.color = "#1A1A18";
          e.currentTarget.style.borderColor = "#9A9A9A";
        }}
        onMouseLeave={(e) => {
          if (refreshing) return;
          e.currentTarget.style.color = "#6B6B6B";
          e.currentTarget.style.borderColor = "#E5E2DB";
        }}
      >
        <RefreshCw
          size={12}
          aria-hidden="true"
          style={{ animation: refreshing ? "ps-spin 0.8s linear infinite" : "none" }}
        />
      </button>
      <style>{`
        @keyframes ps-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

function Breadcrumbs({ title, pathname }: { title: string; pathname: string }) {
  const { t } = useTranslation();
  const isOverview = title.toLowerCase() === "overview" || title === t("overview.title");
  const origin =
    typeof window !== "undefined" ? window.location.origin : "https://prizeskout.qa";
  const dashboardLabel = t("layout.dashboard");
  const itemList = isOverview
    ? [{ name: dashboardLabel, item: `${origin}/dashboard` }]
    : [
        { name: dashboardLabel, item: `${origin}/dashboard` },
        { name: title, item: typeof window !== "undefined" ? window.location.href : "" },
      ];
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: itemList.map((entry, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: entry.name,
      item: entry.item,
    })),
  };
  return (
    <>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 14,
          flexWrap: "wrap",
        }}
      >
        <nav
          aria-label="Breadcrumb"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 12,
            fontWeight: 500,
            color: "#6B6B6B",
          }}
        >
          <Link
            to="/dashboard"
            style={{
              color: isOverview ? "#1A1A18" : "#6B6B6B",
              textDecoration: "none",
              transition: "color 0.15s",
            }}
            onMouseEnter={(e) => {
              if (!isOverview) e.currentTarget.style.color = "#1A1A18";
            }}
            onMouseLeave={(e) => {
              if (!isOverview) e.currentTarget.style.color = "#6B6B6B";
            }}
          >
            {dashboardLabel}
          </Link>
          {!isOverview && (
            <>
              <ChevronRight size={12} aria-hidden="true" color="#9A9A9A" />
              <span aria-current="page" style={{ color: "#1A1A18" }}>
                {title}
              </span>
            </>
          )}
        </nav>
        <LastUpdated pathname={pathname} />
      </div>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </>
  );
}

type DashboardLayoutProps = {
  title: string;
  subtitle?: string;
  primaryAction?: ReactNode;
  helpItems?: string[];
  statusChips?: ReactNode;
  children: ReactNode;
};

export function DashboardLayout(props: DashboardLayoutProps) {
  return (
    <ModeProvider>
      <SidebarCollapseProvider>
        <DashboardLayoutInner {...props} />
      </SidebarCollapseProvider>
    </ModeProvider>
  );
}

function DashboardLayoutInner({
  title,
  subtitle,
  primaryAction,
  helpItems,
  statusChips,
  children,
}: DashboardLayoutProps) {
  const [channel, setChannel] = useState<Channel>("All Channels");
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { collapsed } = useSidebarCollapse();
  const { mode } = useModeContext();
  const sidebarWidth = collapsed ? 64 : 240;
  const mobileShift = collapsed ? 56 : 0;

  // On client mount: read the stored locale and apply it to i18n + html dir/lang.
  useEffect(() => {
    const lng = getStoredLocale();
    i18n.changeLanguage(lng);
    applyLocale(lng);
  }, []);

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#FAFAF9" }}>
      <Sidebar />
      <MobileSidebar open={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div
        className="dashboard-main-shift"
        style={{
          display: "flex",
          flexDirection: "column",
          minHeight: "100vh",
          ["--ps-sidebar-w" as string]: `${sidebarWidth}px`,
          ["--ps-sidebar-mobile-w" as string]: `${mobileShift}px`,
        }}
      >
        <TopBar
          title={title}
          channel={channel}
          onChannelChange={setChannel}
          onMenuClick={() => setMobileOpen(true)}
          showMenuButton={!collapsed}
        />
        {mode === "sandbox" && <SandboxBanner />}
        <PlanGateModal />
        <main
          id="main-content"
          tabIndex={-1}
          className="dashboard-main-content"
          style={{ flex: 1, backgroundColor: "#FAFAF9", overflowY: "auto" }}
        >
          <div
            key={location.pathname}
            className="dashboard-page-fade"
            style={{ maxWidth: 1080, margin: "0 auto" }}
          >
            <Breadcrumbs title={title} pathname={location.pathname} />
            {subtitle && (
              <PageHeader
                title={title}
                subtitle={subtitle}
                primaryAction={primaryAction}
                helpItems={helpItems}
                statusChips={statusChips}
              />
            )}
            {children}
          </div>
        </main>
      </div>
      <style>{`
        /* Use logical properties so the same CSS works for LTR and RTL. */
        .dashboard-main-shift {
          margin-inline-start: var(--ps-sidebar-mobile-w, 0px);
          transition: margin-inline-start 0.2s ease;
        }
        .dashboard-main-content { padding: 16px; }
        @media (min-width: 768px) {
          .dashboard-main-shift { margin-inline-start: var(--ps-sidebar-w, 240px); }
          .dashboard-main-content { padding: 24px; }
        }
        @keyframes dashboardPageFade {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .dashboard-page-fade {
          animation: dashboardPageFade 0.25s ease-out both;
        }
        @media (prefers-reduced-motion: reduce) {
          .dashboard-page-fade { animation: none; }
          .dashboard-main-shift { transition: none; }
        }
      `}</style>
    </div>
  );
}
