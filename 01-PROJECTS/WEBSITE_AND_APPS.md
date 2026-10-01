# Website and Apps

## Current verified production state

**David Walsh Website / Cloudflare Pages**

- Project: `david-walsh`
- Public domain: `david-walsh.pages.dev`
- Current canonical deployment: **`60605cf7`**
- Full deployment ID: `60605cf7-ddda-45d6-b5f5-88fab54e7b57`
- Git commit: `cd7170e245be93bd678dabad21cb86ea238ed3d4`
- Deployment trigger: **github:push**
- Source repository: **Dualis3283/david-walsh-site**
- Cloudflare production branch: **production**
- Integration branch: **main**
- Static output: **site/**
- Pages Functions: **active**
- Verified directly from Cloudflare and GitHub Actions on **1 October 2026**

Rollback references:
- previous gated production: **`91c284e3`**
- earlier gated production: **`c8709b99`**
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

## Second ordinary gated feature release

**PR #2 — Harden Deck Planner mobile touch targets**

- Feature branch: `feature/deck-planner-mobile-touch-targets`
- Feature commit: `630a4c2d8abd4a2b979619f15a62578063849f04`
- Staging deployment: `03d957b5`
- PR-triggered Site QA: success
- Squash merge to `main`: `cd7170e245be93bd678dabad21cb86ea238ed3d4`
- Post-merge Site QA: success
- Automatic fast-forward promotion: success
- Production deployment: **`60605cf7`**
- Cloudflare queue / initialize / clone / build / deploy: all success
- Collateral-drift check: **exactly one static file changed** — `/projects/deck-planner/index.html`
- Production smoke: success
- Resolver contract probe: success
- Merged feature branch auto-deleted.

### Live mobile evidence

Rendered production audit at **390×844 / DPR 2 / touch input**:
- horizontal overflow: **none**;
- duplicate IDs: **none**;
- broken ARIA references: **none**;
- unnamed visible form/button controls: **none**;
- project-status diagnostic control: **44px high**;
- Review settings disclosure: **44px high**;
- Filter roles select: **44px high**.

A narrower **320×568** staging stress pass also showed no horizontal overflow. The Filter roles control is inside a collapsed Advanced Tag Table at that state, so it has no rendered box until the disclosure is opened.

The three controls were already above the WCAG 2.2 AA 24×24 target-size floor. This release intentionally raises them to a more comfortable **44px mobile target**, consistent with the existing chapter-toggle treatment.

### New permanent guardrail

`tests/html-a11y.mjs` now asserts a 44px minimum-height rule for:
- `.status-pill.source-navigable`;
- `.audit-options > summary`;
- `.tag-tools select`.

### Full-deck fixture source gap

The durable QA archive retains the verified Shorikai result (**100 total cards / 85 unique names**) and the Matzalantli front-face failure mode, but not the literal full deck list itself. The current full Victor list is also not retained as a literal dated input.

Therefore:
- do **not** reconstruct those fixtures from memory or partial deck summaries;
- when the authoritative full lists are available, store the literal dated inputs under the test fixture layer before creating executable full-deck regressions;
- future real-deck regression records should preserve **input + expected result**, not only the result summary.

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
- key mobile diagnostic/disclosure/filter controls have a 44px small-screen/coarse-pointer minimum;
- rendered mobile audits at 390px and 320px show no horizontal overflow;
- Scryfall fallback and 75-card collection batching are tested.

Next checks:
- user-side phone/interaction review remains useful after rendered-browser QA;
- continue broader accessibility QA where it adds evidence;
- capture exact dated Shorikai/Victor full lists before adding full-deck executable fixtures;
- future backend/data design only when it solves a demonstrated problem.


## Website attention audit — 1 October 2026

With Deck Planner hardening at a checkpoint, the broader public site was audited across nine principal pages:
- home;
- about;
- memoir;
- poetry;
- professional;
- Compleated Loyalty;
- Ascension;
- Duality Unfolding;
- Pearlescent Gaze.

### Confirmed strengths

- Every audited page has a page title, meta description, canonical URL and one H1.
- All audited image elements have an `alt` attribute.
- The home page already presents Project Morrow as a method: context, evidence and verification.
- Navigation between creative disciplines is established and coherent.
- The release pages link to listening platforms and related releases.
- The professional page and project pages retain the same broad dark-editorial identity.

### Priority attention areas

#### 1. Search and social discovery foundation — high priority / low implementation risk

Current source audit:
- **0 / 9** audited pages contain JSON-LD structured data.
- **0 / 9** audited pages define an Open Graph image.
- Home, Professional and Compleated Loyalty do not currently define Open Graph title/description metadata.
- Twitter-card metadata is absent on most audited pages.
- No `robots.txt` or `sitemap.xml` exists in the current `site/` source root.

Recommended next pass:
- add sitemap and robots files;
- add consistent Open Graph / social-card metadata;
- add one reusable share image family;
- add appropriate structured data for Person, MusicAlbum/MusicRecording, CreativeWork/Book and project pages where factual;
- add automated metadata sanity checks to Site QA.

#### 2. Project Morrow needs a first-class public destination — high priority

Morrow is currently explained on the home page but does not have its own route.

Recommended:
- create a dedicated `/projects/morrow/` or `/morrow/` page;
- explain the ethos, methodology, continuity model, evidence discipline and verification loop;
- show public-safe examples of how the method changed actual projects;
- distinguish Morrow from a generic AI persona.

This page is also the natural home for a future **Ask Morrow** assistant.

#### 3. Visitor next-actions / feedback — medium-high priority

Across the nine audited pages:
- there are no public forms;
- no dedicated contact/feedback route exists;
- there is no lightweight site-feedback mechanism.

This is not inherently a defect, but the site now has enough substantive work that visitors should have a clear way to:
- give project feedback;
- contact David;
- report a Deck Planner issue;
- optionally share whether a Morrow answer was useful.

A contact/feedback path should be privacy-minimal and should not expose a personal inbox address in client-side code unless explicitly intended.

#### 4. Measurement — medium-high priority

Cloudflare Web Analytics is not configured.

Before adding more interactive systems, a privacy-conscious measurement baseline would help answer:
- which sections visitors actually enter;
- whether visitors reach project/release detail pages;
- whether Deck Planner and a future Ask Morrow assistant are used;
- whether social/search improvements change discovery.

Do not invent performance or engagement claims before measurement exists.

#### 5. Project navigation / growth — medium priority

The home page has a Projects section, but there is no dedicated general projects index route.

As the site grows, a project hub could prevent the home page becoming the only directory for:
- Compleated Loyalty;
- Deck Planner;
- Magic Quick Reference;
- Deck Evolution Planner;
- Project Morrow;
- future systems/creative work.

#### 6. Release-page depth and consistency — medium priority

Ascension has materially richer explanatory content than Duality Unfolding and Pearlescent Gaze.

Do not add filler for SEO. Instead, where source material exists, consider:
- brief creative context;
- credits / release facts;
- relationship to poetry or wider themes;
- selected visual/process notes;
- clearer routes into related work.

#### 7. Media/performance follow-up — lower priority until measured

Several existing public assets are in the ~400–650 KB range, including:
- `cl-playmat.webp` ~656 KB;
- `cl-commander-process.webp` ~521 KB;
- `compleated-playmat.webp` ~493 KB;
- `in-my-own-light.png` ~412 KB.

These sizes alone do not prove a performance problem. Before changing assets, measure rendered dimensions, loading behaviour and real page performance. Prefer evidence over blanket recompression.
