# MVR-003 — Bridge integration checkpoint

Date: 12 November 2026. Candidate / not ratified.

Baseline: Core proposal commit `56564066627c7ec9ccb73799d3d37b15494112f1`. Original MVR v0.2 archive integrity 10/10; 20 structural and 13 mock adapter scenarios rerun. This revision stages a separate sidecar schema and an actual Bridge gate in `morrow_bridge/visual_gate.py`. Upstream Bridge schema and validator are unchanged.

Observed local tests: 28 unittest methods passed (24 previous Bridge/readback tests + 4 visual test methods, including 19 veto subcases). No model transfer or human comprehension result. The gate requires trusted caller authorization and dependency snapshots; pointer/time equality is not authenticated provenance, and public-review boolean is not independently authenticated. No external transfer or deletion propagation was exercised.

Pilot proposal: HAR + Console Investigator, using synthetic captures only. Display an evidence/interpretation distinction in selected evidence, link each claim to source rows, show chronology and matching IDs separately, leave missing timestamps unaligned, distinguish measured blocked duration from hypothesized user-visible freeze. Preserve local-only processing, redaction, the existing list/detail relationship and text fallback; no raw capture export or external AI calls. Freeze synthetic fixtures before implementation: matching ID, near time only, missing timestamp, unknown duration, contradictory ID, redaction and keyboard/mobile. Compare existing view with candidate view for correct evidence classification, correct event selection, time and perceived clarity; no effect-size claim until measured. Secondary pilots: deck planner roles/coverage and Project Morrow method explainer.

Next action: run CI on proposal, review privacy and provenance semantics, then build a small local-only HAR pilot on website feature branch. No main merge or production change.

## Pilot priority supersession — 12 November 2026 (MVR-004)

The project owner directed the Deck Planner to be the first test area, to assess function and aesthetics against the established Morrow design. HAR + Console Investigator is the second pilot, after validation and review of the first; Deck Simulator is optional follow-on work, not a prerequisite. The earlier HAR-first recommendation above remains historical.

A private website feature branch now contains an optional, read-only role evidence explorer under Functional Coverage. It reuses existing data, count targets, player tags and heuristic detection; overlap counts once; no new network, persistence or rules inference. Four synthetic unit tests and module syntax passed locally; all three committed files matched readback. Draft review is open. Browser, responsive, keyboard, offline, comparative comprehension and owner visual approval are outstanding. No production changes or ratification.

Next action: review candidate at staging, complete site QA and the pilot-specific visual/interaction checks, then record owner feedback and reusable lessons. Do not begin HAR implementation until this gate has been reviewed. P0 Core evaluation remains a separate priority.

## MVR-005 — Deck Planner QA and correction checkpoint

12 November 2026. Initial website Site QA passed. During source review, two fidelity problems were identified: direct coverage-table redraws did not always refresh the visual role explorer, and the existing advanced-tag add path promoted active detected roles into player tags. Both corrected in the private website candidate. Historical copied tags cannot be reconstructed automatically. Overlap is not verification; the pilot now uses gold rather than green for the overlap category. Added accessible status text and 44px target sizes. Four unit tests and module/browser-test syntax checks passed; three changed files matched the new commit. The revised Site QA run is in progress and includes a synthetic browser regression for immediate refresh, provenance separation, targets, empty state, keyboard, responsive widths and no additional fetches. Staging authenticated read was blocked by Cloudflare HTTP 400 invalid authentication header; no independent preview or owner visual approval. No production change. HAR remains second and untouched.

Next gate: revised CI result, staging/actual visual review, enlarged text and comparative usability before promotion or HAR application.
