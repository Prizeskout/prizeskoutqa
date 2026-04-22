import { useEffect, useState, type ReactNode } from "react";
import { Bell, Mail, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { Card, CardSubtitle, CardTitle, Toggle } from "./primitives";
import { supabase } from "@/integrations/supabase/client";

type Setting = { key: string; name: string; desc: string; def: boolean };

const SETTINGS: Setting[] = [
  {
    key: "price_drop",
    name: "Price drop alerts",
    desc: "Get notified when a competitor drops price on a tracked product",
    def: true,
  },
  {
    key: "stock",
    name: "Stock change alerts",
    desc: "Get notified when a competitor goes out of stock or restocks",
    def: true,
  },
  {
    key: "promo",
    name: "Promotion detection",
    desc: "Get notified when a competitor launches a new promotion",
    def: true,
  },
  {
    key: "pattern",
    name: "Competitor pattern alerts",
    desc: "Get notified when recurring competitor behavior patterns are detected",
    def: true,
  },
  {
    key: "field",
    name: "Field intel submissions",
    desc: "Get notified when your field team submits a new price observation",
    def: false,
  },
  {
    key: "report",
    name: "Weekly market report",
    desc: "Receive a weekly email summary of market trends and your position",
    def: true,
  },
  {
    key: "rec",
    name: "Pricing recommendations",
    desc: "Get notified when new AI pricing recommendations are available",
    def: true,
  },
  {
    key: "omni",
    name: "Omnichannel price gaps",
    desc: "Alert when your own online and in-store prices diverge by more than 3%",
    def: false,
  },
];

type Channel = { key: string; icon: ReactNode; name: string; status: string; def: boolean };

const CHANNELS: Channel[] = [
  {
    key: "channel_email",
    icon: <Mail size={18} color="#6B6B6B" />,
    name: "Email",
    status: "pricing@snoonu.com",
    def: true,
  },
  {
    key: "channel_sms",
    icon: <Smartphone size={18} color="#6B6B6B" />,
    name: "SMS",
    status: "+974 4000 0000",
    def: false,
  },
  {
    key: "channel_in_app",
    icon: <Bell size={18} color="#6B6B6B" />,
    name: "In-app",
    status: "Always active",
    def: true,
  },
];

export function NotificationsTab() {
  const [states, setStates] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(SETTINGS.map((s) => [s.key, s.def])),
  );
  const [channelStates, setChannelStates] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(CHANNELS.map((c) => [c.key, c.def])),
  );
  const [loaded, setLoaded] = useState(false);

  // Load persisted preferences once on mount.
  useEffect(() => {
    let active = true;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        if (active) setLoaded(true);
        return;
      }
      const { data } = await supabase
        .from("user_notification_settings")
        .select("pref_key, enabled")
        .eq("user_id", user.id);
      if (!active) return;
      if (data && data.length > 0) {
        const map = new Map(data.map((r) => [r.pref_key, r.enabled]));
        setStates((prev) => {
          const next = { ...prev };
          for (const k of Object.keys(prev)) {
            if (map.has(k)) next[k] = !!map.get(k);
          }
          return next;
        });
        setChannelStates((prev) => {
          const next = { ...prev };
          for (const k of Object.keys(prev)) {
            if (map.has(k)) next[k] = !!map.get(k);
          }
          return next;
        });
      }
      setLoaded(true);
    })();
    return () => {
      active = false;
    };
  }, []);

  const persist = async (key: string, enabled: boolean) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Please sign in again to save preferences");
      return;
    }
    const { error } = await supabase
      .from("user_notification_settings")
      .upsert(
        { user_id: user.id, pref_key: key, enabled },
        { onConflict: "user_id,pref_key" },
      );
    if (error) {
      console.error(error);
      toast.error("Could not save preference");
    }
  };

  const toggleSetting = (key: string, value: boolean) => {
    setStates((prev) => ({ ...prev, [key]: value }));
    if (loaded) void persist(key, value);
  };

  const toggleChannel = (key: string, value: boolean) => {
    setChannelStates((prev) => ({ ...prev, [key]: value }));
    if (loaded) void persist(key, value);
  };

  return (
    <Card>
      <CardTitle>Notification preferences</CardTitle>
      <CardSubtitle>Control how and when you receive alerts</CardSubtitle>

      <div style={{ marginTop: 8 }}>
        {SETTINGS.map((s, i) => {
          const isLast = i === SETTINGS.length - 1;
          return (
            <div
              key={s.key}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 14,
                padding: "14px 0",
                borderBottom: isLast ? "none" : "1px solid #E5E2DB",
              }}
            >
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: "#1A1A18" }}>{s.name}</div>
                <div style={{ fontSize: 12, color: "#6B6B6B", marginTop: 2 }}>{s.desc}</div>
              </div>
              <Toggle on={states[s.key]} onChange={(v) => toggleSetting(s.key, v)} />
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 20, fontSize: 14, fontWeight: 600, color: "#1A1A18" }}>
        Alert channels
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 14,
          marginTop: 12,
        }}
      >
        {CHANNELS.map((c) => (
          <div
            key={c.key}
            style={{
              backgroundColor: "#FAFAF9",
              border: "1px solid #E5E2DB",
              borderRadius: 8,
              padding: "14px 18px",
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            {c.icon}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: "#1A1A18" }}>{c.name}</div>
              <div
                style={{
                  fontSize: 11,
                  color: "#6B6B6B",
                  marginTop: 2,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {c.status}
              </div>
            </div>
            <Toggle
              size="sm"
              on={channelStates[c.key]}
              onChange={(v) => toggleChannel(c.key, v)}
            />
          </div>
        ))}
      </div>
    </Card>
  );
}
