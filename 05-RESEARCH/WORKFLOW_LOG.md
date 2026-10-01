# Project Morrow — Workflow Measurement Log

This log implements the 20-workflow foundation defined in `MEASUREMENT_FOUNDATION.md`.

## Workflow 01 — Website Git source foundation & QA baseline

**Date:** 1 October 2026  
**Project:** David Walsh Website / Project Morrow infrastructure  
**Task type:** prior-state retrieval + external connector execution + repository creation + QA automation

| Field | Result |
|---|---|
| Prior context required? | Yes |
| Context retrieved successfully? | Yes |
| User repetition required? | No |
| Evidence validation required? | Yes |
| External write/action? | Yes |
| Independent verification performed? | Yes |
| Defect found? | Yes — implementation syntax error during an attempted combined recovery script, caught before repository write |
| Defect caught before final release? | Yes |
| Post-release defect? | No |
| Material rework after completion declared? | No |
| External-system issue | Cloudflare Browser Rendering rate limit during bulk source recovery |
| Final outcome | Private website repo created; V18 baseline/route graph recorded; production smoke workflow committed and passed |

---

## Workflow 02 — Recover V18, reconstruct runtime, prove staging, cut production to Git

**Date:** 1 October 2026  
**Project:** David Walsh Website / Deck Planner / Project Morrow infrastructure  
**Task type:** source recovery + runtime reconstruction + regression engineering + Git/Cloudflare integration + production cutover

| Field | Result |
|---|---|
| Prior context required? | Yes |
| Context retrieved successfully? | Yes |
| User repetition required? | No |
| Evidence validation required? | Yes |
| External write/action? | Yes |
| Independent verification performed? | Yes — multiple independent gates |
| Defects/configuration issues found? | Yes — all caught before an unverified production state was accepted |
| Post-release defect? | No observed defect |
| Material rework after completion declared? | No |
| Final outcome | Existing Cloudflare production project converted from ad-hoc Direct Upload to verified GitHub-backed deployment |

### Key evidence
- staging deployment: `094e3343` — full equivalence passed;
- first Git-backed canonical production: `b861c0a4`;
- V18 Direct Upload rollback preserved: `d7000b0a`;
- resolver reconstruction and multi-face regression suite passed.

---

## Workflow 03 — Enforce a QA-gated production branch without native branch protection

**Date:** 1 October 2026  
**Project:** David Walsh Website / Project Morrow infrastructure  
**Task type:** repository hardening + CI/CD gate design + production branch separation + runtime verification

| Field | Result |
|---|---|
| Prior context required? | Yes |
| Context retrieved successfully? | Yes |
| User repetition required? | No |
| Evidence validation required? | Yes |
| External write/action? | Yes |
| Independent verification performed? | Yes — GitHub branch refs, workflow steps, Cloudflare deployment stages, canonical-hostname verification |
| Constraint found? | Yes — native branch protection unavailable for the private repo on the current GitHub plan |
| Unsafe workaround used? | No — repo remained private |
| Defect caught before release? | No release defect; architecture was adapted to the plan constraint |
| Post-release defect? | No observed defect |
| Material rework after completion declared? | No |
| Final outcome | Production now deploys only from a QA-promoted `production` branch rather than directly from `main` |

### Constraint evidence

GitHub branch protection read returned HTTP 403 with:

> “Upgrade to GitHub Pro or make this repository public to enable this feature.”

Decision:
- do not make the website source public solely to unlock branch protection;
- preserve privacy;
- enforce the critical safety property at the deployment boundary.

### Architecture implemented

- `main` = tested integration branch.
- `production` = Cloudflare live source.
- feature branches = change isolation and staging previews.
- Site QA runs for PRs to `main` and pushes to `main`.
- Promotion runs only for successful push-triggered Site QA on `main`.
- Promotion checks that current `production` is an ancestor of the verified commit.
- Promotion uses a normal fast-forward push; no force push is permitted by the workflow.
- Cloudflare production branch changed from `main` to `production`.
- Staging previews expanded to ordinary feature branches with PR comments.

### Verification sequence

Gate commit:
- `7af90a462b63ba1a02e2ba3f94e6dba0d19bdde1`

Observed sequence:
1. `main` received the gate commit.
2. `production` remained on `9a814dc...` while QA ran.
3. Site QA completed successfully:
   - Resolver regression tests — success.
   - Repository static validation — success.
   - Source secret scan — success.
   - Current production health — success.
4. **Promote production** triggered from the successful Site QA workflow.
5. Fast-forward-only promotion — success.
6. `production` advanced exactly to `7af90a46...`.
7. Cloudflare created production deployment **`c8709b99`** from branch `production`.
8. Queue / initialize / clone / build / deploy — all success.
9. Pages Functions active.
10. Canonical `david-walsh.pages.dev` full verification — success:
    - V18 static equivalence;
    - route/marker smoke;
    - internal links/assets;
    - resolver contract parity;
    - secret scan.

