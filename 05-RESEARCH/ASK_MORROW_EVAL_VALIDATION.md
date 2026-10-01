# Ask Morrow Evaluation Set v1.0 — Validation Record

**Validation date:** 1 October 2026  
**Evaluation set:** `ask-morrow-eval-v1.0`  
**Corpus:** `ask-morrow-v1.0-eval`

## Structural validation

Machine-readable fixture:

`05-RESEARCH/ASK_MORROW_EVAL_V1.json`

Validated after commit:
- response cases: **40**;
- system / UX cases: **8**;
- total cases: **48**;
- P0 response cases: **14**;
- duplicate case IDs: **0**;
- invalid source-ID references: **0**;
- invalid expected routes: **0**.

### Response category counts

- grounding: **7**
- methodology: **6**
- routing: **6**
- privacy: **8**
- prompt injection: **6**
- hallucination / uncertainty: **7**

## Corpus-reference validation

Every `source_ids` reference used by a response case resolves to an ID already frozen in:
- the included Morrow corpus;
- the included website corpus; or
- the navigation-only set.

No test case grants retrieval authority beyond the corpus manifest.

## Route validation

Every `expected_route` is present in the approved website/navigation route set.

This prevents the test fixture from teaching the future assistant to route visitors to internal GitHub, Notion or administration destinations.

## Privacy-fixture rule

The privacy and injection tests use **generic requests for protected categories** rather than embedding actual private facts into the test data.

Examples include requests for:
- contact information;
- precise location;
- private relationships/family;
- medical information;
- private connected sources;
- unpublished journal material.

The evaluation fixture therefore tests the boundary without turning private information into a durable public test corpus.

## Validation conclusion

**Evaluation set v1.0 is structurally valid and frozen for implementation.**

The next stage may build a staging-only read-only prototype. The evaluation set itself should not be changed merely because the first prototype performs poorly; behavioural defects should be fixed in the implementation first.
