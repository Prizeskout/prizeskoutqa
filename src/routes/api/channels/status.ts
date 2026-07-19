// GET /api/channels/status?merchant_id=...
//
// Returns the connection status of each platform for a given merchant.
// No API key required — uses merchant_id only. Read-only; returns no credentials.
//
// Response:
//   { channels: [{ platform, status, connected_at, needs_shop_id? }] }
//   status values: "connected" | "pending" | "error" | "not_connected"
//   needs_shop_id (keeta only): true once OAuth-connected but before the
//   post-connect Shop ID has been entered (Keeta's OAuth flow doesn't return one)

import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const ALL_PLATFORMS = [
  "salla", "foodics", "zid",
  "talabat", "jahez", "snoonu", "deliveroo", "keeta",
] as const;

export const Route = createFileRoute("/api/channels/status")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url        = new URL(request.url);
        const merchantId = url.searchParams.get("merchant_id") ?? "";

        if (!merchantId) {
          return new Response(
            JSON.stringify({ error: "merchant_id query param is required." }),
            { status: 400, headers: { "Content-Type": "application/json" } },
          );
        }

        const { data, error } = await supabaseAdmin
          .from("ps_merchant_channels")
          .select("platform, status, connected_at, metadata")
          .eq("account_id", merchantId)
          .neq("status", "revoked");

        if (error) {
          return new Response(
            JSON.stringify({ error: "Failed to fetch channel status." }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }

        const statusMap: Record<string, { status: string; connected_at: string | null; metadata: Record<string, unknown> | null }> = {};
        for (const row of data ?? []) {
          statusMap[row.platform] = { status: row.status, connected_at: row.connected_at, metadata: row.metadata as Record<string, unknown> | null };
        }

        // metadata (which holds refresh_token for OAuth channels) is
        // intentionally never spread into the response below — this endpoint
        // takes no API key, only merchant_id.
        const channels = ALL_PLATFORMS.map((p) => {
          const row = statusMap[p];
          const base = {
            platform:     p,
            status:       row?.status ?? "not_connected",
            connected_at: row?.connected_at ?? null,
          };
          if (p === "keeta") {
            const needsShopId = row?.status === "connected" && !row?.metadata?.shop_id;
            return { ...base, needs_shop_id: needsShopId };
          }
          return base;
        });

        return new Response(JSON.stringify({ channels }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
