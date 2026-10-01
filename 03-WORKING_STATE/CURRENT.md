# Current Working State

**Checkpoint date:** 1 October 2026

## Confirmed current infrastructure

### GitHub
- Canonical public knowledge repo: **Dualis3283/morrow-knowledge3283**
- Read/write + independent readback: verified.
- Public-safety rule applies: no sensitive personal/private source material.
- Private website/source repo: **Dualis3283/david-walsh-site**
- Website source recovery: **complete for the public V18 route/asset graph**
- GitHub Actions QA is active for:
  - resolver unit regressions;
  - route/marker smoke tests;
  - internal link and asset checks;
  - recovered-source secret scan;
  - immutable deployment equivalence;
  - live resolver contract parity.

### Cloudflare
- Cloudflare MCP connection: operational.
- Production Pages project: **david-walsh**
- **Current canonical production: Git-backed deployment `b861c0a4`**
- Full deployment ID: `b861c0a4-f6ba-4774-8900-a940dd6b4849`
- Git commit: `9a814dc8821cc5d5157163b6e213e8c55ce3e4b7`
- Trigger: **github:push**
- Git repository: **Dualis3283/david-walsh-site**
- Production branch: **main**
- Build output: **site/**
- Pages Functions: **enabled**
- Compatibility date: **2026-09-24**
- All Cloudflare stages: **success**
- Canonical public hostname `david-walsh.pages.dev`: full equivalence gate **passed**
- Immutable deployment URL `b861c0a4.david-walsh.pages.dev`: full equivalence gate **passed**
- Preserved rollback deployment: **V18 Direct Upload `d7000b0a`**
- Separate Git-backed staging project: **david-walsh-staging**
- Staging preview deployment `094e3343`: verified equivalent to V18 before production cutover.
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

1. **Git-backed website operations**
   - GitHub is now source of truth for website code.
   - Cloudflare production is driven by `main`.
   - `cloudflare-preview` is the dedicated preview branch.
   - Use staging/preview + QA before significant production changes.
   - Preserve `d7000b0a` as rollback until several Git-backed releases have proven stable.

2. **Deck Planner Companion App**
   - V18 public frontend recovered into Git.
   - `/api/resolve-deck` Pages Function reconstructed from the V18 contract.
   - Shorikai/Matzalantli and Victor Room multi-face regression tests are automated and passing.
   - Continue phone review, accessibility QA, and broader full-deck regression fixtures when useful.
   - Future D1/KV work remains optional until a demonstrated need justifies it.

3. **Project Morrow measurement foundation**
   - Workflow 01 logged.
   - Workflow 02 logged.
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
- Add branch/merge safeguards so normal website work follows QA → preview → merge → production.
- Compleated Loyalty physical print proof from Print Master v2.
- Continue MTG collection/deck knowledge.
- Continue Dualis catalogue/corpus organisation.
- Continue cross-project visual standard where useful.

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
- **GitHub→Cloudflare production cutover, independently verified.**

## Important unknowns

- Physical print behaviour for Compleated Loyalty.
- User-side visual/interaction review of the newly Git-backed production site remains useful even though automated equivalence is complete.
- R2/D1/KV architecture should remain optional until a demonstrated need justifies it.
- Morrow performance percentages are not publishable until the 20-workflow foundation baseline is complete.