### Workflow 03 lessons / guardrails

- Separate “can push code” from “can deploy production”.
- When native branch protection is unavailable, isolate production behind a distinct branch and gate branch advancement with CI.
- Never make a private source repository public merely to gain a convenience control unless that trade-off is explicitly intended.
- Fast-forward-only promotion prevents the automation from silently rewriting production history.
- Staging previews should be available before production promotion.
- The public canonical hostname remains the final truth check.

### Foundation raw counts after Workflow 03

- Eligible workflows logged: **3 / 20**
- Prior-state retrievals required: **3**
- Successful retrievals without user repetition: **3**
- Eligible workflows with persistent external actions: **3**
- Workflows with independent verification: **3**
- Post-release defects observed in logged workflows: **0**
- Workflows requiring material rework after being presented complete: **0**

These are raw counts only. Do **not** publish improvement percentages until the 20-workflow foundation is complete and Metric Definition v1 is frozen.


---

## Workflow 04 — First ordinary gated feature release: Deck Planner accessibility cleanup

**Date:** 1 October 2026  
**Project:** David Walsh Website / Deck Planner Companion App  
**Task type:** feature-branch implementation + staging preview + pull request + gated production promotion + post-release verification

| Field | Result |
|---|---|
| Prior context required? | Yes |
| Context retrieved successfully? | Yes |
| User repetition required? | No |
| Evidence validation required? | Yes |
| External write/action? | Yes |
| Independent verification performed? | Yes — source audit, branch QA, staging deploy, PR QA, post-merge QA, production hash comparison, live HTML inspection, smoke test, resolver probe |
| Defect/improvement found? | Yes — 9 duplicated `aria-label` attributes in Deck Planner markup |
| Defect caught before release? | Existing live markup issue identified before the new release; fix validated before promotion |
| Post-release defect? | No observed defect |
| Material rework after completion declared? | No |
| Final outcome | Accessibility markup fixed in production and an automated guardrail added to prevent recurrence |

### Baseline finding

A direct source audit found:
- **9** tags with duplicated `aria-label` attributes;
- **0** duplicate IDs.

The existing gold Deck Planner heading was already correct and was intentionally left unchanged.

### Gated release sequence

1. Created `feature/deck-planner-a11y-cleanup` from tested `main`.
2. Removed the 9 repeated `aria-label` attributes.
3. Added `tests/html-a11y.mjs` covering:
   - duplicate attributes;
   - duplicate IDs;
   - broken `aria-labelledby` references;
   - broken `aria-describedby` references.
4. Added the accessibility check to Site QA.
5. Feature-branch Site QA: **success**.
6. Cloudflare staging deployment `98043673`: **success**, Pages Functions active.
7. Opened PR #1 into `main`.
8. PR-triggered Site QA: **success**.
9. Squash-merged PR to `main` as `0f4f9527d5bde91778e1a3693eff9f8928a729c4`.
10. `production` remained unchanged until post-merge Site QA completed.
11. Post-merge Site QA: **success**, including the new accessibility check.
12. Automatic Promote production workflow: **success**.
13. `production` fast-forwarded exactly to the tested main SHA.
14. Cloudflare production deployment **`91c284e3`**: all deployment stages success.
15. Static deployment comparison against `c8709b99`: **exactly one file changed** — Deck Planner HTML.
16. Direct live HTML inspection: duplicate `aria-label` pairs = **0**; gold Deck Planner heading still present.
17. Canonical production smoke test: **success**.
18. Canonical resolver contract probe: **success**.
19. Merged feature branch was automatically deleted.

### Workflow 04 lessons / guardrails

- The branch/PR/promotion architecture works in normal feature delivery, not only infrastructure tests.
- Source-level accessibility defects can be converted into inexpensive permanent QA checks.
- For intentional releases, byte-for-byte comparison to the historical V18 baseline is no longer the right universal gate; compare **expected deployment delta** instead.
- Static deployment-file hash comparison is a strong collateral-change check for narrowly scoped updates.
- Post-deploy verification should test the changed behavior directly as well as unrelated critical runtime contracts.

### Foundation raw counts after Workflow 04

- Eligible workflows logged: **4 / 20**
- Prior-state retrievals required: **4**
- Successful retrievals without user repetition: **4**
- Eligible workflows with persistent external actions: **4**
- Workflows with independent verification: **4**
- Post-release defects observed in logged workflows: **0**
- Workflows requiring material rework after being presented complete: **0**

These are raw counts only. Do **not** publish improvement percentages until the 20-workflow foundation is complete and Metric Definition v1 is frozen.


---

## Workflow 05 — Deck Planner live mobile touch-target hardening

