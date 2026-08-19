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
import { reconcileSallaEasyModeForAccount } from "@/server/core/salla-account-link";

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
        const accessCodeValue = request.headers.get("x-prizeskout-access-code")?.trim().toUpperCase() ?? "";
        const { data: authorizedCode } = await supabaseAdmin.from("ps_access_codes").select("merchant_id").eq("code", accessCodeValue).maybeSingle();
        if (!authorizedCode || authorizedCode.merchant_id !== merchantId) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });

        // Repairs Easy Mode installations received before account linking was
        // introduced. It only links after Salla and PrizeSkout independently
        // confirm the same merchant email.
        await reconcileSallaEasyModeForAccount(merchantId);

        const [{ data, error }, { data: accessCode }] = await Promise.all([
          supabaseAdmin
            .from("ps_merchant_channels")
            .select("platform, status, connected_at, metadata, webhook_secret")
            .eq("account_id", merchantId)
            .neq("status", "revoked"),
          // A merchant can hold more than one access code (e.g. re-registered
          // on another device) — .maybeSingle() throws when >1 row matches,
          // which was silently swallowed here (this destructure never checked
          // that query's error) and always fell back to null. Scoping to rows
          // that actually have a name set, newest first, makes this safe
          // regardless of how many codes the merchant has.
          supabaseAdmin
            .from("ps_access_codes")
            .select("store_name")
            .eq("merchant_id", merchantId)
            .not("store_name", "is", null)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
        ]);

        if (error) {
          return new Response(
            JSON.stringify({ error: "Failed to fetch channel status." }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }

        const statusMap: Record<string, { status: string; connected_at: string | null; metadata: Record<string, unknown> | null; webhook_secret?: string | null }> = {};
        for (const row of data ?? []) {
          statusMap[row.platform] = { status: row.status, connected_at: row.connected_at, metadata: row.metadata as Record<string, unknown> | null, webhook_secret: row.webhook_secret };
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
          if (p === "talabat") return { ...base, environment: row?.metadata?.environment === "sandbox" ? "sandbox" : "production", webhook_token_configured: !!row?.webhook_secret };
          return base;
        });

        return new Response(JSON.stringify({ channels, store_name: accessCode?.store_name ?? null }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
