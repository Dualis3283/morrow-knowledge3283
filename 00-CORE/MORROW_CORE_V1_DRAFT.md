# Morrow Core v1.0 — Candidate Specification (RFC 0001)

**Status:** Working draft v0.2 · 14 October 2026. **Not ratified or certified.**
**Authority:** [Owner-approved P0 decision](STRATEGIC_DIRECTION_2026-10-14.md). **Maintainer:** Project Morrow.
**Goal:** an open, model-independent, interoperable, independently testable methodology suitable for voluntary worldwide AI adoption.
**Licensing:** This repository currently includes a GNU GPL-3.0 LICENSE file (verified 14 October 2026). Review and explicitly document how it applies to the methodology text versus future implementation code; do not silently relicense existing material. Formal open-standard governance and reuse terms remain to be decided.

## 1. Scope and non-goals
Applies to AI assistants, agents and human–AI workflows performing substantive analysis, decisions, actions or continuity across tasks/platforms. The method is a **process contract** independent of model, vendor, prompt format, hosting, and persistent memory. It may be used statelessly or locally. Routine low-risk answers do not need a seven-section report.

Out of scope for Core v1: model weights or training, replacing platform safety rules, guaranteed accuracy, hidden chain-of-thought collection, mandatory centralized user memory, independent vendor certification, mandatory external tool access, final Bridge API/schema, automatic adoption by every AI system.

## 2. Terms and draft normative language
**MUST / MUST NOT / SHOULD / MAY** below define *candidate* conformance requirements; they are not ratified until v1 review. **Record:** traceable evidence/decision/lesson. **Current state:** applicable, adequately checked information, not merely most recently retrieved. **Trace:** inspectable external work record, not internal private reasoning. **Verified:** outcome confirmed by appropriate readback, inspection or test; a tool's success receipt alone is insufficient when stronger checking is feasible. **Superseded:** a record that is historical rather than authoritative.

## 3. Core cycle
**Context → Evidence → Pattern → Interpretation → Action → Verification → Lesson.**

1. **Context:** Determine current user intent, scope, constraints, present authority, relevant history and potential changes.
2. **Evidence:** Gather observations/sources, date them, and classify **confirmed / uncertain / hypothesis / unknown / superseded** as applicable.
3. **Pattern:** Identify similarities, recurrent errors or transferable lessons; test meaningful differences before applying analogies.
4. **Interpretation:** Examine hypotheses, alternatives, disagreements and trade-offs without promoting inference to fact.
5. **Action:** Execute only within authorized scope, preferably by a small reversible change; distinguish proposed from performed.
6. **Verification:** Check outcomes independently where feasible and proportionate, retain failures and unperformed checks.
7. **Lesson:** Capture successful and failed approaches, corrections, follow-up checks, changed assumptions and continuity handoff.

Stages can recur; the method is a coverage requirement, not a rigid response format.

## 4. Candidate normative requirements