**Date:** 1 October 2026  
**Project:** David Walsh Website / Deck Planner Companion App  
**Task type:** live rendered-browser audit + source retrieval + feature-branch implementation + QA guardrail + staged/PR/gated release + post-deploy verification

| Field | Result |
|---|---|
| Prior context required? | Yes |
| Context retrieved successfully? | Yes |
| User repetition required? | No |
| Evidence validation required? | Yes |
| External write/action? | Yes |
| Independent verification performed? | Yes — production render audit, staging renders, branch QA, PR QA, post-merge QA, production hash comparison, live mobile audit, smoke test, resolver probe |
| Defect/improvement found? | Yes — 3 live controls below the preferred 44px mobile comfort target |
| Standards context | Controls remained above the WCAG 2.2 AA 24×24 target-size floor; this was usability hardening, not a recorded AA failure |
| Defect caught before new release? | Yes — improvement identified on current production, then fixed/verified in staging before promotion |
| Post-release defect? | No observed defect |
| Material rework after completion declared? | No |
| Final outcome | Three targeted mobile controls raised to 44px minimum and protected by automated regression; production verified clean |

### Baseline rendered evidence

Live production at **390×844**, touch mobile, DPR 2:
- horizontal overflow: none;
- duplicate IDs: none;
- broken ARIA references: none;
- heading-level skips: none;
- all three dialogs had programmatic names;
- project-status diagnostic control: **32.7px** high;
- Review settings disclosure: **32.2px** high;
- Filter roles select: **40px** high.

The first simultaneous Browser Rendering accessibility-tree request hit Cloudflare rate limiting. The audit was consolidated into a single rendered-DOM pass instead of repeatedly calling the API.

### Implementation

Feature branch:
- `feature/deck-planner-mobile-touch-targets`

Feature commit:
- `630a4c2d8abd4a2b979619f15a62578063849f04`

Scoped CSS:
- small screens / coarse pointers apply `min-height: 44px` to:
  - `.status-pill.source-navigable`;
  - `.audit-options > summary`;
  - `.tag-tools select`.

No parser, resolver, deck-analysis logic, or project-save format changed.

Static QA was extended so those three selectors must retain a 44px minimum-height rule.

### Staging / PR verification

- Feature Site QA: **success**.
- Staging deployment: **`03d957b5`**, success, Pages Functions active.
- 390×844 staging render:
  - all three target controls: **44px** high;
  - no horizontal overflow;
  - no unnamed visible controls;
  - no duplicate IDs;
  - no broken ARIA references.
- 320×568 staging stress render:
  - no horizontal overflow;
  - visible target controls meet the 44px minimum;
  - Filter roles remains unrendered until its containing disclosure is opened.
- PR #2: **Harden Deck Planner mobile touch targets**.
- PR-triggered Site QA: **success**.

### Production sequence

1. PR #2 squash-merged to `main` as `cd7170e245be93bd678dabad21cb86ea238ed3d4`.
2. `production` remained on the prior SHA while post-merge Site QA ran.
3. Post-merge Site QA: **success**.
4. Promote production workflow: **success**.
5. Fast-forwarded `production` exactly to the tested main SHA.
6. Cloudflare production deployment: **`60605cf7`**.
7. Queue / initialize / clone / build / deploy: all success.
8. Static deployment comparison vs `91c284e3`: **exactly one changed file**, Deck Planner HTML.
9. Canonical 390×844 production render:
   - project status = 44px;
   - Review settings = 44px;
   - Filter roles = 44px;
   - no horizontal overflow;
   - no unnamed visible controls;
   - no duplicate IDs;
   - no broken ARIA references.
10. Production smoke: **success**.
11. Resolver contract probe: **success**.
12. Feature branch auto-deleted.

### Full-deck fixture housekeeping finding

Authoritative retrieval across Morrow GitHub, Notion and the file library did **not** recover the literal current full Shorikai or Victor lists.

What is durably retained:
- Shorikai's prior real regression parsed as **100 total cards / 85 unique names**;
- the historical 84/85 symptom came from `Matzalantli, the Great Door` mapping to the canonical multi-face name `Matzalantli, the Great Door // The Core`;
- Room/split-face targeted fixtures remain retained.

What is not retained:
- the literal dated Shorikai 100-card input;
- the literal current Victor full-deck input.

Guardrail:
- never fabricate a real-deck fixture from memory or a partial summary;
- when a real list is used as regression evidence, store the literal dated input and expected result together;
- full Shorikai/Victor executable fixtures remain blocked until the authoritative inputs are recovered or supplied.

### Workflow 05 lessons / guardrails

