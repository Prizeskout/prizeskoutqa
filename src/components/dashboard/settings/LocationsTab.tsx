import { MapPin, Pencil, Plus, Trash2 } from "lucide-react";
import {
  Card,
  CardSubtitle,
  CardTitle,
  IconAction,
  OutlineAddButton,
} from "./primitives";

type Location = {
  name: string;
  address: string;
  nearbyCompetitors: string;
  observations: number;
};

const LOCATIONS: Location[] = [
  {
    name: "Snoonu HQ",
    address: "Lusail, Marina District, Qatar",
    nearbyCompetitors: "Lulu Lusail, Carrefour Lusail",
    observations: 23,
  },
  {
    name: "Doha Festival City Partner Zone",
    address: "Doha Festival City, Umm Salal, Qatar",
    nearbyCompetitors: "Carrefour DFC, Lulu DFC",
    observations: 18,
  },
  {
    name: "Mall of Qatar Pickup Point",
    address: "Mall of Qatar, Al Rayyan, Qatar",
    nearbyCompetitors: "Carrefour MOQ",
    observations: 12,
  },
  {
    name: "Al Wakrah Service Center",
    address: "Al Wakrah, Qatar",
    nearbyCompetitors: "Lulu Al Wakrah",
    observations: 7,
  },
];

const MAX = Math.max(...LOCATIONS.map((l) => l.observations));

export function LocationsTab() {
  return (
    <Card>
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
          <CardTitle>Your store locations</CardTitle>
          <CardSubtitle>
            Physical locations where you operate and where field agents collect competitor data
          </CardSubtitle>
        </div>
        <OutlineAddButton icon={<Plus size={14} strokeWidth={2} />}>Add location</OutlineAddButton>
      </div>

      <div style={{ marginTop: 8 }}>
        {LOCATIONS.map((l, i) => {
          const isLast = i === LOCATIONS.length - 1;
          const pct = (l.observations / MAX) * 100;
          return (
            <div
              key={l.name}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 14,
                padding: "16px 0",
                borderBottom: isLast ? "none" : "1px solid #E5E2DB",
                flexWrap: "wrap",
              }}
            >
              <div style={{ minWidth: 0, flex: "1 1 240px" }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: "#1A1A18" }}>{l.name}</div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    marginTop: 6,
                  }}
                >
                  <MapPin size={12} color="#9A9A9A" />
                  <span style={{ fontSize: 12, color: "#6B6B6B" }}>{l.address}</span>
                </div>
                <div style={{ fontSize: 11, color: "#9A9A9A", marginTop: 4 }}>
                  Nearby competitors: {l.nearbyCompetitors}
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 18,
                  flexShrink: 0,
                }}
              >
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 12, color: "#6B6B6B" }}>
                    {l.observations} observations this month
                  </div>
                  <div
                    style={{
                      width: 60,
                      height: 6,
                      backgroundColor: "#F5F4F1",
                      borderRadius: 3,
                      marginTop: 6,
                      marginLeft: "auto",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${pct}%`,
                        height: "100%",
                        backgroundColor: "#EA580C",
                      }}
                    />
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <IconAction
                    ariaLabel={`Edit ${l.name}`}
                    icon={<Pencil size={14} color="#6B6B6B" />}
                  />
                  <IconAction
                    ariaLabel={`Remove ${l.name}`}
                    hoverColor="#EF4444"
                    icon={<Trash2 size={14} color="#9A9A9A" />}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
