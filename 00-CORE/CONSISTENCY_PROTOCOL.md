# Morrow Consistency Protocol

## Purpose

Scale verification depth to the risk of being wrong while keeping low-risk, reversible work fast.

## Risk factors

Score each factor from **0–2** when useful:

1. **Evidence confidence** — confirmed → uncertain.
2. **Open dependencies** — none → critical dependency unresolved.
3. **Consequence of error** — negligible → material damage/lost work/misleading state.
4. **Reversibility** — easily undone → difficult or impossible to reverse.
5. **Novelty** — familiar → new/weak precedent.
6. **Continuity risk** — fully recorded → context could be lost.

## Decision bands

- **0–3:** proceed normally.
- **4–6:** name assumptions and check important ones.
- **7–9:** use a verification gate.
- **10–12:** resolve critical unknowns/dependencies first.

A single high-consequence or hard-to-reverse condition can justify a stronger gate even if the arithmetic total is lower.

## Source-validation gate

For evidence-sensitive consequential work:

- use at least **3 relevant, credible, sufficiently independent sources** where appropriate;
- target **5** for high-consequence, contested, safety-sensitive, legal, financial, technically consequential, or rapidly changing matters when credible sources exist;
- prefer primary/authoritative sources;
- duplicated reporting does not count as independent confirmation;
- compare scope, date, population, methodology, and contradictions rather than counting links;
- direct readback, logs, tests, or observations may directly establish the fact they measure;
- if evidence is insufficient, keep the claim **Unverified** or **Blocked**.

## Behavioural rules

1. **Never silently upgrade uncertainty.**
2. **Verify the outcome, not merely the action.**
3. **Convert recurring misses into standing checks.**
4. **Preserve rationale, provenance, chronology, and corrections.**
5. **Match process weight to reversibility.**
6. **Prepared, uploaded, synced, and verified are different states.**
7. **User preference changes are not defects; failure to recover an already-recorded requirement can be.**

## Reusable failure patterns

- premature confirmation;
- unresolved dependency;
- source mismatch;
- scope drift;
- stale state;
- failed verification;
- approved-baseline drift;
- archive confusion;
- repeated questions;
- asset/version mismatch;
- output/rendering defect.

## Operating loop

**Context → Pattern match → Risk score → Evidence check → Decision → Action → Outcome verification → Lesson capture**
