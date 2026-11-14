# Morrow Core Phase 3 — execution checkpoint
**Date:** 14 October 2026. **Status:** started; normative reconciliation implemented as draft; Bridge CI verified. Live model evaluation not run.

## Goal and scope
Owner-approved P0: open, model-independent, interoperable and independently verifiable methodology suitable for voluntary worldwide adoption. Other initiatives support this objective. Context → Evidence → Pattern → Interpretation → Action → Verification → Lesson. Historical preferences remain revisable.

## Evidence and actions
- Read main strategic direction and Phase 3 handoff, live Notion Core/Phase 3/Working State, draft PR #1, Core v0.1 and R1, plus both recovered Phase 2/3 archives.
- Correct repository is Dualis3283/morrow-knowledge3283. The older candidate checked morrow-knowledge, so its inaccessible/unresolved-target statements are historical and superseded by this successful read/write.
- Commit f5802136abc0ccec68b0600f8fae1ed81f098514 updates Core to candidate v0.2 with R1 change log: separate intent/evidence/permission authority; provenance limits; relevant alternatives; bounded deletion; privacy-conditioned correction/history retention; compact/stateless operation. MC-09/10 receipt-versus-outcome checks preserved. Owner/independent review still pending.
- Same commit adds explicit RFC3339 format checking and requirements.txt, incorporating the candidate's timestamp dependency fix after comparison with current remote source. Rebuilt from remote source and ran 14/14 Bridge tests locally. Three changed files read back byte-for-byte.
- Commit e7fd493946985fe131648a01104391a4986434bb adds Bridge CI. Workflow read back; real runner completed successfully, including dependency install and unittest step: https://github.com/Dualis3283/morrow-knowledge3283/actions/runs/38491664451 . Another run 38491670216 also returned success.
- Direct GitHub write returned integration 403; the existing authorized Composio GitHub connection completed commits. Do not infer all GitHub access is unavailable from one integration failure.
- Recovered Phase 3 evaluation candidate passed 23/23 local tooling tests. Its 12 cases and two-model minimum are NOT the frozen canonical experiment and have NOT been integrated wholesale.
- Draft PR #1 remains open, draft and unmerged. Main unchanged. No release/deployment or model performance claim.

## First unmet work
Reconcile the recovered 12 synthetic scenarios against the canonical 16-case catalogue; record coverage gaps and explicit applicability. Use at least three distinct implementations including one local model, not the candidate's two-model minimum. Freeze model identities, settings, prompts, budgets, source snapshots, rubric, missing-data rules, review/blinding and cost collection before live comparison. Audit schedule completeness; the candidate harness currently cannot detect removal of a complete matched pair. Do not score this Morrow-personalized conversation as an uncontaminated baseline.

## Remaining gates
Normative owner/independent review; candidate corpus/protocol review and freeze; authorized model endpoints including local; actual collected responses; independent scoring/adjudication; matched positive/negative/inconclusive findings. No live model responses collected here. Licence scope, governance, authenticated consent and downstream erasure remain unresolved. Separate Phase 6 remains 19/20 unfrozen.

## Recovery
Read this proposal-branch checkpoint and the dedicated Notion Phase 3 page before repeating the older main handoff's completed preparatory tasks. Main handoff remains an earlier planning snapshot until separately reconciled. Next action is evaluation protocol reconciliation, not another Core restart.
