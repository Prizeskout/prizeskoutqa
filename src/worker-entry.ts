import { createStartHandler, defaultStreamHandler } from "@tanstack/react-start/server";
import { cfCtxStorage } from "./server/cf-ctx";

interface ExecCtx {
  waitUntil(promise: Promise<unknown>): void;
}

// Cloudflare Workers attach geo metadata to the request via request.cf.
// This type narrows what we use — the full type is IncomingRequestCfProperties.
type CfRequest = Request & { cf?: { country?: string } };

const startFetch = createStartHandler(defaultStreamHandler);

export function createServerEntry(entry: { fetch: (...args: unknown[]) => unknown }) {
  return {
    async fetch(...args: unknown[]) {
      return await (entry.fetch as (...a: unknown[]) => Promise<unknown>)(...args);
    },
  };
}

export default {
  async fetch(request: Request, env: unknown, ctx?: ExecCtx): Promise<Response> {
    // Read the country at the Worker boundary where request.cf is available.
    // This is the authoritative source — request.cf.country is set by the
    // Cloudflare runtime before the fetch handler is invoked.
    const cfReq = request as CfRequest;
    const cfCountry =
      cfReq.cf?.country?.trim().toUpperCase() ||
      request.headers.get("CF-IPCountry")?.trim().toUpperCase() ||
      "unknown";

    const runFetch = () =>
      (startFetch as (req: Request, env: unknown) => Promise<Response>)(request, env);

    const response: Response = ctx?.waitUntil
      ? await cfCtxStorage.run(ctx.waitUntil.bind(ctx), runFetch)
      : await runFetch();

    // X-PS-Country: debug header — shows exactly what the Worker detected for
    // this request. Verify with: curl -sI https://…workers.dev/ | grep X-PS-Country
    // Safe to leave in: it's only a country code, not a user identifier.
    // Remove once geo detection is confirmed working in production.
    const headers = new Headers(response.headers);
    headers.set("X-PS-Country", cfCountry);

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  },
};
