/**
 * On the server, our Supabase auth session lives in localStorage and is
 * unavailable. Rather than resolve the loader with empty arrays (which causes
 * an empty flash followed by a client-side refetch), we return a promise that
 * never resolves during SSR. TanStack Router keeps the route in its pending
 * state, which serializes as the route's `pendingComponent` (the skeleton).
 *
 * On the client, the loader runs normally with the real session and resolves
 * with data on first paint — no double-fetch.
 */
export function pendingOnSSR<T>(): Promise<T> {
  if (typeof window === "undefined") {
    // Never resolves — route stays in pendingComponent during SSR.
    return new Promise<T>(() => {});
  }
  // Should not be reached on the client; callers branch on `typeof window`.
  return Promise.resolve(undefined as unknown as T);
}
