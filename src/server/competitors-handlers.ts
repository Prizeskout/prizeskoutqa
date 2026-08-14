// ============================================================================
// Real handlers for the /v1/competitors/* endpoints.
//
// Tenancy: per-user (auth.uid via the API key's user_id). The competitor_*
// tables are scoped by user_id, so we filter on ctx.userId.
//
// Empty-data behavior: when a user has no rows for a given query, we fall
// back to the documented sample response so the docs sandbox never feels
// dead. The fallback is marked with `_fallback: "sample"` in metadata so
// integrators can detect it.
// ============================================================================

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { runScrape } from "@/server/scrape-runner";
import { backgroundTask } from "@/server/cf-ctx";
import type { V1Context, V1Result } from "@/server/v1-handlers";

function ok(body: unknown, status = 200, headers?: Record<string, string>): V1Result {
  return { status, body, headers };
}

function err(code: string, message: string, status: number, extra?: Record<string, unknown>): V1Result {
  return { status, body: { error: { code, message, ...extra } } };
}

// Encode the row id to/from a px_<short> style identifier. We expose the
// underlying uuid prefix so it stays stable across requests.
function toPriceId(uuid: string): string {
  return `px_${uuid.replace(/-/g, "").slice(0, 10)}`;
}

// Map a competitor_prices row into the documented response shape.
function shapePriceRow(row: any) {
  const competitors: Record<string, unknown> = {};
  for (const key of ["talabat", "carrefour", "amazon", "noon", "lulu"] as const) {
    if (row[key] && typeof row[key] === "object") {
      competitors[key] = row[key];
    }
  }
  return {
    id: toPriceId(row.id),
    _row_id: row.id,
    product: row.product,
    category: row.category,
    channel: row.channel,
    your_price: Number(row.your_price),
    currency: "QAR",
    competitors,
    signal: row.signal,
  };
}

// ============================================================================
// GET /v1/competitors/prices
// ============================================================================
export async function handleListPrices(request: Request, ctx: V1Context): Promise<V1Result> {
  const url = new URL(request.url);
  const category = url.searchParams.get("category");
  const channel = url.searchParams.get("channel");
  const competitor = url.searchParams.get("competitor");
  const limitRaw = parseInt(url.searchParams.get("limit") ?? "25", 10);
  const limit = Math.min(Math.max(Number.isFinite(limitRaw) ? limitRaw : 25, 1), 100);

  let q = supabaseAdmin
    .from("competitor_prices")
    .select("*")
    .eq("user_id", ctx.userId)
    .order("position", { ascending: true })
    .limit(limit + 1);

  if (category) q = q.eq("category", category);
  if (channel) q = q.eq("channel", channel);

  const { data, error } = await q;
  if (error) {
    console.error("list-prices: query failed", error);
    return err("internal_error", "Failed to load competitor prices.", 500);
  }

  let rows = (data ?? []) as any[];

  // Optional competitor filter — keep rows that have a price for that
  // competitor key.
  if (competitor) {
    rows = rows.filter((r) => r[competitor] && typeof r[competitor] === "object");
  }

  if (rows.length === 0) {
    return ok({
      data: [
        {
          id: "px_3f9c2",
          product: "Sony WH-1000XM5",
          category: "Electronics",
          channel: "online",
          your_price: 1199,
          currency: "QAR",
          competitors: {
            carrefour: { price: 1149, observed_at: "2026-04-23T10:14:00Z" },
            amazon: { price: 1179, observed_at: "2026-04-23T10:09:00Z" },
            noon: { price: 1199, observed_at: "2026-04-23T10:11:00Z" },
          },
          signal: "undercut",
        },
      ],
      page: { has_more: false, next_cursor: null },
      _fallback: "sample",
    });
  }

  const hasMore = rows.length > limit;
  const page = rows.slice(0, limit).map(shapePriceRow);
  return ok({
    data: page,
    page: { has_more: hasMore, next_cursor: null },
  });
}

