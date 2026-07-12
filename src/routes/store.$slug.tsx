import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  type DemoScenario,
  getScenario,
  getScenarioOverrides,
  SCENARIO_STORAGE_KEY,
  type DemoProduct,
} from "@/lib/demo-scenarios";

export const Route = createFileRoute("/store/$slug")({
  component: StorefrontPage,
  loader: ({ params }: { params: { slug: string } }): { scenario: DemoScenario | null } => {
    return { scenario: getScenario(params.slug) ?? null };
  },
});

function StorefrontPage() {
  const { scenario } = Route.useLoaderData() as { scenario: DemoScenario | null };

  if (!scenario) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "#6B7280" }}>
        Store not found.
      </div>
    );
  }

  return <StorefrontContent scenario={scenario} />;
}

function StorefrontContent({ scenario }: { scenario: DemoScenario }) {
  const [overrides, setOverrides] = useState<Record<string, number>>(
    () => getScenarioOverrides(scenario.id),
  );

  useEffect(() => {
    const key = SCENARIO_STORAGE_KEY(scenario.id);
    function handleStorage(e: StorageEvent) {
      if (e.key === key) {
        try {
          setOverrides(e.newValue ? JSON.parse(e.newValue) : {});
        } catch { /* empty */ }
      }
    }
    window.addEventListener("storage", handleStorage);

    function handleLocalUpdate() {
      setOverrides(getScenarioOverrides(scenario.id));
    }
    window.addEventListener("ps-override-update", handleLocalUpdate);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("ps-override-update", handleLocalUpdate);
    };
  }, [scenario.id]);

  const appliedCount = Object.keys(overrides).length;

  return (
    <div style={{
      minHeight: "100vh",
      background: "#FAFAFA",
      fontFamily: "system-ui, -apple-system, sans-serif",
    }}>
      <StorefrontHeader scenario={scenario} appliedCount={appliedCount} />
      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px" }}>
        {appliedCount > 0 && (
          <div style={{
            background: "#DCFCE7",
            border: "1px solid #86EFAC",
            borderRadius: 12,
            padding: "12px 18px",
            marginBottom: 28,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}>
            <span style={{ fontSize: 18 }}>✓</span>
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: "#15803D" }}>
                {appliedCount} price{appliedCount !== 1 ? "s" : ""} updated by PrizeSkout AI
              </div>
              <div style={{ fontSize: 12, color: "#16A34A" }}>
                Pricing recommendations applied from your dashboard. Prices update in real time.
              </div>
            </div>
          </div>
        )}

        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "#111827", margin: 0, marginBottom: 4 }}>
            All Products
          </h2>
          <p style={{ fontSize: 13.5, color: "#6B7280", margin: 0 }}>
            {scenario.products.length} products · {scenario.category}
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: 20 }}>
          {scenario.products.map((product) => (
            <ProductCard
              key={product.sku}
              product={product}
              scenario={scenario}
              overridePrice={overrides[product.sku]}
            />
          ))}
        </div>
      </main>

      <StorefrontFooter scenario={scenario} />
    </div>
  );
}

function StorefrontHeader({ scenario, appliedCount }: { scenario: DemoScenario; appliedCount: number }) {
  const primaryColor = scenario.primaryColor;
  return (
    <header style={{
      background: "#fff",
      borderBottom: "1px solid #E5E7EB",
      position: "sticky",
      top: 0,
      zIndex: 100,
      boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
    }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 64 }}>
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 38,
              height: 38,
              background: `linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor}99 100%)`,
              borderRadius: 10,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 20,
            }}>
              {scenario.products[0]?.imageEmoji ?? "🛍️"}
            </div>
            <div>
              <div style={{ fontSize: 17, fontWeight: 700, color: "#111827", lineHeight: 1 }}>
                {scenario.name}
              </div>
              <div style={{ fontSize: 11.5, color: "#6B7280", marginTop: 2 }}>on {scenario.platform}</div>
            </div>
          </div>

          {/* Nav */}
          <nav style={{ display: "flex", alignItems: "center", gap: 24 }}>
            {["Home", "Products", "Deals", "Support"].map((item) => (
              <span key={item} style={{ fontSize: 13.5, color: "#374151", cursor: "pointer" }}>{item}</span>
            ))}
          </nav>

          {/* Cart + back link */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <a
              href={`/dashboard/scenarios/${scenario.id}`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontSize: 12.5,
                fontWeight: 600,
                color: "#7C3AED",
                background: "rgba(124,58,237,0.07)",
                border: "1px solid rgba(124,58,237,0.2)",
                borderRadius: 8,
                padding: "6px 12px",
                textDecoration: "none",
                whiteSpace: "nowrap",
              }}
            >
              ← Back to PrizeSkout
            </a>
            {appliedCount > 0 && (
              <div style={{
                background: "#DCFCE7",
                border: "1px solid #86EFAC",
                borderRadius: 8,
                padding: "4px 10px",
                fontSize: 11.5,
                color: "#15803D",
                fontWeight: 600,
              }}>
                {appliedCount} AI price update{appliedCount !== 1 ? "s" : ""} active
              </div>
            )}
            <div style={{
              background: "#F3F4F6",
              borderRadius: 8,
              padding: "8px 14px",
              fontSize: 13.5,
              cursor: "pointer",
              color: "#374151",
            }}>
              🛒 Cart (0)
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

