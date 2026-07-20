// POST /api/channels/connect
// Dashboard-facing endpoint — no API key required, uses merchant_id from body.
// Supports: talabat (OAuth BYOK), jahez (secret key BYOK),
//           keeta_shop_id (post-OAuth shop-ID capture for an already-
//           connected Keeta channel — Keeta itself connects via /api/auth/keeta)

import { createFileRoute } from "@tanstack/react-router";
import { connectTalabat, connectJahez, verifyMerchantAccess, setKeetaShopId } from "@/server/core/byok-connect";
import { getMerchantMarginFloor, setMerchantMarginFloor } from "@/server/core/merchant-pricing-config";

type Body = Record<string, string>;

export const Route = createFileRoute("/api/channels/connect")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const json = () => new Response(
          JSON.stringify({ error: "Request body must be valid JSON." }),
          { status: 422, headers: { "Content-Type": "application/json" } },
        );

        let body: Body;
        try { body = await request.json() as Body; }
        catch { return json(); }

        const { merchant_id, access_code, platform } = body;
        if (!merchant_id) return resp({ error: "merchant_id is required." }, 400);
        if (!platform)    return resp({ error: "platform is required." }, 400);

        const authorized = await verifyMerchantAccess(merchant_id, access_code ?? "");
        if (!authorized) return resp({ error: "Unauthorized." }, 401);

        try {
          if (platform === "talabat") {
            const { client_id, client_secret, vendor_id, chain_id } = body;
            if (!client_id || !client_secret || !vendor_id || !chain_id) {
              return resp({ error: "Talabat requires client_id, client_secret, vendor_id, and chain_id." }, 400);
            }
            const result = await connectTalabat({ merchantId: merchant_id, clientId: client_id, clientSecret: client_secret, vendorId: vendor_id, chainId: chain_id });
            return result.ok
              ? resp({ ok: true, platform }, 200)
              : resp({ ok: false, error: result.message }, 200);
          }

          if (platform === "jahez") {
            const { api_key, secret_code, branch_id } = body;
            if (!api_key || !secret_code || !branch_id) {
              return resp({ error: "Jahez requires api_key, secret_code, and branch_id." }, 400);
            }
            const result = await connectJahez({ merchantId: merchant_id, apiKey: api_key, secretCode: secret_code, branchId: branch_id });
            return result.ok
              ? resp({ ok: true, platform }, 200)
              : resp({ ok: false, error: result.message }, 200);
          }

          if (platform === "keeta_shop_id") {
            // Synthetic platform key, deliberately not "keeta" — Keeta itself
            // can only ever be connected via OAuth (/api/auth/keeta), never
            // through a credential-paste flow. This branch only finishes an
            // already-connected Keeta channel by capturing its Shop ID.
            const { shop_id } = body;
            if (!shop_id) return resp({ error: "Keeta requires shop_id." }, 400);
            const result = await setKeetaShopId(merchant_id, shop_id);
            return result.ok
              ? resp({ ok: true, platform }, 200)
              : resp({ ok: false, error: result.message }, 200);
          }

          if (platform === "margin_floor") {
            // Not a real "channel" — multiplexed onto this endpoint because
            // PipeOps' production routing (separate from the Cloudflare
            // Worker deploy) blocks any brand-new URL path outright, even
            // under an already-working prefix. Reusing this proven path
            // until that's resolved on PipeOps' side. See merchant-pricing-
            // config.ts for what actually enforces this value.
            if (body.action === "set") {
              const pct = Number(body.margin_floor_pct);
              if (!(pct > 0 && pct < 1)) {
                return resp({ error: "margin_floor_pct must be between 0 and 1 (exclusive)." }, 400);
              }
              const result = await setMerchantMarginFloor(merchant_id, pct);
              return result.ok
                ? resp({ ok: true, margin_floor_pct: pct }, 200)
                : resp({ ok: false, error: result.error }, 400);
            }
            const pct = await getMerchantMarginFloor(merchant_id);
            return resp({ ok: true, margin_floor_pct: pct }, 200);
          }

          return resp({ error: `Unsupported platform: ${platform}. Supported: talabat, jahez, keeta_shop_id, margin_floor.` }, 400);
        } catch (err) {
          console.error("[connect] unhandled error:", err);
          return resp({ ok: false, error: "Unexpected error. Please try again." }, 200);
        }
      },
    },
  },
});

function resp(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