// ============================================================================
// GET /v1/competitors/prices/{id}
// ============================================================================
export async function handleGetPrice(_request: Request, ctx: V1Context, priceId: string): Promise<V1Result> {
  // px_<short> — match by id prefix (uuid without dashes starts with this).
  const short = priceId.replace(/^px_/, "").trim();
  if (!short) {
    return err("validation_failed", "Invalid price id.", 422);
  }

  // Look up by full uuid prefix. We store as uuid; match the de-dashed prefix.
  const { data, error } = await supabaseAdmin
    .from("competitor_prices")
    .select("*")
    .eq("user_id", ctx.userId);

  if (error) {
    console.error("get-price: query failed", error);
    return err("internal_error", "Failed to load competitor price.", 500);
  }

  const row = (data ?? []).find((r: any) => (r.id as string).replace(/-/g, "").startsWith(short));
  if (!row) {
    // Fallback to documented sample so the sandbox always has something.
    return ok({
      id: priceId,
      product: "Sony WH-1000XM5",
      category: "Electronics",
      channel: "online",
      your_price: 1199,
      currency: "QAR",
      competitors: {
        carrefour: { price: 1149, observed_at: "2026-04-23T10:14:00Z" },
        amazon: { price: 1179, observed_at: "2026-04-23T10:09:00Z" },
      },
      signal: "undercut",
      _fallback: "sample",
    });
  }
  return ok(shapePriceRow(row));
}

// ============================================================================
// GET /v1/competitors/prices/history
// ============================================================================
export async function handlePriceHistory(request: Request, ctx: V1Context): Promise<V1Result> {
  const url = new URL(request.url);
  const product = url.searchParams.get("product");
  const monthsRaw = parseInt(url.searchParams.get("months") ?? "6", 10);
  const months = Math.min(Math.max(Number.isFinite(monthsRaw) ? monthsRaw : 6, 1), 24);

  if (!product) {
    return err("validation_failed", "Missing required query parameter: product.", 422, {
      fields: [{ name: "product", error: "required" }],
    });
  }

  const { data, error } = await supabaseAdmin
    .from("competitor_price_history")
    .select("month_label, you, talabat, carrefour, amazon, position")
    .eq("user_id", ctx.userId)
    .eq("product", product)
    .order("position", { ascending: true })
    .limit(months);

  if (error) {
    console.error("price-history: query failed", error);
    return err("internal_error", "Failed to load price history.", 500);
  }

  const rows = (data ?? []) as any[];
  if (rows.length === 0) {
    return ok({
      product,
      currency: "QAR",
      series: [
        { month: "2025-11", you: 1299, carrefour: 1249, amazon: 1259, talabat: 1279 },
        { month: "2025-12", you: 1249, carrefour: 1199, amazon: 1229, talabat: 1259 },
        { month: "2026-01", you: 1199, carrefour: 1149, amazon: 1179, talabat: 1239 },
      ],
      _fallback: "sample",
    });
  }

  return ok({
    product,
    currency: "QAR",
    series: rows.map((r) => ({
      month: r.month_label,
      you: r.you !== null ? Number(r.you) : null,
      carrefour: r.carrefour !== null ? Number(r.carrefour) : null,
      amazon: r.amazon !== null ? Number(r.amazon) : null,
      talabat: r.talabat !== null ? Number(r.talabat) : null,
    })),
  });
}

// ============================================================================
// POST /v1/competitors/scrape
// ============================================================================
export async function handleTriggerScrape(request: Request, ctx: V1Context): Promise<V1Result> {
  let body: Record<string, unknown> = {};
  try {
    const text = await request.text();
    body = text ? JSON.parse(text) : {};
  } catch {
    return err("validation_failed", "Request body must be valid JSON.", 422);
  }

  const url = typeof body.url === "string" ? body.url.trim() : "";
  const jobId = `scr_${Math.random().toString(36).slice(2, 8)}`;
  const eta = new Date(Date.now() + 4 * 60 * 1000).toISOString();

  if (url) {
    // Validate the URL.
    try {
      const parsed = new URL(url);
      if (!parsed.protocol.startsWith("http")) throw new Error("bad protocol");
    } catch {
      return err("validation_failed", "Body field `url` must be a valid http(s) URL.", 422);
    }

    // Fire the scrape in the background. Don't await — return job id immediately.
    backgroundTask(runScrape(supabaseAdmin as any, { userId: ctx.userId, url }, { maxAttempts: 1, timeoutMs: 60_000 }).catch((e) => {
      console.error("scrape (single url) failed in background", e);
    }));

    return ok(
      {
        job_id: jobId,
        status: "queued",
        target: "single_url",
        url,
        estimated_completion: eta,
      },
      202,
    );
  }

  // No URL → enqueue all tracked URLs for this user.
  const { data: urls, error: urlsErr } = await supabaseAdmin
    .from("competitor_product_urls")
    .select("url, product, competitor")
    .eq("user_id", ctx.userId)
    .limit(500);

  if (urlsErr) {
    console.error("scrape (all): tracked-url query failed", urlsErr);
    return err("internal_error", "Failed to load tracked URLs.", 500);
  }

  const tracked = (urls ?? []) as Array<{ url: string; product: string | null; competitor: string | null }>;
  // Concurrency cap of 3 (per spec note).
  backgroundTask((async () => {
    const queue = [...tracked];
    const workers = Array.from({ length: Math.min(3, queue.length) }, async () => {
      while (queue.length > 0) {
        const job = queue.shift();
        if (!job) break;
        try {
          await runScrape(supabaseAdmin as any, {
            userId: ctx.userId,
            url: job.url,
            product: job.product ?? undefined,
            competitor: job.competitor ?? undefined,
          });
        } catch (e) {
          console.error("scrape (all): job failed", job.url, e);
        }
      }
    });
    await Promise.all(workers);
  })().catch((e) => console.error("scrape (all) supervisor failed", e)));

  return ok(
    {
      job_id: jobId,
      status: "queued",
      target: "all_tracked_urls",
      url_count: tracked.length,
      estimated_completion: eta,
    },
    202,
  );
}

