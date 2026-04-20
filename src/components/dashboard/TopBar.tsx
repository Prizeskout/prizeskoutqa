import { Bell } from "lucide-react";
import { ChannelFilter, type Channel } from "./ChannelFilter";

export function TopBar({
  title,
  channel,
  onChannelChange,
}: {
  title: string;
  channel: Channel;
  onChannelChange: (c: Channel) => void;
}) {
  return (
    <header
      className="flex items-center justify-between"
      style={{
        height: 52,
        padding: "0 24px",
        backgroundColor: "#FFFFFF",
        borderBottom: "1px solid #E5E2DB",
      }}
    >
      <h1 style={{ fontSize: 18, fontWeight: 600, color: "#1A1A18", margin: 0 }}>{title}</h1>

      <div className="flex items-center gap-3">
        <ChannelFilter value={channel} onChange={onChannelChange} />
        <button
          type="button"
          aria-label="Notifications"
          className="relative flex items-center justify-center"
          style={{ width: 32, height: 32, borderRadius: 8 }}
        >
          <Bell size={18} strokeWidth={1.75} color="#6B6B6B" />
          <span
            aria-hidden
            className="absolute"
            style={{
              top: 6,
              right: 6,
              width: 6,
              height: 6,
              borderRadius: 9999,
              backgroundColor: "#EA580C",
            }}
          />
        </button>
      </div>
    </header>
  );
}
