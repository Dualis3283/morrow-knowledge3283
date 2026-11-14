# Morrow communication alignment implementation — resume checkpoint

**Date:** 2026-11-14. **Status:** candidate implementation independently read back; pre-merge CI verified at the implementation commits; not active on main or in a live AI runtime. This is a public-safe GitHub working-state checkpoint, not a Notion task status or a user acceptance receipt.

## Context and decisions

A naming drift incident exposed identity fragmentation and the risk of treating transcription as intention. The user expanded the scope to dialect and culture, then specified that the AI model should handle language while Morrow checks identifiers, context, intent and authority. The user's support-case practice (acknowledge reported issue, clarify scope, distinguish a query from an action request) motivates respect, acknowledgement and consideration as practical grounding controls, not mandatory boilerplate. The objective is less total effort and correct forward momentum, not maximal confirmation.

## Verified implementation receipts

- Knowledge [PR #36](https://github.com/Dualis3283/morrow-knowledge3283/pull/36), implementation SHA [0b846be](https://github.com/Dualis3283/morrow-knowledge3283/commit/0b846be505789fa45a028b4cfa56ad92bac87c7b), readback of 12 changed files matched; [verify-layer](https://github.com/Dualis3283/morrow-knowledge3283/actions/runs/43654188759/job/132628990620) and [privacy](https://github.com/Dualis3283/morrow-knowledge3283/actions/runs/43654188795/job/132628990852) passed.
- Website [PR #58](https://github.com/Dualis3283/david-walsh-site/pull/58), SHA [8f6b6cc](https://github.com/Dualis3283/david-walsh-site/commit/8f6b6ccb2d5958fdd5593e2e2daf5e34b96ecaad), [Site QA](https://github.com/Dualis3283/david-walsh-site/actions/runs/43650820689/job/132618664460) and staging passed. Both PRs observed open, mergeable, not merged before this checkpoint. Recheck the actual new head and CI before merge; prior CI is not evidence for a later commit.
- Earlier identifier implementation: 21 resolver tests + 7 operational naming tests passed; both repositories' 11 changed files matched readback. Deliberate invalid operational workflow name failed the gate in a synthetic Git repository.
- Communication implementation: 23 alignment tests + 10 reference tests passed. Total 61 distinct new tests across those suites; not a model performance rate. Actual resolver integration smoke and archived Irish language / intent lookup passed. Gate emits execution candidates, never authority or execution verification.
- [Core protocol](../00-CORE/COMMUNICATION_ALIGNMENT_PROTOCOL.md), [entity/role protocol](../00-CORE/ENTITY_ROLE_IDENTIFIER_PROTOCOL.md), [Context Bridge](../02-KNOWLEDGE/CONTEXT_BRIDGE.md), [source registry](../06-SOURCES/linguistic-source-registry-v1.json), [incident record](../05-RESEARCH/CONTEXT_INTEGRITY_CHECKPOINT_2026-11-14.md).

## Archive receipts

Unpublished GitHub release, archive tag linguistic-reference-2026-11-14-v1 (authorised repository release lookup). Full files downloaded and inspected; uploaded asset metadata read back with matching SHA-256 and byte counts. Original transfer failure recovered by retry. Keep draft unpublished until licence/privacy review; no audio or private person records imported.

| Asset | Bytes | SHA-256 | Scope |
|---|---:|---|---|
| amazon-massive-dataset-1.1.tar.gz | 40251390 | 4cba5faa11c71437928e17cb1b9b3d8b8e727e7ea363a3a9a8045e19c0491577 | 859092 records / 52 locales |
| glottolog-5.4-languoid.csv.zip | 591763 | 74a6874c4945ca5f9ac2157bcd97d1adf142290e30cd7b854d212648458d15ee | 27275 languoids |
| massive-1.1-test-intent-sample.jsonl.gz | 85415 | 6c24c413dc3596d3f7311dfa4172cfd3454f44977161a923bfca988b7902eedf | 3068 derived test examples |

See [library and attribution](../06-SOURCES/LINGUISTIC_REFERENCE_LIBRARY.md). Restricted corpora are pointers only. Glottolog is not a pragmatics database; MASSIVE is not natural conversation or a culture corpus. Parallel translated utterances are not independent observations.

## Resume order

1. Reconcile latest PR heads, fresh CI, scope and merge authority; verify main after merge. Do not promote website or publish archive merely because staging/CI passes.
2. Reconcile candidate with existing Core/Bridge PR #1 and actual runtime; recover original role-identifier schema if available, preserve privacy and avoid duplicate registries. Trusted orchestrator must supply context, exact target, action authority, and prevent model proposals from bypassing execution checks.
3. Design controlled paired evaluation, same model/version/tools and task, baseline vs Morrow. Include clear/ambiguous, query vs action, contextual continuation, false matches, dialectal paraphrases, correction, role succession, costly and reversible work; independently label intended outcome, use synthetic or consented data, stratify and record paired denominators. MASSIVE subset measures candidate intent recognition only; separate conversational grounding and clarification cases required.
4. Measure first-pass intent accuracy, necessary/unnecessary clarification, wrong actions, user repetition, tokens/tool calls, time and total cost per correct outcome. Preserve failed/incomplete trials and missing measurements. No real comparative trial or cost-saving claim yet; existing Phase 6 19/20 baseline is distinct and unfrozen.
5. Review reference rights and prioritise genuinely open pragmatic/conversation resources; do not auto-ingest restricted corpora or use cultural evidence to infer an individual's identity or intention.

**Outstanding:** no main merge, live model or private-store integration, archive publication, actual comparative model evaluation, cost savings, or user acceptance established. Existing Notion operational authority unchanged; no Notion sync performed for this checkpoint. The next task is controlled evaluation planning plus integration/merge reconciliation, not downloading the same datasets again.
