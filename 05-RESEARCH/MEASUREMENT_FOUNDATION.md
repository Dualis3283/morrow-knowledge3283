# Project Morrow Measurement Foundation

## Purpose

Measure whether Morrow improves **observable workflow outcomes** rather than manufacturing an abstract AI accuracy score.

Foundation question:

**Is Morrow reducing avoidable rework, catching failures earlier, preserving context more reliably, and verifying actions more consistently over time?**

## Historical periods

- **H0 — Pre-Morrow:** 29 Jun–22 Sep 2026
- **Transition:** 23–24 Sep 2026
- **M0 — early Morrow:** 25–30 Sep 2026

Historical observation suggests a shift from:

**mistake → correction → continue**

toward:

**mistake → cause → correction → verification → persistent lesson → changed procedure**

This is a hypothesis to measure, not a published performance claim.

## Foundation sample

Collect the next **20 eligible substantive workflows**.

A workflow is eligible when it includes at least one of:
- prior-state retrieval;
- external research/source validation;
- connector/tool execution;
- artifact creation/modification;
- deployment/publishing;
- a multi-evidence decision.

Do not count greetings, simple factual questions, lightweight rewriting, or purely conversational turns.

## Six core metrics

1. **Material rework rate**
   - workflows needing material correction after being presented as complete / completed eligible workflows.

2. **Pre-release defect catch rate**
   - defects caught before final release / all defects discovered in the window.

3. **Continuity retrieval success**
   - successful prior-state retrievals without user repetition / workflows requiring prior-state retrieval.

4. **Verification coverage**
   - independently verified eligible writes/actions / total eligible writes/actions.

5. **Evidence traceability coverage**
   - traceable evidence-dependent conclusions / eligible conclusions.

6. **Repeated-context burden**
   - count how often the user must re-explain a settled fact/constraint that should have been recoverable.

## Required log fields

- date;
- workflow/project;
- task type;
- prior context required? Y/N;
- context retrieved successfully? Y/N;
- user repetition required? Y/N;
- evidence validation required? Y/N;
- source count/type where relevant;
- external write/action? Y/N;
- independent verification? Y/N;
- defect found? Y/N;
- caught before final release? Y/N;
- post-release defect? Y/N;
- material rework? Y/N;
- root cause;
- lesson/new guardrail.

## Root-cause categories

- context retrieval failure;
- unsupported assumption;
- source/evidence failure;
- tool/connector failure;
- asset/version mismatch;
- implementation error;
- output/rendering defect;
- verification gap;
- requirement misunderstanding;
- external-system behaviour;
- other — explain.

## Measurement rules

- no invented accuracy score;
- count observable events only;
- preserve failed attempts;
- distinguish pre-release from post-release defects;
- tool acceptance is not independent verification;
- user preference changes are not rework unless original requirement was explicit;
- failing to recover a recorded constraint can count as rework;
- freeze definitions before comparing periods;
- keep numerator and denominator for every published percentage;
- label small samples.

## Completion criteria

Foundation is complete when:
- 20 eligible workflows are logged;
- all six metrics can be calculated;
- ambiguous definitions are resolved;
- Metric Definition v1 is frozen;
- baseline is archived;
- a later comparison window can use the same definitions.


## Qualitative evidence stream

The six core metrics capture observable workflow events, but they do not fully represent the human cost of continuity failure.

Public-safe user-reported observations are therefore recorded separately in:

`05-RESEARCH/QUALITATIVE_FINDINGS.md`

Rules:
- qualitative findings do **not** increment the 20-workflow foundation sample;
- they do not change the six core metric definitions mid-window;
- they must separate report, interpretation and confounders;
- they may inform Metric Definition v1 only after the 20-workflow baseline is complete.
