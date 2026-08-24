// ============================================================================
// In-memory, per-IP rate limiter for unauthenticated / abuse-prone endpoints.
// ----------------------------------------------------------------------------
// This generalizes the inline limiter that previously lived only in
// `api/restore.ts` so every public auth endpoint can share one implementation.
//
// IMPORTANT — this runs inside a Cloudflare Worker. Each isolate holds its own
// copy of `buckets`, and isolates are spun up per-region and recycled under
// load, so this is a *soft* limiter, not a global guarantee:
//   • It reliably throttles a single source hammering one isolate — which is
//     exactly the brute-force / email-enumeration burst we care about here.
//   • Counters reset when an isolate is torn down, and two isolates don't share
//     state, so a distributed attacker gets a higher effective ceiling.
// For a hard global limit, layer Cloudflare's native rate-limiting rules in
// front, or move the counter into a shared store (Durable Object / a Supabase
// table). Kept in-memory deliberately: it matches the existing pattern and
// avoids a DB round-trip on every auth request.
// ============================================================================

export function clientIp(request: Request): string {
  return (
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0] ??
    "unknown"
  ).trim();
}

type Bucket = { count: number; resetAt: number };

export type RateLimitOptions = {
  /** Unique name for this limiter — keeps buckets for different endpoints separate. */
  name: string;
  /** Max requests allowed per IP within the window. */
  max: number;
  /** Window length in milliseconds. */
  windowMs: number;
};

export type RateLimitResult = {
  limited: boolean;
  /** Seconds until the current window resets — use for the Retry-After header. */
  retryAfterSeconds: number;
};

const buckets = new Map<string, Bucket>();

// Opportunistic cleanup so the Map can't grow unbounded inside a long-lived
// isolate. Runs at most once per sweep interval; cheap and self-throttling.
let lastSweep = 0;
const SWEEP_INTERVAL_MS = 5 * 60_000;
function sweep(now: number) {
  if (now - lastSweep < SWEEP_INTERVAL_MS) return;
  lastSweep = now;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

/**
 * Record one hit from this request's client IP and report whether it has now
 * exceeded `max` within `windowMs`. Fixed-window semantics: the window starts
 * on the first hit and every hit inside it counts, so the (max+1)-th hit is
 * the first to be limited.
 */
export function checkRateLimit(request: Request, options: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  sweep(now);
  const key = `${options.name}:${clientIp(request)}`;
  const current = buckets.get(key);
  const next: Bucket =
    !current || current.resetAt <= now
      ? { count: 1, resetAt: now + options.windowMs }
      : { count: current.count + 1, resetAt: current.resetAt };
  buckets.set(key, next);
  return {
    limited: next.count > options.max,
    retryAfterSeconds: Math.max(1, Math.ceil((next.resetAt - now) / 1000)),
  };
}

/** Ready-to-return 429 with the correct Content-Type and Retry-After headers. */
export function tooManyRequests(
  retryAfterSeconds: number,
  message = "Too many requests. Please slow down and try again shortly.",
): Response {
  return new Response(JSON.stringify({ error: message }), {
    status: 429,
    headers: {
      "Content-Type": "application/json",
      "Retry-After": String(retryAfterSeconds),
    },
  });
}
