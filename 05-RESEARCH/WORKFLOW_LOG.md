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
| Evidence used | Notion pipeline/current state; live Cloudflare Pages readback; GitHub repository/write/readback; GitHub Actions result |
| External write/action? | Yes |
| Independent verification performed? | Yes |
| Defect found? | Yes — implementation syntax error during an attempted combined recovery script, caught before repository write |
| Defect caught before final release? | Yes |
| Post-release defect? | No |
| Material rework after completion declared? | No |
| Root-cause category | Implementation error |
| External-system issue | Cloudflare Browser Rendering rate limit during bulk source recovery |
| Final outcome | Private website repo created; V18 baseline/route graph recorded; production smoke workflow committed and passed |
| Lesson / guardrail | Split complex multi-system recovery into smaller verifiable steps; establish QA guardrails before source switching; do not retry aggressively through Browser Rendering rate limits; production Git integration remains blocked until reproducibility is proven |

### Verification evidence

- Website repository: `Dualis3283/david-walsh-site`
- Baseline commit: `ce4d93ba2553520e7fb4d7103d74608da2304f10`
- GitHub Actions workflow: **Production smoke test**
- First run: **success**
- Critical verification step: **Verify live V18 production routes and markers — success**

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
| Evidence used | GitHub source/readback; recovered V18 manifest; Cloudflare project/deployment state; staging deployment; GitHub Actions; live resolver probes |
| External write/action? | Yes |
| Independent verification performed? | Yes — multiple independent gates |
| Defects/configuration issues found? | Yes — all caught before an unverified production state was accepted |
| Post-release defect? | No observed defect |
| Material rework after completion declared? | No |
| Final outcome | Existing Cloudflare production project converted from ad-hoc Direct Upload to verified GitHub-backed deployment |

### What was attempted and learned

1. **Cloudflare Browser Rendering recovery**
   - successfully recovered the homepage/route graph;
   - bulk recovery hit Browser Rendering rate limits;
   - response: moved recovery to GitHub Actions instead of repeatedly retrying the constrained service.

2. **GitHub Actions recovery**
   - captured 10 public routes and same-origin assets;
   - generated SHA-256 recovery manifest;
   - final corrected recovery had no skipped assets.

3. **QA parser false positive**
   - link scanner interpreted JavaScript template text such as `${escapeHtml(fact.imageUri)}` as rendered HTML;
   - caught during QA before production source switching;
   - fixed by excluding script/style bodies while preserving external script references.

4. **Recovery branch race**
   - an older recovery workflow attempted to push after `main` advanced;
   - Git rejected the unsafe fast-forward;
   - this was treated as a successful safety control, not worked around destructively.

5. **Deck Planner runtime reconstruction**
   - recovered V18 frontend contract for `POST /api/resolve-deck`;
   - rebuilt the Pages Function in source control;
   - added focused regressions for Matzalantli/multi-face cards and Victor Room cards;
   - live V18 resolver probe and reconstructed resolver both returned the expected canonical multi-face cards with `notFound: []`.

6. **Cloudflare source schema**
   - first combined staging source creation returned generic `8000000`;
   - isolated empty-project creation succeeded;
   - source endpoint inspection showed legacy `deployments_enabled` remained required alongside newer source controls;
   - Git source attachment succeeded once the full schema was supplied.

7. **Preview path filter**
   - first staging preview was skipped with `skip_reason: path_config`;
   - root cause: empty `path_includes`;
   - corrected to `["*"]`, after which Git clone/build/deploy succeeded.

### Verification evidence

**Staging**
- Project: `david-walsh-staging`
- Deployment: `094e3343`
- Trigger: GitHub push
- Clone/build/deploy: success
- Pages Functions: active
- Full equivalence workflow: success

**Production**
- Repository: `Dualis3283/david-walsh-site`
- Cutover commit: `9a814dc8821cc5d5157163b6e213e8c55ce3e4b7`
- Cloudflare canonical deployment: **`b861c0a4`**
- Full deployment ID: `b861c0a4-f6ba-4774-8900-a940dd6b4849`
- Trigger: GitHub push
- Queue / initialize / clone / build / deploy: success
- Pages Functions: active
- Immutable deployment full equivalence: success
- Canonical public hostname full equivalence: success
- Preserved rollback: **`d7000b0a`**

### Workflow 02 lessons / guardrails

- Prove a source-control integration in a separate environment before production.
- Attach Git to production with automatic production deployment disabled first.
- A source switch is not complete until both immutable and canonical URLs pass verification.
- Use content hashes when “looks the same” is not strong enough.
- Turn known failure classes into tests before migrating the runtime.
- Treat Git non-fast-forward protection as a safety feature.
- Query actual API schemas instead of relying on deprecation labels or remembered request shapes.

### Foundation raw counts after Workflow 02

- Eligible workflows logged: **2 / 20**
- Prior-state retrievals required: **2**
- Successful retrievals without user repetition: **2**
- Eligible workflows with persistent external actions: **2**
- Workflows with independent verification: **2**
- Post-release defects observed in the logged workflows: **0**
- Workflows requiring material rework after being presented as complete: **0**

Implementation/configuration defects and external-system constraints remain recorded per workflow rather than collapsed into a misleading aggregate percentage.

These are raw counts only. Do **not** publish improvement percentages until the 20-workflow foundation is complete and Metric Definition v1 is frozen.