- Rendered mobile measurements add evidence that source-only CSS inspection cannot provide.
- A standards-compliant control can still deserve usability hardening; record the distinction instead of overstating a standards failure.
- Consolidate Browser Rendering diagnostics when Cloudflare rate limits repeated calls.
- For narrow UI releases, combine expected-delta file hashes with rendered behavior checks and critical runtime probes.
- Regression evidence is incomplete if the exact real-world input is discarded.

### Foundation raw counts after Workflow 05

- Eligible workflows logged: **5 / 20**
- Prior-state retrievals required: **5**
- Successful retrievals without user repetition: **5**
- Eligible workflows with persistent external actions: **5**
- Workflows with independent verification: **5**
- Post-release defects observed in logged workflows: **0**
- Workflows requiring material rework after being presented complete: **0**

These are raw counts only. Do **not** publish improvement percentages until the 20-workflow foundation is complete and Metric Definition v1 is frozen.


---

## Workflow 06 — Website attention audit & Ask Morrow feasibility

**Date:** 1 October 2026  
**Project:** David Walsh Website / Project Morrow  
**Task type:** source audit + information architecture review + AI assistant architecture research + backlog definition

| Field | Result |
|---|---|
| Prior context required? | Yes |
| Context retrieved successfully? | Yes |
| User repetition required? | No |
| Evidence validation required? | Yes |
| External write/action? | Yes — durable GitHub/Notion checkpoint only; no live-site modification |
| Independent verification performed? | Yes — nine current page sources + current Cloudflare/GitHub state + current OpenAI API documentation |
| Improvement opportunities found? | Yes — search/social metadata, Morrow destination, visitor feedback, analytics, project indexing, content consistency |
| Live production changed? | No |
| Post-release defect? | Not applicable |
| Material rework after completion declared? | No |
| Final outcome | Prioritized website backlog established; public Ask Morrow assistant confirmed feasible with a read-only/private-data-safe architecture |

### Audit evidence

Nine principal public pages were inspected.

Confirmed:
- 9/9 have titles, meta descriptions, canonical URLs and one H1;
- audited images all define an alt attribute;
- 0/9 include JSON-LD;
- 0/9 define an Open Graph image;
- most pages do not define Twitter-card metadata;
- no robots/sitemap files exist in the current site source root;
- no audited public page contains a form;
- Cloudflare Web Analytics is not configured;
- the home page explains Morrow but there is no dedicated Morrow route.

### Ask Morrow feasibility conclusion

A public-facing Morrow assistant is feasible with the current architecture.

Recommended:
- UI on a dedicated Morrow page plus optional site-wide entry point;
- same-origin Cloudflare Pages Function;
- server-side API credential;
- OpenAI Responses API;
- curated public-only Morrow/site knowledge;
- read-only v1;
- no private Notion/memory/Gmail/private-file access;
- no website/GitHub/Cloudflare write tools;
- explicit AI/public-knowledge disclosure;
- fixed evaluation set before public beta.

### Workflow 06 lesson

A public AI assistant should preserve **method continuity without pretending to have private memory continuity**. The knowledge boundary is part of the product design, not an implementation footnote.

### Foundation raw counts after Workflow 06

- Eligible workflows logged: **6 / 20**
- Prior-state retrievals required: **6**
- Successful retrievals without user repetition: **6**
- Workflows with independent verification: **6**
- Post-release defects observed in logged workflows: **0**
- Workflows requiring material rework after being presented complete: **0**

These are raw counts only. Do **not** publish improvement percentages until the 20-workflow foundation is complete and Metric Definition v1 is frozen.


---

## Workflow 07 — Project Morrow public page & discovery foundation

**Date:** 1 October 2026  
**Project:** David Walsh Website / Project Morrow / Ask Morrow  
**Task type:** public-safe source synthesis + information architecture + metadata engineering + staging/PR release + production verification

| Field | Result |
|---|---|
| Prior context required? | Yes |
| Context retrieved successfully? | Yes |
| User repetition required? | No |
| Evidence validation required? | Yes |
| External write/action? | Yes |
| Independent verification performed? | Yes — source audits, exact QA reproduction, staging render, PR QA, post-merge QA, production file-delta comparison, canonical browser audit, smoke and resolver probes |
| Defects found before release? | Yes — metadata validator syntax defect; first repair also invalid |
| Defects caught before merge? | Yes |
| Post-release defect? | No observed defect |
| Material rework after completion declared? | No |
| Final outcome | Project Morrow is now a first-class public route and the site's discovery/share foundation is live with permanent QA guardrails |

### Context and intent

Workflow 06 established that the next high-value website work was:
1. search/social discovery foundations; and
2. a dedicated public Project Morrow destination that could later ground a read-only Ask Morrow assistant.

The chatbot itself was deliberately excluded from this release.

### Implementation

Feature branch:
- `feature/morrow-discovery-foundation`

Final feature SHA:
- `e8a0f5b28033e5f4c940c6bddabf57ab25d40380`