// ============================================================================
// GET /v1/competitors/coverage
// ============================================================================
// Per-(product × competitor) scrape status matrix. Shows fresh prices,
// OOS/unscrapeable (null_price), failures, and never-scraped pairs.
// ============================================================================
export async function handleScrapeCoverage(_request: Request, ctx: V1Context): Promise<V1Result> {
  const { data: urlRows, error: urlErr } = await supabaseAdmin
    .from("competitor_product_urls")
    .select("product, competitor, url, category")
    .eq("user_id", ctx.userId)
    .neq("competitor", "self")
    .order("product");

  if (urlErr) return err("internal_error", urlErr.message, 500);

  const urls = (urlRows ?? []) as Array<{
    product: string; competitor: string; url: string; category: string | null;
  }>;

  if (urls.length === 0) {
    return ok({
      coverage: [],
      summary: { total: 0, success: 0, null_price: 0, failed: 0, never_scraped: 0, stale: 0 },
      ceiling_note: "No competitor URLs tracked. POST a URL via /v1/competitors/scrape or seed via admin script.",
    });
  }

  const urlSet = urls.map((u) => u.url);
  const { data: scrapeRows, error: scrErr } = await supabaseAdmin
    .from("competitor_scrapes")
    .select("url, status, price, error, scraped_at")
    .eq("user_id", ctx.userId)
    .in("url", urlSet)
    .order("scraped_at", { ascending: false })
    .limit(urlSet.length * 10);

  if (scrErr) return err("internal_error", scrErr.message, 500);

  const latestByUrl = new Map<string, { status: string; price: number | null; error: string | null; scraped_at: string }>();
  for (const s of (scrapeRows ?? []) as any[]) {
    if (!latestByUrl.has(s.url)) latestByUrl.set(s.url, s);
  }

  const STALE_HOURS = 48;
  const now = Date.now();

  const coverage = urls.map((u) => {
    const sc = latestByUrl.get(u.url);
    if (!sc) {
      return { product: u.product, competitor: u.competitor, status: "never_scraped", price: null, last_scraped_at: null, age_hours: null, stale: false, skip_reason: null };
    }
    const ageHours = Math.round(((now - new Date(sc.scraped_at).getTime()) / 3_600_000) * 10) / 10;
    const stale = sc.status === "success" && ageHours > STALE_HOURS;
    return {
      product: u.product,
      competitor: u.competitor,
      status: stale ? "stale" : sc.status,
      price: sc.price,
      last_scraped_at: sc.scraped_at,
      age_hours: ageHours,
      stale,
      skip_reason: sc.status !== "success" ? (sc.error ?? null) : null,
    };
  });

  const summary = {
    total:         coverage.length,
    success:       coverage.filter((c) => c.status === "success").length,
    stale:         coverage.filter((c) => c.stale).length,
    null_price:    coverage.filter((c) => c.status === "null_price").length,
    failed:        coverage.filter((c) => c.status === "failed" || c.status === "error").length,
    never_scraped: coverage.filter((c) => c.status === "never_scraped").length,
  };

  return ok({
    coverage,
    summary,
    ceiling_note:
      "Coverage limited to products with known competitor URLs. " +
      "Scaling to an arbitrary catalog requires automated SKU→URL entity-resolution " +
      "(separate roadmap). Local-chain brands (e.g. Al Meera) have no cross-retailer URLs.",
  });
}

