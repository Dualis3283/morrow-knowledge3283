# Task Register

## Morrow operational baseline — 19 October 2026

**Last consolidated (public GitHub mirror):** 19 October 2026 — GitHub, Notion and current CI reconciled; [audit evidence](../05-RESEARCH/MORROW_PIPELINE_AUDIT_2026-10-19.md)  
**Current operational status:** **Active for GitHub CI and curated public knowledge**; portable model-to-model interoperability is **planned / NOT OBSERVED**.  
**Authority boundary:** Notion's Morrow project pipeline remains the operational task authority; this GitHub record is a public-safe, independently readable checkpoint, not evidence of a Notion sync or a local workstation deployment.

### Active execution pipeline — scoped lifecycle observations

| ID | Work item | Observed lifecycle state | Evidence and limits | Next gate |
| --- | --- | --- | --- | --- |
| TASK-001 | Canonical repository layout | **independently verified** (GitHub only) | Eight required directories on `main` passed the [Morrow structure gate](../.github/workflows/morrow-gates.yml) and [PR #3](https://github.com/Dualis3283/morrow-knowledge3283/pull/3). Local PC layout and explicit user confirmation: **NOT OBSERVED**. | Separately verify any chosen local installation; obtain owner confirmation if requested. |
| TASK-002 | GitHub context and privacy gates | **independently verified** (repository CI scope) | Protected `main` requires passing `privacy` and `verify-layer`; both passed on [merge commit 54fd975](https://github.com/Dualis3283/morrow-knowledge3283/commit/54fd97524158c6a44a7afcc6c01eef3b79a7e2eb). Actual cross-model evaluation is **NOT OBSERVED**. | Retain CI and human semantic privacy review; inspect any future failures. |
| TASK-003 | Cross-model Context Bridge interoperability | **planned** (live evaluation) | [Draft PR #1](https://github.com/Dualis3283/morrow-knowledge3283/pull/1) passed 24/24 synthetic tests and a staged destination readback. Distinct live models, paired outcomes, remote sync and independent behavioural assessment: **NOT OBSERVED**. | Fix a cross-compatibility matrix, model versions, synthetic cases, scoring and approved execution routes. |
| TASK-004 | Secure private/local context store | **planned** (deployment) | Privacy separation and publication rules are active in GitHub; no encrypted private store, local runtime or deletion-propagation test has been independently verified. | Specify access controls, key ownership, retention, deletion and per-destination authorisation before any private-data import. |
| TASK-005 | Cloudflare Workers build for the public knowledge repository | **planned** (investigation) | Cloudflare Workers Builds check **failed** on baseline `bd2119e`; GitHub privacy/verify-layer/ledger checks passed. Authenticated Cloudflare build-log cause is **NOT OBSERVED**. | Inspect the relevant Cloudflare Worker build logs; determine whether the unintended build integration should be corrected or disabled, without impacting website production. |
| TASK-006 | Cross-system pipeline reconciliation | **independently verified** (Notion/GitHub record scope) | On 19 October, Notion Core, Phase 3, Knowledge Architecture, Working State and Decision Log updates were fetched after the writes; GitHub public-safe mirror has separate commit/CI gates. | Retain record provenance, avoid stale next-actions and keep private Notion source links out of public exports. |
| TASK-007 | Public Publisher and read-only Bridge candidate | **independently verified** (source/CI scope only) | [PR #6](https://github.com/Dualis3283/morrow-knowledge3283/pull/6) merged at `1431b6d`; 15/15 Node endpoint/security tests passed plus repository privacy and verify-layer CI. Actual Cloudflare runtime and independent MCP interoperability: **NOT OBSERVED**. | Restore Cloudflare authorisation, inspect separate staging environment and independently test deployment before public exposure. |
| TASK-008 | Cloudflare public Worker staging deployment | **planned / blocked** | No live staging route, public hostname, deploy receipt or HTTP readback. Cloudflare account and Worker API reads returned HTTP 400 authentication errors; no secret changes were made. | Reconnect/authenticate Cloudflare through official flow; verify account and use Access-protected staging first. |
| TASK-009 | Morrow Verify conformance runner | **planned** | Three synthetic example descriptions published as source/API fixture only; no independent model comparison, result evidence, signed tests or external evaluation performed. | Reconcile 12-versus-16 cases, agree model/fixture contract, then pilot with authorised model access. |
| TASK-010 | Morrow Observer and Outreach | **planned** | No production metrics collection, contact retention, automated social posting or release-distribution bots deployed. | Define aggregate-only measurement, retention, opt-in outreach and human approval before any implementation. |

**Lifecycle legend:** `planned` → `attempted` → `accepted` → `active` → `independently verified` → `user confirmed`. These labels apply to **bounded tasks**, not to the entire Morrow project by inference. A successful CI check does not confer user confirmation.

**Persistence observations:** `prepared` ≠ `saved` ≠ `uploaded` ≠ `synced` ≠ `verified`. A recorded commit/readback proves only the repository state checked; external destinations require separate evidence.

**Reconciliation note:** This checkpoint supersedes the older *add Bridge CI* next-action below. It does not replace unrelated projects, the Notion task source, the 19/20 unfrozen workflow baseline or prior decisions.

---

Consolidated from Notion pipeline status plus live external verification.

## NOW

### Morrow Core Phase 3 — primary P0
**Status:** Candidate Core v1/Bridge v0.1 remain on draft PR #1. Structural CI and staged integrity readback have passed (24/24 synthetic tests); live cross-model conformance and adoption remain NOT OBSERVED.  
**Next:** Prepare the cross-compatibility matrix and paired controlled model trials; review Core MC-01–15 and R1 changes without ratifying the draft or importing private context.  
**Authority:** 14 October owner strategic P0; project record in Notion. Do not confuse this with older website phases or the distinct, unfrozen Phase 6 workflow measurement baseline.  


### Ascension preview metadata recovery
**Status:** Open after the 13 October editorial review. The existing album.json is absent; previews were already unavailable before PR #10.  
**Next:** recover a verified track list, durations and approved preview URLs; add the metadata through normal source/release gates and verify playable audio. Until then retain the explicit unavailable-preview message and streaming links. Do not invent metadata or mark audio restored from deployment success alone.

### Website recurrence controls
**Status:** Implemented in the 13 October review; follow-up on the next relevant correction.  
**Next:** apply 00-CORE/RELEASE_REVIEW_PROTOCOL.md; a second occurrence must explain the failed control and revise its check before closure. Keep owner evaluation distinct from automated verification. See 05-RESEARCH/MORROW_RETROSPECTIVE_2026-10-13.md.

### Morrow Knowledge Repository
**Status:** In progress / active  
**Next:** keep converting durable Notion knowledge into curated GitHub records with provenance and readback.

### Morrow Knowledge Model
**Status:** In progress / active  
**Next:** update only when recurring corrections, failure classes, or successful workflows materially change future handling.

### Morrow Knowledge Architecture
**Status:** In progress / active  
**Next:** pilot completed on 2 October (five candidate bridges). Use the findings for normal contextual retrieval; expand evaluation only when a new decision requires it.

### Morrow Context Bridge & Relevance Engine
**Status:** In progress / active  
**Next:** reuse the completed five-case Context Bridge pilot; record accepted, downgraded and rejected connections on demand rather than mass-tagging the archive.

### Morrow Knowledge Infrastructure
**Status:** In progress / active  
**Next:** verify current authority and readback across Notion (operational), GitHub (versioned knowledge and code), Cloudflare (deployed runtime), and Drive (selected backups).

### Morrow Connector & Integration Layer
**Status:** In progress / research  
**Next:** maintain a proven-capability map; real reads/writes override connection badges.

### Ask Morrow AI Workflow
**Status:** In progress / staging-only; Workers AI runtime and P0 gate pass  
**Next:** complete one genuine keyboard-only staging walkthrough. Do not describe or promote Ask Morrow as public beta until that P1 gate passes.

### Deck Planner Companion App
**Status:** In progress / review  
**Next:** phone review, Shorikai/Victor regression checks, accessibility QA, rate-limit/resolver monitoring.

### Deck Evolution Planner
**Status:** In progress / review  
**Next:** final v0.7 review; promote only after sign-off.

## NEXT

### Compleated Loyalty physical proof
**Status:** Redesign complete; production validation pending  
**Next:** print representative proof from Print Master v2 at Actual Size.

### Project Morrow measurement foundation
**Status:** In progress — 19/20 coded workflows (last dated 2 October 2026); chronological sampling gap and schema issues remain.  
**Next:** identify and code the first still-eligible unlogged workflow after 2 October, rather than picking a convenient recent task; reconcile per-action verification and per-conclusion traceability denominators before freezing Metric Definition v1. Run the offline workflow ledger audit for current raw counts; do not publish improvement percentages.

### MTG Deck Development
**Status:** In progress  
**Next:** continue collection-driven EDH development while preserving exact list versions.

### MTG Collection Knowledge Base
**Status:** In progress / planning  
**Next:** convert validated collection/card interactions into durable knowledge.

### Creative Corpus & Revenue Path
**Status:** In progress / planning  
**Next:** inventory connected creative work and map themes/products/revenue paths.

### Dualis Memoir & Poetry
**Status:** In progress / research  
**Next:** separate chronology, themes and literary passages; keep private-source boundary.

### Dualis Music
**Status:** In progress / active  
**Next:** organise releases and supporting material.

### Dualis Music Catalogue
**Status:** In progress / planning  
**Next:** build durable release/track/platform catalogue.

### Morrow Visual System
**Status:** In progress / active  
**Next:** use approved hierarchy as default where suitable; update only after explicit cross-project decisions.

### Morrow Source & Research Archive
**Status:** In progress / active  
**Next:** align provenance fields with Context Bridge: source pointer, recorded date, last-confirmed date, confidence, scope, cross-project relevance and supersession.

## LATER

### BG3 Builds & Campaigns
**Status:** In progress  
**Next:** maintain current decisions and state snapshots.

### BG3 Current Tactician Campaign
**Status:** In progress  
**Next:** update from actual current save state before build prescriptions.

### MTG Eight-Deck Story
**Status:** Not started  
**Next:** develop titles/essence/realm narrative when reopened.

### Morrow Creative Framework
**Status:** Not started  
**Next:** define Morrow ↔ Dualis ↔ creative-corpus relationship.

## SOMEDAY

### BG3 Solo Dark Urge Concept
**Status:** Not started / planning  
**Next:** revisit after current run; verify actual mod support before execution.

## CLOSED / ARCHIVED

- Website photo-driven responsive correction — completed 12 October 2026, final tested production SHA ad8da033, evidence archived in 07-ARCHIVE/WEBSITE_LAYOUT_PHOTO_CHECKPOINT_2026-10-12.md. The website project itself remains active in Notion.

- Magic Quick-Reference Guide — complete.
- Deck Planner Flow Validation v0.4 — complete; superseded as active baseline by later flow-locked work.
- Compleated Loyalty redesign tickets — closure consolidated under canonical final archive.
- 23 Sep mixed chat backup — recovery archive, not an active task.
- FitzChivalry character study — complete reference.
- Project Morrow historical baseline checkpoint — complete.
- Viv Vision Stax / Control — retired from active tracking; historical context only.
