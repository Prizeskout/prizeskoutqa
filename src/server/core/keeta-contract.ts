export type KeetaFlatValue = string | number | boolean;

export function canonicalKeetaParams(params: Record<string, KeetaFlatValue>): string {
  return Object.keys(params)
    .filter((key) => key !== "sig")
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");
}

export type KeetaWebhookEnvelope = {
  appId: string;
  eventId: string;
  messageId: string;
  shopId: string;
  timestamp: string;
  message: Record<string, unknown>;
  signedParams: Record<string, KeetaFlatValue>;
};

export function parseKeetaWebhook(payload: Record<string, unknown>): KeetaWebhookEnvelope {
  const required = ["appId", "eventId", "messageId", "shopId", "timestamp"] as const;
  for (const key of required) {
    if (payload[key] === undefined || payload[key] === null || String(payload[key]).trim() === "") {
      throw new Error(`Missing ${key}`);
    }
  }
  if (typeof payload.sig !== "string" || !payload.sig) throw new Error("Missing sig");

  let message: unknown = payload.message;
  if (typeof message === "string") {
    try { message = JSON.parse(message); } catch { throw new Error("Invalid message JSON"); }
  }
  if (!message || typeof message !== "object" || Array.isArray(message)) {
    throw new Error("Invalid message payload");
  }

  const signedParams: Record<string, KeetaFlatValue> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (key !== "sig" && (typeof value === "string" || typeof value === "number" || typeof value === "boolean")) {
      signedParams[key] = value;
    }
  }

  return {
    appId: String(payload.appId),
    eventId: String(payload.eventId),
    messageId: String(payload.messageId),
    shopId: String(payload.shopId),
    timestamp: String(payload.timestamp),
    message: message as Record<string, unknown>,
    signedParams,
  };
}
