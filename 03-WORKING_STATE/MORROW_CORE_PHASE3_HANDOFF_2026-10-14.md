# Morrow Core Phase 3 — Cross-Model Evaluation & Interoperability Handoff

**Dated:** 14 October 2026 · **Status:** Scoped and ready to begin; **NOT yet executed** as a cross-model evaluation.
**Priority:** P0 under the owner-approved [strategic direction](../00-CORE/STRATEGIC_DIRECTION_2026-10-14.md).
**Primary mission:** Develop Morrow into an open, interoperable, model-independent and independently verifiable methodology suitable for voluntary worldwide adoption. All other initiatives are secondary/supporting, not cancelled.

## First-read links (do not rely on GitHub search alone)

- **Canonical strategic goal on `main`:** [14 October 2026 decision](../00-CORE/STRATEGIC_DIRECTION_2026-10-14.md).
- **Current Morrow Core project in Notion:** private Notion record (find by document title in authenticated workspace)
- **Morrow Working State in Notion:** private Notion record (find by document title in authenticated workspace)
- **Morrow Decision Log in Notion:** private Notion record (find by document title in authenticated workspace)
- **Implementation source is still in the unmerged draft pull request:** https://github.com/Dualis3283/morrow-knowledge3283/pull/1
- **Working branch:** `proposal/morrow-core-v1-spec`; **target `main`**, currently unmerged.
- **Candidate Core spec v0.1:** [00-CORE/MORROW_CORE_V1_DRAFT.md](https://github.com/Dualis3283/morrow-knowledge3283/blob/proposal/morrow-core-v1-spec/00-CORE/MORROW_CORE_V1_DRAFT.md).
- **Requirements review R1:** [05-RESEARCH/CORE_V1_REQUIREMENTS_REVIEW.md](https://github.com/Dualis3283/morrow-knowledge3283/blob/proposal/morrow-core-v1-spec/05-RESEARCH/CORE_V1_REQUIREMENTS_REVIEW.md).
- **Portable Bridge v0.1 schema:** [JSON Schema](https://github.com/Dualis3283/morrow-knowledge3283/blob/proposal/morrow-core-v1-spec/02-KNOWLEDGE/bridge-record-v0.1.schema.json); [validator](https://github.com/Dualis3283/morrow-knowledge3283/blob/proposal/morrow-core-v1-spec/morrow_bridge/validate.py); [tests](https://github.com/Dualis3283/morrow-knowledge3283/blob/proposal/morrow-core-v1-spec/tests/test_morrow_bridge.py).

## Verified baseline: what Phase 2 achieved
1. Candidate Core methodology contains 15 proposed normative requirements; it is a **draft**, neither reviewed into v1.0 nor certified.
2. Portable Bridge v0.1 schema and Python validator with public-safe synthetic examples are committed to draft PR #1.
3. **14/14 synthetic structural/semantic tests passed** when the committed files were fetched and run in a separate sandbox. This proves only those validator and fail-closed export-veto scenarios; **not model understanding, robust consent, provenance authentication, remote deletion, or measurable AI improvement**.
4. A preliminary Core R1 review identifies requirements needing clarification: current intent versus current facts, source trust, consent and deletion scope, verification status, correction retention and risk-proportionate overhead.
5. A CI workflow was described/prepared locally but was **not committed** to GitHub. The proposal-branch Core text remains v0.1; the R1 changes are not yet incorporated.

## Phase 3 objective and exact next action
Produce a **repeatable task-level evaluation framework**, then test whether distinct AI implementations can use Morrow safely and beneficially.

**First action:** Open draft PR #1 and R1, apply specifically justified corrections to the candidate Core specification on its proposal branch, establish reproducible CI for the 14 baseline Bridge tests, verify branch readback and CI result; retain draft status until reviewed.

### Ordered phase gates
1. **Normative reconciliation:** Update candidate Core text against R1 with explicit change log; resolve conflict between user intent, authoritative evidence and platform permission boundaries. Preserve owner review before any ratified v1.0 claims.
2. **Reproducible validation:** Commit GitHub Actions or other suitable CI for the committed unit tests and check at least one real runner result. Preserve negative tests. Local test success is not CI success.
3. **Evaluation protocol:** Fix system versions, task corpus, prompts/context budgets, tool affordances, source snapshots, scoring rubric, reviewer blinding where feasible, denominators, negatives, costs and failure labels **before comparison**. Adapt [16 candidate conformance cases](https://github.com/Dualis3283/morrow-knowledge3283/blob/proposal/morrow-core-v1-spec/05-RESEARCH/CORE_V1_CONFORMANCE_CASES.md) into executable/observable fixtures.
4. **Interoperability pilot:** With explicit authorization and available access, test three distinct AI implementations including one locally hosted model. Transfer only public-safe or consented records. Validate semantic interpretation, freshness, changed preferences, irrelevant retrieval rejection and no unauthorized data export. **Not yet performed.**
5. **Matched control experiment:** Run like-for-like tasks with/without the Morrow intervention and independent scoring when possible. Publish positive, negative and inconclusive results; never manufacture effect sizes.
6. **Checkpoint and decision:** Record test evidence and limitations, what changed, owner-approved decisions, blockers and next action. No unreviewed merge, release or site deployment.

## Boundaries and blockers
- Existing GitHub repository has GPL-3.0; specific methodology documentation/runtime licensing and governance need deliberate review.
- Schema validation does **not** establish that importers or AI models follow the method.
- Imported sharing metadata is not independently authenticated consent. No guaranteed third-party deletion propagation.
- No current model adapter or comparative test run has been independently demonstrated under Phase 3.
- Earlier separate Morrow workflow measurement **Phase 6** remains **19/20 eligible workflows, unfrozen**, and must not be mistaken for this Morrow Core Phase 3.
- Earlier website or app phases using the name "Phase 3" are separate workstreams.

## Cross-conversation recovery instruction
If another chat is told "Resume Morrow Core Phase 3":
1. Read this file on GitHub **`main`**; check the Notion Morrow Core project and Working State by title using authenticated workspace search.
2. Fetch **draft PR #1 and its proposal branch**, not just the default branch or search index.
3. Report that the P0 goal is owner-approved, the Bridge prototype is verified only by synthetic tests, and Phase 3 cross-model testing is not yet performed.
4. Continue at the first unmet phase gate; update canonical sources with readback after any real change.
5. Do not replace today's user intent with a historical guess, and do not assume tools are unavailable merely because an earlier connector path failed.

**Checkpoint category:** discoverability/continuity repair. This file records a Phase 3 plan and handoff, **not execution of Phase 3**.
