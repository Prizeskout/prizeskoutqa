export const ENGINE_WORK_STATES = [
  "queued", "leased", "processing", "waiting_evidence", "waiting_approval",
  "verifying", "retry_scheduled", "completed", "dead_letter", "cancelled",
] as const;

export type EngineWorkState = (typeof ENGINE_WORK_STATES)[number];

const ALLOWED: Record<EngineWorkState, readonly EngineWorkState[]> = {
  queued: ["leased", "cancelled"],
  leased: ["processing", "retry_scheduled", "dead_letter", "cancelled"],
  processing: ["waiting_evidence", "waiting_approval", "verifying", "completed", "retry_scheduled", "dead_letter", "cancelled"],
  waiting_evidence: ["queued", "cancelled"],
  waiting_approval: ["queued", "dead_letter", "cancelled"],
  verifying: ["completed", "retry_scheduled", "dead_letter"],
  retry_scheduled: ["leased", "cancelled"],
  completed: [],
  dead_letter: ["queued", "cancelled"],
  cancelled: [],
};

export function canTransitionEngineWork(from: EngineWorkState, to: EngineWorkState) {
  return ALLOWED[from].includes(to);
}

export function assertEngineTransition(from: EngineWorkState, to: EngineWorkState) {
  if (!canTransitionEngineWork(from, to)) throw new Error(`Illegal engine transition: ${from} -> ${to}`);
}

export function engineRetryDelayMs(attempt: number, seed = 0) {
  const base = Math.min(15 * 60_000, 5_000 * 2 ** Math.max(0, attempt - 1));
  return base + (Math.abs(seed) % Math.max(1, Math.floor(base * 0.2)));
}

export function nextFailureState(attempt: number, maxAttempts: number): EngineWorkState {
  return attempt >= maxAttempts ? "dead_letter" : "retry_scheduled";
}
