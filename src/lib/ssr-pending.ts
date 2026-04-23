/**
 * On the server, our Supabase auth session lives in localStorage and is
 * unavailable. Previously this returned a never-resolving promise so that
 * TanStack Router would keep the route in its `pendingComponent` during SSR.
 *
 * That approach is incompatible with the Cloudflare Worker runtime: a request
 * that never resolves trips the Worker's "code hung" guard and returns a 502
 * before the streaming pending HTML can be flushed.
 *
 * New strategy: callers pass an empty default that matches their loader's
 * return shape. The SSR pass resolves immediately with that empty payload,
 * route components render an empty shell, and on the client `staleTime: 0`
 * causes the loader to re-run with the real Supabase session and replace
 * the empty shell with real data on first paint.
 */
export function pendingOnSSR<T>(empty: T): Promise<T> {
  return Promise.resolve(empty);
}
