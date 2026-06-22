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

export default {
  async fetch(request: Request, env: unknown, ctx?: ExecCtx): Promise<Response> {
    if (ctx?.waitUntil) {
      return cfCtxStorage.run(ctx.waitUntil.bind(ctx), () =>
        (startFetch as (req: Request, env: unknown) => Promise<Response>)(request, env),
      );
    }
    return (startFetch as (req: Request, env: unknown) => Promise<Response>)(request, env);
  },
};
