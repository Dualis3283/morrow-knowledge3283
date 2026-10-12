# Morrow — Phase 6 Consolidation & Workflow Stopgap
Date: 12 October 2026
Status: consolidated source inventory and tests; six-metric baseline not frozen.
Phase 4: owner-closed. Phase 5: intentionally skipped, NOT completed.

## Context → verified evidence
The operational source of truth is the Notion Morrow Project Pipeline. GitHub morrow-knowledge3283 is a public-safe, versioned knowledge mirror; private david-walsh-site owns website source/tests/CI; Cloudflare Pages owns actual live deploy state. Google Drive contains selected historic backups, not live next-actions.

Direct inventory:
| Asset | Measured state | Good for | Boundary |
| --- | --- | --- | --- |
| Notion pipeline | 38 rows: 17 Morrow, 12 MTG, 4 Dualis, 3 BG3, 2 Other | Status drift and prioritisation | Historical rows can go stale |
| Public-safe knowledge GitHub | 36 files; 33 Markdown, 2 JSON and LICENSE | Rules, lessons, provenance | No private source content |
| Workflow ledger | 19 sequential coded cases; last 2 Oct 2026 | Event coding and lessons | Sample incomplete/chronological gap |
| Ask Morrow fixed evaluation | 48 frozen cases: 40 response, 8 system | Regression, privacy and release gates | Not visitor analytics |
| Private site GitHub | 359 files, 8 Node test files, 7 GitHub workflows | CI quality and release/readback | Source repo private |
| Price history | 256 shards, 31,688,733 compressed bytes, 107,007 printings, 30-day window, 11 Oct source date | Same-printing/provider/currency dated trends | Not causality or forecasts |
| Google Drive | 7 name-matched Morrow items across two linked Drives | Backup discovery | Not exhaustive or a restore test |
| Open site PR #8 | Ask Morrow opt-in pricing conversation proposal | Future gated feature evaluation | Open proposal, not merged or independently accepted by this audit |

Metadata: 06-SOURCES/ASSET_CATALOG_PHASE6_2026-10-12.json.

## Measurement status — no invented improvement
All 19 entries are coded as needing and recovering context, making an external action, and receiving workflow-level verification. They also state no user repetition and no material rework after completed delivery. This is coded record evidence, not a causal accuracy/reliability improvement result.

The post-release defect field instead has three classes: 5 explicit No, 7 No observed and 7 Not applicable. The new parser's unit test caught an initial mistake that treated Not applicable as No. Keeping unknown, absence, non-observation and non-applicability distinct is essential.

**Metric Definition v1 remains NOT frozen.** The next-20-eligible-workflows sampling window is interrupted: last coded 2 October, eligible work exists afterward. Do not choose a convenient current task as case 20. Recover the earliest omitted eligible case in order or start a transparently declared new prospective cohort.

Six metric blockers:
1. Material rework: only a small selected sample; comparison cohort absent.
2. Pre-release defect catch: heterogeneous defect fields and no exact per-defect denominator.
3. Continuity retrieval: workflow-level Yes is available but source currency/relevance not independently coded.
4. Verification coverage: workflow-level Yes does not equal eligible writes independently checked / eligible writes.
5. Evidence traceability: no per-conclusion eligible/traceable count.
6. Repeat-context burden: a coarse workflow-level No does not count all unnecessary restatements.
Elapsed time and overall model accuracy are not defensibly attributed to Morrow from existing logs.

Read-only script: python3 05-RESEARCH/workflow_ledger_audit.py --json.
Deterministic snapshot: 05-RESEARCH/WORKFLOW_AUDIT_SNAPSHOT_2026-10-12.json.
Candidate event template: 05-RESEARCH/WORKFLOW_EVENT_TEMPLATE_V1.md.
GitHub Actions source audit now checks count/repetition and parser classification.

## Patterns, interpretation and lessons
- GitHub task register claimed 17/20 while Notion and detailed ledger had 19/20; corrected to 19 with an explicit gap.
- Source registry still called Direct Upload V18 d7000b0a current; corrected to historical rollback, with 12 Oct verified Git production SHA and fresh-readback rule.
- Connector badge != operational capability, successful tool call != independent readback, QA != a physical-device experience study.
- Preserve exact deck/card inputs and snapshot dates so later decisions can be reproduced; missing card prices never become zero.
- Context Bridge pilot confirmed that a retrieved preference may be superseded, and superficial analogies must be rejected.
- Rendering/keyboard/gestures are distinct verification layers from source tests.
- Price comparisons must retain observation vs retrieval date, printing, finish, currency and source scope.
- Public knowledge content must never inherit sensitive Notion/private repo contents.

## Phase 6 actions
- Reconcile GitHub Working State, Task Register, Decision Log and Source Registry.
- Add public-safe asset manifest, parsed ledger snapshot, read-only audit, three unit tests and CI check.
- Preserve website visuals, Professional Equalizer, Deck Planner and existing privacy/security.
- Do not install visitor telemetry, open a public testing phase or merge Ask Morrow staging features implicitly.

## STOPGAP / next segment gate
SAFE: continue the currently deployed site, test suite, Context Observatory evidence contract, Context Bridge relevance rules, and low-risk reversible housekeeping with standard CI/release verification.
HOLD: Metric Definition v1 freeze, improvement claims, new behavioural analytics, unverified Drive restore assertions, staging-to-public AI promotion and any unapproved expansion of the roadmap.
BEFORE NEXT PHASE: reconcile earliest unlogged workflow(s), calculate exact action/conclusion denominators, confirm Notion authority and current Git/Cloudflare state, pass privacy/keyboard/QA gates for any promoted feature, obtain owner's explicit new phase scope.
Phase 5 remains skipped unless explicitly reopened. This stopgap is a workflow boundary, NOT rollback or site shutdown.

## Continuity handoff
Read this file, the current Notion project-specific record, latest production branch and the audit JSON before proceeding. Do not automatically promote old next-actions or treat successful source retrieval as current decision authority.

Retrieval tags: morrow, phase6, workflow-analytics, asset-inventory, lessons, stopgap, provenance, public-safe, phase5-skipped.
