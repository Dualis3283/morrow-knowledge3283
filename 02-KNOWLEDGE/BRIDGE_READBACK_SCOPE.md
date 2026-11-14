# Bridge v0.1 — Candidate readback verification

**Status:** Draft Phase 3 CI component, not ratified and not independently certified.

## What this gate proves

- An artifact exists in a permitted workspace and was read afresh.
- Its SHA-256 digest matches one captured from a trusted source before transfer.
- The destination is unambiguous UTF-8 JSON with no duplicate keys.
- It satisfies the existing Bridge v0.1 structural and local semantic validator.
- The record identifier matches the expected reference.

The check is a **local controlled-transfer integrity/schema test**, not a live cross-model experiment. It does not prove the target model understood the content, that an upload/sync occurred, that provenance or consent were authenticated, or that public release is authorized.

## Lifecycle boundary

The README states: planned → attempted → accepted → active → independently verified → user confirmed. These denote separate observed stages; a successful local readback **does not** automatically promote any lifecycle status. Each stage must be evidenced and authorization remains independent.

## Secure/private storage boundary

**Reject blind scrubbing as a public-release gate.** Keep private masters outside the public worktree with access controls; do not embed local master paths or private identifiers in public output. Require explicit, authenticated, destination-specific approval and deliberate minimization into a new public-safe summary. Run the existing repository privacy scan, then verify the actual destination. Regex substitution alone does not constitute permission to publish.

## CI evidence

The existing Morrow Bridge workflow now runs the synthetic schema and readback unit tests and separately stages a copied fixture, verifies the expected pre-transfer SHA-256, and checks the destination. Any actual cross-model testing remains **NOT OBSERVED** until third-party model inputs/outputs are collected and retained.

**Next:** acquire authorised live model access, agree the test corpus and scoring rubric, and independently assess both fidelity and privacy behaviors before making model-interoperability claims.
