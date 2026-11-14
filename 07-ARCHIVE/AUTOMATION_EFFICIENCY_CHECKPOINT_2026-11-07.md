# Automation efficiency — public-safe checkpoint (2026-11-07)

**Scope:** lessons from maintaining a personal website, a card deck simulator, dated public card references and automated QA. This record is generalised for public methodology review; raw CI screenshots, private repository paths and administrative references remain in the private project checkpoint.

## Observed pattern

Unconditional screenshots after successful browser runs create a growing retention liability. A full browser validation suite can be more expensive than the small, versioned data update that triggered it. Bulk external data refresh may continue on a timer even where the user-visible interface has limited discoverability.

## Intervention proposed

Keep functional validation for changed code, store debug screenshots only after failure and with bounded retention, cancel superseded runs, and avoid downloading large external datasets without demonstrated usage or need. Keep code-backed dated evidence while turning bulk refresh into manual opt-in pending measurement.

## Future AI utility

When this pattern recurs, retrieve the finding as a hypothesis and compare the current task's risk, code coverage, age and user goal. Do **not** assume the same tests, features or retention settings should always be removed. Surface historical context for independent decision-making, not as a directive.

## Evidence and unknowns

Evidence was reviewed against GitHub workflow configuration, artifact metadata, deployment history and source navigation. The number of customer-facing price-history uses and resulting real costs were not established; absence of a direct landing-page search is not proof that linked per-card analytics is unused. The private project contains the bounded operational ledger.

**Status:** recorded as historical evidence; proposed workflow changes are not claimed deployed or independently verified.
