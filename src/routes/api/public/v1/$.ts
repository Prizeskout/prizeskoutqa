// Test-mode API dispatcher.
// Powers the "Try it out" button in /docs by accepting any /api/v1/* request,
// validating the caller's test-mode API key, and returning the documented
// sample response. This is a sandbox - it does NOT touch real account data.
//
// Live-mode keys are rejected here. They will eventually route to real
// production handlers; for now they get a clear "not yet available" response.

import { createFileRoute } from "@tanstack/react-router";
import { createHash } from "crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { API_GROUPS, type EndpointSpec } from "@/lib/api-spec";
import { dispatchV1Handler, V1_HANDLER_KEYS, type V1Context } from "@/server/v1-handlers";

function hashKey(raw: string) {
  return createHash("sha256").update(raw).digest("hex");
}

function json(body: unknown, status: number, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "X-PrizeSkout-Mode": "test",
      ...extraHeaders,
    },
  });
}

// Build a lookup keyed by "METHOD /v1/path" with placeholders normalized.
// e.g. "GET /v1/competitors/prices/{id}" matches "GET /v1/competitors/prices/px_123".
type Match = { spec: EndpointSpec; pattern: RegExp };
const ROUTE_TABLE: Match[] = API_GROUPS.flatMap((g) => g.endpoints).map((spec) => {
  const escaped = spec.path
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    .replace(/\\\{[^}]+\\\}/g, "[^/]+");
  return { spec, pattern: new RegExp(`^${escaped}$`) };
});

function matchEndpoint(method: string, fullPath: string): EndpointSpec | null {
  for (const { spec, pattern } of ROUTE_TABLE) {
    if (spec.method === method && pattern.test(fullPath)) return spec;
  }
  return null;
}

async function handle(request: Request, splat: string) {
  const fullPath = `/v1/${splat}`;

  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Authorization, Content-Type",
      },
    });
  }

  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace(/^Bearer\s+/i, "").trim();

  if (!token) {
    return json(
      {
        error: {
          code: "unauthorized",
          message: "Missing Authorization header. Pass `Authorization: Bearer <your_test_key>`.",
        },
      },
      401,
    );
  }

  // Look up the key
  const { data: keyRow, error: keyErr } = await supabaseAdmin
    .from("api_keys")
    .select("id, mode, revoked_at, scopes, user_id")
    .eq("key_hash", hashKey(token))
    .maybeSingle();

  if (keyErr) {
    console.error("api/v1: key lookup failed", keyErr);
    return json({ error: { code: "internal_error", message: "Key lookup failed." } }, 500);
  }
  if (!keyRow) {
    return json({ error: { code: "unauthorized", message: "Invalid API key." } }, 401);
  }
  if (keyRow.revoked_at) {
    return json({ error: { code: "unauthorized", message: "This API key has been revoked." } }, 401);
  }
  if (keyRow.mode !== "test") {
    return json(
      {
        error: {
          code: "live_mode_unavailable",
          message:
            "Live mode endpoints are not yet generally available. Use a test key (sk_test_...) to explore the API in the sandbox.",
        },
      },
      403,
    );
  }

  // ---------------------------------------------------------------------------
  // Real-handler branch: if this path/method has a Week 2+ implementation,
  // run it against actual account-scoped Postgres tables instead of returning
  // the documented sample response.
  // ---------------------------------------------------------------------------
  if (V1_HANDLER_KEYS.has(`${request.method} ${fullPath}`)) {
    // Resolve the account for this API key (uses find_account_for_api_key SQL helper).
    const { data: acctRows, error: acctErr } = await supabaseAdmin
      .rpc("find_account_for_api_key", { _api_key_id: keyRow.id });

    if (acctErr || !acctRows || acctRows.length === 0) {
      return json(
        {
          error: {
            code: "account_not_provisioned",
            message:
              "Your API key is not yet linked to an account. This usually resolves itself on first dashboard login. Contact support if it persists.",
          },
        },
        409,
      );
    }
    const acct = acctRows[0];
    const ctx: V1Context = {
      apiKeyId: keyRow.id,
      userId: keyRow.user_id,
      accountId: acct.account_id,
      licenseeId: acct.licensee_id,
    };

    const start = Date.now();
    const result = await dispatchV1Handler(request.method, fullPath, request, ctx);
    if (!result) {
      // Should never happen — guard anyway.
      return json({ error: { code: "internal_error", message: "Handler dispatch returned null." } }, 500);
    }

    const requestId = `req_live_${Math.random().toString(36).slice(2, 10)}`;
    await supabaseAdmin.from("api_request_logs").insert({
      user_id: keyRow.user_id,
      api_key_id: keyRow.id,
      method: request.method,
      path: fullPath,
      status_code: result.status,
      duration_ms: Date.now() - start,
      request_id: requestId,
    });
    await supabaseAdmin
      .from("api_keys")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", keyRow.id);

    return new Response(JSON.stringify(result.body, null, 2), {
      status: result.status,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "X-PrizeSkout-Mode": "test",
        "X-Request-Id": requestId,
        ...(result.headers ?? {}),
      },
    });
  }

  // Find the spec
  const spec = matchEndpoint(request.method, fullPath);
  if (!spec) {
    return json(
      {
        error: {
          code: "not_found",
          message: `No endpoint matches ${request.method} ${fullPath}. See https://prizeskout.com/docs for the full reference.`,
        },
      },
      404,
    );
  }

  // Best-effort body validation for required fields on POST endpoints.
  if (spec.body && spec.body.length > 0 && (spec.method === "POST" || spec.method === "PATCH")) {
    let body: Record<string, unknown> = {};
    try {
      const text = await request.text();
      body = text ? JSON.parse(text) : {};
    } catch {
      return json({ error: { code: "validation_failed", message: "Request body must be valid JSON." } }, 422);
    }
    const missing = spec.body.filter((f) => f.required && !(f.name in body));
    if (missing.length > 0) {
      return json(
        {
          error: {
            code: "validation_failed",
            message: `Missing required field${missing.length === 1 ? "" : "s"}: ${missing.map((m) => m.name).join(", ")}.`,
            fields: missing.map((m) => ({ name: m.name, error: "required" })),
          },
        },
        422,
      );
    }
  }

  // Log the test-mode call so it shows up in the user's request logs.
  await supabaseAdmin.from("api_request_logs").insert({
    user_id: keyRow.user_id,
    api_key_id: keyRow.id,
    method: spec.method,
    path: fullPath,
    status_code: spec.responses[0]?.status ?? 200,
    duration_ms: Math.floor(Math.random() * 80) + 40,
    request_id: `req_test_${Math.random().toString(36).slice(2, 10)}`,
  });

  // Touch last_used_at
  await supabaseAdmin.from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", keyRow.id);

  const sample = spec.sampleResponse ?? spec.responses[0]?.example ?? { ok: true };
  const status = spec.responses[0]?.status ?? 200;

  return json(sample, status, {
    "X-Request-Id": `req_test_${Math.random().toString(36).slice(2, 10)}`,
  });
}

export const Route = createFileRoute("/api/public/v1/$")({
  server: {
    handlers: {
      GET: ({ request, params }) => handle(request, params._splat ?? ""),
      POST: ({ request, params }) => handle(request, params._splat ?? ""),
      PATCH: ({ request, params }) => handle(request, params._splat ?? ""),
      DELETE: ({ request, params }) => handle(request, params._splat ?? ""),
    },
  },
});
