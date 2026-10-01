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
