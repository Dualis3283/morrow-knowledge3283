# Website and Apps

## Current verified production state

**David Walsh Website / Cloudflare Pages**

- Project: `david-walsh`
- Public domain: `david-walsh.pages.dev`
- **Current production baseline: V18**
- Deployment short ID: **`d7000b0a`**
- Deployment message: **V18 production: Deck Planner Companion App + Project Morrow**
- Verified directly from Cloudflare on **1 October 2026**
- Deployment mode remains **ad hoc / direct-style**, not Git-clone/build driven.
- Pages Functions are active in V18.

Earlier V7 and V14 records remain valid historical checkpoints but are not current.

## Deployment protocol

1. Freeze current production ID and source/asset baseline.
2. Classify the requested delta.
3. Use the smallest possible patch.
4. Run internal preflight even when user-facing preview is skipped.
5. Verify deployment state.
6. Verify public HTML/render and key routes.
7. Verify shared CSS/assets.
8. Distinguish:
   - deployment accepted;
   - deployment active;
   - public route verified;
   - user visually confirmed.
9. If verification is rate-limited, state what remains unverified instead of inferring success.
10. Checkpoint after a stable state.

## Reusable lessons

- A successful Cloudflare deployment does not prove every route or content change is correct.
- A one-line content request should not silently turn into routing/Function architecture changes.
- Keep rollback points before structural work.
- Preview/canary checks can catch missing assets before production.
- Public pages should curate project stories rather than reproduce internal archives.
- Mobile overflow can come from width + padding without appropriate box sizing.
- Security hardening should be scoped separately from content changes unless explicitly bundled.

## Deck Planner Companion App

**Status:** live alpha / hardening.

Current Notion working record identifies:
- V18 as canonical production;
- MVP **0.6.6**;
- live route under `/projects/deck-planner/`;
- same-origin resolver active.

Next checks:
- phone review;
- Shorikai/Victor regression tests;
- accessibility QA;
- resolver/rate-limit behaviour;
- future backend/data design only when it solves a demonstrated problem.

## GitHub → Cloudflare

Cloudflare now has GitHub authorised, but the current Pages project is still not Git-driven.

Desired future pattern:

**GitHub source → preview branch → Cloudflare preview → verify → merge/main → production**

Do not attach the repository until a known-good website source baseline exists in GitHub and can reproduce current V18 safely.
