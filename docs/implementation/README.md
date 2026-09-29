# PrizeSkout Implementation Continuity Pack

This directory is the durable handoff system for humans and coding agents. It replaces reliance on long chat histories and progressively supersedes `docs/NEXT_CODEX_HANDOFF.md`.

## Reading order

1. `00-product-charter.md` — stable purpose and boundaries.
2. `state.yaml` — current phase, current task, and machine-readable status.
3. `01-current-state.md` — concise operational snapshot.
4. The current file in `task-packets/` — executable work unit.
5. Other registers only as the current task requires.

## Authority order when records conflict

1. Read-only production verification
2. Deployment register
3. Automated contract tests
4. `state.yaml`
5. Current task packet
6. Current-state document
7. Session log
8. Legacy handoff documents and chat summaries

File existence never proves deployment. Local tests never prove production readiness. A capability is customer-ready only when its task packet records the required production verification.
