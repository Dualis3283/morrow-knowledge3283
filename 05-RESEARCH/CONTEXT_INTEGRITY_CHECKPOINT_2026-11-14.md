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
