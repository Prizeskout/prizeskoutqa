import { createHmac, randomBytes, timingSafeEqual } from "crypto";

type Capability = { merchant_id: string; nonce: string; exp: number };

function secret() {
  const value = process.env.ONBOARDING_CAPABILITY_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!value) throw new Error("Onboarding capability signing is not configured.");
  return value;
}

function encode(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

export function issueOnboardingCapability(merchantId: string = crypto.randomUUID()) {
  const payload: Capability = {
    merchant_id: merchantId,
    nonce: randomBytes(24).toString("base64url"),
    exp: Date.now() + 30 * 60 * 1000,
  };
  const encoded = encode(JSON.stringify(payload));
  const signature = createHmac("sha256", secret()).update(encoded).digest("base64url");
  return { merchant_id: payload.merchant_id, token: `${encoded}.${signature}`, expires_at: payload.exp };
}

export function verifyOnboardingCapability(token: string, merchantId: string) {
  const [encoded, supplied] = token.split(".");
  if (!encoded || !supplied) return false;
  const expected = createHmac("sha256", secret()).update(encoded).digest("base64url");
  const a = Buffer.from(supplied);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as Capability;
    return payload.merchant_id === merchantId && payload.exp > Date.now() && payload.nonce.length >= 24;
  } catch {
    return false;
  }
}

export function secureAccessCode(region = "QA") {
  const cleanRegion = region.replace(/[^A-Z]/gi, "").toUpperCase().slice(0, 3) || "QA";
  return `PSK-${cleanRegion}-${randomBytes(18).toString("base64url").toUpperCase()}`;
}
