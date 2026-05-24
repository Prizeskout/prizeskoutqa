/**
 * Vercel Serverless Function (Node.js 20) — wraps TanStack Start's
 * Fetch-API-based request handler.
 *
 * Written as plain JavaScript (.mjs) so Vercel's dependency tracer
 * (@vercel/nft / acorn) does not encounter TypeScript syntax.
 * TypeScript source files use colon tokens for type annotations which
 * acorn (JavaScript-mode parser) cannot handle → "Unhandled type: ColonToken".
 *
 * dist/server/server.js is produced by `vite build` before Vercel compiles
 * this function. It exports { default: server } where server.fetch is the
 * Fetch-API handler.
 */

// dist/server/server.js is generated at build time by `vite build`.
import server from "../dist/server/server.js";

export const config = {
  api: {
    /** Keep the raw body stream so we can forward it to the Fetch handler. */
    bodyParser: false,
    /** Allow streaming SSR responses of any size. */
    responseLimit: false,
  },
};

export default async function handler(req, res) {
  // ── Reconstruct full URL ──────────────────────────────────────────────────
  const proto =
    (Array.isArray(req.headers["x-forwarded-proto"])
      ? req.headers["x-forwarded-proto"][0]
      : req.headers["x-forwarded-proto"]) ?? "https";

  const host =
    (Array.isArray(req.headers["x-forwarded-host"])
      ? req.headers["x-forwarded-host"][0]
      : req.headers["x-forwarded-host"]) ??
    (Array.isArray(req.headers.host)
      ? req.headers.host[0]
      : req.headers.host) ??
    "localhost";

  const url = `${proto}://${host}${req.url ?? "/"}`;

  // ── Build Fetch-compatible Headers ────────────────────────────────────────
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value !== undefined) {
      if (Array.isArray(value)) {
        value.forEach((v) => headers.append(key, v));
      } else {
        headers.set(key, value);
      }
    }
  }

  // ── Collect request body (skip for GET / HEAD) ────────────────────────────
  const chunks = [];
  if (req.method !== "GET" && req.method !== "HEAD") {
    for await (const chunk of req) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
  }
  const body = chunks.length > 0 ? Buffer.concat(chunks) : null;

  // ── Create Fetch Request ──────────────────────────────────────────────────
  const request = new Request(url, {
    method: req.method ?? "GET",
    headers,
    body: body && body.length > 0 ? body : undefined,
    // Required for request bodies in Node.js 18+
    duplex: "half",
  });

  // ── Delegate to TanStack Start ────────────────────────────────────────────
  const response = await server.fetch(request);

  // ── Write response status + headers ──────────────────────────────────────
  res.statusCode = response.status;
  for (const [key, value] of response.headers.entries()) {
    res.setHeader(key, value);
  }

  // ── Stream response body ──────────────────────────────────────────────────
  if (response.body) {
    const reader = response.body.getReader();
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(Buffer.from(value));
      }
    } finally {
      reader.releaseLock();
    }
    res.end();
  } else {
    res.end();
  }
}
