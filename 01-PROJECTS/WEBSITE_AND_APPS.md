# Website and Apps

## Current verified production state

**David Walsh Website / Cloudflare Pages**

- Project: `david-walsh`
- Public domain: `david-walsh.pages.dev`
- Current production deployment: **`b861c0a4`**
- Full deployment ID: `b861c0a4-f6ba-4774-8900-a940dd6b4849`
- Git commit: `9a814dc8821cc5d5157163b6e213e8c55ce3e4b7`
- Deployment trigger: **github:push**
- Source repository: **Dualis3283/david-walsh-site**
- Production branch: **main**
- Static output: **site/**
- Pages Functions: **active**
- Verified directly from Cloudflare and GitHub Actions on **1 October 2026**

The previous Direct Upload V18 deployment **`d7000b0a`** remains the known-good rollback point.

Earlier V7 and V14 records remain historical checkpoints only.

## Git-backed deployment model

The website has now transitioned from ad-hoc Direct Upload to:

**GitHub source → QA → isolated Cloudflare preview → equivalence verification → main → Cloudflare production → public readback**

A separate Pages project, **`david-walsh-staging`**, is retained for safe Git-backed staging.

Preview branch:
- `cloudflare-preview`

Production branch:
- `main`

## Production cutover evidence

Before the Git-backed production switch, the following passed against staging deployment **`094e3343`**:

- private GitHub repository clone;
- build;
- Pages Functions bundling;
- deployment;
- byte-level SHA-256 equivalence against recovered V18 routes/assets;
- route/marker smoke tests;
- internal link/asset tests;
- Deck Planner resolver unit regressions;
- live resolver contract parity;
- recovered-source secret scan.

After cutover, the same complete verification gate passed against:

- immutable production deployment **`b861c0a4.david-walsh.pages.dev`**
- canonical public hostname **`david-walsh.pages.dev`**

Cloudflare independently reports **`b861c0a4`** as the canonical deployment.

## Deployment protocol

For meaningful website/app changes:

1. Recover current `main` state and current Cloudflare production ID.
2. Classify the requested delta.
3. Make the smallest source change.
4. Run GitHub QA.
5. Use preview/staging for structural, runtime, asset, parser, or high-risk changes.
6. Verify preview route/assets/runtime behaviour.
7. Merge/promote only after checks pass.
8. Confirm Cloudflare deployment stages.
9. Independently verify the immutable deployment URL.
10. Independently verify the canonical public hostname.
11. Record commit SHA ↔ Cloudflare deployment ID.
12. Preserve a rollback point and checkpoint Morrow/Notion.

## Reusable lessons from the cutover

- Deployment acceptance is not deployment verification.
- Git attachment should be separated from production enablement.
- A staging project can prove Git clone/build/Functions before touching the live project.
- Cloudflare source attachment currently requires legacy `deployments_enabled` alongside newer deployment controls.
- Empty `path_includes` can result in `skip_reason: path_config`; explicit `["*"]` was required for this workflow.
- A QA parser must distinguish rendered HTML attributes from JavaScript template strings inside `<script>` blocks.
- Git safely blocked a stale recovery run from overwriting a newer branch head.
- Byte-level equivalence is stronger than “the page loads”.
- Keep rollback IDs before structural deployment changes.
- Public verification should cover the canonical hostname, not only an immutable deployment URL.

## Deck Planner Companion App

**Status:** live alpha / hardening, now under source control and regression testing.

Current state:
- live route: `/projects/deck-planner/`;
- same-origin resolver: `/api/resolve-deck`;
- Pages Function source now stored at `functions/api/resolve-deck.js`;
- V18 resolver contract reproduced;
- Matzalantli/multi-face and Room aliases covered by automated regression tests;
- Scryfall fallback and 75-card collection batching are tested.

Next checks:
- phone review;
- accessibility QA;
- add full-deck fixtures when they add value beyond the focused failure-class regressions;
- future backend/data design only when it solves a demonstrated problem.
