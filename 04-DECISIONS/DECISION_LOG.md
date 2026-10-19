# Decision Log

## ADR-001 — Independent context layer and model-agnostic interchange (19 October 2026)

**Decision authority:** Owner-directed architectural principle, consistent with the owner-approved 14 October P0 strategy.  
**Status:** **Accepted architectural direction; implementation and cross-model conformance not yet verified.**  
**Responsible party:** Project Morrow maintainer. No unverified "Project Core Team" or additional approvers are inferred.

### Context and problem

If valuable context exists only as vendor-specific conversation memory or opaque model state, changing models can interrupt continuity and complicate correction, provenance and revocation. A portable, privacy-respecting representation is necessary to *test* interoperability, but no model portability or universal integration is presumed successful.

### Accepted direction and boundaries

1. Keep the **Morrow Core methodology and candidate interchange schema vendor-neutral**; use adapters for provider-specific APIs rather than encoding a provider requirement as the canonical data contract.
2. Treat the **public GitHub repository as a curated, versioned, public-safe knowledge layer**, **not** the master store for private context. Notion remains the currently designated operational task authority; any future private/local store requires separately authorised design and testing.
3. Require provenance, freshness, supersession, minimisation, consent/access boundaries and separable readback evidence in portable records. An imported record's self-declared permissions are not sufficient authorisation.
4. Distinguish saved/uploaded/synced/verified states and planned/attempted/accepted/active/independently verified/user confirmed states in their **actual measured scope**. Schema validity alone must not upgrade them.
5. Preserve present user agency and applicable platform restrictions; a prior context record must never dictate a person's current decisions.

### Alternatives and trade-offs

- **Provider-only memory:** less integration work but introduces portability dependence; not selected as the sole canonical layer.
- **Public central context store:** easier sharing but incompatible with Morrow's default private-source boundary; rejected for private material.
- **Portable contract plus adapters and segregated private stores:** selected as the working architectural direction; adds governance, version migration, authenticated permission and interoperability-testing requirements.

### Acceptance evidence and remaining unknowns

