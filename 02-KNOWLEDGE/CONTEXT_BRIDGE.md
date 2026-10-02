# Morrow Context Bridge & Relevance Engine v1

**Established:** 2 October 2026

## Purpose

Operationalise the Relational Context Ruleset.

The Context Bridge answers:

> **What from the past may help us understand this better now, and does it still apply?**

It is neither a memory dump nor a personality-prediction system.

## Core flow

**Current situation → candidate prior context → relevance test → freshness/change test → scope check → difference check → present connection → combined reasoning → lesson capture**

Retrieval and judgment are separate operations.

A record can be relevant enough to retrieve while still being too stale, too different, too narrow, or too uncertain to influence the current conclusion.

## Context-record metadata

Use these fields where useful:

| Field | Purpose |
|---|---|
| Type | principle / preference / decision / lesson / failure-pattern / successful-pattern / open-question / personal-perspective / source-fact |
| Scope | project / domain / cross-project / general |
| Subject | what the record concerns |
| Recorded date | when the information was captured |
| Last confirmed | most recent explicit validation, when applicable |
| Confidence | confirmed / probable / provisional / superseded |
| Source | recoverable supporting pointer |
| Cross-project relevance | none / possible / demonstrated |
| Superseded by | newer authoritative record |
| Retrieval boundary | broad / project-scoped / direct-relevance-only |

This metadata does not need to become a rigid database schema everywhere. It is the minimum conceptual contract for reliable retrieval.

## Relevance test

A candidate record should be surfaced only when enough of these checks pass:

1. **Subject relevance** — same subject, actor, object, or decision?
2. **Pattern relevance** — meaningfully similar mechanism or failure/success pattern?
3. **Decision relevance** — could it materially alter an option, risk, or interpretation?
4. **Freshness** — is the information current enough for the claim?
5. **Change check** — has the person, project, requirement, or environment changed?
6. **Scope check** — is the context appropriate to surface in this situation?
7. **Difference check** — what makes the earlier situation materially different?

A contextual connection is evidence to inspect, not a conclusion to inherit.

## Jeff Goldblum effect

When a later situation reveals a meaningful connection to earlier learning:

1. retrieve the earlier record;
2. state the connection;
3. explain why it may matter;
4. identify material differences;
5. test whether the earlier lesson still applies;
6. use the result as additional evidence rather than automatic precedent.

This is a **relevance bridge**.

## Personal-context guardrail

For preferences, beliefs, and behavioural observations:

Prefer:

> **Historically observed preference — last confirmed [date].**

Avoid silently presenting it as:

> **Current preference.**

Past behaviour is evidence about a person, not a definition of that person.

When a current decision materially depends on the preference, compare the historical record against present expression.

## Disagreement diagnostic

When two interpretations conflict, inspect whether the difference comes from:

- different evidence;
- different interpretation of shared evidence;
- changed circumstances;
- different definitions;
- stale context;
- different priorities;
- genuinely different judgment.

Do not assume disagreement means one party has failed.

## Presentation rule

When retrieved context materially affects an answer, make the bridge understandable:

- **Prior context** — what was learned before.
- **Why it connects** — shared subject, mechanism, or pattern.
- **What differs now** — material changes.
- **Current weight** — how strongly the old context should influence present reasoning.

Do not force this structure into low-risk conversation when the connection is obvious.

## Initial pilot

Test 3–5 existing durable records with at least:

1. one genuine cross-project Jeff Goldblum-effect connection;
2. one historical preference that must be checked for change;
3. one false or weak analogy that should be rejected;
4. one prior failure-pattern that produces a useful standing check.

Record why each candidate was accepted, downgraded, or rejected.

## Evaluation

Track:

- useful prior connections surfaced;
- false/forced analogies;
- stale assumptions avoided;
- user repetition prevented;
- disagreements that reveal new information;
- retrievals that were relevant but correctly given low decision weight.

## Relationship to other Morrow systems

- **Relational Context Ruleset** — why context should be used this way.
- **Context Bridge** — what prior context to retrieve and how to test it.
- **Pipeline Reconciliation** — which record is current when records conflict.
- **Consistency Protocol** — how much verification a consequential claim/action requires.
- **Source & Research Archive** — provenance and source pointers that make retrieval inspectable.
