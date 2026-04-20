import { Bell, Menu } from "lucide-react";
import { ChannelFilter, type Channel } from "./ChannelFilter";

export function TopBar({
  title,
  channel,
  onChannelChange,
  onMenuClick,
}: {
  title: string;
  channel: Channel;
  onChannelChange: (c: Channel) => void;
  onMenuClick?: () => void;
}) {
  return (
    <header
      className="flex items-center justify-between"
      style={{
        height: 52,
        padding: "0 16px",
        backgroundColor: "#FFFFFF",
        borderBottom: "1px solid #E5E2DB",
      }}
    >
      <div className="flex items-center gap-2 min-w-0">
        <button
          type="button"
          aria-label="Open menu"
          onClick={onMenuClick}
          className="flex items-center justify-center md:hidden"
          style={{ width: 36, height: 36, borderRadius: 8, flexShrink: 0 }}
        >
          <Menu size={20} strokeWidth={1.75} color="#1A1A18" />
        </button>
        <h1
          style={{
            fontSize: 18,
            fontWeight: 600,
            color: "#1A1A18",
            margin: 0,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {title}
        </h1>
      </div>

      <div className="flex items-center gap-2 md:gap-3" style={{ flexShrink: 0 }}>
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
