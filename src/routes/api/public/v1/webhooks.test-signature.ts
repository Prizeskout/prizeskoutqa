// Public debugging endpoint: recompute the v1 HMAC for a given secret,
// timestamp, and raw body so integrators can self-diagnose signature
// verification problems without needing a real delivery.
//
// SECURITY: This endpoint accepts the secret in the request body. It is the
// CALLER's secret (they own it) — we never store, log, or echo it back. The
// endpoint is safe to expose publicly because:
//   1. We don't return the secret in the response.
//   2. We don't persist anything from the request.
//   3. Computation is deterministic and equivalent to running openssl locally.

import { createFileRoute } from "@tanstack/react-router";
import { createHmac } from "crypto";
import { z } from "zod";

const Schema = z.object({
  // Don't restrict the format too much — users may paste any test secret. We
  // do enforce a sane length window to prevent obvious abuse / DoS.
  secret: z.string().min(8).max(512),
  // Unix epoch seconds, sent as a string to match the X-PrizeSkout-Timestamp
  // header verbatim. Accept either a numeric string or an actual number.
  timestamp: z.union([z.string().min(1).max(20), z.number().int()]),
  // Raw request body exactly as the receiver saw it. Cap at 256 KB so we
  // don't get used as a free HMAC oracle for arbitrary blobs.
  rawBody: z.string().max(256 * 1024),
  // Optional: the signature header the receiver got. If provided, we report
  // whether it matches what we computed.
  receivedSignature: z.string().max(2048).optional(),
});

function corsHeaders(extra: Record<string, string> = {}) {
  return {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Cache-Control": "no-store",
    ...extra,
  };
}

function parseSignatureHeader(header: string): {
  t?: string;
  v1?: string;
  sha256?: string;
  raw: Record<string, string>;
} {
  const raw: Record<string, string> = {};
  for (const part of header.split(",")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    raw[part.slice(0, idx).trim()] = part.slice(idx + 1).trim();
  }
  return { t: raw.t, v1: raw.v1, sha256: raw.sha256, raw };
}

// Constant-time hex-string comparison without leaking timing info.
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

export const Route = createFileRoute("/api/public/v1/webhooks/test-signature")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders() }),

      POST: async ({ request }) => {
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return new Response(
            JSON.stringify({ error: "invalid_json", message: "Request body must be valid JSON." }),
            { status: 400, headers: corsHeaders() },
          );
        }

        const parsed = Schema.safeParse(body);
        if (!parsed.success) {
          return new Response(
            JSON.stringify({
              error: "invalid_input",
              message: "Request body failed validation.",
              issues: parsed.error.issues.map((i) => ({
                path: i.path.join("."),
                message: i.message,
              })),
            }),
            { status: 400, headers: corsHeaders() },
          );
        }

        const { secret, rawBody, receivedSignature } = parsed.data;
        const timestamp = String(parsed.data.timestamp);

        const tsNumeric = Number(timestamp);
        if (!Number.isFinite(tsNumeric) || !Number.isInteger(tsNumeric) || tsNumeric <= 0) {
          return new Response(
            JSON.stringify({
              error: "invalid_timestamp",
              message: "timestamp must be a positive Unix epoch in seconds.",
            }),
            { status: 400, headers: corsHeaders() },
          );
        }

        const signedPayload = `${timestamp}.${rawBody}`;
        const v1 = createHmac("sha256", secret).update(signedPayload).digest("hex");
        const legacySha256 = createHmac("sha256", secret).update(rawBody).digest("hex");
        const expectedHeader = `t=${timestamp},v1=${v1},sha256=${legacySha256}`;

        // Replay-window diagnostic — informational only, since the caller is
        // explicitly providing a (likely historical) test timestamp.
        const nowSeconds = Math.floor(Date.now() / 1000);
        const skewSeconds = Math.abs(nowSeconds - tsNumeric);
        const TOLERANCE_SECONDS = 300;

        // If the caller passed a receivedSignature, compare it.
        let comparison: {
          provided: boolean;
          v1Matches?: boolean;
          sha256Matches?: boolean;
          parsed?: { t?: string; v1?: string; sha256?: string };
          notes?: string[];
        } = { provided: false };

        if (receivedSignature) {
          const parsedSig = parseSignatureHeader(receivedSignature);
          const notes: string[] = [];

          if (parsedSig.t && parsedSig.t !== timestamp) {
            notes.push(
              `t in received signature (${parsedSig.t}) does not match the timestamp you provided (${timestamp}). Use the same timestamp for both.`,
            );
          }
          const v1Matches = parsedSig.v1
            ? constantTimeEqual(parsedSig.v1, v1)
            : undefined;
          const sha256Matches = parsedSig.sha256
            ? constantTimeEqual(parsedSig.sha256, legacySha256)
            : undefined;

          if (v1Matches === false) {
            notes.push(
              "v1 mismatch — common causes: (1) signing the wrong byte string, e.g. parsed-and-reserialized JSON instead of the raw request body; (2) using a different secret than the one that signed this delivery; (3) a stale secret if the endpoint was rotated.",
            );
          }
          if (parsedSig.v1 === undefined) {
            notes.push("Received signature did not contain a v1=... value.");
          }

          comparison = {
            provided: true,
            v1Matches,
            sha256Matches,
            parsed: { t: parsedSig.t, v1: parsedSig.v1, sha256: parsedSig.sha256 },
            notes,
          };
        }

        return new Response(
          JSON.stringify(
            {
              ok: true,
              algorithm: "HMAC-SHA-256 over `{timestamp}.{rawBody}`",
              signedPayloadPreview:
                signedPayload.length > 200
                  ? `${signedPayload.slice(0, 200)}…(${signedPayload.length} bytes total)`
                  : signedPayload,
              expected: {
                v1,
                sha256: legacySha256,
                signatureHeader: expectedHeader,
              },
              replayCheck: {
                nowUnix: nowSeconds,
                providedUnix: tsNumeric,
                skewSeconds,
                toleranceSeconds: TOLERANCE_SECONDS,
                withinTolerance: skewSeconds <= TOLERANCE_SECONDS,
                note:
                  skewSeconds > TOLERANCE_SECONDS
                    ? `A live receiver applying the recommended 5-minute window would REJECT this timestamp as a replay. (This endpoint still computed the signature for debugging.)`
                    : "Within the recommended 5-minute replay window.",
              },
              comparison,
              docs: "https://prizeskout.qa/docs/guides/webhooks#verify",
            },
            null,
            2,
          ),
          { status: 200, headers: corsHeaders() },
        );
      },
    },
  },
});
