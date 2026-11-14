# Morrow Entity and Role Identifier Protocol v1 (proposed)

Established as a proposal on 2026-11-14. Not yet an active automated gate.

## Purpose and provenance

Reconcile the role identifier concept for people with the wider identifier, context and intent checkpoint. Preserve the principles in [Morrow Ethos](MORROW_ETHOS.md), [Relational Context Ruleset](RELATIONAL_CONTEXT_RULESET.md), [Context Bridge](../02-KNOWLEDGE/CONTEXT_BRIDGE.md), [Consistency Protocol](CONSISTENCY_PROTOCOL.md) and [Publication Privacy](PUBLICATION_PRIVACY.md). The original standalone person-role schema was not recovered from available prior conversations or Notion title search; this is a new proposed formalisation, not a reconstruction claimed to be exact. All examples are synthetic or public project identifiers.

## Conceptual records

| Record | Fields (minimum where relevant) |
|---|---|
| Entity | entity_id (stable, opaque for private persons); type; canonical label or approved display alias; classification; status; provenance |
| Role | role_id; role_type; definition; scope; classification |
| Assignment / relationship | assignment_id; subject_entity_id; role_id; related_entity_id if applicable; context_id; valid_from/to (unknown allowed); recorded_at; last_confirmed; source; confidence; status |
| Alias | alias_id; observed alias; candidate entity or role ID; scope; provenance; status and confidence; classification |
| Context | context_id; domain/project; relevant time; scope and access boundary; source references |
| Intent checkpoint | checkpoint_id; current request/reference; candidates and selected entity/assignment/context; action and target; authority/risk; resolution outcome; separate verification receipt |

An entity is not its name, role, or a historical interpretation. Multiple entities may share a label or role; a person can occupy several roles, and an assignment can change while the entity remains stable. A role type is distinct from a specific role assignment. Relationships are directional and time/context-scoped. Unknown dates or identities remain unknown; do not manufacture a link. A role-only reference may remain role-only if knowing the person is unnecessary or unjustified. Do not assume two people sharing a role are identical or one person with different roles is two individuals.

## Resolution sequence

AI model interprets language and proposes candidates. Morrow checks the current scope, existing registry, aliases, assignments, freshness, sources and explicit present intent. Resolve only as far as the requested task requires. Prefer current explicit correction over historical assumptions. On unresolved consequential ambiguity, ask one focused question; low-risk reversible work may proceed with a stated assumption. A match does not itself authorise action, access, or disclosure. Before writing, verify target and permission; after writing, independently verify outcome. Do not create a duplicate entity merely due to wording, a new role, or a transcription variant.

## Privacy

Private people use opaque IDs only where necessary and authorised; any identity mapping remains in access-controlled private storage, not a public repository, public corpus or exported checkpoint. Role-only labels are not necessarily anonymous; combinations of roles, relationships and dates may re-identify. Minimise details, scope retrieval to direct relevance, and apply publication review. No raw private messages, voice data, names or private mappings are included here. Pseudonymisation is not anonymisation; if a deterministic private mapping is required, use a separately protected key rather than an unsalted name hash. User corrections may update assignments or aliases without rewriting historical evidence.

## Synthetic acceptance fixtures (expected outcomes, not executed tests)

| Scenario | Expected outcome |
|---|---|
| A person is a manager in one context and colleague in another | One entity, two scoped assignments |
| A new person takes over the same manager role | New entity/assignment; close or supersede former assignment; retain history |
| Two managers share the same label | Resolve by context/date or clarify; never merge |
| A past role is mentioned in historical analysis | Resolve using event-time assignment, not present incumbent |
| User refers only to a role and no identity is needed | Retain role-only reference; avoid unnecessary identification |
| A person changes display name | Add confirmed scoped alias; preserve stable entity ID |
| Project Morrow is referenced through a phonetic variant | Resolve to Morrow in project context; unrelated proper names remain distinct |
| User explicitly changes current objective | Preserve historical intent but update current intent checkpoint |
| Public output requests a private identity mapping | Do not disclose; use permitted role-level context if safe |

## Implementation boundary

Reuse Context Bridge and Project Register; integrate with any original role-identifier implementation if recovered, with explicit migration and collision review. No parallel speech engine. Next: machine-readable schema, private/public registry boundaries, resolver, synthetic tests, CI pre-write/pre-merge guard, independent verification. No real person records created by this proposal.