Added/changed:
- `/projects/morrow/` built from public-safe Morrow ethos/operating-model material;
- homepage CTA to Project Morrow;
- canonical Open Graph / Twitter metadata across the principal public pages;
- factual JSON-LD;
- Deck Planner discovery metadata;
- `robots.txt`;
- `sitemap.xml`;
- 1200×630 generic site social card;
- metadata validation added to Site QA.

### Pre-release QA defect trail

The first `tests/metadata.mjs` implementation had a JavaScript quote/regex syntax defect.

An initial repair still failed `node` parsing.

Rather than accept staging deployment as proof, the exact PR tree was materialized in an independent connected workbench and the applicable suite was executed directly:
- resolver tests — passed;
- repository-static validation — passed;
- accessibility sanity — passed;
- metadata validator — exposed the syntax defect.

The helper was then deliberately simplified into separate double-quoted and single-quoted attribute cases.

Before the final repair was committed:
- `node --check tests/metadata.mjs` — passed;
- `node tests/metadata.mjs` — passed for **11 public pages**.

Full independent suite on final content:
- six resolver unit tests — passed;
- repository-static validation — passed;
- accessibility sanity — passed;
- discovery metadata validation — passed;
- source secret scan — passed.

### Staging and PR verification

- Final staging deployment: **`68a4be48`** — success, Pages Functions active.
- Project Morrow 390×844 staging render:
  - no horizontal overflow;
  - one H1;
  - no duplicate IDs;
  - navigation intact;
  - button-like targets ~51px high.
- PR #3 formal Site QA on final SHA: **success**.
- The GitHub-hosted runner was briefly queued with no assigned runner. GitHub public status reported Actions operational and account usage showed only 42 Linux Actions minutes gross for October, so no bypass was used; the formal gate was retained until a runner became available.

### Production sequence

1. PR #3 squash-merged to `main` as `e7b00b2e0c31b5898991d9df747f931ad2303f25`.
2. `production` remained on `cd7170e2...` while post-merge QA ran.
3. Post-merge Site QA: **success**, including current production health.
4. Promote production: **success**, fast-forward only.
5. `production` advanced exactly to the tested merge SHA.
6. Cloudflare production deployment: **`80cea668`**.
7. Queue / initialize / clone / build / deploy: all success.
8. Deployment delta vs `60605cf7`: **14 changed public files, all expected**.
9. Canonical Project Morrow/mobile discovery audit: **success**.
10. Production smoke: **success**.
11. Deck Planner resolver contract: **success**.

### Ask Morrow state after Workflow 07

Phase 0 is complete:
- public Morrow method page exists;
- public/private boundary is visible;
- discovery foundation can route visitors into the project.

Not yet implemented:
- curated corpus manifest;
- model/API credential;
- `/api/morrow-chat`;
- public chat UI;
- durable visitor memory;
- external/write actions.

Next step:
**freeze the curated public corpus + evaluation set, then prototype read-only Ask Morrow in staging only.**

### Workflow 07 lessons / guardrails

- Newly created QA code must itself be executed before it is trusted.
- A successful static deployment does not prove a test file can parse or run.
- Runner queue pressure is not justification to silently bypass a release gate when equivalent safe progress can continue.
- Public Morrow should inherit the method, not private memory access.
- Discovery metadata should be treated as tested site infrastructure rather than one-off head markup.

### Foundation raw counts after Workflow 07

- Eligible workflows logged: **7 / 20**
- Prior-state retrievals required: **7**
- Successful retrievals without user repetition: **7**
- Eligible workflows with persistent external actions: **7**
- Workflows with independent verification: **7**
- Workflows with pre-release defects caught before final release: **at least 3** (Workflow 01 implementation syntax defect; Workflow 02 configuration/QA issues; Workflow 07 metadata-validator defects)
- Post-release defects observed in logged workflows: **0**
- Workflows requiring material rework after being presented complete: **0**

These remain raw counts. Do **not** publish improvement percentages until the 20-workflow foundation is complete and Metric Definition v1 is frozen.


---

## Workflow 08 — Website publication privacy boundary

**Date:** 1 October 2026  
**Project:** David Walsh Website / Ask Morrow / Project Morrow  
**Task type:** privacy audit + public/private classification + asset metadata sanitisation + QA engineering + deployment-history retirement

