import {createHmac, randomBytes, timingSafeEqual} from "node:crypto";
import {supabaseAdmin} from "@/integrations/supabase/client.server";

const cleanDomain = (value: string) => value.trim().toLowerCase().replace(/^@/, "").replace(/[^a-z0-9.-]/g, "");
export const evidenceMailboxDomain = () => cleanDomain(process.env.EVIDENCE_MAILBOX_DOMAIN || "evidence.prizeskout.qa");

export async function getOrCreateEvidenceMailbox(accountId: string, merchantId: string) {
  const db = supabaseAdmin as any;
  const {data: existing, error: readError} = await db.from("ps_evidence_mailboxes")
    .select("id,local_part,status,created_at").eq("account_id", accountId).eq("merchant_id", merchantId).maybeSingle();
  if (readError) throw new Error(readError.message);
  if (existing) return {...existing, address: `${existing.local_part}@${evidenceMailboxDomain()}`};
  const localPart = `merchant-${randomBytes(12).toString("hex")}`;
  const {data, error} = await db.from("ps_evidence_mailboxes").insert({account_id: accountId, merchant_id: merchantId, local_part: localPart})
    .select("id,local_part,status,created_at").single();
  if (error || !data) throw new Error(error?.message ?? "Could not create the evidence forwarding address.");
  return {...data, address: `${data.local_part}@${evidenceMailboxDomain()}`};
}
export async function resolveEvidenceMailbox(recipient: string) {
  const normalized = recipient.trim().toLowerCase();
  const [localPart, domain, ...rest] = normalized.split("@");
  if (!localPart || !domain || rest.length || domain !== evidenceMailboxDomain()) return null;
  const {data, error} = await (supabaseAdmin as any).from("ps_evidence_mailboxes")
    .select("account_id,merchant_id,local_part,status").eq("local_part", localPart).eq("status", "active").maybeSingle();
  if (error) throw new Error(error.message);
  return data as {account_id: string; merchant_id: string; local_part: string; status: string} | null;
}

export function verifyInboundEmailSignature(rawBody: string, supplied: string | null, secret = process.env.INBOUND_EVIDENCE_WEBHOOK_SECRET || "") {
  if (!secret || !supplied) return false;
  const value = supplied.trim().replace(/^sha256=/i, "").toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(value)) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest();
  const received = Buffer.from(value, "hex");
  return received.length === expected.length && timingSafeEqual(received, expected);
}
