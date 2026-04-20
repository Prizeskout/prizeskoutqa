import { useState } from "react";
import {
  Copy,
  LineChart,
  MapPin,
  Package,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import {
  Card,
  CardSubtitle,
  CardTitle,
  IconAction,
  OutlineAddButton,
  StatusDot,
} from "./primitives";

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

type DataConnectionCard = {
  icon: React.ReactNode;
  title: string;
  description: string;
  options?: string[];
  status: { label: string; color: string };
  cta: string;
};

const DATA_CONNECTIONS: DataConnectionCard[] = [
  {
    icon: <Package size={20} color="#EA580C" strokeWidth={1.75} />,
    title: "Product catalog sync",
    description:
      "Import your product catalog so we can match your products against competitors",
    options: ["CSV upload", "API sync", "Shopify", "WooCommerce"],
    status: { label: "Connected via API", color: "#22C55E" },
    cta: "Configure",
  },
  {
    icon: <LineChart size={20} color="#EA580C" strokeWidth={1.75} />,
    title: "Sales and margin data",
    description:
      "Share your sales volumes and margin targets for personalized pricing recommendations",
    options: ["CSV upload", "ERP sync", "Manual entry"],
    status: { label: "Not connected", color: "#9A9A9A" },
    cta: "Configure",
  },
  {
    icon: <MapPin size={20} color="#EA580C" strokeWidth={1.75} />,
    title: "Store locations",
    description:
      "Add your physical store locations for in-store competitive tracking and field intel",
    status: { label: "4 locations configured", color: "#22C55E" },
    cta: "Manage",
  },
];

function DataConnectionTile({ card }: { card: DataConnectionCard }) {
  return (
    <div
      style={{
        backgroundColor: "#FAFAF9",
        border: "1px solid #E5E2DB",
        borderRadius: 10,
        padding: 18,
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {card.icon}
        <div style={{ fontSize: 14, fontWeight: 600, color: "#1A1A18" }}>{card.title}</div>
      </div>
      <div style={{ fontSize: 12, color: "#6B6B6B", lineHeight: 1.5 }}>
        {card.description}
      </div>
      {card.options && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 2 }}>
          {card.options.map((opt) => (
            <span
              key={opt}
              style={{
                fontSize: 11,
                fontWeight: 500,
                color: "#6B6B6B",
                backgroundColor: "#FFFFFF",
                border: "1px solid #E5E2DB",
                borderRadius: 6,
                padding: "3px 8px",
              }}
            >
              {opt}
            </span>
          ))}
        </div>
      )}
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          marginTop: 2,
        }}
      >
        <StatusDot color={card.status.color} />
        <span style={{ fontSize: 11, color: card.status.color, fontWeight: 500 }}>
          {card.status.label}
        </span>
      </div>
      <a
        href="#"
        onClick={(e) => e.preventDefault()}
        style={{
          fontSize: 12,
          fontWeight: 500,
          color: "#EA580C",
          textDecoration: "none",
          marginTop: 2,
        }}
      >
        {card.cta}
      </a>
    </div>
  );
}

export function IntegrationsTab() {
  return (
    <Card>
      <CardTitle>API and integrations</CardTitle>
      <CardSubtitle>Connect PrizeSkout to your existing systems</CardSubtitle>

      {/* Your API key (for pulling data FROM PrizeSkout) */}
      <div style={{ marginTop: 18 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "#1A1A18" }}>Your API key</div>
        <div style={{ fontSize: 12, color: "#6B6B6B", marginTop: 4 }}>
          Use this key to pull PrizeSkout data into your own systems
        </div>
        <div
          style={{
            marginTop: 12,
            display: "flex",
            gap: 8,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
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

      {/* Webhooks */}
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

      {/* ERP and system integrations */}
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

      {/* Data connections (new) */}
      <div style={{ marginTop: 24 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "#1A1A18" }}>Data connections</div>
        <div style={{ fontSize: 12, color: "#6B6B6B", marginTop: 4, lineHeight: 1.5 }}>
          Connect your internal systems so PrizeSkout can combine your data with market
          intelligence for more accurate recommendations
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 14,
            marginTop: 12,
          }}
        >
          {DATA_CONNECTIONS.map((card) => (
            <DataConnectionTile key={card.title} card={card} />
          ))}
        </div>
      </div>
    </Card>
  );
}