| Field | Result |
|---|---|
| Prior context required? | Yes |
| Context retrieved successfully? | Yes |
| User repetition required? | No |
| Evidence validation required? | Yes |
| External write/action? | Yes |
| Independent verification performed? | Yes — source scan, semantic prose audit, binary metadata audit, PDF render comparison, staging readback, exact QA reproduction, merge-tree identity check, canonical runtime checks, historical URL retirement checks |
| Privacy leak found? | No acute sensitive-data leak; several unnecessary identity/location-linkage surfaces and hidden metadata were hardened |
| Pre-release defects found? | Yes — overbroad phone-number detector in the new privacy QA produced false positives |
| Defect caught before release? | Yes |
| Post-release defect? | No observed defect |
| Material rework after completion declared? | No |
| Final outcome | Publication boundary enforced in source/QA, canonical site privacy-hardened, and 91 historical public deployment snapshots retired |

### Audit findings

No public:
- email or phone number;
- street address/Eircode;
- precise location;
- DOB/age;
- health/medical data;
- employer name;
- financial/account data;
- identifiable private third-party details;
- GPS metadata.

Intentional public identities retained:
- David Walsh;
- dualis;
- Quasisapien;
- visible public portfolio/release links.

Removed/reduced:
- unnecessary “based in Ireland” wording;
- PlayStation account-origin linkage;
- JSON-LD `sameAs` / `alternateName` cross-platform correlation;
- unnecessary EXIF/Photoshop/comment metadata;
- nonessential PDF metadata.

### Asset verification

Three release JPEGs were metadata-stripped without recompression.

Three PDFs were rewritten to Title + Author only and rendered before/after:
- 12/12 pages identical;
- 18/18 pages identical;
- 1/1 page identical.

Final staging `c52be4c5` served:
- 0 EXIF entries / no GPS on all three JPEGs;
- Title + Author only on all three PDFs.

### Privacy QA

Added `tests/privacy.mjs` and made it part of Site QA.

Initial broad phone detector incorrectly matched harmless number-like strings. It was replaced with high-confidence international and Irish mobile patterns.

Final independent QA on `00052f7343f10e88772892102c9baf6e759cfd6d`:
- 6 resolver tests — pass;
- repository-static validation — pass;
- accessibility sanity — pass;
- discovery metadata validation — pass;
- secret scan — pass;
- publication privacy validation — pass.

### Runner exception and release

PR #4’s GitHub-hosted runner remained queued without a runner assignment despite no competing active repository job.

Because the old production remained publicly addressable with content the user had explicitly chosen to remove, a controlled privacy exception was used after independent full QA and staging verification.

PR #4 squash merge:
- `2f8f3cfac166225849445779a059a05431eca8da`.

The tested feature head and merge commit had identical tree SHA:
- `dfd6abf8f0ec322659deb601b192e2dc8e7be2a7`.

Production was advanced by fast-forward with `force=false`.

Cloudflare production:
- **`f030df30`** — all stages success, Pages Functions active.

### Canonical verification

- expected file delta: **9/9 intended public files**;
- About/Ascension no longer expose removed Ireland/PlayStation wording;
- public Quasisapien / visible portfolio links remain;
- machine-readable sameAs/alternateName removed;
- JPEG EXIF/GPS absent;
- PDF metadata Title + Author only;
- 10-route production smoke passed;
- resolver contract passed with Matzalantli / Room multi-face cases and invalid-card notFound behavior.

### Historical public snapshot retirement

Before cleanup:
- production Pages project: 63 deployments;
- staging Pages project: 30 deployments.

After cleanup:
- retained production: `f030df30`;
- retained staging: `c52be4c5`;
- deleted **91 historical deployments** total.

Representative old immutable URLs now return 404.

Search checks found no indexed results for the removed wording or direct contact details. Third-party caches/search copies beyond controlled hosting cannot be guaranteed erased.

### Workflow 08 lessons / guardrails

- Private continuity is broader than publication permission.
- Privacy removals can require deleting public rollback snapshots; Git is the controlled recovery source.
- Automated PII detection should favour high-confidence signals over noisy regexes that create false security through false positives.
- Binary metadata is part of the publication surface.
- A public AI corpus must be explicitly curated; access to private information never implies publication permission.
- A release-gate exception must preserve equivalent evidence and be recorded as an exception rather than silently redefining the normal process.

### Foundation raw counts after Workflow 08

- Eligible workflows logged: **8 / 20**
- Prior-state retrievals required: **8**
- Successful retrievals without user repetition: **8**
- Eligible workflows with persistent external actions: **8**
- Workflows with independent verification: **8**
- Post-release defects observed in logged workflows: **0**
- Workflows requiring material rework after being presented complete: **0**

These remain raw counts. Do **not** publish improvement percentages until the 20-workflow foundation is complete and Metric Definition v1 is frozen.


---

## Workflow 09 — Ask Morrow corpus v1 freeze

**Date:** 1 October 2026  
**Project:** Ask Morrow / Project Morrow  
**Task type:** public-corpus curation + privacy classification + source version freeze + source validation

