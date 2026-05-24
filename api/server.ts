/**
 * Vercel Serverless Function (Node.js 20) — wraps TanStack Start's
 * Fetch-API-based request handler for deployment on Vercel.
 *
 * `dist/server/index.js` is produced by `vite build` *before* Vercel
 * compiles this function, so the import below resolves correctly.
 *
 * Routing:  static assets in dist/client/ are served by Vercel's CDN
 * (see vercel.json → "outputDirectory"); every other request falls
 * through to this function for SSR and server-function handling.
 */

// @ts-ignore — dist/server/server.js is generated at build time by `vite build`
// The filename comes from the TanStack Start plugin; the default export is
// { fetch: (request: Request) => Promise<Response> }.
import server from "../dist/server/server.js";
import type { IncomingMessage, ServerResponse } from "node:http";

export const config = {
  api: {
    /** Keep the raw body stream so we can forward it to the Fetch handler. */
    bodyParser: false,
    /** Allow streaming SSR responses of any size. */
    responseLimit: false,
  },
};

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const url = `${proto}://${host}${(req as any).url ?? "/"}`;

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

  // ── Collect request body (skip for GET / HEAD) ───────────────────────────
  const chunks: Buffer[] = [];
  if (req.method !== "GET" && req.method !== "HEAD") {
    for await (const chunk of req as AsyncIterable<Buffer>) {
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
    // @ts-ignore
    duplex: "half",
  });

  // ── Delegate to TanStack Start ────────────────────────────────────────────
  const response: Response = await server.fetch(request);

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
