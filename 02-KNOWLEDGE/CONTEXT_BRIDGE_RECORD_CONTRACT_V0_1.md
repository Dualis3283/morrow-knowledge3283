# Morrow Context Bridge — Candidate Record Contract v0.1

**Status:** Prototype, 14 October 2026. Not ratified; no vendor certification.

## Components
- [Bridge JSON Schema](bridge-record-v0.1.schema.json) uses JSON Schema 2020-12.
- [Reference validator](../morrow_bridge/validate.py) validates schema and selected semantic conditions.
- [Synthetic examples](../morrow_bridge/examples/) and [14 automated unit tests](../tests/test_morrow_bridge.py) cover expected and rejected states.
- Existing [Context Bridge & Relevance Engine](CONTEXT_BRIDGE.md) remains authoritative for relevance, freshness and transfer of lessons.

## Contract and limits
The `0.1` envelope captures record kind, authority, provenance, scope, status, supersession, action state and verification. A historical record is not automatically a current instruction. Provenance metadata is not source authentication. A parsed record is not evidence that an AI understands or follows Morrow.

`privacy` defines self-declared sensitivity, share preferences, retention and deletion requests. These declarations **cannot grant themselves authorization**: every export still needs an independently established host-side permission. The sample `can_export` method is a fail-closed veto predicate, not a complete access-control, encryption, recipient-authentication or transfer implementation.

Tombstones may identify a deleted record without carrying its prior text, but do not prove erasure from backups, remote services or logs. Do not retain even a tombstone where its identifier must not be kept. No propagation of consent withdrawal or remote deletion exists in this prototype.

## Reproduction
With Python and `jsonschema==4.26.0`, run `python -m unittest discover -s tests -v` from the repository root. The code and all five source artifacts were independently fetched from the GitHub proposal branch and **14/14 synthetic tests passed** in the separate execution sandbox. This proves only the tested validator behavior.

## Open gates
Core v1 normative review and approval; legal/licensing scope (repository has GPL-3.0); real cross-provider authorization and deletion semantics; source trust/signatures; migrations; executable task-level model comparisons and independent privacy review. Phase 6 measurement stays at 19/20, unfrozen.

**Related standards:** [JSON Schema](https://json-schema.org/specification) and [W3C PROV-O](https://www.w3.org/TR/prov-o/) (conceptual reference; not claiming PROV-O serialization).