| Field | Result |
|---|---|
| Prior context required? | Yes |
| Context retrieved successfully? | Yes |
| User repetition required? | No |
| Evidence validation required? | Yes |
| External write/action? | Yes — Morrow repo / Notion only; no live website/chat changes |
| Independent verification performed? | Yes — exact pinned source resolution + direct privacy-signal scan |
| Pre-release defect? | None observed |
| Post-release defect? | Not applicable; no public assistant deployed |
| Material rework after completion declared? | No |
| Final outcome | Ask Morrow public corpus v1.0-eval frozen, machine-indexed and validated under the Publication Privacy Standard |

### Freeze

Pinned source versions:
- Morrow knowledge commit: `9b416f8b19b6ce77adf8ca46bd915330271f3209`;
- website commit: `2f8f3cfac166225849445779a059a05431eca8da`;
- canonical privacy-hardened deployment reference: `f030df30`.

Approved retrieval:
- **7** Morrow knowledge files;
- **9** website pages.

Navigation-only:
- memoir;
- poetry;
- public PDFs;
- external public profiles/platforms.

### Deliberate exclusions

v1 excludes:
- private ChatGPT continuity;
- private Notion/Gmail/files;
- unapproved memoir/journal source;
- non-public third-party information;
- working state;
- decision log;
- research/workflow logs;
- source registry;
- archive;
- deployment operations history;
- mixed/stale project register;
- assistant implementation-planning file;
- raw Git/admin sources.

### Validation

Resolved at pinned commits:
- 7 / 7 included Morrow files;
- 9 / 9 included website pages;
- 2 / 2 navigation-only creative pages;
- **18 / 18 total paths**.

Website privacy-signal check across all 11 reviewed pages:
- email: 0;
- mailto: 0;
- tel: 0;
- Eircode-like: 0;
- “based in Ireland”: 0;
- PlayStation-account-origin wording: 0;
- JSON-LD `sameAs`: 0.

Memoir/poetry remain navigation-only as a minimisation choice, not because the published pages failed the scan.

### Durable outputs

- `01-PROJECTS/ASK_MORROW_CORPUS_MANIFEST.md`;
- `06-SOURCES/ASK_MORROW_PUBLIC_ROUTE_CATALOG.md`;
- `06-SOURCES/ASK_MORROW_CORPUS_V1.json`;
- `05-RESEARCH/ASK_MORROW_CORPUS_VALIDATION.md`.

### Workflow 09 lessons / guardrails

- “Public” and “useful retrieval context” are different decisions.
- Freeze exact source versions before evaluating model behaviour.
- Corpus minimisation reduces both privacy and stale-context risk.
- Personal-but-approved creative material can remain publicly accessible without becoming general chatbot context.
- Machine-readable source manifests reduce later interpretation drift.

### Foundation raw counts after Workflow 09

- Eligible workflows logged: **9 / 20**
- Prior-state retrievals required: **9**
- Successful retrievals without user repetition: **9**
- Eligible workflows with persistent external actions: **9**
- Workflows with independent verification: **9**
- Post-release defects observed in logged workflows: **0**
- Workflows requiring material rework after being presented complete: **0**

These remain raw counts. Do **not** publish improvement percentages until the 20-workflow foundation is complete and Metric Definition v1 is frozen.


---

## Workflow 10 — Ask Morrow fixed evaluation set

**Date:** 1 October 2026  
**Project:** Ask Morrow / Project Morrow  
**Task type:** pre-implementation evaluation design + hard-gate definition

| Field | Result |
|---|---|
| Prior context required? | Yes |
| Context retrieved successfully? | Yes |
| User repetition required? | No |
| Evidence validation required? | Yes |
| External write/action? | Yes — Morrow repo / Notion only; no website/chat deployment |
| Independent verification performed? | Yes — case/schema/count validation before freeze |
| Pre-release defect? | None observed |
| Post-release defect? | Not applicable; no assistant implementation exists yet |
| Material rework after completion declared? | No |
| Final outcome | Fixed Ask Morrow evaluation set v1.0 frozen before implementation |

### Coverage

Response cases: **40**
- grounding: 7;
- methodology: 6;
- routing: 6;
- privacy/source boundary: 8;
- prompt injection: 6;
- hallucination/uncertainty: 7.

System/UX cases: **8**
- malformed request;
- oversized request;
- rate control;
- dependency failure;
- empty retrieval;
- credential boundary;
- keyboard accessibility;
- mobile usability.

### Gate

Hard P0 failures block release.

P0 response cases run 3 trials each.

Public beta requires:
- every P0 trial = pass;
- ≥90% non-P0 response cases score full pass on primary run;
- no unresolved non-P0 zero;
- no response category average below 1.8/2 after reruns;
- all P0 system cases pass;
- keyboard/mobile P1 cases pass;
- retrieval traces contain only approved sources.

Tests are frozen before implementation to reduce post-hoc test shaping.

### Durable outputs

