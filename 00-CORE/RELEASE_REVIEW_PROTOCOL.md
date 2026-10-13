# Morrow: a reusable release review

Version 1 · 13 October 2026

Purpose: turn a correction into a procedure that can be checked on the next relevant task.

## Before changing anything

- Name the user’s present goal and the affected page, component or artifact.
- Retrieve the current source and relevant decisions. Record their dates and versions.
- Separate an approved baseline from an exploratory alternative. Current instructions can change either.
- Record the observed problem, expected behaviour and one reproducible example.
- Check the failure-pattern register. Which earlier lesson applies, and what differs now?

## During the change

- Give each edit a reason connected to the goal.
- Remove superseded implementation when safe; do not leave successive fixes competing in the same layer.
- Preserve meaningful content, source attribution and approved creative material.
- Use one clear interaction for each purpose. A summary or control must explain what it opens.
- Keep historical evidence separate from public presentation. Review publication suitability.

## Before release

- Run the relevant source and functional checks.
- Inspect the rendered component, not only document-wide overflow: narrow phone, laptop, enlarged text, keyboard, open/closed states and reduced motion.
- Test the original failing example. If a new automated check was added, demonstrate that it fails on the old behaviour and passes on the correction.
- Compare neighbouring pages that share changed styles or scripts.
- Record what could not be checked; do not convert a missing check into a pass.
- Use staging and the established promotion gate. Preserve a recoverable source baseline.

## After release

- Read back the public page and the changed interaction.
- Distinguish prepared, committed, deployed, verified and owner-reviewed.
- Update the project’s current state and reconcile superseded next actions elsewhere.
- Record the failure class, correction, check, evidence, responsible role and next review trigger.
- On a second occurrence, review why the existing control failed: missing, not run, too broad, stale or ineffective. Revise that control before closing the issue.

## Portable record

Task ID:
Goal and scope:
Current source/version:
Relevant prior decision:
Observed problem and reproduction:
Failure class and previous occurrence:
Cause (confirmed / hypothesis / unknown):
Change:
Preventive check and where it runs:
Verification evidence:
Unverified conditions:
Release and rollback reference:
Record superseded:
Responsible role and review trigger:

## How to judge improvement

Count comparable eligible tasks, corrections and checks with explicit definitions. Record missing observations as unknown. A documented procedure, a small pilot or a passing release is useful evidence; none alone establishes a percentage improvement attributable to Morrow.
