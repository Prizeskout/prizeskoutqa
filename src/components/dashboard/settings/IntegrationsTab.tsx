import { useState } from "react";
import { Copy, Pencil, Plus, RefreshCw, Trash2, Zap } from "lucide-react";
import {
  Card,
  CardSubtitle,
  CardTitle,
  Field,
  FieldRow,
  IconAction,
  OutlineAddButton,
  SelectField,
  StatusDot,
  TextField,
} from "./primitives";

const AI_PROVIDERS = [
  "PrizeSkout Default",
  "Google Gemini",
  "OpenAI",
  "Anthropic",
  "Custom endpoint",
] as const;

function SmallButton({
  icon,
  children,
  onClick,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  const [hover, setHover] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        backgroundColor: "#FFFFFF",
        border: `1px solid ${hover ? "#EA580C" : "#E5E2DB"}`,
        color: "#6B6B6B",
        fontSize: 12,
        fontWeight: 500,
        padding: "8px 14px",
        borderRadius: 8,
        cursor: "pointer",
        transition: "border-color 0.15s",
        whiteSpace: "nowrap",
      }}
    >
      {icon}
      {children}
    </button>
  );
}

export function IntegrationsTab() {
  const [aiProvider, setAiProvider] = useState<string>("Google Gemini");
  const [aiKey, setAiKey] = useState("");

  return (
    <Card>
      <CardTitle>API and integrations</CardTitle>
      <CardSubtitle>Connect PrizeSkout to your existing systems</CardSubtitle>

      {/* 5a: API Key */}
      <div style={{ marginTop: 18 }}>
        <div style={{ fontSize: 12, color: "#9A9A9A", marginBottom: 6 }}>API Key</div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <div
            style={{
              flex: "1 1 240px",
              minWidth: 0,
              fontSize: 13,
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
              backgroundColor: "#FAFAF9",
              border: "1px solid #E5E2DB",
              borderRadius: 8,
              padding: "10px 14px",
              color: "#1A1A18",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            sk_live_••••••••••••••••••••a4f2
          </div>
          <SmallButton icon={<Copy size={14} />}>Copy</SmallButton>
          <SmallButton icon={<RefreshCw size={14} />}>Regenerate</SmallButton>
        </div>
      </div>

      {/* 5b: AI engine */}
      <div style={{ marginTop: 24 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "#1A1A18" }}>
          AI engine configuration
        </div>
        <div style={{ fontSize: 12, color: "#6B6B6B", marginTop: 4 }}>
          Connect your own AI provider for custom model training and inference
        </div>
        <div style={{ marginTop: 14 }}>
          <FieldRow>
            <Field label="AI Provider">
              <SelectField value={aiProvider} onChange={setAiProvider} options={AI_PROVIDERS} />
            </Field>
            <Field label="API Key">
              <TextField
                value={aiKey}
                onChange={setAiKey}
                placeholder="Enter your Gemini API key"
                type="password"
              />
            </Field>
          </FieldRow>
        </div>
        <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          <SmallButton icon={<Zap size={14} />}>Test connection</SmallButton>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <StatusDot color="#9A9A9A" />
            <span style={{ fontSize: 12, color: "#9A9A9A" }}>Not configured</span>
          </div>
        </div>
        <div style={{ marginTop: 10, fontSize: 11, color: "#9A9A9A", lineHeight: 1.6 }}>
          Your AI API key is encrypted and never shared. It is used exclusively for running pricing
          models on your data.
        </div>
      </div>

      {/* 5c: Webhooks */}
      <div style={{ marginTop: 24 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 14,
            flexWrap: "wrap",
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#1A1A18" }}>
              Webhook endpoints
            </div>
            <div style={{ fontSize: 12, color: "#6B6B6B", marginTop: 4 }}>
              Receive real-time event notifications in your systems
            </div>
          </div>
          <OutlineAddButton icon={<Plus size={14} strokeWidth={2} />}>Add webhook</OutlineAddButton>
        </div>
        <div
          style={{
            marginTop: 14,
            padding: "14px 0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 14,
            flexWrap: "wrap",
            borderTop: "1px solid #E5E2DB",
          }}
        >
          <div style={{ minWidth: 0, flex: "1 1 260px" }}>
            <div
              style={{
                fontSize: 12,
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                color: "#6B6B6B",
                wordBreak: "break-all",
              }}
            >
              https://api.snoonu.com/webhooks/prizeskout
            </div>
            <div style={{ fontSize: 11, color: "#9A9A9A", marginTop: 4 }}>
              Events: Price alerts, Stock changes
            </div>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              flexShrink: 0,
            }}
          >
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <StatusDot color="#22C55E" />
              <span style={{ fontSize: 11, color: "#22C55E" }}>Active</span>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <IconAction
                ariaLabel="Edit webhook"
                icon={<Pencil size={14} color="#6B6B6B" />}
              />
              <IconAction
                ariaLabel="Remove webhook"
                hoverColor="#EF4444"
                icon={<Trash2 size={14} color="#9A9A9A" />}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 5d: ERP */}
      <div style={{ marginTop: 24 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "#1A1A18" }}>
          ERP and system integrations
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 14,
            marginTop: 12,
          }}
        >
          {[
            {
              name: "ERP System",
              desc: "Sync product catalog, margins, and inventory",
              connected: false,
            },
            {
              name: "POS System",
              desc: "Real-time in-store sales and pricing data",
              connected: false,
            },
            {
              name: "E-commerce Platform",
              desc: "Sync online catalog and order data",
              connected: true,
            },
          ].map((card) => {
            const dot = card.connected ? "#22C55E" : "#9A9A9A";
            const label = card.connected ? "Connected" : "Not connected";
            return (
              <div
                key={card.name}
                style={{
                  backgroundColor: "#FAFAF9",
                  border: "1px solid #E5E2DB",
                  borderRadius: 10,
                  padding: 18,
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                <div style={{ fontSize: 14, fontWeight: 600, color: "#1A1A18" }}>
                  {card.name}
                </div>
                <div style={{ fontSize: 12, color: "#6B6B6B", lineHeight: 1.5 }}>{card.desc}</div>
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    marginTop: 4,
                  }}
                >
                  <StatusDot color={dot} />
                  <span style={{ fontSize: 11, color: dot, fontWeight: 500 }}>{label}</span>
                </div>
                <a
                  href="#"
                  onClick={(e) => e.preventDefault()}
                  style={{
                    fontSize: 12,
                    fontWeight: 500,
                    color: "#EA580C",
                    textDecoration: "none",
                    marginTop: 4,
                  }}
                >
                  Configure
                </a>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
