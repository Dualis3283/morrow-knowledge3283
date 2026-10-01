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
  - current-production health check on pushes to `main`;
  - fast-forward-only promotion from verified `main` to `production`;
  - full immutable/canonical deployment equivalence checks.

### Cloudflare
- Cloudflare MCP connection: operational.
- Production Pages project: **david-walsh**
- **Current canonical production: `91c284e3`**
- Full deployment ID: `91c284e3-064f-4284-83f1-2c2618b97d74`
- Git commit: `0f4f9527d5bde91778e1a3693eff9f8928a729c4`
- Trigger: **github:push**
- Git source branch: **production**
- Build output: **site/**
- Pages Functions: **enabled**
- Compatibility date: **2026-09-24**
- Queue / initialize / clone / build / deploy: **all success**
- Canonical public hostname `david-walsh.pages.dev`: full equivalence/runtime gate **passed**
- Previous gated production: **`c8709b99`**
- Earlier verified Git-backed production: **`b861c0a4`**
- Preserved Direct Upload rollback: **`d7000b0a`**
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
   - Preserve `d7000b0a` until several gated releases have proven stable.

2. **Deck Planner Companion App**
   - V18 public frontend recovered into Git.
   - `/api/resolve-deck` Pages Function reconstructed from the V18 contract.
   - Shorikai/Matzalantli and Victor Room multi-face regression tests are automated and passing.
   - Nine duplicate `aria-label` attributes removed from Deck Planner production markup.
   - Automated HTML accessibility sanity test now prevents duplicate attributes/IDs and broken `aria-labelledby` / `aria-describedby` references.
   - Continue phone review, broader accessibility QA, and full-deck regression fixtures when useful.
   - Future D1/KV work remains optional until a demonstrated need justifies it.

3. **Project Morrow measurement foundation**
   - Workflow 01 logged.
   - Workflow 02 logged.
   - Workflow 03 logged.
   - Workflow 04 logged.
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
- **First ordinary gated feature release: Deck Planner accessibility cleanup via PR #1.**

## Important unknowns

- Physical print behaviour for Compleated Loyalty.
- Native branch protection remains unavailable on the current private-repository GitHub plan.
- User-side visual/interaction review remains useful despite automated equivalence.
- R2/D1/KV architecture should remain optional until demonstrated needs justify it.
- Morrow performance percentages are not publishable until the 20-workflow foundation baseline is complete.
