# Current Working State

**Checkpoint date:** 1 October 2026

## Confirmed current infrastructure

### GitHub
- Canonical public knowledge repo: **Dualis3283/morrow-knowledge3283**
- Read/write + independent readback: verified.
- Public-safety rule applies: no sensitive personal/private source material.
- Private website/source repo: **Dualis3283/david-walsh-site**
- Website source recovery: **complete for the public V18 route/asset graph**
- Website branch roles:
  - `main` = integration / tested source;
  - `production` = Cloudflare live source;
  - feature branches = change isolation / staging previews.
- Native GitHub branch protection for this private repository is **not available on the current plan**; GitHub returned: “Upgrade to GitHub Pro or make this repository public to enable this feature.”
- Privacy was preserved; the repository was not made public.
- Deployment safety is therefore enforced at the production branch/runtime boundary.
- GitHub Actions now provide:
  - resolver unit regressions;
  - repository-static validation;
  - source secret scan;
  - HTML accessibility sanity checks for duplicate attributes/IDs and broken ARIA references;
  - discovery metadata validation for canonical/social/structured metadata plus sitemap/robots;
  - current-production health check on pushes to `main`;
  - fast-forward-only promotion from verified `main` to `production`;
  - full immutable/canonical deployment equivalence checks.

### Cloudflare
- Cloudflare MCP connection: operational.
- Production Pages project: **david-walsh**
- **Current canonical production: `f030df30`**
- Full deployment ID: `f030df30-895b-4cc3-affa-f7bc090d78ad`
- Git commit: `2f8f3cfac166225849445779a059a05431eca8da`
- Trigger: **github:push**
- Git source branch: **production**
- Build output: **site/**
- Pages Functions: **enabled**
- Compatibility date: **2026-09-24**
- Queue / initialize / clone / build / deploy: **all success**
- Canonical public hostname `david-walsh.pages.dev`: full equivalence/runtime gate **passed**
- Public Cloudflare rollback deployments from before the privacy boundary have been **retired**.
- Git history is now the recovery source for pre-privacy website states; those states must not be re-published without a new privacy review.
- Final privacy-clean staging preview retained: **`c52be4c5`**.
- Separate staging project: **david-walsh-staging**
- Staging previews are enabled for ordinary non-production branches and PR preview comments are enabled.
- Web Analytics is not configured.
- R2 is not enabled.
- D1: no databases currently.
- KV: no namespaces currently.
- Worker `morrow-knowledge3283` remains an unused/unbound foundation.

### Notion
- **Morrow — Project Pipeline** remains the operational task/status source.
- Duplicate/superseded records are archived rather than deleted.
- Project Morrow measurement foundation is active.

## Current project gates

### Now

1. **Gated website operations**
   - Work should begin on a feature branch when practical.
   - PRs to `main` run Site QA.
   - Pushes to `main` run Site QA again.
   - A successful push-triggered Site QA run is required before automation can fast-forward `production`.
   - Promotion refuses non-fast-forward changes.
   - Cloudflare production deploys only from `production`.
   - Significant changes should still receive preview/staging and post-deploy canonical verification.
   - For ordinary releases, preserve useful rollback evidence.
   - **Privacy exception:** if a release deliberately removes personal/private material, retire publicly addressable historical deployments containing the removed material and rely on private Git history for recovery.

2. **Deck Planner Companion App**
   - V18 public frontend recovered into Git.
   - `/api/resolve-deck` Pages Function reconstructed from the V18 contract.
   - Shorikai/Matzalantli and Victor Room multi-face regression tests are automated and passing.
   - Nine duplicate `aria-label` attributes removed from Deck Planner production markup.
   - Automated HTML accessibility sanity test prevents duplicate attributes/IDs and broken `aria-labelledby` / `aria-describedby` references.
   - Live 390×844 mobile audit found three controls below the preferred 44px comfort target; all three are now 44px minimum on small/coarse-pointer devices.
   - 390×844 and 320×568 rendered checks show no horizontal overflow.
   - Full literal Shorikai/Victor lists are not currently retained in durable sources; do not fabricate full-deck fixtures. Capture exact dated inputs before adding those fixtures.
   - Future D1/KV work remains optional until a demonstrated need justifies it.

3. **Project Morrow measurement foundation**
   - Workflow 01 logged.
   - Workflow 02 logged.
   - Workflow 03 logged.
   - Workflow 04 logged.
   - Workflow 05 logged.
   - Workflow 06 logged.
   - Workflow 07 logged.
   - Workflow 08 logged.
   - Workflow 09 logged.
   - Workflow 10 logged.
   - Workflow 11 logged.
   - Workflow 12 logged.
   - Continue until 20 eligible substantive workflows are captured.

4. **Deck Evolution Planner**
   - review 18-page v0.7 core book;
   - if approved, promote to production baseline;
   - regenerate storefront/listing previews;
   - then pricing/launch preparation.

5. **Morrow architecture/infrastructure**
   - GitHub = durable/versioned knowledge and website source;
   - Notion = operational pipeline;
   - Cloudflare = runtime/deployment truth;
   - Drive/files = authoritative asset/recovery layer where appropriate.

6. **Website attention / Ask Morrow**
   - Search/social discovery foundation is live: sitemap, robots, social cards, consistent Open Graph/Twitter metadata and factual JSON-LD.
   - Project Morrow now has a dedicated public route at `/projects/morrow/`.
   - Ask Morrow Phase 0 is complete; the chatbot itself is **not live**.
   - Publication Privacy Standard is now a hard corpus boundary.
   - Public corpus v1.0-eval is frozen and validated against pinned source commits.
   - Fixed Ask Morrow evaluation set v1.0 is frozen: 40 response cases + 8 system/UX cases.
   - Phase 1C staging prototype scaffold is implemented and verified on feature branch `feature/ask-morrow-prototype`.
   - Staging model-runtime checkpoint: branch head `b4af125710932030ba077aca210fa6ecefd9c613`, isolated staging canonical `b962d551`.
   - `OPENAI_API_KEY` is securely bound only to the separate `david-walsh-staging` project; the accidental copy in real `david-walsh` production was removed and re-verified absent.
   - The staging model path reaches OpenAI, but the current API project returns HTTP 429 with `billing_not_active`; no model answer is generated.
   - Next dependency: activate OpenAI API billing for the project/key, then run the frozen model-dependent evaluation suite and keyboard interaction gate. No PR/public beta until it passes.
   - Visitor feedback/contact and privacy-conscious measurement remain useful before wider interactive expansion.

### Next
- Continue using the proven feature → PR → QA → `main` → promotion → `production` path for substantive website changes.
- Optional future improvement: GitHub Pro could add native branch protection on this private repo; do not make the repo public solely for that feature.
- Compleated Loyalty physical print proof from Print Master v2.
- Continue MTG collection/deck knowledge.
- Continue Dualis catalogue/corpus organisation.

## Completed / locked

- Compleated Loyalty redesign.
- Print Master v2 digital production master.
- Magic Quick-Reference Guide checkpoint.
- Deck Planner flow validation checkpoint.
- Project Morrow historical H0/Transition/M0 baseline.
- FitzChivalry character-study reference.
- GitHub Morrow ethos and core repository structure.
- Website V18 public source/asset recovery.
- Reconstructed Deck Planner Pages resolver + multi-face regression tests.
- Isolated Git→Cloudflare staging proof.
- GitHub→Cloudflare production cutover.
- QA-gated `main` → `production` promotion architecture, independently verified.
- First ordinary gated feature release: Deck Planner accessibility cleanup via PR #1.
- Deck Planner mobile touch-target hardening via PR #2, rendered and verified on production.
- Project Morrow public page + site discovery foundation via PR #3, verified on production.
- **Publication privacy boundary via PR #4: source/content audit, metadata sanitisation, permanent privacy QA, and retirement of 91 historical public deployment snapshots.**

## Important unknowns

- Physical print behaviour for Compleated Loyalty.
- Native branch protection remains unavailable on the current private-repository GitHub plan.
- User-side visual/interaction review remains useful despite automated and rendered-browser checks.
- Exact current full Shorikai and Victor deck-list inputs are not retained in durable sources; executable full-deck fixtures require those literal dated lists.
- R2/D1/KV architecture should remain optional until demonstrated needs justify it.
- Ask Morrow corpus v1.0-eval and evaluation set v1.0 are frozen. A staging-only read-only endpoint/UI exists and now has a secure staging-only API key binding. Model evaluation is blocked specifically by OpenAI API `billing_not_active`; no production/public Ask Morrow endpoint exists.
- Third-party search-engine/cache copies cannot be guaranteed deleted by Cloudflare cleanup; current searches found no indexed copies of the removed Ireland/PlayStation wording.
- Morrow performance percentages are not publishable until the 20-workflow foundation baseline is complete.