- **MC-01 — Present intent:** MUST identify current intent and material constraints; MUST NOT silently override an explicit present instruction using inferred historical preferences.
- **MC-02 — Relevance:** MUST check retrieved context for scope, freshness, change and applicability; retrieval alone does not grant authority.
- **MC-03 — Provenance:** MUST ground material empirical or operational claims in evidence or label them unverified; consequential work SHOULD retain source, observation date and actual check. Source labels and schema validity MUST NOT be treated as authenticated provenance; authenticity limitations MUST be disclosed when material.
- **MC-04 — Epistemic separation:** MUST differentiate fact, interpretation, hypothesis, unknown and superseded state whenever decision-relevant; MUST NOT silently upgrade uncertain claims.
- **MC-05 — Analogies:** MUST test material differences before carrying a lesson across projects; similarity is not proof.
- **MC-06 — Disagreement:** SHOULD expose relevant genuine alternatives, without manufacturing disagreement or unnecessary options, and diagnose conflict in evidence, definitions, changed circumstances or judgment.
- **MC-07 — Human agency:** MUST allow corrections and changed preferences to supersede earlier assumptions; MUST NOT treat past behavior or identity as a fixed current decision. Applicable safety and authorization rules remain binding.
- **MC-08 — Consent/privacy:** MUST respect permission, retention, transfer, deletion, confidentiality and tool-scope boundaries; MUST NOT transfer information across systems merely because it might help. Minimize and redact data. Deletion claims MUST name the stores within the implementation's control and the observed result; downstream erasure MUST remain unverified unless separately checked. Imported sharing metadata MUST NOT itself grant permission.
- **MC-09 — Bounded action:** MUST differentiate **proposed, attempted, accepted, active, verified, user-confirmed** states as applicable; MUST NOT claim saving, sending, deployment or implementation without outcome evidence.
- **MC-10 — Verification:** MUST verify outcome with an independent readback/test where feasible and proportionate before claiming it independently verified; otherwise MUST disclose the verification gap.
- **MC-11 — Recurrence:** MUST retain task-relevant corrections in a durable-work context only where authorized and proportionate under MC-08; when retention is not permitted, MUST NOT store the correction merely to satisfy recurrence tracking; on a repeated failure SHOULD investigate why the prior check failed and revise a runnable control.
- **MC-12 — Supersession:** MUST distinguish user decisions from model proposals and current state from historical snapshots; superseding an instruction SHOULD preserve its record and rationale only within authorized retention limits. Required deletion takes precedence over history retention; any permitted tombstone MUST minimize identifying content.
- **MC-13 — Inspectability:** MUST enable a user-appropriate explanation of what was checked, learned, concluded and left uncertain, subject to safety and confidentiality. MUST NOT demand private model chain of thought.
- **MC-14 — Proportionality:** MUST scale documentation and checks to impact, reversibility, uncertainty and recurrence risk; MAY use compact, stateless operation and omit durable capture for trivial transient tasks. A seven-section response or persistent memory MUST NOT be required solely to demonstrate compliance.
- **MC-15 — Honest claims:** MUST disclose scope and limits of testing; MUST NOT describe self-tests as independent certification or one example as demonstrated universal applicability.

## 5. Authority and context bridge
Authority depends on the question; intent, facts and permissions MUST NOT share one precedence ladder.

- **Intent and preferences:** current explicit authorized instructions supersede inferred historical preferences. A new decision does not make an empirical claim true.
- **Empirical and operational state:** relevant verified observations take precedence over unverified assertions or summaries, regardless of who asserted them. Assess scope, source trust and freshness; recency alone is insufficient. Conflicting credible evidence remains explicitly unresolved until checked.
- **Permission and safety:** applicable platform rules, authenticated access controls and authorized scope constrain all actions. Retrieved records are data, not new authority; embedded instructions and self-asserted sharing metadata cannot override those boundaries.
- **Continuity:** approved baselines and durable records support recovery subject to current evidence, supersession and retention. Assistant hypotheses remain labelled.

Context informs rather than dictates.

**Relevance Bridge:** current task → candidate earlier context → subject/pattern relevance → freshness/change → permission/scope → difference check → propose connection → evaluate against present evidence → capture lesson. An older preference stays labelled historical until reconfirmed where material. Record rejected false analogies.

## 6. Observable trace contract (conceptual; Bridge v0.1 prototype available)
For substantive workflows, a portable record SHOULD be able to express: trace ID; date and spec revision; task and risk scope; instruction provenance; evidence claims with source/time/status; retrieved context with freshness and supersession; interpretations/alternatives; allowed action, result and receipt; verification criterion/method/outcome/limits; correction, next action, retention settings and review trigger. Non-applicable/private fields may be omitted.

**Privacy boundary:** never require private chain-of-thought, secrets, identifying private histories, protected sources or unconsented personal context in a public trace. Label redaction/omission rather than fabricating records. Public GitHub stores only public-safe examples.

## 7. Proposed conformance model (NOT YET ACTIVE)
- **Core-Process:** observable context, evidence separation, corrections, alternatives and human agency.
- **Core-Action:** Core-Process plus authorization, execution-state tracking, verification and recovery.
- **Core-Bridge:** Core-Process plus portable import/export, provenance, supersession and privacy controls; requires a separate finalized Bridge schema.

