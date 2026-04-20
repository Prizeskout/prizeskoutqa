import { useState, type ReactNode } from "react";
import { Sidebar } from "./Sidebar";
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

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#FAFAF9" }}>
      <Sidebar />
      <div style={{ marginLeft: 240, display: "flex", flexDirection: "column", minHeight: "100vh" }}>
        <TopBar title={title} channel={channel} onChannelChange={setChannel} />
        <main
          style={{
            flex: 1,
            backgroundColor: "#FAFAF9",
            padding: 24,
            overflowY: "auto",
          }}
        >
          <div style={{ maxWidth: 1080, margin: "0 auto" }}>{children}</div>
        </main>
      </div>
    </div>
  );
}
