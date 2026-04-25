import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Bell, AlertCircle, AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

type NotificationRow = {
  id: string;
  category: string;
  severity: string;
  title: string;
  body: string | null;
  link_to: string | null;
  read_at: string | null;
  created_at: string;
};

const RECENT_LIMIT = 30;

function severityIcon(severity: string) {
  const size = 16;
  switch (severity) {
    case "error":
      return <AlertCircle size={size} color="#EF4444" strokeWidth={2} />;
    case "warning":
      return <AlertTriangle size={size} color="#F59E0B" strokeWidth={2} />;
    case "success":
      return <CheckCircle2 size={size} color="#22C55E" strokeWidth={2} />;
    default:
      return <Info size={size} color="#3B82F6" strokeWidth={2} />;
  }
}

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const sec = Math.max(0, Math.floor(diffMs / 1000));
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function NotificationsBell() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(false);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  const unreadCount = items.filter((n) => !n.read_at).length;

  // Initial load + realtime subscription
  useEffect(() => {
    if (!user) {
      setItems([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(RECENT_LIMIT);
      if (!cancelled) {
        setItems((data ?? []) as NotificationRow[]);
        setLoading(false);
      }
    })();

    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          setItems((prev) => {
            const next = [payload.new as NotificationRow, ...prev];
            return next.slice(0, RECENT_LIMIT);
          });
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const updated = payload.new as NotificationRow;
          setItems((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [user]);

  // Close on outside click / escape
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      const target = e.target as Node;
      if (
        popoverRef.current?.contains(target) ||
        buttonRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const markAsRead = async (id: string) => {
    setItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n)),
    );
    await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", id);
  };

  const markAllRead = async () => {
    if (!user || unreadCount === 0) return;
    const now = new Date().toISOString();
    setItems((prev) => prev.map((n) => (n.read_at ? n : { ...n, read_at: now })));
    await supabase
      .from("notifications")
      .update({ read_at: now })
      .eq("user_id", user.id)
      .is("read_at", null);
  };

  const dismiss = async (id: string) => {
    setItems((prev) => prev.filter((n) => n.id !== id));
    await supabase.from("notifications").delete().eq("id", id);
  };

  return (
    <div style={{ position: "relative" }}>
      <button
        ref={buttonRef}
        type="button"
        aria-label={`Notifications${unreadCount ? ` (${unreadCount} unread)` : ""}`}
        onClick={() => setOpen((v) => !v)}
        className="relative flex items-center justify-center"
        style={{ width: 32, height: 32, borderRadius: 8 }}
      >
        <Bell size={18} strokeWidth={1.75} color="#6B6B6B" />
        {unreadCount > 0 && (
          <span
            aria-hidden
            className="absolute"
            style={{
              top: 2,
              right: 2,
              minWidth: 14,
              height: 14,
              padding: "0 4px",
              borderRadius: 9999,
              backgroundColor: "#EA580C",
              color: "#fff",
              fontSize: 9,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              lineHeight: 1,
            }}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          ref={popoverRef}
          role="dialog"
          aria-label="Notifications"
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            right: 0,
            width: 360,
            maxWidth: "calc(100vw - 24px)",
            maxHeight: 460,
            display: "flex",
            flexDirection: "column",
            backgroundColor: "#FFFFFF",
            border: "1px solid #E5E2DB",
            borderRadius: 10,
            boxShadow: "0 8px 24px rgba(0, 0, 0, 0.08)",
            zIndex: 50,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 14px",
              borderBottom: "1px solid #E5E2DB",
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 600, color: "#1A1A18" }}>
              Notifications
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                style={{
                  fontSize: 11,
                  color: "#6B6B6B",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                Mark all read
              </button>
            )}
          </div>

          <div style={{ overflowY: "auto", flex: 1 }}>
            {loading ? (
              <EmptyState text="Loading…" />
            ) : items.length === 0 ? (
              <EmptyState text="You're all caught up." />
            ) : (
              items.map((n) => (
                <NotificationItem
                  key={n.id}
                  n={n}
                  onRead={() => markAsRead(n.id)}
                  onDismiss={() => dismiss(n.id)}
                  onNavigate={() => setOpen(false)}
                />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div
      style={{
        padding: "32px 16px",
        textAlign: "center",
        fontSize: 12,
        color: "#9A9A9A",
      }}
    >
      {text}
    </div>
  );
}

function NotificationItem({
  n,
  onRead,
  onDismiss,
  onNavigate,
}: {
  n: NotificationRow;
  onRead: () => void;
  onDismiss: () => void;
  onNavigate: () => void;
}) {
  const isUnread = !n.read_at;
  const baseStyle: CSSProperties = {
    display: "flex",
    gap: 10,
    padding: "12px 14px",
    borderBottom: "1px solid #F1EFE8",
    backgroundColor: isUnread ? "#FFF8F2" : "#FFFFFF",
    cursor: "pointer",
  };

  const content = (
    <>
      <div style={{ paddingTop: 2, flexShrink: 0 }}>{severityIcon(n.severity)}</div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "#1A1A18",
            lineHeight: 1.3,
          }}
        >
          {n.title}
        </div>
        {n.body && (
          <div
            style={{
              fontSize: 12,
              color: "#6B6B6B",
              marginTop: 3,
              lineHeight: 1.45,
            }}
          >
            {n.body}
          </div>
        )}
        <div style={{ fontSize: 10, color: "#9A9A9A", marginTop: 5 }}>
          {relativeTime(n.created_at)}
        </div>
      </div>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onDismiss();
        }}
        style={{
          alignSelf: "flex-start",
          background: "none",
          border: "none",
          color: "#9A9A9A",
          cursor: "pointer",
          padding: 2,
          flexShrink: 0,
        }}
      >
        <X size={14} />
      </button>
    </>
  );

  if (n.link_to) {
    return (
      <Link
        to={n.link_to}
        style={{ ...baseStyle, textDecoration: "none", color: "inherit" }}
        onClick={() => {
          if (isUnread) onRead();
          onNavigate();
        }}
      >
        {content}
      </Link>
    );
  }

  return (
    <div
      style={baseStyle}
      onClick={() => {
        if (isUnread) onRead();
      }}
    >
      {content}
    </div>
  );
}
