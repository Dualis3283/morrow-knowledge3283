# Current Working State

**Checkpoint date:** 1 October 2026

## Confirmed current infrastructure

### GitHub
- Canonical public knowledge repo: **Dualis3283/morrow-knowledge3283**
- Read access: verified.
- Write access through the active GitHub integration: verified.
- Commit/readback workflow: operational.
- Public-safety rule applies: no sensitive personal/private source material.
- Private website repo: **Dualis3283/david-walsh-site**
- Website repo baseline/QA commit: **ce4d93ba2553520e7fb4d7103d74608da2304f10**
- GitHub Actions production smoke workflow: **passed** on first run.

### Cloudflare
- Cloudflare MCP connection: operational.
- Pages project: **david-walsh**
- **Current production: V18 / `d7000b0a`**
- V18 deployment succeeded on 1 Oct 2026.
- Current Pages deployment is still ad hoc/direct-style, not Git clone/build driven.
- Pages Functions active in V18.
- Web Analytics not configured on the Pages project.
- R2 exists as a capability but is not enabled.
- D1: no databases currently.
- KV: no namespaces currently.
- Worker `morrow-knowledge3283` exists but has no bindings/routes and is not yet an operational backend.
- Browser Rendering successfully recovered the V18 homepage/route graph, then reached rate limits during bulk source recovery.

### Notion
- **Morrow — Project Pipeline** database remains the operational task/status source.
- Duplicate/superseded records have been archived rather than deleted.
- The Project Morrow measurement foundation is now active.

## Current project gates

### Now
1. **Morrow knowledge consolidation**
   - maintain repository;
   - preserve sources/provenance;
   - classify duplicates/superseded state;
   - maintain public-safety boundary.

2. **Website Git source recovery**
   - private `david-walsh-site` repo created;
   - V18 production baseline and route graph recorded;
   - production smoke tests operational and passing;
   - finish source/assets recovery after Browser Rendering cooldown;
   - do **not** connect Git to Cloudflare production until reproduction/preview equivalence is proven.

3. **Deck Planner Companion App**
   - V18 live;
   - phone review;
   - Shorikai/Victor regressions;
   - accessibility QA;
   - resolver/rate-limit hardening;
   - convert known parsing failures into regression fixtures once exact lists are captured.

4. **Deck Evolution Planner**
   - review 18-page v0.7 core book;
   - if approved, promote to production baseline;
   - regenerate storefront/listing previews;
   - then pricing/launch preparation.

5. **Project Morrow measurement foundation**
   - Workflow 01 logged;
   - continue until 20 eligible substantive workflows are captured.

6. **Morrow architecture/infrastructure**
   - GitHub = versioned knowledge/source;
   - Notion = operational pipeline;
   - Cloudflare = runtime/deployment truth;
   - Drive/files = asset/recovery layer.

### Next
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
- First website Git/QA baseline commit and first successful production smoke test.

## Important unknowns

- Physical print behaviour for Compleated Loyalty.
- Complete lossless reconstruction of V18 source/assets is still pending.
- Git-backed Cloudflare preview equivalence has not yet been demonstrated.
- R2/D1/KV architecture should remain optional until a demonstrated need justifies it.
- Morrow performance percentages are not publishable until the 20-workflow foundation baseline is complete.
