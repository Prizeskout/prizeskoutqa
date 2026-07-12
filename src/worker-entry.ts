import { createStartHandler, defaultStreamHandler } from "@tanstack/react-start/server";
import { cfCtxStorage } from "./server/cf-ctx";

interface ExecCtx {
  waitUntil(promise: Promise<unknown>): void;
}

const startFetch = createStartHandler(defaultStreamHandler);

export function createServerEntry(entry: { fetch: (...args: unknown[]) => unknown }) {
  return {
    async fetch(...args: unknown[]) {
      return await (entry.fetch as (...a: unknown[]) => Promise<unknown>)(...args);
    },
  };
}

// Embed widget responses set X-Frame-Options: ALLOWALL so partners can iframe the widget.
// All other responses get SAMEORIGIN + a restrictive CSP with frame-ancestors 'self'.
const EMBED_FRAME_HEADER = "ALLOWALL";

const CSP_POLICY = [
  "default-src 'self'",
  // TanStack SSR hydration writes inline <script> blocks — unsafe-inline is required.
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  "img-src 'self' data: blob: https:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
  "frame-ancestors 'self'",
  "form-action 'self'",
  "base-uri 'self'",
].join("; ");

function applySecurityHeaders(headers: Headers): void {
  const isEmbedResponse = headers.get("X-Frame-Options") === EMBED_FRAME_HEADER;

  // Always enforce HTTPS with a 2-year HSTS window.
  headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");

  // Prevent MIME-type sniffing on all responses.
  headers.set("X-Content-Type-Options", "nosniff");

  // Limit referrer leakage to same-origin cross-origin requests.
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  // Disable unnecessary browser features.
  headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

  if (!isEmbedResponse) {
    // Non-embed pages must not be framed by third-party sites.
    headers.set("X-Frame-Options", "SAMEORIGIN");
    headers.set("Content-Security-Policy", CSP_POLICY);
  }
  // Embed widget keeps its own X-Frame-Options: ALLOWALL set by the route handler.
}

export default {
  async fetch(request: Request, env: unknown, ctx?: ExecCtx): Promise<Response> {
    const runFetch = () =>
      (startFetch as (req: Request, env: unknown) => Promise<Response>)(request, env);

    const response: Response = ctx?.waitUntil
      ? await cfCtxStorage.run(ctx.waitUntil.bind(ctx), runFetch)
      : await runFetch();

    const headers = new Headers(response.headers);
    applySecurityHeaders(headers);

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  },
};
