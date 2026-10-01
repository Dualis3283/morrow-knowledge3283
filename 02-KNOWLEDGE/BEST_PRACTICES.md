# Best Practices and Learned Rules

This file distils reusable lessons from website deployment, Compleated Loyalty, MTG analysis, artifact production, connector work, and Morrow continuity work.

## State and continuity

- Recover the latest relevant state before asking for information already recorded.
- Preserve chronology and corrections.
- Separate current state from historical snapshots.
- A curated summary is not a complete transcript or source archive.
- Locked/approved decisions outrank older exploratory material.
- When a state changes, record what it supersedes.
- Keep a minimum resume record: project, date, current state, decisions, last confirmed artifacts/links, blockers, open questions, next action.

## Authority and reconciliation

- For a specific project's current operational state, use the **project-specific record first**.
- Morrow Working State is a synthesized snapshot; it must be updated when a newer project record supersedes it.
- Durable decisions belong in the Decision Log; connector capability belongs in the Connector & Integration Layer.
- GitHub is a versioned public-safe mirror, not automatically the newest source merely because it has a commit timestamp.
- Foundations and Archive preserve evidence and recovery context; their old next-actions are historical unless explicitly promoted.
- At each major checkpoint ask: **Does this new state supersede another active next-action?**
- Do not close the checkpoint until affected broader records are reconciled and, where practical, read back.

## Verification

- Tool acceptance is not proof of external result.
- Verify outcomes by independent readback when practical.
- Distinguish planned, attempted, accepted, active, independently verified, and user confirmed.
- Persistent writes should use **write → readback** when continuity matters.
- When automated verification fails or is rate-limited, do not infer success.

## Scope control

- Solve the requested delta without widening architecture or design language unnecessarily.
- If a local edit begins requiring routing/system changes, reassess before deploying.
- Separate remediation from redesign.
- Separate a new revision from unfinished work on an already-complete checkpoint.

## Source discipline

- Prove an option belongs to the allowed source set before comparing it.
- Dynamic facts require freshness checks.
- Primary/authoritative sources are preferred.
- Do not silently convert an inference into a confirmed fact.
- Record sources that materially support consequential decisions.

## Artifact production

- Generate/assemble is not the same as production-ready.
- Render the final output and visually inspect it.
- Separate authoritative data/mechanics from visual/generated layers.
- For print, digital approval and physical proof are separate gates.
- Keep printer/cutter/stock behaviour as its own production state.

## Website/deployment

- Freeze the current production baseline before change.
- Maintain rollback points.
- Use preview/preflight to catch missing assets.
- Smoke-test representative routes after deployment.
- Check public HTML/render, not only deployment status.
- Preserve source-of-truth files instead of relying on response-time transformations where possible.

## MTG

- Collection-only means recommendations must be demonstrably in the supplied collection.
- One physical copy should not be allocated to multiple decks unless explicitly changed.
- Exact dated deck lists matter because builds drift.
- Validate card mechanics rather than inferring from name/archetype reputation.
- Multi-type cards must be counted/analysed correctly.
- Commander/theme recommendations should respect the user's stated purpose, not just generic power.

## Creative work

- Preserve accepted voice and strongest material.
- Do not restart a locked creative direction merely because another style is possible.
- Use the work itself as evidence of capability.
- Public presentation should reveal enough to create interest without requiring total personal disclosure.
- A coherent narrative is often stronger than a complete catalogue.

## Housekeeping

- One canonical record per active concern.
- Historical checkpoints may remain, but their “next action” is not automatically current.
- Duplicate completion tickets should point to the canonical closure record.
- Stale “current baseline” claims should be moved into archive/history once externally superseded.
- Do not delete useful failure evidence merely because the problem is fixed.
