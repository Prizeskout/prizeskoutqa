import { Check } from "lucide-react";

const ITEMS = [
  "Your delivery fee structure and how it affects price sensitivity by zone across Doha, Lusail, and Al Wakrah",
  "Which product categories have the highest return rates on your platform and how that affects true margin",
  "Your customer base skews 14% toward premium buyers with higher average basket value than the market",
  "Your same-day delivery advantage justifies 3 to 7% price premiums on electronics compared to Amazon and Noon",
  "Your Sunday evening order spike pattern and how different promotion types perform during that window",
  "Your merchant commission structure and how it creates a different margin floor per category",
  "Seasonal demand curves specific to your platform, including Ramadan, Eid, and National Day patterns",
  "Price elasticity coefficients for your top 200 SKUs, calibrated against 11 months of actual sales data",
];

export function ModelKnowledge() {
  return (
    <div
      style={{
        backgroundColor: "#FFFFFF",
        border: "1px solid #E5E2DB",
        borderRadius: 10,
        padding: "20px 24px",
      }}
    >
      <div style={{ fontSize: 15, fontWeight: 600, color: "#1A1A18" }}>
        What your model knows that a generic tool does not
      </div>
      <div style={{ fontSize: 12, color: "#6B6B6B", marginTop: 4 }}>
        Unique intelligence learned from 11 months of Snoonu data
      </div>
      <div style={{ marginTop: 8 }}>
        {ITEMS.map((item, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              gap: 12,
              alignItems: "flex-start",
              padding: "10px 0",
              borderBottom: i === ITEMS.length - 1 ? "none" : "1px solid #F5F4F1",
            }}
          >
            <div
              style={{
                width: 22,
                height: 22,
                borderRadius: "50%",
                backgroundColor: "rgba(34, 197, 94, 0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                marginTop: 1,
              }}
            >
              <Check size={14} color="#22C55E" />
            </div>
            <div style={{ fontSize: 13, fontWeight: 400, color: "#1A1A18", lineHeight: 1.5 }}>
              {item}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