// ============================================================================
// GET /v1/competitors/patterns
// ============================================================================
export async function handleListPatterns(request: Request, ctx: V1Context): Promise<V1Result> {
  const url = new URL(request.url);
  const competitor = url.searchParams.get("competitor");
  const minConfRaw = parseInt(url.searchParams.get("min_confidence") ?? "70", 10);
  const minConfidence = Math.min(Math.max(Number.isFinite(minConfRaw) ? minConfRaw : 70, 0), 100);

  let q = supabaseAdmin
    .from("behavior_patterns")
    .select("id, competitor, category, channel, pattern, confidence, detection_period, impact, recommendation, position")
    .eq("user_id", ctx.userId)
    .gte("confidence", minConfidence)
    .order("position", { ascending: true })
    .limit(100);

  if (competitor) {
    // Match case-insensitively because the column stores display case ("Talabat").
    q = q.ilike("competitor", competitor);
  }

  const { data, error } = await q;
  if (error) {
    console.error("list-patterns: query failed", error);
    return err("internal_error", "Failed to load patterns.", 500);
  }

  const rows = (data ?? []) as any[];
  if (rows.length === 0) {
    return ok({
      data: [
        {
          id: "pat_4b1d",
          competitor: "Talabat",
          category: "Electronics",
          channel: "online",
          pattern: "Drops electronics 12-18% the Thursday before public holidays",
          confidence: 92,
          detection_period: "Last 11 months",
          impact: "high",
          recommendation: "Pre-position your prices Wednesday evening, not Thursday morning.",
        },
      ],
      _fallback: "sample",
    });
  }

  return ok({
    data: rows.map((r) => ({
      id: `pat_${(r.id as string).replace(/-/g, "").slice(0, 6)}`,
      competitor: r.competitor,
      category: r.category,
      channel: r.channel,
      pattern: r.pattern,
      confidence: r.confidence,
      detection_period: r.detection_period,
      impact: r.impact,
      recommendation: r.recommendation,
    })),
  });
}

// ============================================================================
// GET /v1/competitors/cache-stats
// ============================================================================
// Returns scrape cost savings from the shared URL cache: how many Firecrawl
// calls were avoided by deduplicating URLs across tenants.
// Platform-readable; also available to any authenticated tenant (shows only
// aggregate numbers — no per-tenant data is exposed).
export async function handleCacheStats(_request: Request, _ctx: V1Context): Promise<V1Result> {
  // Recent runs (last 30)
  const { data: runs, error: runsErr } = await supabaseAdmin
    .from("scrape_cost_log")
    .select("run_id,run_at,due_urls,cache_hit_urls,scrapes_performed,scrapes_saved,savings_pct,ok,null_price,failed,watchers_notified")
    .order("run_at", { ascending: false })
    .limit(30) as unknown as { data: any[] | null; error: unknown };

  if (runsErr) return err("internal_error", "Failed to load cache stats.", 500);

  // Totals across all recorded runs
  const { data: totals, error: totErr } = await supabaseAdmin
    .from("scrape_cost_log")
    .select("scrapes_performed,scrapes_saved") as unknown as { data: any[] | null; error: unknown };

  if (totErr) return err("internal_error", "Failed to load totals.", 500);

  const totalPerformed = (totals ?? []).reduce((s, r) => s + (r.scrapes_performed ?? 0), 0);
  const totalSaved     = (totals ?? []).reduce((s, r) => s + (r.scrapes_saved     ?? 0), 0);
  const totalOld       = totalPerformed + totalSaved;
  const overallPct     = totalOld > 0 ? Math.round((totalSaved / totalOld) * 100) : 0;

  // Current cache size
  const { count: cacheSize } = await supabaseAdmin
    .from("competitor_url_cache")
    .select("*", { count: "exact", head: true });

  return ok({
    cache_size:       cacheSize ?? 0,
    all_time: {
      scrapes_performed: totalPerformed,
      scrapes_saved:     totalSaved,
      savings_pct:       overallPct,
    },
    recent_runs: (runs ?? []).map((r) => ({
      run_id:            r.run_id,
      run_at:            r.run_at,
      due_urls:          r.due_urls,
      cache_hit_urls:    r.cache_hit_urls,
      scrapes_performed: r.scrapes_performed,
      scrapes_saved:     r.scrapes_saved,
      savings_pct:       r.scrapes_performed + r.scrapes_saved > 0
        ? Math.round(r.scrapes_saved / (r.scrapes_performed + r.scrapes_saved) * 100)
        : 0,
      ok:                r.ok,
      null_price:        r.null_price,
      failed:            r.failed,
      watchers_notified: r.watchers_notified,
    })),
  });
}

