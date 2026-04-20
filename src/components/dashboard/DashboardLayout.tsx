import { useState, type ReactNode } from "react";
import { useLocation } from "@tanstack/react-router";
import { Sidebar, MobileSidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import type { Channel } from "./ChannelFilter";

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
