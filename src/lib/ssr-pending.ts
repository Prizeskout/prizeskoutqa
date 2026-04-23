/**
 * On the server, our Supabase auth session lives in localStorage and is
 * unavailable. Previously this returned a never-resolving promise so that
 * TanStack Router would keep the route in its `pendingComponent` during SSR.
 *
 * That approach is incompatible with the Cloudflare Worker runtime: a request
 * that never resolves trips the Worker's "code hung" guard and returns a 502
 * before the streaming pending HTML can be flushed.
 *
 * New strategy: resolve immediately with an empty payload (cast to T). The
 * route components are written to handle empty arrays/objects gracefully -
 * they render an empty shell on the SSR pass. On the client, `staleTime: 0`
 * causes the loader to re-run with the real Supabase session and replace
 * the empty shell with real data on first paint - no perceptible flash.
 */
export function pendingOnSSR<T>(): Promise<T> {
  // Return a structurally-empty object. Routes destructure arrays out of this
  // (e.g. `data.metrics ?? []`) and cope with missing fields.
  return Promise.resolve({} as T);
}
