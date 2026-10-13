# Morrow review — 13 October 2026

## Finding and coverage

Morrow has developed from conversational continuity into a documented working method, then into a versioned publishing process and a context-aware collaboration model. Its strongest demonstrated result is a traceable collection of artifacts and corrections. Repeated failures show that recording a lesson does not ensure the next task applies it.

This review preceded implementation. It used retrieved dated conversation excerpts and summaries, the complete 18 August Continuity Master, the 23 September website archive, the 24 September Notion Master Backup, current Notion project/decision/framework/working-state records, and the website and knowledge repositories. Retrieval covered writing, music, creative production, BG3, MTG, website development and Morrow methodology. These sources are uneven: some are direct user corrections, some curated summaries, and some versioned outputs. They are not an exhaustive raw export of every chat. Missing conversations must remain a coverage limitation; inferred causes are not facts.

Private biographical source material is excluded from this publication. The public timeline deliberately illustrates methods and artifacts rather than exposing personal context.

## How conversations changed the method

| Period | Observed development | Consequence for implementation |
| --- | --- | --- |
| June–August | Writing, creative direction and project work supplied rich context. August feedback challenged repetitive, difficult-to-digest responses. The continuity master preserved selected decisions rather than every message. | Preserve original creative language; distinguish source from summary; reduce introductions that restate the same point. |
| August | Cross-project corrections exposed missing constraints and reopened decisions that had already been settled. | Retrieve the current rules and approved baseline before proposing changes. Label an alternative as exploratory. |
| September | Morrow became an explicit collaborative identity; archive and pipeline recovery connected evidence, interpretation and creation. Feedback asked for a more balanced independent voice rather than excessive attention to flaws. | Retain reasons, rejected options and approvals. AI can question and propose; human intention and judgement govern the work. |
| 23–30 September | Website and print work exposed wrong surfaces, layered fixes and a gap between an approved design and a verified artifact. | Scope each edit to the actual source. Inspect the final medium. Separate prepared, deployed and verified. |
| 1 October | Versioned source and deployment gates made the site reproducible. Qualitative reports described easier continuity and less repetition. | Treat those reports as experience evidence, not causal measurement. Check the page visitors receive after release. |
| 2 October | Context Bridge work rejected fixed identity assumptions and distinguished related contexts from equivalent ones. | Check freshness, relevance and meaningful differences; present choices without silently deciding from history. |
| 11–12 October | Editorial and visual navigation improved sequence, while later photographs exposed clipped words and cramped controls. | Test component contents and expanded states, not only page width or HTTP status. |
| 13 October | This review connects the website’s evolution to recurring failure controls. | Clean superseded implementation; offer a quiet, optional history; carry the procedure into review and release. |

The change in writing is not simply shorter text. The progression is toward one useful claim per passage, visible evidence, reasons for a decision, and detail available when requested. A summary that removes meaningful intention is still a failure even when concise. Music and writing should carry their own meaning; the interface should help a visitor find relationships without inventing them from titles or treating every work as an explanation of Morrow.

## Recurring failure register

The following recurrence classes are an interpretation of the reviewed cases. They do not establish a complete frequency count or prove a single cause.

| Class | Recurring evidence | Preventive control | Owner / next trigger |
| --- | --- | --- | --- |
| Stale or incomplete context | Missed project-specific constraints; older current-state notes conflicting with newer decisions | Read dated authoritative sources; state version and unresolved gap; compare current instruction with prior preference | Implementer / each resumed task |
| Approved-baseline drift | Reopening settled choices; changing creative layers after approval | Mark baseline versus exploration; diff every intended change against that baseline | Implementer and owner / any revision of approved work |
| Scope drift | Wrong route or component edited; adjacent professional/planner scope confused | Record affected route/component and concrete acceptance example in the PR | Implementer / before edits and during diff review |
| Patch accumulation | Successive style and runtime layers; duplicate layout definitions | Search all references, remove superseded implementation and inspect dependent pages | Implementer / every shared asset change |
| Premature completion | Deployment acceptance treated as user-visible success; screen fitting while words clip | Gated source checks plus rendered component checks, then independent public readback | Release operator / each release |
| Meaning lost in communication | Repetitive introductions; over-summary; inference from titles instead of source work | One purpose per passage; consult original material; retain uncertainty and authorial wording | Editor / copy or narrative revision |
| Documentation without enforcement | Previously recorded lessons recurring in later work | On second occurrence classify the failed control as absent, skipped, broad, stale or ineffective; change it and record a check | Reviewer / recurrence before closure |

## What this implementation changes

