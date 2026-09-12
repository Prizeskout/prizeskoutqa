import { readFile } from "node:fs/promises";
import { strict as assert } from "node:assert";

const gateway = await readFile("src/routes/api/public/v1/$.ts", "utf8");
const handlers = await readFile("src/server/v1-handlers.ts", "utf8");
const writes = await readFile("src/server/v1-writes-handlers.ts", "utf8");

assert.match(gateway, /isLive && endpointSpec && V1_HANDLER_KEYS\.has/,
  "Live traffic must be limited to documented endpoints with real handlers.");
assert.match(gateway, /Idempotency-Key/,
  "Browser preflight must permit the idempotency header.");
assert.match(gateway, /missingScopes = endpointSpec\.scopes\.filter/,
  "The gateway must enforce documented endpoint scopes.");
assert.match(gateway, /no_production_effect: true/,
  "Sandbox responses must identify themselves as synthetic and non-mutating.");
assert.match(gateway, /if \(isLive\)[\s\S]*?not_implemented[\s\S]*?not_found/,
  "Live endpoints must fail closed when undocumented or unimplemented.");

const dynprice = handlers.slice(
  handlers.indexOf("export async function handleDynprice"),
  handlers.indexOf("async function handleLegacyDynprice"),
);
assert.match(dynprice, /pricing\.write/,
  "Dynamic pricing must require pricing write authority.");
assert.match(dynprice, /evidence_refresh_required/,
  "Dynamic pricing must reject stale evidence.");
assert.match(dynprice, /authority:"evidence_backed_margin_engine"/,
  "Dynamic pricing must disclose its evidence authority.");
assert.doesNotMatch(dynprice, /enqueueWebhookEvent|\.from\("dynprice_decisions"\)/,
  "A recommendation request must not execute a price or emit a change event.");

const simulation = writes.slice(
  writes.indexOf("export async function handleSimulatePromotion"),
  writes.indexOf("async function handleLegacySimulatePromotion"),
);
assert.match(simulation, /simulation_evidence_required/,
  "Promotion simulation must fail closed without measured evidence.");
assert.match(simulation, /no_scenario_saved:true/,
  "A blocked simulation must not persist a scenario.");

const decision = writes.slice(
  writes.indexOf("export async function handleCreateDecision"),
  writes.indexOf("export async function handleSimulatePromotion"),
);
assert.match(decision, /execution_status: "not_executed"/,
  "A pricing decision must not claim a storefront execution.");

console.log("Public API safety contract verified.");
