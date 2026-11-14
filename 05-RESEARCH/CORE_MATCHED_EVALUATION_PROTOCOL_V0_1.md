# Morrow Core matched evaluation — candidate v0.1

**Prepared:** 5 November 2026. **State:** Review candidate only. Not frozen, executed, independently scored, certified or released.
**Authority:** RFC 0001 draft on proposal/morrow-core-v1-spec; candidate Core tests and three synthetic pilot fixtures.

## Context / decision

The primary P0 question is whether the Morrow Core intervention improves observable results on matched tasks. This change creates an offline standard-library harness for planning, metadata-blinded review and conservative accounting. It invokes no model, sends no data, and changes no production runtime.

Sources: 00-CORE/MORROW_CORE_V1_DRAFT.md, 05-RESEARCH/CORE_V1_CONFORMANCE_CASES.md, and 05-RESEARCH/PHASE3_LIVE_PILOT_FIXTURES_V0_1.json.

## Evidence inventory

- The Core source documents T01–T16: **16 candidate cases**, not executed behavioral results.
- T01, T02 and T06: **3 actual machine-readable synthetic pilot fixtures**. The other 13 require separately reviewed prompts and rubrics before they can be called runnable.
- The handoff kit mentions 12 recovered scenarios, but their identity, consent eligibility and possible overlap are not established by the inspected Core source. Do not count them as additional executed or eligible cases.
- The separate 19/20 Phase 6 workflow-coding foundation is incomplete and unfrozen. It is not an effectiveness denominator or paired model sample.

## Proposed protocol (NOT FROZEN)

1. Pin the exact Core draft and fixture set. The harness rejects a difference between actual Core Git-blob SHA and the fixture's recorded Core SHA.
2. Pre-register per-case success and requirement-level grading (PASS / FAIL / NOT_OBSERVED / NOT_APPLICABLE). Do not adjust criteria after seeing results without protocol revision.
3. Compare treatment B (pinned Core plus input) against A (same task without Core). Hold provider, **exact model version**, temperature/output budget, tool access, context length, system instructions and task inputs matched where possible. Start fresh chat per trial. Record every deviation.
4. Randomize trial order. Keep the operator manifest with arm labels separate from the reviewer packet, which omits arm/provider/model/instruction metadata. Responses may still reveal treatment; metadata blinding is not guaranteed double blinding.
5. Retain exact responses, timestamps, tool results/errors, provenance and run settings only in an authorized private evidence store. No private personal data, employer data, source credentials, real connected-app records or secret tokens in this public repository.
6. Code blocked access, consent failure, CAPTCHA/login and tool failures as BLOCKED/ERROR/NOT_RUN, **never** as observed model failures.
7. Ask an independent reviewer to score observed outputs against the pre-registered rubric, with a rationale and requirement-level result. The script can aggregate review rows but cannot establish reviewer independence or infer behavioral conformance.
8. Review disputes, failures, exclusions and denominators per arm before any effectiveness assertion. Local and cross-model evaluations require separate authorized runtimes and at least one local implementation.

## Local commands

Run structural/negative tests:

    python3 -m unittest discover -s 05-RESEARCH -p 'test_core_matched_eval.py' -v

Create the private operator plan (creates file, refuses overwrite):

    python3 05-RESEARCH/core_matched_eval.py plan --fixtures 05-RESEARCH/PHASE3_LIVE_PILOT_FIXTURES_V0_1.json --spec 00-CORE/MORROW_CORE_V1_DRAFT.md --provider AUTHORIZED_PROVIDER --model-version EXACT_MODEL_ID --seed 20261105 --out /private/location/plan.json

The operator executes each trial outside this tool and records observations as a JSON object containing an observations array, with each row holding trial_id, status and verbatim response. A missing output must not be reported as RESPONDED.

Generate a treatment-label-blinded review packet:

    python3 05-RESEARCH/core_matched_eval.py blind --plan /private/location/plan.json --observations /private/location/observations.json --out /private/location/blind-review.json

Independent human reviewers replace the default NOT_OBSERVED values with audited scores and add reviewer_id plus rationale. Then unblind and summarize:

    python3 05-RESEARCH/core_matched_eval.py summary --plan /private/location/plan.json --review /private/location/scored-review.json --out /private/location/summary.json

All artifacts are private/local and create-only. There is no built-in model invocation or independent scoring.

## Acceptance / reversibility

- Local synthetic tests check paired plan coverage, spec drift, duplicate IDs, missing conditions, arm masking, missing model response, erroneous blocked scoring and honest zero-observation reporting.
- GitHub CI must execute the tests on this PR; privacy checks must pass.
- Independently read back committed files and review any differences before merge.
- Owner approval required to freeze the protocol, run authorized external-model comparisons, merge, publish results, or deploy.
- Rollback: revert this isolated code, tests, workflow and document; existing Core draft and production site remain unchanged.

**Do not claim model effectiveness or conformance from these tests.** No live model evaluation has been performed in this change.
