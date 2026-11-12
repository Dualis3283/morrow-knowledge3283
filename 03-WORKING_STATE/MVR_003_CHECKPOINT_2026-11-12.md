# MVR-003 — Bridge integration checkpoint

Date: 12 November 2026. Candidate / not ratified.

Baseline: Core proposal commit `56564066627c7ec9ccb73799d3d37b15494112f1`. Original MVR v0.2 archive integrity 10/10; 20 structural and 13 mock adapter scenarios rerun. This revision stages a separate sidecar schema and an actual Bridge gate in `morrow_bridge/visual_gate.py`. Upstream Bridge schema and validator are unchanged.

Observed local tests: 28 unittest methods passed (24 previous Bridge/readback tests + 4 visual test methods, including 19 veto subcases). No model transfer or human comprehension result. The gate requires trusted caller authorization and dependency snapshots; pointer/time equality is not authenticated provenance, and public-review boolean is not independently authenticated. No external transfer or deletion propagation was exercised.

Pilot proposal: HAR + Console Investigator, using synthetic captures only. Display an evidence/interpretation distinction in selected evidence, link each claim to source rows, show chronology and matching IDs separately, leave missing timestamps unaligned, distinguish measured blocked duration from hypothesized user-visible freeze. Preserve local-only processing, redaction, the existing list/detail relationship and text fallback; no raw capture export or external AI calls. Freeze synthetic fixtures before implementation: matching ID, near time only, missing timestamp, unknown duration, contradictory ID, redaction and keyboard/mobile. Compare existing view with candidate view for correct evidence classification, correct event selection, time and perceived clarity; no effect-size claim until measured. Secondary pilots: deck planner roles/coverage and Project Morrow method explainer.

Next action: run CI on proposal, review privacy and provenance semantics, then build a small local-only HAR pilot on website feature branch. No main merge or production change.
