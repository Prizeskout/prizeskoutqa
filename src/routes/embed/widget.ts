// White-Label Embed Widget renderer (API 13 — public GET /embed/widget)
//
// Auth: embed JWT in ?token= query param (no API key required).
// Flow:
//   1. Decode claims (no-verify) → extract licensee_id
//   2. Fetch embed_configs row for licensee → get signing_key_hex + branding
//   3. Verify HS256 signature + expiry
//   4. Assert token has at least one valid embed scope
//   5. Fetch merchant data (recommendation + competitor prices)
//   6. Render branded HTML (no Prizeskout reference when powered_by_visible=false)
//
// Security: signature is verified before any DB query on merchant data.
// Bad / expired / wrong-scope token → 401 JSON.

import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  decodeEmbedJWTClaims,
  verifyEmbedJWT,
  fetchWidgetData,
  renderWidget,
} from "@/server/embed-handlers";

const VALID_SCOPES = new Set([
  "pricing_widget",
  "roi_summary",
  "competitor_chart",
  "action_items",
]);

function jsonErr(code: string, message: string, status: number): Response {
  return new Response(JSON.stringify({ error: { code, message } }), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "X-Frame-Options": "ALLOWALL",
    },
  });
}

export const Route = createFileRoute("/embed/widget")({
  server: {
    handlers: {
      GET: async ({ request }): Promise<Response> => {
        const url = new URL(request.url);
        const token = url.searchParams.get("token");

        if (!token) return jsonErr("missing_token", "?token= is required.", 401);

        // Step 1: Decode without verify to get licensee_id for key lookup.
        const rawClaims = decodeEmbedJWTClaims(token);
        if (!rawClaims || typeof rawClaims.licensee_id !== "string") {
          return jsonErr("invalid_token", "Token is malformed or missing licensee_id.", 401);
        }
        const licenseeId = rawClaims.licensee_id;

        // Step 2: Fetch embed config (includes signing key + branding).
        const { data: cfg, error: cfgErr } = await supabaseAdmin
          .from("embed_configs")
          .select("signing_key_hex, brand_name, primary_color, logo_url, powered_by_visible")
          .eq("licensee_id", licenseeId)
          .maybeSingle();

        if (cfgErr) return jsonErr("internal_error", cfgErr.message, 500);
        if (!cfg) {
          return jsonErr(
            "embed_config_not_found",
            "No embed config for this licensee. The platform has not configured their white-label settings.",
            401,
          );
        }

        // Step 3: Verify signature + expiry.
        const result = verifyEmbedJWT(token, (cfg as { signing_key_hex: string }).signing_key_hex);
        if (!result.valid) {
          return jsonErr(
            result.error === "token_expired" ? "token_expired" : "invalid_token",
            result.error === "token_expired"
              ? "Embed token has expired. Request a new one via POST /v1/embed/token."
              : "Token signature is invalid.",
            401,
          );
        }

        const claims = result.claims;

        // Step 4: Scope check — token must grant at least one embed scope.
        const tokenScopes: string[] = Array.isArray(claims.scopes)
          ? (claims.scopes as string[]).filter((s) => VALID_SCOPES.has(s))
          : [];
        if (tokenScopes.length === 0) {
          return jsonErr(
            "insufficient_scope",
            "Token grants no valid widget scopes. Include at least one of: pricing_widget, roi_summary, competitor_chart, action_items.",
            401,
          );
        }

        // Step 5: Fetch merchant data.
        const merchantId = typeof claims.account_id === "string" ? claims.account_id : "";
        if (!merchantId) return jsonErr("invalid_token", "Token missing account_id.", 401);

        const data = await fetchWidgetData(merchantId);

        // Step 6: Render branded HTML.
        const branding = {
          brand_name: (cfg as { brand_name: string }).brand_name,
          primary_color: (cfg as { primary_color: string }).primary_color,
          logo_url: (cfg as { logo_url: string | null }).logo_url,
          powered_by_visible: (cfg as { powered_by_visible: boolean }).powered_by_visible,
        };

        const html = renderWidget(data, branding, tokenScopes);

        return new Response(html, {
          status: 200,
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            "X-Frame-Options": "ALLOWALL",
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": "no-store",
          },
        });
      },
    },
  },
});
