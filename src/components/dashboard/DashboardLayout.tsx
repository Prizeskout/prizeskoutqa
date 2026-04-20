import { useState, type ReactNode } from "react";
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
          style={{
            flex: 1,
            backgroundColor: "#FAFAF9",
            padding: 16,
            overflowY: "auto",
          }}
        >
          <div style={{ maxWidth: 1080, margin: "0 auto" }}>{children}</div>
        </main>
      </div>
      <style>{`
        .dashboard-main-shift { margin-left: 0; }
        @media (min-width: 768px) {
          .dashboard-main-shift { margin-left: 240px; }
        }
        @media (min-width: 768px) {
          main { padding: 24px !important; }
        }
      `}</style>
    </div>
  );
}
