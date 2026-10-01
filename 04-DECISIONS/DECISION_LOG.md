# Decision Log

Durable decisions that materially affect future work.

## 2026-10-01 — GitHub becomes the versioned public-safe Morrow knowledge layer

**Decision:** populate `Dualis3283/morrow-knowledge3283` with curated operating knowledge, project state, decisions, research and archive records.

**Why:** Git gives durable version history and independent recovery. Notion remains better suited to operational task tracking.

**Constraint:** repository is public; sensitive/private source material remains outside it.

**Reversal criteria:** move protected detail to a private repository if public-safe summaries become insufficient.

---

## 2026-10-01 — Notion pipeline remains operational task authority

**Decision:** treat the Notion **Morrow — Project Pipeline** database as the operational task/status source, while GitHub stores curated durable state.

**Why:** Notion is better for live status/priority; GitHub is better for versioned knowledge.

**Housekeeping rule:** stale Notion page prose can be superseded by verified live state; do not let an old “current baseline” override external readback.

---

## 2026-10-01 — Pipeline Reconciliation v1 defines current-state authority

**Decision:** resolve conflicting Morrow records in this order: project-specific record → Morrow Working State → Decision Log → Connector & Integration Layer → public-safe GitHub mirror → Foundations / Archive.

**Why:** valid records can become stale at different speeds. Retrieval success is not enough if a broader record still carries an obsolete next-action.

**Checkpoint rule:** whenever a project state changes materially, ask whether it supersedes another active next-action. Reconcile affected broader records before closing the checkpoint.

**Constraint:** Foundations and Archive remain valuable evidence, but historical instructions do not regain operational authority merely because they remain readable.

**Reversal criteria:** replace this hierarchy only when a tested automated source-of-truth system provides stronger conflict resolution and independent readback.

---

## 2026-10-01 — Website V18 is current production

**Decision:** V18 / Cloudflare deployment `d7000b0a` is the current production baseline.

**Evidence:** direct Cloudflare Pages readback.

**Supersedes:** V7 and V14 as “current”; they remain historical milestones.

---

## 2026-09-30 — Compleated Loyalty redesign closes at Print Master v2

**Decision:** redesign is complete; Print Master v2 is the approved digital production master.

**Remaining gate:** representative physical print proof.

**Reversal criteria:** a demonstrated production defect can trigger targeted correction; preference alone does not reopen the entire redesign.

---

## 2026-09-30 — Magic Quick-Reference Guide checkpoint is complete

**Decision:** the A5 battlefield-first guide is closed as a completed checkpoint.

**Reversal criteria:** future rules audit, print-prep, or content change is a new revision, not unfinished work.

---

## 2026-09-30 — Project Morrow measurement claims require a baseline

**Decision:** do not publish percentage-improvement claims until the 20-workflow foundation sample is complete and Metric Definition v1 is frozen.

**Why:** measure observable workflow outcomes rather than inventing an “AI accuracy score”.

---

## Standing MTG decisions

- Collection-only requests require proof that recommended cards are in the collection.
- One owned physical copy should not be assigned to multiple decks unless explicitly changed.
- Exact dated deck lists should be preserved because builds drift.
- Mechanics should be validated; archetype reputation is not sufficient evidence.

## Standing creative decisions

- Existing work should be evaluated as evidence before defining new products.
- Public promotion does not require total disclosure of private personal history.
- Accepted voice/themes/baselines should be preserved unless a new brief changes them.
