# Morrow context integrity checkpoint — 2026-11-14

Status: root-cause hypothesis recorded; preventive protocol proposed in PR #36; automated gate not yet active.

## Incident and evidence

The user identified incorrect project-name variants in repository notes and workflows. The canonical name is Morrow (M-O-R-R-O-W). The preceding reconciliation found operational retention references, including workflow, checkpoint, script and test names. GitHub readback on 2026-11-14 confirms the correction PRs are open, not merged: [knowledge #36](https://github.com/Dualis3283/morrow-knowledge3283/pull/36), [website #58](https://github.com/Dualis3283/david-walsh-site/pull/58). The PR descriptions report a 412-file tracked-text audit, five passing retention tests and preserved evidence ledger hash; this checkpoint does not independently re-run those tests.

## Root cause and consequence

Confirmed failure: a known entity acquired inconsistent persistent identifiers, and the error reached operational files before user detection. Leading hypothesis: phonetic transcription was accepted without resolving it against the established project identity. The original introduction and transcription mechanism are unverified. A second contributing control gap is absence of a demonstrated entity-consistency gate at the write boundary. Successful syntax or functional tests do not establish semantic identity consistency.

Risks: fragmented search and recall, duplicate task creation, missed dependencies, misrouted workflow references, broken paths/imports and misleading checkpoint status. No actual lost record or missed workflow has been established.

## Preventive protocol

1. Resolve identity before action: consult the core canonical naming rule, project register and current working state before writing identifiers or creating records. Treat phonetic variants as candidate aliases, not new entities. Normalize only when context is decisive; ask or mark unresolved if materially ambiguous.
2. Use stable identity separate from display label: proposed entity ID `morrow`; retain original input in provenance when necessary. Alias lookup should resolve to this ID. Do not globally replace unrelated terms (e.g. Magic card proper names), source quotations, historical run identifiers or hashes.
3. Pre-write and pre-merge checks: search changed file contents, filenames, workflow keys, links, imports, task identifiers and relevant cross-repository references; check renames and resolve aliases. A future deterministic CI check should reject unapproved project-context variants, with narrowly scoped explicit exceptions. A scanner must not reject the incident record itself or genuine unrelated names.
4. Verify after write: independently read back destination and check references, tests, CI, branch/merge state and, if applicable, deployment. Distinguish planned, attempted, accepted, active, independently verified, and user confirmed.
5. Capture failure patterns: classify this as entity/identity drift, link to correction PRs, and test the same rule on other project names, dates, versions and task IDs. Check actual evidence before claiming loss or success.

## Acceptance criteria / next steps

- A canonical entity registry or explicit existing registry entry and alias resolver are established; retrieval tests demonstrate variant and canonical queries resolve to the same entity.
- Regression fixtures cover canonical project references, incorrect project-context variants, unrelated proper names, quoted provenance, and path/import renames.
- CI blocks a deliberately introduced incorrect operational name and accepts valid exceptions; both active repositories adopt or share the rule.
- Correction PRs merged only after applicable checks pass; verify main and search/readback, then mark active/verified. Do not rewrite immutable history.
- Reconcile prior relevant tasks if alias searching reveals missed records. No automatic blanket replacement or destructive cleanup.

Owner: Morrow project workflow; user remains authority for entity naming. Future implementation is tracked as pending, not completed.

## Addendum — cultural, dialect and individual communication context (2026-11-14)

User clarification: cultural and dialect differences may contribute to misinterpretation and should be considered in continuity design. The system, not the speaker, must reconcile intent with established context. No particular accent, cultural identity, or causal speech-recognition defect is established by this incident; original audio and transcription evidence are unavailable.

Distinguish expression (accent, dialect, idiom, personal shorthand), representation (speech-to-text or typed input), and meaning (current intent and established context). Treat a transcript as evidence, not definitive intent. Use user-confirmed aliases and demonstrated communication patterns; do not infer ethnicity, nationality, dialect or personal traits from location or impose stereotypes. Preserve dialect and wording where they are intentional, especially in quotations and creative work. Normalize operational identifiers only when context supports the mapping. If ambiguity materially affects a consequential action, ask a focused clarification rather than guessing. For low-risk, reversible work, proceed with an explicit assumption if needed.

Extend the proposed Entity Continuity Gate with these acceptance criteria:

- Test phonetic and orthographic variations, dialectal paraphrases, idioms, shorthand and ambiguous homonyms against the same canonical task or project identity; include legitimate unrelated names and intentionally new entities as negative controls.
- Measure correct resolution, false merges, missed matches and clarification rate; evaluate whether equivalent intent yields equivalent action across expression variants. Use user-approved examples or synthetic examples; do not collect voice recordings or sensitive cultural profiles by default.
- Keep observed expression separate from resolved identity and confidence. Store only necessary, approved alias/provenance data; do not silently convert hypotheses into facts or allow old preferences to override a current explicit correction.
- Verify interpretation at the pre-write boundary and report the outcome separately from transcription quality. User corrections take precedence and become reviewed regression examples.

Status: documented requirement; implementation and validation pending. This is a general communication-context safeguard, not an assertion that the user's dialect caused the incident.
