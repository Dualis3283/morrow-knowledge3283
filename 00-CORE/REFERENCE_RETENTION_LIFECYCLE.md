# Morrow Reference and Retention Lifecycle v0.1

**Established:** 7 November 2026
**Status:** Proposed extension to the Consistency Protocol and Relational Context Ruleset, pending independent review.
**Purpose:** Make automated work lighter and preserve recoverable insights without allowing historical records to dictate future user choices.

## Principle: context is evidence, not authority

Recall is conditional on relevance, provenance, freshness and present user intent. Prior decisions are evidence of what was chosen under earlier conditions, not standing instructions or permanent preferences. User agency, current circumstances and verified evidence take precedence. An agent may disagree with prior interpretations and must clearly identify the changed context.

## Portable checkpoint schema

A retained Morrow record should include:

- `record_id`, `recorded_at_utc`, `scope`, `project`, `source_title`, `source_reference`, `source_timestamp`, `content_hash`
- `classification`: public / approved personal / private; retrieval must obey current authorisation
- `evidence`: confirmed observation, hypothesis, unknown, contradictory evidence
- `decision_at_the_time`: what was actually decided; `decision_owner`, `rationale`, `constraints_then`
- `outcome`: what was tested, observed and independently verified; name untested effects
- `usage`: what generated the record, a bounded resource/cost estimate, duplicate-risk
- `retrieval_tags`, `supersedes`, `superseded_by`, `review_after`, `expires_after`
- `payload_state`: active / summarized / archived / deleted / not preserved
- `binding_status`: **historical_reference_only** by default, not a present instruction

Do not invent source references or content hashes. If only metadata is retained, say plainly that payload content cannot be reconstructed.

## Operating gates

1. **Before running:** identify what changed and select the narrowest necessary test or source read. Skip unchanged components and do not fetch an entire bulk dataset to answer a narrow question.
2. **After running:** capture inputs, time, source, outcome and unknowns in a concise checkpoint. Distinguish tests of behaviour from evidence of production deployment.
3. **Classify:** deduplicate by content hash and source revision. Keep unique failure material and consequential decisions; avoid keeping repeated successful screenshots where source tests reproduce them.
4. **Protect:** check privacy classification and destination; private source records stay private even if a public summary is useful.
5. **Retain:** archive metadata/lessons to a knowledge location that is not the public production asset tree. Bound temporary automation payloads to **30 days maximum** unless a concrete, approved reason requires shorter or longer retention.
6. **Delete:** check checkpoint persistence by readback first; then delete eligible redundant payloads, record exact receipts. A deletion without verified record is not completion.
7. **Retrieve:** run relevance, temporal, contradiction and permission checks; summarize evidence plus differences from current context. Do not automatically apply old decisions.
8. **Update:** mark corrections and supersession rather than rewriting older experience as if it never occurred.

## Change-scaled verification

- Content-only / new snapshot: inexpensive schema, privacy, links and provenance checks.
- Isolated code component: unit tests and affected integration path.
- Simulator mechanics, payments, security, production promotion: full relevant regressions and release gate.
- Debug evidence: store on failure or meaningful anomaly, not every passing run.
- Release proof: commit SHA, CI result, deployment ID, live readback and owner review remain distinct lifecycle gates.

## Efficiency reporting

Track number of runs, minutes, artifact bytes retained, cache occupancy, external bulk downloads, duplicate runs and protected checks. Use baseline/after comparison and disclose when measurement is unavailable. **Fewer tests alone is not improvement** if defect-detection coverage degrades.

## Context retrieval rule

A useful record can suggest a question or hypothesis, but never silently choose the answer. Tell the user what was recalled, when it applied, what has changed and how strong its evidence is. If newer evidence conflicts, re-evaluate rather than privileging memory.

This extension supplements, not replaces, 00-CORE/CONSISTENCY_PROTOCOL.md, 00-CORE/RELATIONAL_CONTEXT_RULESET.md and 00-CORE/PUBLICATION_PRIVACY.md.

## Canonical project terminology

Use **Morrow** (M-O-R-R-O-W) in prose, **MORROW** in uppercase labels, and `morrow` in machine identifiers, paths and workflow names. Normalize speech-to-text variants when they refer to this project. Preserve unrelated proper names and source quotations, immutable history, artifact IDs and evidence digests.
