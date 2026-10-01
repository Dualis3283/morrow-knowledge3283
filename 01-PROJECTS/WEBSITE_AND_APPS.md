# Website and Apps

## Current verified production state

**David Walsh Website / Cloudflare Pages**

- Project: `david-walsh`
- Public domain: `david-walsh.pages.dev`
- Current canonical deployment: **`91c284e3`**
- Full deployment ID: `91c284e3-064f-4284-83f1-2c2618b97d74`
- Git commit: `0f4f9527d5bde91778e1a3693eff9f8928a729c4`
- Deployment trigger: **github:push**
- Source repository: **Dualis3283/david-walsh-site**
- Cloudflare production branch: **production**
- Integration branch: **main**
- Static output: **site/**
- Pages Functions: **active**
- Verified directly from Cloudflare and GitHub Actions on **1 October 2026**

Rollback references:
- previous gated production: **`c8709b99`**
- earlier verified Git-backed production: **`b861c0a4`**
- Direct Upload V18: **`d7000b0a`**

## Gated deployment model

Normal path:

**feature branch → staging preview / PR → Site QA → main → Site QA → fast-forward promotion → production → Cloudflare production → public verification**

Cloudflare production is no longer driven directly by `main`.

### Gate mechanics

- PRs targeting `main` run **Site QA**.
- Pushes to `main` run **Site QA**.
- Site QA validates:
  - Deck Planner resolver regressions;
  - repository-static route/assets structure;
  - HTML accessibility sanity checks;
  - source secret scan;
  - current production health for push events.
- **Promote production** runs only when:
  - Site QA concluded successfully;
  - the checked branch was `main`;
  - the Site QA event was a push.
- Promotion is **fast-forward only**.
- If `production` is not an ancestor of the verified `main` commit, promotion fails instead of force-updating.
- Cloudflare deploys only from `production`.

## GitHub plan limitation

Native GitHub branch protection was tested for `main`.

GitHub returned a 403 stating that this private repository requires **GitHub Pro** or must be made public to enable branch protection.

Decision:
- keep the repository private;
- do not weaken privacy to obtain native branch protection;
- enforce the deployment gate using separate `main` and `production` branches plus GitHub Actions.

This means direct Git pushes are not technically forbidden by GitHub itself, but an ordinary push to `main` cannot directly deploy production.

## Staging

Separate Pages project:
- **`david-walsh-staging`**

Staging now:
- accepts previews from ordinary non-production branches;
- has PR preview comments enabled;
- keeps production deployments disabled.

This makes feature-branch previews the default safe test surface.

## Verification evidence for the gated architecture

Gate implementation commit:
- `7af90a462b63ba1a02e2ba3f94e6dba0d19bdde1`

Sequence observed:
1. `main` advanced to the gate commit.
2. `production` remained on the prior verified commit while Site QA ran.
3. Site QA passed:
   - resolver regressions;
   - repository-static validation;
   - source secret scan;
   - current production health.
4. Promote production ran.
5. Promotion fast-forwarded `production` to exactly the tested SHA.
6. Cloudflare detected the `production` branch push.
7. Queue / initialize / clone / build / deploy all passed.
8. New production deployment: **`c8709b99`**.
9. Canonical hostname then passed:
   - V18 static equivalence;
   - route/marker smoke test;
   - internal links/assets;
   - resolver contract parity;
   - secret scan.

## First ordinary gated feature release

**PR #1 — Clean Deck Planner accessibility markup**

- Feature branch: `feature/deck-planner-a11y-cleanup`
- Feature commit: `4e6b58a2e45e0d7a65a1928b0ac475fdc74ece64`
- Staging deployment: `98043673`
- PR-triggered Site QA: success
- Squash merge to `main`: `0f4f9527d5bde91778e1a3693eff9f8928a729c4`
- Post-merge Site QA: success
- Automatic fast-forward promotion: success
- Production deployment: **`91c284e3`**
- Cloudflare queue / initialize / clone / build / deploy: all success
- Collateral-drift check: **exactly one static file changed** — `/projects/deck-planner/index.html`
- Live Deck Planner HTML: duplicated `aria-label` pairs = **0**
- Gold `Deck Planner` heading preserved.
- Post-deploy route smoke: success
- Post-deploy resolver contract probe: success
- Merged feature branch auto-deleted.

The release removed **9 duplicated `aria-label` attributes** and added an automated HTML accessibility sanity check covering:
- duplicate attributes;
- duplicate IDs;
- missing targets referenced by `aria-labelledby`;
- missing targets referenced by `aria-describedby`.

## Deployment protocol

For meaningful website/app changes:

1. Create a feature branch when practical.
2. Let Cloudflare staging create a preview.
3. Run/inspect PR Site QA.
4. Merge or otherwise advance `main`.
5. Wait for push-triggered Site QA.
6. Do not manually move `production` if QA fails.
7. Let **Promote production** fast-forward the verified commit.
8. Confirm Cloudflare production stages.
9. Verify immutable deployment when risk warrants it.
10. Verify canonical public hostname.
11. Record commit SHA ↔ Cloudflare deployment ID.
12. Preserve rollback points and checkpoint Morrow/Notion.

## Deck Planner Companion App

**Status:** live alpha / hardening, source-controlled and regression-tested.

Current state:
- live route: `/projects/deck-planner/`;
- same-origin resolver: `/api/resolve-deck`;
- Pages Function source: `functions/api/resolve-deck.js`;
- V18 resolver contract reproduced;
- Matzalantli/multi-face and Room aliases covered by automated regression tests;
- HTML accessibility sanity checks are automated;
- nine duplicate form-field `aria-label` attributes have been removed from production;
- Scryfall fallback and 75-card collection batching are tested.

Next checks:
- phone review;
- broader accessibility QA / phone review;
- add full-deck fixtures when they add value;
- future backend/data design only when it solves a demonstrated problem.