- **Accepted as direction:** direct owner instruction plus [14 October P0 strategic decision](../00-CORE/STRATEGIC_DIRECTION_2026-10-14.md).
- **Observed implementation:** public repository structure and two protected CI checks; synthetic Bridge validators and destination readback on [draft PR #1](https://github.com/Dualis3283/morrow-knowledge3283/pull/1).
- **NOT OBSERVED:** cross-model behavioural equivalence, deployed encrypted private storage, verified remote synchronisation, independently authenticated end-user consent, standards adoption and user sign-off on a released Core version.

### Review, supersession and reversal criteria

Reconsider when the owner changes requirements, a relevant open standard becomes mature and applicable, comparative testing demonstrates a better design, or security/privacy defects require revision. A new external standard alone does **not** automatically replace a reviewed architecture. Preserve an explicit decision trail and conformance evidence; do not silently relabel a candidate implementation as a ratified Core specification.

---

## 19 October 2026 — Candidate implementation criteria for model-independent verification

**Standing authority:** The 14 October owner-approved P0 objective establishes an open, model-independent Morrow methodology. This entry translates that objective into candidate operational acceptance checks; **it does not ratify Core v1 or certify any model**.

**Candidate criteria:** (1) observable Context → Evidence → Pattern → Interpretation → Action → Verification → Lesson without collecting hidden reasoning; (2) verifiable evidence and provenance distinct from inferences; (3) context relevance, freshness, supersession and current human agency; (4) consent- and destination-specific privacy controls without automatic publication of imported records; (5) distinguish planned, attempted, accepted, active, independently verified and user confirmed, with documented separate evidence; (6) treat prepared, saved, uploaded, synced and verified as distinct persistence observations; (7) negative tests, independent readback, and honest NOT OBSERVED for absent cross-model or remote evidence.

**Implementation approach:** enforce repository layout, public privacy scanning, synthetic state-manifest syntax tests and available Bridge unit tests in GitHub Actions. Candidate checkpoint metadata is *not* authenticated provenance, and a green CI workflow proves only the named checks ran against the identified revision. Human semantic privacy review and external-system verification remain necessary.

**Reversal criteria:** update these candidate checks on a recorded defect, demonstrated model incompatibility, privacy concern, or owner decision; never silently weaken an existing required privacy check. Full standard adoption remains subject to conformance design and owner review.

---


## 14 October 2026 — Global adoption of Morrow methodology becomes P0

**Approved:** Morrow shall prioritise an open, model-independent, interoperable and verifiable methodology capable of worldwide AI adoption. All previous workstreams are secondary/supporting, not erased or automatically cancelled.

**Approach:** document versioned Morrow Core; portable, permission-aware Context Bridge; cross-model open runtime and adapters; independent, reproducible Morrow Verify benchmarks. Protect present human agency, contestability, provenance, privacy and evidence-vs-interpretation.

**Caveat:** testable compatibility is not global adoption. Benefits and portability remain unverified. Existing 19/20 workflow metric foundation is unfrozen.

**Supersedes:** previous strategic priority ranking, not technical acceptance or completed project history.

**Reversal criteria:** explicit owner revision or independently evidenced, transparently reviewed reasons. See [canonical checkpoint](../00-CORE/STRATEGIC_DIRECTION_2026-10-14.md).

---


Durable decisions that materially affect future work.

## 2026-10-02 — Relational Context Ruleset v1

**Decision:** Morrow should use accumulated context to improve mutual understanding without reducing a person to their history or preferences.

**Core rules:** context grounds understanding; information may be compartmentalised but should remain tagged/retrievable when relevant; past preferences are evidence rather than identity; people can grow and change; do not dismiss, disregard or disrespect another; disagreement can reveal new information; present reasoning should remain understandable and challengeable; support informed decisions rather than predicted decisions.

**Why:** continuity is useful because autonomous parties cannot read one another's minds. Its purpose is to reduce drift and preserve learning, not to turn historical patterns into deterministic assumptions.

**Supersedes:** the narrower “human authorship” framing as the primary Morrow relationship model.

**Reversal criteria:** revise only if later experience shows a clearer principle that preserves context, growth, respect, mutual intelligibility and informed agency more accurately.

---

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

## 12 October 2026 — Phase 6 consolidation stopgap
- Preserve the existing verified website and security gates; Phase 5 remains intentionally skipped, not finished. No new public telemetry or model release was authorised.
- The 19 coded workflows do not constitute a frozen twenty-case chronological sample. Defect and write/conclusion denominators remain ambiguous: no improvement percentages.
- Adopt the reproducible read-only ledger audit, reconcile stale source/register pointers, and hold new-phase scope until the owner directs it.
- Reversal criteria: validate chronological sequence, coding and per-event denominators before deliberately freezing Metric Definition v1. Evidence: 07-ARCHIVE/PHASE6_CONSOLIDATION_STOPGAP_2026-10-12.md.

## Photo-driven component QA rule — 12 October 2026
- Evidence: document-wide responsive tests had passed, yet laptop photographs exposed a word broken mid-word, clipped MORROW branding and unreadable World Wave labels. First live readback also caught a 43px mobile-specific target override.
- Standing guardrail: compare actual unbreakable text dimensions with their rendered container, especially in overflow-hidden and responsive/expanded components; verify focus state and mobile 44px touch dimensions after applying the entire CSS cascade.
- Preserve originals: verify lazy image loading before replacing authentic album art; keep semantic labels even when the display uses arrow controls.
- Verified release: site SHA ad8da03385379ba99e2d896808100a13a4512554, full QA/promotion/provider checks and live geometry readback.
- Scope: technical quality follow-up, not a reopened public testing phase or completion of the 20-workflow measurement foundation. Source: 07-ARCHIVE/WEBSITE_LAYOUT_PHOTO_CHECKPOINT_2026-10-12.md.
