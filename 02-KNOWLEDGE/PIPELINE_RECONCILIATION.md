# Pipeline Reconciliation v1

**Established:** 1 October 2026

## Purpose

Prevent stale but valid Morrow records from presenting obsolete instructions as current work.

The problem is not missing continuity; it is **state drift** between records that update at different speeds.

## Authority hierarchy

When records disagree about current state, resolve them in this order:

1. **Project-specific record** — current operational state, blockers and immediate next action for that project.
2. **Morrow Working State** — synthesized cross-project snapshot. It reflects project records and does not override a newer project-specific checkpoint.
3. **Decision Log** — durable choices, rationale and reversal criteria.
4. **Connector & Integration Layer** — demonstrated capability by access path and operation.
5. **GitHub knowledge repository** — versioned public-safe mirror/checkpoint.
6. **Foundations / Archive** — historical evidence and recovery context.

A newer timestamp alone does not override stronger direct evidence.

## Supersession check

At every major checkpoint ask:

> **Does this new state supersede another active next-action?**

If yes:

1. update the project-specific record;
2. reconcile Morrow Working State;
3. update any durable decision that materially changed;
4. update connector capability if access evidence changed;
5. mirror public-safe state to GitHub when appropriate;
6. preserve obsolete chronology as history, but remove it from current authority.

## Connector rule

Record connector capability by **access path + operation**, not as a single connected/disconnected flag.

Useful states:

- **Verified** — target operation succeeded and was read back where practical.
- **Read-only verified** — reads succeed; writes remain unproven or unavailable.
- **Degraded** — one path fails while another verified path remains usable.
- **Unverified** — connection/session exists but the required operation has not been proven.
- **Unavailable** — the required operation cannot currently be performed.

Connector badges, cached authentication state and remembered success do not outrank direct current evidence.

## Current-state quality gate

A checkpoint is complete only when:

- each affected active project has one unambiguous current next action;
- broader Morrow records do not contradict the project-specific record;
- capability claims are backed by real read/write evidence where testable;
- completed or superseded instructions cannot surface as active priorities;
- persistent changes are independently read back when supported.

## Initial reconciliation — 1 October 2026

Pipeline Reconciliation v1 was introduced after detecting several examples of state drift:

- Ask Morrow had advanced to authenticated Workers AI inference and a final keyboard-only gate, while broader records still described Cloudflare-auth restoration as the next step.
- GitHub write/readback had been verified, while older connector/foundations text still said it required testing.
- historical project instructions remained readable after their operational role had ended.

The fix preserves the historical evidence while separating it from current authority.
