import { useState } from "react";
import { Bell, Menu, RefreshCw } from "lucide-react";
import { ChannelFilter, type Channel } from "./ChannelFilter";

// Visual-only data freshness indicator. Wired to real refresh times when the
// data pipeline lands; for now hardcoded to "4 min ago" (fresh).
const DATA_FRESHNESS_MIN = 4;

function freshnessColor(min: number) {
  if (min > 120) return "#EF4444";
  if (min > 30) return "#F59E0B";
  return "#22C55E";
}

function DataFreshnessIndicator() {
  const [open, setOpen] = useState(false);
  const color = freshnessColor(DATA_FRESHNESS_MIN);

  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "4px 8px",
          borderRadius: 6,
          backgroundColor: "transparent",
          border: "1px solid transparent",
          cursor: "pointer",
          fontSize: 11,
          fontWeight: 500,
          color,
          whiteSpace: "nowrap",
        }}
        aria-label="Competitive data refresh status"
      >
        <RefreshCw size={12} strokeWidth={2} color={color} />
        <span className="hidden sm:inline">Data: {DATA_FRESHNESS_MIN} min ago</span>
      </button>
      {open && (
        <div
          role="dialog"
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            right: 0,
            width: 260,
            backgroundColor: "#FFFFFF",
            border: "1px solid #E5E2DB",
            borderRadius: 8,
            padding: "10px 12px",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.06)",
            fontSize: 11,
            color: "#6B6B6B",
            lineHeight: 1.55,
            zIndex: 50,
          }}
        >
          <div style={{ fontWeight: 600, color: "#1A1A18", marginBottom: 4 }}>
            Competitive data
          </div>
          Refreshed every 4 hours. Last full refresh: Today at 2:45 PM. Next refresh: Today
          at 6:45 PM.
        </div>
      )}
    </div>
  );
}

export function TopBar({
  title,
  channel,
  onChannelChange,
  onMenuClick,
  showMenuButton = true,
}: {
  title: string;
  channel: Channel;
  onChannelChange: (c: Channel) => void;
  onMenuClick?: () => void;
  // Hide the hamburger when the mobile icon rail is already visible.
  showMenuButton?: boolean;
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
        {showMenuButton && (
          <button
            type="button"
            aria-label="Open menu"
            onClick={onMenuClick}
            className="flex items-center justify-center md:hidden"
            style={{ width: 36, height: 36, borderRadius: 8, flexShrink: 0 }}
          >
            <Menu size={20} strokeWidth={1.75} color="#1A1A18" />
          </button>
        )}
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
        <DataFreshnessIndicator />
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
