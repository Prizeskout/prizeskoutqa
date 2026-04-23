import { createFileRoute } from "@tanstack/react-router";
import { ClipboardList } from "lucide-react";
import { ProductDetailPage } from "@/components/marketing/ProductDetailPage";

export const Route = createFileRoute("/products/field-intel")({
  head: () => ({
    meta: [
      { title: "Field Intel API | PrizeSkout" },
      {
        name: "description",
        content:
          "Ingest in-store observations from field reps. Reconcile online vs in-store prices programmatically via REST.",
      },
      { property: "og:title", content: "Field Intel API | PrizeSkout" },
      {
        property: "og:description",
        content:
          "Programmatic ingestion and reconciliation of in-store observations from field reps.",
      },
    ],
  }),
  component: () => (
    <ProductDetailPage
      eyebrow="Field Intel API"
      title="The shelf, in JSON."
      subtitle="Push in-store observations from your field reps straight into the platform, reconcile them against online prices, and feed everything downstream — no bespoke pipeline, no CSV wrangling."
      icon={ClipboardList}
      endpoints={[
        { method: "POST", path: "/v1/field-intel/observations", desc: "Ingest an in-store observation from a field rep" },
        { method: "GET", path: "/v1/field-intel/observations", desc: "List observations with filters by store, agent, SKU, date" },
        { method: "GET", path: "/v1/field-intel/price-gaps", desc: "Reconciled discrepancies between online and in-store prices" },
      ]}
      features={[
        "Structured observation schema: store, SKU, price, promo, condition, timestamp, photo URL",
        "Automatic reconciliation against your latest online prices for the same SKU",
        "Price-gap detection with direction and magnitude",
        "Agent-level activity rollups for team management",
        "Photo attachments stored securely and returned with signed URLs",
        "Works with any mobile tool — our SDKs wrap the REST API for Android and iOS",
      ]}
      sampleRequest={`curl https://api.prizeskout.qa/v1/field-intel/observations \\
  -H "Authorization: Bearer sk_live_••••" \\
  -H "Content-Type: application/json" \\
  -d '{
    "store": "carrefour_lusail",
    "product_id": "sku_galaxy_buds_2_pro",
    "price": 445.00,
    "condition": "on_endcap",
    "promo_detail": "Buy 2 save 10%",
    "agent_id": "agent_042"
  }'`}
      sampleResponse={`{
  "id": "obs_01HX9P2K3M7QZ8Y4N6W5B1E2F0",
  "reconciled": true,
  "online_price": 449.00,
  "gap": -4.00,
  "direction": "below_online"
}`}
      useCases={[
        { title: "Field ops app", desc: "Build your own field-rep app and post observations straight to the API." },
        { title: "Price-gap alerts", desc: "Fire webhooks when in-store prices diverge from online by more than a threshold." },
        { title: "Rep performance", desc: "Pull agent activity rollups into your HR and performance systems." },
      ]}
    />
  ),
});
