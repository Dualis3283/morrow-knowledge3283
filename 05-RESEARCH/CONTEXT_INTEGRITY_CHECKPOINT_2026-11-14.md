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

## Addendum — identifier, context and intent checkpoint

User direction: leave verbal communication and language interpretation to the AI model; use the Morrow methodology to checkpoint identifiers, context and intent, extending the existing role-identifier approach rather than duplicating speech recognition.

Architecture: model produces candidate interpretation; Morrow resolves references against authorised existing records, tests context and current intent, assesses uncertainty and consequence, and verifies the action target before persistent changes. A model interpretation is evidence, not authority. This is a proposed extension of the Entity Continuity Gate and Context Bridge, not an independent language engine.

Existing foundations reviewed: [Relational Context Ruleset](../00-CORE/RELATIONAL_CONTEXT_RULESET.md) (roles are distinct from people; historical context informs but does not define), [Context Bridge](../02-KNOWLEDGE/CONTEXT_BRIDGE.md) (retrieval versus judgement, scope, freshness, difference checks), [Project Register](../01-PROJECTS/PROJECT_REGISTER.md) (canonical project records), and [Consistency Protocol](../00-CORE/CONSISTENCY_PROTOCOL.md) (risk-proportionate verification). Exact person-role identifier schema has not been recovered; integrate with it when verified rather than invent a replacement or conflate person identity with role.

Proposed checkpoint fields: checkpoint_id; observed reference (minimal/authorised); candidate entity IDs and type; resolved entity ID; canonical label; role or relationship (separate and time-scoped); context scope; requested intent/action; target record/version/repository; source pointers and last confirmed date; confidence and unresolved ambiguity; authority/permission and risk; resolution outcome (accepted, downgraded, rejected, clarification required); action and verification receipts. Fields are conceptual, not a mandatory form for every conversational turn.

Example: the model receives a phonetic variant of Morrow in a request to apply the method. The gate matches the existing Morrow entity, checks active task and requested operation, and records canonical references. In a Magic card context, the same string may refer to a different entity; do not merge by spelling alone. A role label such as manager refers to a relationship scoped to time and context, not a fixed person. The entity can remain stable while role, context and intent change.

Acceptance criteria: equivalent intent expressed in different ways resolves to the same target; distinct entities with similar names do not merge; a changed role or explicit current correction supersedes historical assumptions; ambiguous consequential requests are clarified; simple low-risk conversation stays lightweight; persistent actions have verified target and separate outcome receipts. No voice recording or cultural profiling is required.

Status: requirement recorded; integration with actual role identifier schema, machine-readable registry, checkpoint validation and regression tests pending. Do not claim speech recognition improvement or verified understanding solely from structural validation.

## Role identifier reconciliation

Recovered the established role/identity principles in Morrow Ethos and Relational Context Ruleset; Context Bridge supplies contextual metadata; Publication Privacy governs access. Prior conversation search and Notion title searches did not recover an exact standalone person-role schema. The [Entity and Role Identifier Protocol](../00-CORE/ENTITY_ROLE_IDENTIFIER_PROTOCOL.md) formalises a proposed compatible structure: separate entity, role type, contextual assignment/relationship, alias, context and current intent; stable entity ID with time-scoped assignments; role-only references when identity unnecessary; explicit privacy boundaries. No private person mapping was created. Synthetic expected outcomes are specified but not executed. Existing role schema integration remains subject to recovery; automated implementation is pending.

## Implementation candidate

Public project registry, deterministic scoped resolver, role assignment fixtures and pre-write intent validation added. Operational naming lint checks repository-owned machine identifiers; historical prose and card datasets are outside its scope. Regression tests are integrated with the existing Morrow gate. No real private person mappings or runtime connector authority have been added. Production model integration, actual role schema recovery, private store/access policy, broad alias expansion and merge verification remain pending.

## Communication alignment candidate

Downloaded Glottolog 5.4 and MASSIVE 1.1, inspected actual archive counts, derived a compact 52-locale test sample, and stored three assets in an unpublished reference archive. Source registry records licences and restricted sources as links only. Added candidate protocol, deterministic structured decision gate and source selector with tests. Runtime integration and paired model measurement remain pending.
