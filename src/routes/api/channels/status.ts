// GET /api/channels/status?merchant_id=...
//
// Returns the connection status of each platform for a given merchant.
// No API key required — uses merchant_id only. Read-only; returns no credentials.
//
// Response:
//   { channels: [{ platform, status, connected_at }] }
//   status values: "connected" | "pending" | "error" | "not_connected"

import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const ALL_PLATFORMS = [
  "salla", "foodics", "zid",
  "talabat", "jahez", "snoonu", "deliveroo",
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
          .select("platform, status, connected_at")
          .eq("account_id", merchantId)
          .neq("status", "revoked");

        if (error) {
          return new Response(
            JSON.stringify({ error: "Failed to fetch channel status." }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }

        const statusMap: Record<string, { status: string; connected_at: string | null }> = {};
        for (const row of data ?? []) {
          statusMap[row.platform] = { status: row.status, connected_at: row.connected_at };
        }

        const channels = ALL_PLATFORMS.map((p) => ({
          platform:     p,
          status:       statusMap[p]?.status ?? "not_connected",
          connected_at: statusMap[p]?.connected_at ?? null,
        }));

        return new Response(JSON.stringify({ channels }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
