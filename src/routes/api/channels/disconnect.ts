// POST /api/channels/disconnect
// Body: { merchant_id, platform }

import { createFileRoute } from "@tanstack/react-router";
import { disconnectChannel, verifyMerchantAccess } from "@/server/core/byok-connect";

export const Route = createFileRoute("/api/channels/disconnect")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: Record<string, string>;
        try { body = await request.json() as Record<string, string>; }
        catch { return resp({ error: "Invalid JSON." }, 422); }

        const { merchant_id, access_code, platform } = body;
        if (!merchant_id || !platform) return resp({ error: "merchant_id and platform are required." }, 400);

        const authorized = await verifyMerchantAccess(merchant_id, access_code ?? "");
        if (!authorized) return resp({ error: "Unauthorized." }, 401);

        await disconnectChannel(merchant_id, platform);
        return resp({ ok: true, platform }, 200);
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
