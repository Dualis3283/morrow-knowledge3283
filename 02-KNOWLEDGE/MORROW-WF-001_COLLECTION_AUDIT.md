# MORROW-WF-001 — Evidence-driven audit, candidate workflow

**Version:** 0.2.0-candidate  
**Status:** Local reference implementation and synthetic tests completed; publication and Core ratification pending.  
**Relationship:** Implements a narrow, domain-neutral part of `Context → Evidence → Pattern → Interpretation → Action → Verification → Lesson`. Does **not** supersede the approved Morrow Operating Model or ratify Core v1.

## Purpose

Prevent an imported inventory, a successful search query or an attractive candidate from being misrepresented as a completed substantive assessment. The evidence-coverage gate accepts inventory and optional rules receipts; the verification gate checks the structure and completeness of purported interaction evidence. These are **procedural** checks, not independent adjudication of MTG card rules or any other source's real-world truth.

## How to run

```bash
python3 -m unittest discover -s 05-RESEARCH -p 'test_collection_audit_gate.py' -v
python3 05-RESEARCH/collection_audit_gate.py path/to/collection.csv --out audit.json
python3 05-RESEARCH/collection_audit_gate.py path/to/collection.csv --deck path/to/deck.txt --rules path/to/receipts.json --out audit.json
```

Inventory CSV needs **Name** and **Quantity** columns. The optional receipts JSON is an array of `{name, canonical_id, oracle_text, oracle_text_sha256, source_ref, checked_at}`. `checked_at` must be an offset-aware timestamp. A failed lookup may be represented as `{name, status: "BLOCKED_RATE_LIMIT"}`. The receipt hash must exactly match UTF-8 bytes of `oracle_text`.

The generated audit is a deterministic JSON record with `inventory`, `coverage`, `gates`, `records`, `verification_queue` and `interactions`. It does not upload any data. The optional deck list is used **only** to report counts and names absent from the CSV; lack of CSV membership is not proof of non-ownership.

## Gates

| Gate | What it establishes | Not established |
|---|---|---|
| INVENTORY_COMPLETE | Strict input row/quantity parsing with no reported errors | Rules interpretation |
| RULES_COMPLETE | Every distinct exact name has one internally consistent receipt | Authority, freshness or correctness of source |
| INTERACTIONS_VERIFIED | Every supplied scenario has steps, setup, outcome, named verified cards and test evidence metadata | Reproduction by an independent external tester |
| RECOMMENDATIONS_VALIDATED | Deliberately always false in this candidate | No ranking / recommendation engine yet |
| ALLOCATION_CONFIRMED | Deliberately always false in this candidate | Physical copy allocation is unknown |
| EXPORT_QA_PASSED | Deliberately always false in this candidate | Workbook exporter not implemented |

**Vocabulary caution:** `RULES_VERIFIED` and `SCENARIO_VERIFIED` label *structurally valid supplied receipts* under this early candidate; they do not prove rules truth, authentic retrieval, or external conformance. Production requires authenticated source acquisition and independently reproducible interaction tests before such labels can imply independent confirmation.

## Coverage example (local, not included in public repo)

A private local inventory run reproduced the input row, copy and unique-name counts. No authoritative per-card rules snapshots were supplied to the candidate run, so every card remained in an explicit unresolved queue. `INVENTORY_COMPLETE=true` and `RULES_COMPLETE=false`. The counts and actual inventory remain in the private audit, not this public implementation.

Do **not** publish the private inventory, full per-card queue, personal data, original workbook or local audit JSON in this public repository.

## Regression tests

The adjacent synthetic test module exercises 14 **code-level** behaviours: CSV parsing including quoted names/BOM, current deck count preservation, no negative inference, provider failure persistence, receipt hash integrity, duplicate-receipt conflict, partial vs complete coverage, scenario evidence prerequisites, missing proof, invalid quantity, timestamp timezone, allocation uncertainty, determinism and empty inventories.

These are **not** completion of the wider 14-case domain and methodological acceptance suite in the original 0.1 specification. MTG rules adjudication, source authentication, automated full collection Oracle retrieval, semantic scoring, external model portability and workbook QA remain **NOT OBSERVED / NOT IMPLEMENTED**.

## Next gates before integration into ratified Morrow Core

1. Add exact canonical-ID resolution for aliases, multi-face names and printings, with ambiguous matches kept unresolved.
2. Build a provider-compliant, resumable authenticated rules-data adapter with cache, provenance, retry budget and coverage manifests.
3. Implement domain-neutral causal links and domain-specific rule execution; verify mechanisms with independent test cases.
4. Add opportunities/cut comparison, physical allocation reconciliation and transparent scored dimensions; validate against real playtest outcomes.
5. Export JSON and workbook from the same records; check formulas, count reconciliation and provenance links.
6. Establish CI status/readback, independent review and owner acceptance before promotion to `main` or Morrow Core.

**Principle:** processing every name is not understanding every item. A missing rule is `NOT_CHECKED`, never `REJECTED`. A test cannot be marked as run when it was only drafted.