function ProductCard({
  product,
  scenario,
  overridePrice,
}: {
  product: DemoProduct;
  scenario: DemoScenario;
  overridePrice?: number;
}) {
  const hasOverride = overridePrice !== undefined;
  const displayPrice = hasOverride ? overridePrice : product.basePrice;
  const primaryColor = scenario.primaryColor;
  const fmt = (p: number) => p.toFixed(p < 100 ? 2 : 0);

  return (
    <div style={{
      background: "#fff",
      border: hasOverride ? `2px solid ${primaryColor}40` : "1px solid #E5E7EB",
      borderRadius: 14,
      overflow: "hidden",
      transition: "box-shadow 0.15s, border-color 0.15s",
      boxShadow: hasOverride ? `0 2px 12px ${primaryColor}20` : "0 1px 4px rgba(0,0,0,0.04)",
    }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 20px rgba(0,0,0,0.1)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = hasOverride
          ? `0 2px 12px ${primaryColor}20`
          : "0 1px 4px rgba(0,0,0,0.04)";
      }}
    >
      {/* Product image area */}
      <div style={{
        background: hasOverride ? `${primaryColor}08` : "#F9FAFB",
        height: 150,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 64,
        position: "relative",
      }}>
        {product.imageEmoji}
        {hasOverride && (
          <div style={{
            position: "absolute",
            top: 10,
            right: 10,
            background: "#16A34A",
            color: "#fff",
            fontSize: 10,
            fontWeight: 700,
            padding: "3px 8px",
            borderRadius: 999,
            letterSpacing: "0.03em",
          }}>
            AI UPDATED
          </div>
        )}
      </div>

      {/* Product info */}
      <div style={{ padding: "14px 16px" }}>
        <div style={{ fontSize: 11, color: "#9CA3AF", marginBottom: 4 }}>{product.category}</div>
        <div style={{
          fontSize: 13.5,
          fontWeight: 600,
          color: "#111827",
          lineHeight: 1.35,
          marginBottom: 8,
          minHeight: 36,
        }}>
          {product.name}
        </div>
        <div style={{ fontSize: 11.5, color: "#6B7280", lineHeight: 1.5, marginBottom: 12 }}>
          {product.description}
        </div>

        {/* Price */}
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 12 }}>
          <span style={{
            fontSize: 17,
            fontWeight: 700,
            color: hasOverride ? "#16A34A" : "#111827",
          }}>
            QAR {fmt(displayPrice)}
          </span>
          {hasOverride && (
            <span style={{ fontSize: 12.5, color: "#9CA3AF", textDecoration: "line-through" }}>
              QAR {fmt(product.basePrice)}
            </span>
          )}
        </div>

        {hasOverride && (
          <div style={{
            fontSize: 11,
            color: "#15803D",
            background: "#F0FDF4",
            border: "1px solid #BBF7D0",
            borderRadius: 6,
            padding: "5px 10px",
            marginBottom: 10,
            display: "flex",
            alignItems: "center",
            gap: 5,
          }}>
            <span>🤖</span>
            <span>Price updated by PrizeSkout AI</span>
          </div>
        )}

        {/* Add to cart */}
        <button style={{
          width: "100%",
          background: primaryColor,
          color: "#fff",
          border: "none",
          borderRadius: 8,
          padding: "10px 0",
          fontSize: 13,
          fontWeight: 600,
          cursor: "pointer",
        }}>
          Add to Cart
        </button>
      </div>
    </div>
  );
}

function StorefrontFooter({ scenario }: { scenario: DemoScenario }) {
  return (
    <footer style={{
      background: "#111827",
      color: "#9CA3AF",
      padding: "32px 24px",
      marginTop: 48,
    }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 4 }}>{scenario.name}</div>
            <div style={{ fontSize: 13, color: "#6B7280" }}>{scenario.tagline}</div>
          </div>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "rgba(124,58,237,0.12)",
            border: "1px solid rgba(124,58,237,0.25)",
            borderRadius: 10,
            padding: "8px 16px",
          }}>
            <span style={{ fontSize: 14 }}>✦</span>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#C4B5FD" }}>Pricing Intelligence by PrizeSkout</div>
              <div style={{ fontSize: 11, color: "#7C3AED" }}>Prices optimized in real time · Backed by QSTP & Qatar Foundation</div>
            </div>
          </div>
        </div>
        <div style={{ borderTop: "1px solid #1F2937", marginTop: 24, paddingTop: 20, fontSize: 12, color: "#4B5563" }}>
          © 2026 {scenario.name} · Demo scenario powered by PrizeSkout · Prices shown for demonstration purposes
        </div>
      </div>
    </footer>
  );
}