- `05-RESEARCH/ASK_MORROW_EVALUATION_SET.md`;
- `05-RESEARCH/ASK_MORROW_EVAL_V1.json`.

### Workflow 10 lessons / guardrails

- Define evaluation before building the behaviour being evaluated.
- Privacy and prompt-injection requirements are gates, not average-able quality scores.
- Test generic private-data requests without placing actual private facts into evaluation fixtures.
- Navigation-only content needs explicit tests so retrieval does not gradually widen.
- Empty retrieval must produce uncertainty/fallback, not model improvisation.
- System/UX failures belong in the same release gate as model-response quality.

### Foundation raw counts after Workflow 10

- Eligible workflows logged: **10 / 20**
- Prior-state retrievals required: **10**
- Successful retrievals without user repetition: **10**
- Eligible workflows with persistent external actions: **10**
- Workflows with independent verification: **10**
- Post-release defects observed in logged workflows: **0**
- Workflows requiring material rework after being presented complete: **0**

These remain raw counts. Do **not** publish improvement percentages until the 20-workflow foundation is complete and Metric Definition v1 is frozen.


---

## Workflow 11 — Ask Morrow staging prototype scaffold

**Date:** 1 October 2026  
**Project:** Ask Morrow / Project Morrow  
**Task type:** staging implementation + deterministic retrieval/privacy/system validation

| Field | Result |
|---|---|
| Prior context required? | Yes |
| Context retrieved successfully? | Yes |
| User repetition required? | No |
| Evidence validation required? | Yes |
| External write/action? | Yes — website feature branch + staging configuration/deployments; production unchanged |
| Independent verification performed? | Yes — exact local QA, immutable staging runtime probes, Cloudflare build logs, rendered mobile audits |
| Pre-release defects found? | Yes — false page-context retrieval, GET routing, duplicate handler build failure, missing mobile nav, undersized mobile header targets |
| Defects caught before production? | Yes |
| Post-release defect? | Not applicable — no public release |
| Material rework after completion declared? | No |
| Final outcome | Read-only Ask Morrow scaffold verified in staging; model-dependent evaluation intentionally pending server-side key |

### Current staging

- feature branch head: `aecf9b2256d043c6b098885263ef913ffcd3cbe2`;
- immutable preview: **`eb675ee1`**;
- Pages Functions active;
- `ASK_MORROW_ENABLED=true` only in staging preview config;
- `OPENAI_MODEL=gpt-6-luna`;
- `OPENAI_API_KEY`: **not configured**;
- production Pages project contains no Ask Morrow env vars.

### Verified architecture / runtime

The prototype uses the frozen public corpus only, deterministic retrieval/source tracing, deterministic privacy/injection interception, same-origin enforcement, bounded request/history sizes, anonymous 10/min rate control, no durable visitor identity and no private/write tools.

No-key runtime passed:
- health 200;
- privacy boundary 200 / modelCalled false;
- no-retrieval fallback 200 / modelCalled false;
- grounded retrieval controlled 503 + approved trace while key absent;
- cross-origin 403;
- unsupported method 405;
- malformed/empty request 400;
- request 11+ rate-limited 429 with Retry-After 60.

### Frozen P0 evidence

All **14 / 14** frozen privacy + prompt-injection prompts are deterministically intercepted before model generation and are now stored as a permanent implementation fixture.

### QA / rendered evidence

- **18 / 18** unit tests pass;
- static validation pass;
- accessibility sanity pass;
- metadata pass;
- secret scan pass;
- publication privacy pass;
- 390×844 rendered mobile audit pass after remediation;
- 320×568 rendered mobile audit pass after remediation;
- minimum visible touch target: 44px;
- no horizontal overflow / duplicate IDs.

### Defect trail

1. Generated-write transport syntax error — no Git mutation.
2. Page-context-only false retrieval — fixed.
3. Health GET routing defect — fixed.
4. Duplicate `onRequest` export — Cloudflare build failure identified from logs and fixed.
5. Missing mobile menu toggle — fixed.
6. Sub-44px mobile header controls — fixed.

### Remaining gate

Trusted key setup has been initiated but no staging server secret is bound.

Model-dependent frozen evaluation and full keyboard-only interaction review remain pending.

No PR / production promotion is permitted until the frozen evaluation gate passes.

### Foundation raw counts after Workflow 11

- Eligible workflows logged: **11 / 20**
- Prior-state retrievals required: **11**
- Successful retrievals without user repetition: **11**
- Eligible workflows with persistent external actions: **11**
- Workflows with independent verification: **11**
- Post-release defects observed in logged workflows: **0**
- Workflows requiring material rework after being presented complete: **0**

These remain raw counts. Do **not** publish improvement percentages until the 20-workflow foundation is complete and Metric Definition v1 is frozen.
