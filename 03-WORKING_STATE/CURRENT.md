# Current Working State

## Cloudflare global adoption integration — 19 October 2026

**Source implementation:** [PR #6](https://github.com/Dualis3283/morrow-knowledge3283/pull/6) added a stateless, public-safe Publisher and read-only experimental JSON-RPC/MCP adapter. GitHub Worker security/endpoint tests **15/15 passed** with repository privacy and safety CI. **Not a live release:** Cloudflare connections rejected authenticated reads (HTTP 400); no deployment, domain publication, model inference or independent MCP client conformance test occurred. The existing unrelated Workers Builds failure remains open. See [candidate handoff](../cloudflare/morrow-public/README.md), [Task Register TASK-007–010](TASK_REGISTER.md).

## Full pipeline reconciliation checkpoint — 19 October 2026

**Verified:** Public GitHub `main` at `bd2119e` passes the privacy, verify-layer and ledger jobs. PRs #2–#4 merged; draft PR #1 remains unmerged with 24/24 synthetic Bridge tests and a staged readback pass. Core, Phase 3, Knowledge Architecture, Working State and Decision Log records in the authenticated Notion pipeline were updated where needed and re-read after the changes.

**Blocked/unknown:** Cloudflare Workers Builds on the public knowledge repository is still failing; build-log root cause not established. No completed live cross-model A/B tests, private local store deployment, consent verification or user release confirmation. Phase 6 sample stays 19/20 unfrozen. See the [full public-safe audit](../05-RESEARCH/MORROW_PIPELINE_AUDIT_2026-10-19.md). This checkpoint supersedes old *next action* instructions but does not erase dated history.

## Repository operational baseline — 19 October 2026

**Scoped status:** GitHub CI **active and independently verified**; no local encrypted/private store, real inter-model migration, or final user-confirmed Morrow Core release has been observed. See [Task Register TASK-001–TASK-004](TASK_REGISTER.md) and [ADR-001](../04-DECISIONS/DECISION_LOG.md). Notion remains the operational task authority; this GitHub record is a dated public-safe mirror, not proof of a Notion sync. A CI PASS measures the test named, not independent certification of the methodology.

## Strategic authority — 14 October 2026 (P0)

**Current owner-approved primary mission:** design and validate Morrow as an open, interoperable, model-independent methodology for potential worldwide AI adoption. All other Morrow project initiatives are secondary/supporting. Nothing is implicitly cancelled.

**Current Morrow Core state (readback 19 October 2026):** The Core v1 draft and Bridge v0.1 prototype remain on [draft PR #1](https://github.com/Dualis3283/morrow-knowledge3283/pull/1), not merged or ratified. **24/24 synthetic Bridge/readback tests passed** in the draft CI and a staged destination digest/schema readback passed; this is not a real cross-model transfer. The public repository's `main` now runs protected `privacy` and `verify-layer` CI, both verified successful. **Next action:** define a reproducible cross-compatibility matrix, controlled matched scenarios and consented model-runtime routes, then perform live trials; **no cross-model conformance evidence is yet observed**. Older Phase 6 measurement remains a separate 19/20 unfrozen baseline. Global adoption remains aspirational; prior privacy, safety and release gates remain in force.

**Dated source:** [Strategic direction checkpoint](../00-CORE/STRATEGIC_DIRECTION_2026-10-14.md). This entry takes priority over historic "Now" lists below; historical implementation records remain evidence.


## Editorial reduction released — 13 October 2026

Latest verified website source: `eed455ad2c4057c93118a746dab0b9ef8593ca4b`, [PR #10](https://github.com/Dualis3283/david-walsh-site/pull/10), Cloudflare production `652d2833-c246-4f33-8333-485391000aa1`.

Reduced repeated homepage introductions, consolidated About's archive into one optional disclosure, focused Ascension on listening, shortened Morrow continuity framing and moved exports to the end of the history. Professional indicators/equalizer and source limitations remain; Compleated Loyalty and Deck Planner framing is shorter. Orphaned styles were removed. Original poetry, memoir and six-stage history data are unchanged.

PR and main Site QA, health and fast-forward promotion passed. Rendered 390px/1440px review covered representative pages; keyboard/no-script history and keyboard About archive checks passed. Live canonical readback confirmed the compact homepage, expandable About archive, six-stage Morrow history with exports and working professional evidence controls. This is implementation verification, not owner visual approval.

The review found an existing missing Ascension track-data file. The page now states previews are unavailable and keeps streaming links instead of silently claiming previews exist. Restoring previews remains an explicit follow-up requiring verified track metadata and approved audio URLs. No data was invented. CI simulates missing metadata to retain this fallback check after restoration.

[Versioned editorial decisions](https://github.com/Dualis3283/david-walsh-site/blob/eed455ad2c4057c93118a746dab0b9ef8593ca4b/docs/EDITORIAL_REDUCTION_2026-10-13.md). Rule for subsequent copy: explain at the primary destination, link briefly elsewhere, retain evidence and uncertainty with each claim. Ask Morrow remains staging-only; the 19/20 unfrozen measurement baseline and skipped Phase 5 are unchanged. Prior website checkpoints below are historical where superseded.

**Checkpoint date:** 13 October 2026

## Website review authority — 13 October 2026

The owner authorised a conversation-informed retrospective, code housekeeping, visual flow refinement and an expandable website evolution history. See 05-RESEARCH/MORROW_RETROSPECTIVE_2026-10-13.md and 00-CORE/RELEASE_REVIEW_PROTOCOL.md. This is a specific website/procedure mandate, not a reopening of Phase 5 or permission to freeze the incomplete measurement baseline.

Verified website release: `1b8a3c8f204540e0dbd440ff610c0ba8c9be2674`; Cloudflare `14e1b1c2`. Source QA, rendered phone/laptop checks, promotion and canonical browser history readback passed. Scope/limitations and next recurrence trigger are in the retrospective. The website remains an active project; this implementation is complete, not owner-reviewed.

## Latest measurement authority — Phase 6 stopgap
Authoritative new checkpoint: 07-ARCHIVE/PHASE6_CONSOLIDATION_STOPGAP_2026-10-12.md. Nineteen workflows are coded; Metric Definition v1 is NOT frozen; Phase 4 owner-closed, Phase 5 skipped, next phase scope not authorised. The following older project notes are historical unless refreshed from project-specific sources.

### Verified website QA follow-up — 12 October 2026
The owner's physical laptop photos revealed clipped hero typography, clipped MORROW lettering, and cramped World Wave labels despite prior source checks. Verified follow-up production SHA: ad8da03385379ba99e2d896808100a13a4512554 with successful QA, smoke, promotion, Cloudflare deployment checks and live responsive readback. Evidence/lesson: 07-ARCHIVE/WEBSITE_LAYOUT_PHOTO_CHECKPOINT_2026-10-12.md. Phase 6 stopgap remains unchanged; Phase 5 remains skipped; metric baseline remains 19/20 and unfrozen.

### Prior checkpoint
**Earlier checkpoint date:** 2 October 2026

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
- **Current canonical production: `60f0fead`**
- Full deployment ID: `60f0fead-a86a-4bf8-afcc-bd1aca3ded37`
- Git commit: `8395d33f1a09982fa46e0971cef02b7a06158aa5`
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
- **Pipeline Reconciliation v1** is active.
- For a specific project's current state, the project-specific record outranks broader Working State summaries.
- Working State must be reconciled when a newer project checkpoint supersedes one of its active next-actions.
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
   - Workflows **01–19** are logged.
   - One eligible substantive workflow remains before Metric Definition v1 freeze and first baseline calculation.

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
   - Project Morrow has a dedicated public route at `/projects/morrow/`, refreshed on 2 October to the current Relational Context / Context Bridge model.
   - Ask Morrow Phase 0 is complete; the chatbot itself is **not live**.
   - Publication Privacy Standard is now a hard corpus boundary.
   - Public corpus v1.0-eval is frozen and validated against pinned source commits.
   - Fixed Ask Morrow evaluation set v1.0 is frozen: 40 response cases + 8 system/UX cases.
   - Phase 1C staging prototype scaffold is implemented and verified on feature branch `feature/ask-morrow-prototype`.
   - Workers AI proof of concept supersedes OpenAI as the active staging provider. OpenAI remains an inactive comparison adapter only.
   - Current website branch head: `4407e9b764fc815a5f83a5e13754e646a68521bb`; clean staging preview: `493d1ae7`.
   - Staging Preview contains only `ASK_MORROW_ENABLED`, `ASK_MORROW_PROVIDER=cloudflare`, `ASK_MORROW_CF_MODEL=@cf/google/gemma-4-26b-a4b-it`, and Workers AI binding `AI`.
   - Frozen response gate: 26/26 non-P0 primary cases full-pass after remediation; 42/42 required P0 trials intercepted deterministically before inference.
   - 16/26 non-P0 cases use zero-inference deterministic handling; 10/26 require Gemma synthesis.
   - User authenticated runtime successfully returned both the deterministic Project Morrow FAQ and a model-bound evidence-vs-interpretation answer.
   - Current-source P0 system cases S01-S06 pass, including request bounds, rate control, model failure, empty retrieval and credential-safe response behavior.
   - UI now displays actual `metrics.neurons`, and message CSS includes `overflow-wrap:anywhere` for pathological long tokens.
   - Keyboard source mechanics pass, but the frozen public-beta standard still requires one true keyboard-only interaction trial. No Ask Morrow public-beta promotion until that final P1 trial passes.
   - Public Project Morrow copy now states the Context Bridge rule: **retrieved ≠ relevant ≠ current ≠ decision-authoritative**.
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
- **Website editorial refresh via PR #5: current Morrow framework + Context Bridge published, repetitive cross-site copy reduced, production commit `8395d33`, Cloudflare deployment `60f0fead`, rendered canonical readback passed.**

## Important unknowns

- Physical print behaviour for Compleated Loyalty.
- Native branch protection remains unavailable on the current private-repository GitHub plan.
- User-side visual/interaction review remains useful despite automated and rendered-browser checks.
- Exact current full Shorikai and Victor deck-list inputs are not retained in durable sources; executable full-deck fixtures require those literal dated lists.
- R2/D1/KV architecture should remain optional until demonstrated needs justify it.
- Ask Morrow corpus/evaluation v1.0 are frozen. Workers AI/Gemma 4 is the active staging backend with no external API key. Response and P0 system gates pass; authenticated model-bound runtime passes. Only the true keyboard-only P1 interaction trial remains before the frozen public-beta gate can be declared complete.
- Third-party search-engine/cache copies cannot be guaranteed deleted by Cloudflare cleanup; current searches found no indexed copies of the removed Ireland/PlayStation wording.
- Morrow performance percentages are not publishable until the 20-workflow foundation baseline is complete.
