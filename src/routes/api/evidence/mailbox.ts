import {createFileRoute} from "@tanstack/react-router";
import {verifyMerchantAccess} from "@/server/core/byok-connect";
import {getOrCreateEvidenceMailbox} from "@/server/core/evidence-mailbox";

const response = (data: unknown, status = 200) => new Response(JSON.stringify(data), {status, headers: {"Content-Type": "application/json"}});

export const Route = createFileRoute("/api/evidence/mailbox")({server:{handlers:{
  POST: async ({request}) => { try {
    const body = await request.json() as {merchant_id?: string; access_code?: string};
    const merchantId = String(body.merchant_id ?? "").trim();
    if (!await verifyMerchantAccess(merchantId, String(body.access_code ?? ""))) return response({error: "Unauthorized"}, 403);
    const mailbox = await getOrCreateEvidenceMailbox(merchantId, merchantId);
    return response({
      ok: true, address: mailbox.address, status: mailbox.status, created_at: mailbox.created_at,
      options: [
        {id: "private_forwarding_address", status: "ready", address: mailbox.address, explanation: "Forward individual business emails or attachments to this private address."},
        {id: "automatic_forwarding_rule", status: "ready", address: mailbox.address, explanation: "Create a rule in your current mailbox so matching business emails are forwarded automatically."},
        {id: "connected_mailbox", status: "not_configured", explanation: "Optionally authorize PrizeSkout to collect matching messages from a mailbox in read-only mode."},
      ],
    });
  } catch (error) { return response({error: error instanceof Error ? error.message : "Could not prepare the forwarding address."}, 422); }
  },
}}});
