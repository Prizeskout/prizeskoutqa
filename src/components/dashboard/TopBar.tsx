import { useEffect, useRef, useState } from "react";
import { Menu, RefreshCw, LogOut, LifeBuoy } from "lucide-react";
import { useNavigate, useRouter } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ChannelFilter, type Channel } from "./ChannelFilter";
import { NotificationsBell } from "./NotificationsBell";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { ModeSwitcher } from "./ModeSwitcher";
import { ContactSupportModal } from "./ContactSupportModal";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";

function SupportButton() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t("topbar.contactSupport")}
        title={t("topbar.contactSupport")}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 32,
          height: 32,
          borderRadius: 8,
          backgroundColor: "transparent",
          border: "1px solid transparent",
          color: "#6B6B6B",
          cursor: "pointer",
          flexShrink: 0,
        }}
      >
        <LifeBuoy size={17} strokeWidth={1.75} />
      </button>
      <ContactSupportModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}

const DATA_FRESHNESS_MIN = 4;

function freshnessColor(min: number) {
  if (min > 120) return "#EF4444";
  if (min > 30) return "#F59E0B";
  return "#22C55E";
}

function DataFreshnessIndicator() {
  const { t } = useTranslation();
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
        aria-label={t("topbar.dataFreshness")}
      >
        <RefreshCw size={12} strokeWidth={2} color={color} />
        <span className="hidden sm:inline">
          {t("topbar.dataMinAgo", { count: DATA_FRESHNESS_MIN })}
        </span>
      </button>
      {open && (
        <div
          role="dialog"
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            insetInlineEnd: 0,
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
            {t("topbar.competitiveData")}
          </div>
          {t("topbar.refreshSchedule")}
        </div>
      )}
    </div>
  );
}

function getInitials(name: string | null | undefined, email: string | null | undefined): string {
  const source = (name || email || "").trim();
  if (!source) return "U";
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

function UserMenu() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const displayName =
    (user?.user_metadata?.display_name as string | undefined) ||
    user?.email?.split("@")[0] ||
    "Account";
  const initials = getInitials(displayName, user?.email);

  const handleSignOut = async () => {
    setOpen(false);
    await supabase.auth.signOut();
    await router.invalidate();
    navigate({ to: "/login" });
  };

  useEffect(() => {
    if (!open) return;
    function onMouseDown(e: MouseEvent) {
      const target = e.target as Node;
      if (
        popoverRef.current?.contains(target) ||
        buttonRef.current?.contains(target)
      )
        return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div style={{ position: "relative" }}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={t("topbar.userMenu")}
        aria-expanded={open}
        aria-haspopup="true"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 32,
          height: 32,
          borderRadius: 9999,
          backgroundColor: "#EA580C",
          color: "#FFFFFF",
          fontSize: 12,
          fontWeight: 700,
          border: "none",
          cursor: "pointer",
          flexShrink: 0,
          transition: "opacity 0.15s",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
      >
        {initials}
      </button>

      {open && (
        <div
          ref={popoverRef}
          role="menu"
          aria-label={t("topbar.userMenu")}
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            insetInlineEnd: 0,
            minWidth: 220,
            backgroundColor: "#FFFFFF",
            border: "1px solid #E5E2DB",
            borderRadius: 10,
            boxShadow: "0 8px 24px rgba(0, 0, 0, 0.08)",
            zIndex: 60,
            overflow: "hidden",
          }}
        >
          <div style={{ padding: "12px 14px", borderBottom: "1px solid #F1EFE8" }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "#1A1A18",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {displayName}
            </div>
            {user?.email && (
              <div
                style={{
                  fontSize: 11,
                  color: "#9A9A9A",
                  marginTop: 2,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {user.email}
              </div>
            )}
          </div>

          <div style={{ padding: "4px 0" }}>
            <button
              type="button"
              role="menuitem"
              onClick={handleSignOut}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                width: "100%",
                padding: "9px 14px",
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 500,
                color: "#DC2626",
                textAlign: "start",
                transition: "background-color 0.12s",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.backgroundColor = "rgba(220, 38, 38, 0.06)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.backgroundColor = "transparent")
              }
            >
              <LogOut size={15} strokeWidth={1.75} />
              {t("topbar.signOut")}
            </button>
          </div>
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
  showMenuButton?: boolean;
}) {
  const { t } = useTranslation();
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
            aria-label={t("topbar.openMenu")}
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
        <ModeSwitcher />
        <LanguageSwitcher />
        <ChannelFilter value={channel} onChange={onChannelChange} />
        <DataFreshnessIndicator />
        <SupportButton />
        <NotificationsBell />
        <UserMenu />
      </div>
    </header>
  );
}
