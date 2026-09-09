import assert from "node:assert/strict";
import { assertEngineTransition, canTransitionEngineWork, engineRetryDelayMs, nextFailureState } from "../src/server/core/engine-state-machine";

assert.equal(canTransitionEngineWork("queued", "leased"), true);
assert.equal(canTransitionEngineWork("queued", "completed"), false);
assert.equal(canTransitionEngineWork("completed", "queued"), false);
assert.doesNotThrow(() => assertEngineTransition("processing", "waiting_approval"));
assert.throws(() => assertEngineTransition("completed", "processing"));
assert.equal(nextFailureState(4, 5), "retry_scheduled");
assert.equal(nextFailureState(5, 5), "dead_letter");
assert.equal(engineRetryDelayMs(1, 0), 5_000);
assert.ok(engineRetryDelayMs(20, 42) <= 18 * 60_000);
console.log("Engine state-machine verification passed.");
