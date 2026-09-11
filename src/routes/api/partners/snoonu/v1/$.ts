import { createFileRoute } from "@tanstack/react-router";
import {
  authorizeSnoonuPartner, getSnoonuPartnerConnection, listSnoonuActivationRequests,
  provisionSnoonuMerchant, rotateSnoonuWebhookSecret, suspendSnoonuMerchant,
  validatePrizeSkoutMerchantId, validateSnoonuProvisioningInput,
} from "@/server/connectors/snoonu/partner-control";

const headers = { "Content-Type": "application/json", "X-PrizeSkout-Contract": "snoonu-partner-control-v1", "Cache-Control": "no-store" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });

async function handle(request: Request, splat: string) {
  const auth = authorizeSnoonuPartner(request);
  if (auth === "missing_configuration") return json({ error: "Snoonu partner control is not configured." }, 503);
  if (auth === "unauthorized") return json({ error: "Unauthorized." }, 401);
  const parts = splat.split("/").filter(Boolean);
  try {
    if (request.method === "GET" && parts.length === 1 && parts[0] === "activation-requests") {
      return json({ data: await listSnoonuActivationRequests() });
    }
    if (parts[0] !== "merchants" || !parts[1]) return json({ error: "Unknown Snoonu partner operation." }, 404);
    const merchantId = validatePrizeSkoutMerchantId(parts[1]);
    if (request.method === "GET" && parts.length === 2) {
      const connection = await getSnoonuPartnerConnection(merchantId);
      return connection ? json({ data: connection }) : json({ error: "Merchant connection not found." }, 404);
    }
    if (request.method === "PUT" && parts.length === 2) {
      const input = validateSnoonuProvisioningInput(await request.json());
      const result = await provisionSnoonuMerchant(merchantId, input);
      return json({ data: result.connection, webhook: {
        endpoint: `${new URL(request.url).origin}/api/webhooks/snoonu`,
        secret: result.webhookSecret,
        signature_header: "X-Snoonu-Signature",
        timestamp_header: "X-Snoonu-Timestamp",
      } }, 201);
    }
    if (request.method === "DELETE" && parts.length === 2) {
      let reason = "Suspended by Snoonu";
      try { const body = await request.json() as { reason?: unknown }; if (typeof body.reason === "string" && body.reason.trim()) reason = body.reason.trim(); } catch { /* optional body */ }
      const connection = await suspendSnoonuMerchant(merchantId, reason);
      return connection ? json({ data: connection }) : json({ error: "Merchant connection not found." }, 404);
    }
    if (request.method === "POST" && parts.length === 3 && parts[2] === "rotate-webhook-secret") {
      const result = await rotateSnoonuWebhookSecret(merchantId);
      return result ? json({ data: result.connection, webhook_secret: result.webhookSecret }) : json({ error: "Connected merchant not found." }, 404);
    }
    return json({ error: "Unknown Snoonu partner operation." }, 404);
  } catch (error) {
    if (error instanceof SyntaxError) return json({ error: "Request body must be valid JSON." }, 422);
    return json({ error: error instanceof Error ? error.message : "Snoonu partner operation failed." }, 400);
  }
}

export const Route = createFileRoute("/api/partners/snoonu/v1/$")({
  server: { handlers: {
    GET: ({ request, params }) => handle(request, params._splat ?? ""),
    PUT: ({ request, params }) => handle(request, params._splat ?? ""),
    POST: ({ request, params }) => handle(request, params._splat ?? ""),
    DELETE: ({ request, params }) => handle(request, params._splat ?? ""),
  } },
});
