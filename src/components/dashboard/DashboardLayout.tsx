import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { ChevronRight, RefreshCw } from "lucide-react";
import { Sidebar, MobileSidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import type { Channel } from "./ChannelFilter";

function formatRelative(ts: number, now: number) {
  const seconds = Math.max(0, Math.floor((now - ts) / 1000));
  if (seconds < 10) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

function LastUpdated({ pathname }: { pathname: string }) {
  // Defer to client-only to avoid SSR/CSR mismatch on Date.now()
  const [mounted, setMounted] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<number>(() => Date.now());
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    setMounted(true);
  }, []);

  // Reset the "last updated" stamp on route change
  useEffect(() => {
    setUpdatedAt(Date.now());
    setNow(Date.now());
  }, [pathname]);

  // Tick every 30s so the relative label stays fresh
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const absolute = mounted
    ? new Date(updatedAt).toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
      })
    : "";

  const handleRefresh = () => {
    setUpdatedAt(Date.now());
    setNow(Date.now());
  };

  if (!mounted) {
    // Render a stable placeholder during SSR/initial hydration
    return (
      <span
        aria-hidden="true"
        style={{ fontSize: 11, color: "transparent", userSelect: "none" }}
      >
        Last updated
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
      title={`Last refreshed at ${absolute}`}
    >
      <span>
        Last updated <span style={{ color: "#6B6B6B" }}>{formatRelative(updatedAt, now)}</span>
      </span>
      <button
        type="button"
        onClick={handleRefresh}
        aria-label="Refresh dashboard data"
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
          cursor: "pointer",
          color: "#6B6B6B",
          transition: "color 0.15s, border-color 0.15s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = "#1A1A18";
          e.currentTarget.style.borderColor = "#9A9A9A";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = "#6B6B6B";
          e.currentTarget.style.borderColor = "#E5E2DB";
        }}
      >
        <RefreshCw size={12} aria-hidden="true" />
      </button>
    </div>
  );
}

function Breadcrumbs({ title, pathname }: { title: string; pathname: string }) {
  const isOverview = title.toLowerCase() === "overview";
  const origin =
    typeof window !== "undefined" ? window.location.origin : "https://prizeskout.com";
  const itemList = isOverview
    ? [{ name: "Dashboard", item: `${origin}/dashboard` }]
    : [
        { name: "Dashboard", item: `${origin}/dashboard` },
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
            Dashboard
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

export function DashboardLayout({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const [channel, setChannel] = useState<Channel>("All Channels");
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#FAFAF9" }}>
      <Sidebar />
      <MobileSidebar open={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="dashboard-main-shift" style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
        <TopBar
          title={title}
          channel={channel}
          onChannelChange={setChannel}
          onMenuClick={() => setMobileOpen(true)}
        />
        <main
          id="main-content"
          tabIndex={-1}
          className="dashboard-main-content"
          style={{
            flex: 1,
            backgroundColor: "#FAFAF9",
            overflowY: "auto",
          }}
        >
          <div
            key={location.pathname}
            className="dashboard-page-fade"
            style={{ maxWidth: 1080, margin: "0 auto" }}
          >
            <Breadcrumbs title={title} />
            {children}
          </div>
        </main>
      </div>
      <style>{`
        .dashboard-main-shift { margin-left: 0; }
        .dashboard-main-content { padding: 16px; }
        @media (min-width: 768px) {
          .dashboard-main-shift { margin-left: 240px; }
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
        }
      `}</style>
    </div>
  );
}
