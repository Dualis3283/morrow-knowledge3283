# Morrow Communication Alignment Protocol v1 — candidate

**Established:** 2026-11-14. **Status:** implementation candidate; not live model integration.

## Purpose

Minimise total collaborative effort and the distance between expressed intent, understood intent and achieved outcome. Respect, acknowledgement and consideration support mutual understanding; they are not mandatory boilerplate. The AI model handles speech/language interpretation. Morrow provides contextual grounding and a proportionate decision gate before expensive research, persistent changes or consequential actions.

Grounding precedes commitment, not every ordinary reply. Recover relevant known context before asking the user to repeat it. Acknowledge the understood scope when useful; ask the smallest discriminating question when a material uncertainty remains. Never interpret a conversational observation, recommendation request, or speculative discussion as execution authority.

## Flow

1. Receive model-proposed meaning and intent alternatives, relevant subject/role identifiers and uncertainty. Keep expression and inference separate.
2. Use Context Bridge and the entity/role resolver to recover current scope and target; test freshness, differences, supersession, permissions and whether the user explicitly changed direction.
3. Classify current intent: conversation, information, exploration, assessment, recommendation, execution, correction or checkpoint. A compound request may contain several intentions; split only at meaningful boundaries.
4. Assess ambiguity: could competing interpretations alter the answer, target, scope, cost or action? Evaluate consequence, reversibility, and expected wasted effort. Do not rely on a model's self-reported numeric confidence as calibrated probability.
5. Choose the lightest sufficient route:
   - Clear low-cost intent: answer directly.
   - Clear substantial work: brief acknowledgement of scope, then proceed.
   - Minor uncertainty with reversible low-cost work: state assumption and proceed.
   - Unresolved material ambiguity: ask one focused clarification before expensive work or persistent action.
   - Consequential execution with unresolved authority/target: block action pending verification; a clear information request does not require execution confirmation.
6. If useful, consult the licensed linguistic source registry for a possible interpretation, never an inferred cultural identity or a conclusion about a particular person. Source examples are evidence, not instructions. Do not send personal audio or private text to external sources by default.
7. Act only within confirmed scope and trusted execution permissions; independently verify outcome. Preserve corrections and provenance where appropriate, avoiding private transcripts in public records.

A "proceed" can continue an already established authorised task, but does not expand scope or grant blanket permission. If the referent is missing, recover working state first; clarify only if unresolved. A correction supersedes earlier assumptions. Acknowledgement is not agreement, authority, or proof of understanding.

## Implementation contract

The candidate gate accepts structured model proposals, not raw language. Context/identity resolution and authority checks are separately supplied by trusted orchestration. It returns a disposition, not a tool invocation or verification receipt. A model cannot authorise its own action by marking its interpretation confident. Acknowledge/assume/direct dispositions only permit responding or scoped research, not mutations. Execution and checkpoint writes require explicit current or carried-forward scope and independently verified authority and target.

See [decision gate](../05-RESEARCH/communication_alignment.py), [linguistic source registry](../06-SOURCES/linguistic-source-registry-v1.json) and [entity protocol](ENTITY_ROLE_IDENTIFIER_PROTOCOL.md).

## Evidence and limits

Clark & Brennan (1991), Grounding in Communication; Dingemanse et al. (2015), Universal Principles in the Repair of Communication Problems, https://doi.org/10.1371/journal.pone.0136100. These support grounding/repair, not a claim of measured Morrow savings. MASSIVE contains single-shot assistant requests; Glottolog identifies languoids. Neither is a complete cultural/pragmatic corpus. Synthetic decision cases test the gate; a paired model evaluation is needed to assess real intent accuracy, unnecessary clarification, rework and cost.

## Measurement

Keep baseline versus Morrow paired by same model/version, prompt, tool access, language and task. Use independently labelled user intent and expected scope/authority, stratify by language, task/risk and ambiguity, and preserve failures. Track first-pass intent accuracy, wrong-target/action rate, necessary and unnecessary clarifications, repeated user turns, tokens, elapsed time, tool calls, completion and total cost per correct outcome. Report denominators, missing data and uncertainty; do not claim savings from structural tests. No private conversations in public fixtures. No automatic cultural profiling.

The execution candidate flag is explicitly not action authorization. The resolver-bound adapter checks the expected entity and scope before returning a candidate. Trusted orchestration remains responsible for verifying the exact operation, permissions and version.