- Removes unreferenced selectors from shared/site project styles, six identical duplicate project rules, inactive reveal observation and the unused lightbox handler. Active legacy assets remain where pages still use them.
- Moves Morrow page styling out of its HTML. Replaces the duplicated scripted method index with eight native disclosures that carry both label and explanation.
- Adds one closed-by-default six-stage website history: before, change, lesson and evidence. A numbered path and consistent typography guide the eye; details stay optional.
- Uses `history.json` as the source for the HTML timeline and Markdown export. `scripts/build-morrow-history.py --check` blocks divergent copies in Site QA.
- Provides a portable release-review template and optional visitor-started browser reading of the same text. Audio availability depends on the browser; text and downloads remain available.
- Adds browser layout checks and retained screenshots to Site QA: phone/laptop widths, heading/label clipping, keyboard expansion, six visible history stages and no-script disclosure. The checks cover representative pages sharing changed assets.
- Adds a PR template requiring scope, prior failure, evidence, unchecked conditions, rollback and current-state follow-through. Public Markdown is now included in the privacy scan.

## Evidence limits and next review

Local source/regression, static, accessibility sanity, metadata, secret and privacy checks passed during preparation. Browser downloads in this workspace failed, but Chromium CI on commit 86959b5 passed phone/laptop component, keyboard and no-script checks and saved 16 screenshots. The first check incorrectly included intentionally collapsed waveform content; it was corrected to test keyboard expansion. Cloudflare staging deployed successfully but its Access sign-in prevented direct staging readback. The saved commit-specific screenshots were inspected instead; that review also prompted a shorter Morrow header navigation. A deliberate export-drift probe was rejected as expected. Production readback is recorded separately after promotion.

The workflow sample remains 19/20, definitions remain unfrozen, and the chronology/denominator gap remains unresolved. No improvement percentage or causal AI-training claim is made. The site demonstrates a process and its artifacts; it does not prove that model weights were trained or that recurrence has ended.

At the next relevant correction, record which control should have caught it, whether it ran, and whether its acceptance example was adequate. Compare eligible tasks with stable definitions before reporting improvement. The owner’s judgement of meaning and actual-device reading experience remains distinct from automated checks.

## Verified release — 13 October 2026

Website source: `1b8a3c8f204540e0dbd440ff610c0ba8c9be2674`, merged through PR #9. Production deployment: `14e1b1c2-d909-4d2f-952f-70db0b5cea56`. Site QA, production health and fast-forward promotion succeeded. Chromium CI exercised eight representative routes at 390px and 1440px and retained 16 screenshots; history keyboard/no-script checks passed. The final shortened header passed another complete CI run. Live canonical browser readback confirmed the new page, five-item navigation and six-stage keyboard-operated history.

The staging deployment was successful but protected by Cloudflare Access. Pre-release visual inspection used the exact commit’s CI screenshots. Direct HTTP readback from the workspace returned 403; independent canonical browser readback succeeded. Optional narration reported the expected unavailable-voice fallback in this browser; audible narration is not verified here. Actual-device owner review and enlarged-text testing are not claimed.

Evidence: [PR #9](https://github.com/Dualis3283/david-walsh-site/pull/9), [final PR QA](https://github.com/Dualis3283/david-walsh-site/actions/runs/38429038217), [main QA](https://github.com/Dualis3283/david-walsh-site/actions/runs/38429252258), [live history](https://david-walsh.pages.dev/projects/morrow/#history). Recovery source before this change: `ea3a3fc8eda6e0f0e3c0ae848fd27c42b9f502fd` (use a reviewed revert through the gate).

## Supporting public records

- [Historical baseline](https://github.com/Dualis3283/morrow-knowledge3283/blob/c97aa82fc8f2113fc33b1af5bd081a95c882e7c7/07-ARCHIVE/HISTORICAL_BASELINE.md)
- [Workflow evidence](https://github.com/Dualis3283/morrow-knowledge3283/blob/22ceb14febc0081f0842d6bda9bb7907c1f211e3/05-RESEARCH/WORKFLOW_LOG.md)
- [Context Bridge](https://github.com/Dualis3283/morrow-knowledge3283/blob/c97aa82fc8f2113fc33b1af5bd081a95c882e7c7/02-KNOWLEDGE/CONTEXT_BRIDGE.md)
- [Photograph-led layout correction](https://github.com/Dualis3283/morrow-knowledge3283/blob/c97aa82fc8f2113fc33b1af5bd081a95c882e7c7/07-ARCHIVE/WEBSITE_LAYOUT_PHOTO_CHECKPOINT_2026-10-12.md)