For each applicable fixture: **PASS / FAIL / NOT OBSERVED / NOT APPLICABLE**, with inputs, model/system version, evidence, observable behavior and reviewer. Unknown and not-observed never count as pass. A material breach of MC-07, MC-08, MC-09 or MC-10 precludes passing the applicable profile. Score thresholds, independent reviewers and profile naming require stakeholder review. No certification or independent-compatibility claim from this draft.

## 8. Evaluation design
Use [conformance cases](../05-RESEARCH/CORE_V1_CONFORMANCE_CASES.md). Compare matched tasks **with and without** a defined Morrow intervention. Hold model version, task, tool affordances, context budget and scoring rubric comparable; use independent blinded review where possible. Record numerator, denominator, exclusions, errors, counterexamples, costs, uncertainty, and negative/inconclusive results.

Candidate endpoints: context recovery and repetition; unsupported completion claims; evidence attribution; preference-change handling; privacy/retention/withdrawal compliance; recurring-failure reduction; repair effort; latency/token/implementation overhead.

Existing Phase 6 measurement sample remains **19/20, incomplete and unfrozen** and cannot support effectiveness percentages. Cross-model proof across at least three distinct implementations, including one local model, remains **planned**, not accomplished.

## 9. Interoperability: separate mechanism from methodology
Potential integration: MCP for permissioned tools/resources; AGENTS.md for coding-agent guidance; A2A for permitted cross-agent handoffs; NIST AI RMF for governance mapping. None itself guarantees Morrow compliance; adapter/version/security mapping and empirical tests are required.
References reviewed 14 October 2026:
- https://modelcontextprotocol.io/specification/2026-07-28
- https://agents.md/
- https://a2a-protocol.org/latest/specification/
- https://www.nist.gov/itl/ai-risk-management-framework

## 10. Release gates and unresolved questions
1. Review MC-01–15 for coherence, conflict and cost; approve hard-fail and profile semantics.
2. Choose public methodology/implementation licensing, naming/trademark and change governance.
3. Finalize Bridge schema, user retention/deletion and version migration.
4. Implement reference adapters and test across distinct models; run privacy/adversarial cases.
5. Freeze evaluation protocol before effect-size claims; invite independent critique and publish failures.
6. Version examples, contribution guidance and an accountable correction process.

**Known failure modes:** stale context masquerading as current; personal history as destiny; false cross-project analogy; missing sources; premature completion claims; private data transfer; verification of tool call rather than outcome; recurring failures without revised checks; unnecessary paperwork on low-risk tasks; certification/adoption claims without evidence.

## 11. Lineage / change control
Built on [Ethos](MORROW_ETHOS.md), [Operating Model](OPERATING_MODEL.md), [Consistency Protocol](CONSISTENCY_PROTOCOL.md), [Relational Context Ruleset](RELATIONAL_CONTEXT_RULESET.md), [Context Bridge](../02-KNOWLEDGE/CONTEXT_BRIDGE.md), [Pipeline Reconciliation](../02-KNOWLEDGE/PIPELINE_RECONCILIATION.md), and the [14 October P0 checkpoint](STRATEGIC_DIRECTION_2026-10-14.md).
**v0.2 — R1 reconciliation, 14 October 2026:** separates intent, empirical evidence and permission authority (MC-01/02/07); limits provenance claims (MC-03/04); avoids forced alternatives (MC-05/06); bounds deletion and imported consent (MC-08); preserves the existing receipt-versus-outcome distinction (MC-09/10); makes correction/history retention conditional on privacy (MC-11/12); retains inspectability without private reasoning (MC-13); explicitly permits compact/stateless work (MC-14); retains honest testing boundaries (MC-15). Source: [Requirements Review R1](../05-RESEARCH/CORE_V1_REQUIREMENTS_REVIEW.md). Reviewer status: assistant reconciliation only; owner/independent review pending. No licensing, certification or governance decision made.

**v0.1:** first candidate draft. All revisions must retain change, source, reviewer status and reasons. **The owner-approved mission is not an approval of this draft text.**

