"""Deterministic candidate-reference resolver; no speech engine or action authority."""
from __future__ import annotations
import json
import re
import sys
import unicodedata
from datetime import date
from pathlib import Path

VERSION = "morrow-entity-registry-1"
ID = re.compile(r"[a-z0-9][a-z0-9-]*\Z")
CLASSES = {"public", "private"}
TYPES = {"person", "project", "component", "task", "artifact", "decision", "methodology", "card", "organisation"}

def norm(value):
    return " ".join(unicodedata.normalize("NFKC", value).casefold().split())

def parse_date(value):
    if value is None:
        return None
    if not isinstance(value, str) or not re.fullmatch(r"\d{4}-\d{2}-\d{2}", value):
        raise ValueError("date must be YYYY-MM-DD")
    return date.fromisoformat(value)

def validate_registry(reg):
    if not isinstance(reg, dict) or reg.get("schema_version") != VERSION:
        raise ValueError("unsupported registry schema")
    if reg.get("visibility") not in CLASSES:
        raise ValueError("invalid registry visibility")
    indexes = {}
    for key in ("contexts", "entities", "roles", "assignments"):
        rows = reg.get(key)
        if not isinstance(rows, list):
            raise ValueError(f"{key}: expected list")
        index = {}
        for row in rows:
            if not isinstance(row, dict) or not isinstance(row.get("id"), str) or not ID.fullmatch(row["id"]):
                raise ValueError(f"{key}: invalid ID")
            if row["id"] in index:
                raise ValueError(f"{key}: duplicate ID")
            index[row["id"]] = row
        indexes[key] = index
    contexts, entities, roles, assignments = (indexes[k] for k in ("contexts", "entities", "roles", "assignments"))
    def nonempty(row, field):
        if not isinstance(row.get(field), str) or not row[field].strip():
            raise ValueError(f"missing {field}")
    def classified(row):
        if row.get("classification") not in CLASSES:
            raise ValueError("invalid classification")
        if reg["visibility"] == "public" and row["classification"] != "public":
            raise ValueError("private record in public registry")
    def scopes(row):
        values = row.get("scopes")
        if not isinstance(values, list) or not values or any(s not in contexts for s in values):
            raise ValueError("invalid scope")
    for row in contexts.values():
        nonempty(row, "label")
    for row in list(entities.values()) + list(roles.values()):
        nonempty(row, "label")
        nonempty(row, "source")
        classified(row)
        scopes(row)
    for row in entities.values():
        if row.get("type") not in TYPES:
            raise ValueError("invalid entity type")
        if row["type"] == "person" and reg["visibility"] == "public":
            raise ValueError("person mappings not allowed in public registry v1")
    for row in assignments.values():
        classified(row)
        nonempty(row, "source")
        if row.get("entity_id") not in entities or row.get("role_id") not in roles or row.get("scope") not in contexts:
            raise ValueError("dangling assignment")
        if row["scope"] not in entities[row["entity_id"]]["scopes"] or row["scope"] not in roles[row["role_id"]]["scopes"]:
            raise ValueError("assignment outside entity or role scope")
        related = row.get("related_entity_id")
        if related is not None and (related not in entities or row["scope"] not in entities[related]["scopes"]):
            raise ValueError("dangling/out-of-scope related entity")
        start, end = parse_date(row.get("valid_from")), parse_date(row.get("valid_to"))
        if start and end and start >= end:
            raise ValueError("invalid assignment interval")
        if row.get("status") not in {"confirmed", "provisional", "superseded"}:
            raise ValueError("invalid assignment status")
        if row["classification"] == "public" and any(x["classification"] == "private" for x in
            [entities[row["entity_id"]], roles[row["role_id"]]] + ([entities[related]] if related else [])):
            raise ValueError("public assignment links private entity")
    aliases = reg.get("aliases")
    if not isinstance(aliases, list):
        raise ValueError("aliases: expected list")
    for row in aliases:
        nonempty(row, "label")
        nonempty(row, "source")
        scopes(row)
        if row.get("kind") not in {"entity", "role"}:
            raise ValueError("invalid alias kind")
        target = (entities if row["kind"] == "entity" else roles).get(row.get("target"))
        if target is None or not set(row["scopes"]) <= set(target["scopes"]):
            raise ValueError("dangling/out-of-scope alias")
        if row.get("status") not in {"confirmed", "provisional", "superseded"}:
            raise ValueError("invalid alias status")
    return indexes

def resolve(reg, reference, *, scope, as_of=None, identity_required=True, private_access=False,
            related_entity_id=None, kind=None):
    """Resolve a supplied candidate mention, not unrestricted natural language.
    private_access must come from trusted application policy, never a model/request.
    No matching data is returned when a private registry is not authorised.
    """
    if isinstance(reg, dict) and reg.get("visibility") == "private" and private_access is not True:
        return {"outcome": "not_available", "candidates": []}
    ix = validate_registry(reg)
    if not isinstance(reference, str) or not reference.strip() or scope not in ix["contexts"]:
        return {"outcome": "clarification_required", "candidates": []}
    when = parse_date(as_of)
    if kind not in {None, "entity", "role"}:
        raise ValueError("invalid reference kind")
    def permitted(row):
        return row["classification"] == "public" or private_access is True
    entities, roles = ix["entities"], ix["roles"]
    needle = norm(reference)
    candidates = set()
    provisional = set()
    for k, rows in (("entity", entities), ("role", roles)):
        if kind is not None and k != kind:
            continue
        for key, row in rows.items():
            if permitted(row) and scope in row["scopes"] and needle in {norm(key), norm(row["label"])}:
                candidates.add((k, key))
    for row in reg["aliases"]:
        k, key = row["kind"], row["target"]
        target = (entities if k == "entity" else roles)[key]
        if (kind is None or k == kind) and permitted(target) and scope in row["scopes"] and needle == norm(row["label"]):
            if row["status"] == "confirmed":
                candidates.add((k, key))
            elif row["status"] == "provisional":
                provisional.add((k, key))
    all_candidates = candidates | provisional
    def choices(pairs):
        return [{"kind": k, "id": i} for k, i in sorted(pairs)]
    if len(candidates) != 1 or provisional - candidates:
        return {"outcome": "clarification_required" if all_candidates else "unresolved",
                "candidates": choices(all_candidates)}
    k, key = next(iter(candidates))
    if k == "entity":
        return {"outcome": "accepted", "scope": scope, "entity_id": key, "canonical_label": entities[key]["label"]}
    if not identity_required:
        return {"outcome": "role_only", "role_id": key}
    if when is None:
        return {"outcome": "clarification_required", "role_id": key, "candidates": []}
    matches, uncertain = [], []
    for row in ix["assignments"].values():
        if row["role_id"] != key or row["scope"] != scope or not permitted(row):
            continue
        entity = entities[row["entity_id"]]
        if (not permitted(entity) or (row.get("related_entity_id") is not None and not permitted(entities[row["related_entity_id"]]))
                or (related_entity_id is not None and row.get("related_entity_id") != related_entity_id)):
            continue
        start, end = parse_date(row.get("valid_from")), parse_date(row.get("valid_to"))
        if (start is not None and when < start) or (end is not None and when >= end):
            continue
        if row["status"] == "superseded":
            # Superseded records with bounded validity are historical evidence.
            if start is None or end is None:
                continue
        if start is None or row["status"] == "provisional":
            uncertain.append(row)
        else:
            matches.append(row)
    if len(matches) != 1 or uncertain:
        return {"outcome": "clarification_required" if matches or uncertain else "unresolved",
                "role_id": key, "candidates": sorted({r["entity_id"] for r in matches + uncertain})}
    row = matches[0]
    return {"outcome": "accepted", "scope": scope, "role_id": key, "assignment_id": row["id"],
            "entity_id": row["entity_id"], "canonical_label": entities[row["entity_id"]]["label"]}

def intent_checkpoint(resolution, *, scope, action, target_id, authority_verified=False):
    """Structural pre-write decision. Authority must be verified by trusted caller.
    Never returns an execution/verification receipt or grants access itself.
    """
    accepted = resolution.get("outcome") == "accepted"
    target_matches = (accepted and bool(target_id) and resolution.get("entity_id") == target_id
                      and resolution.get("scope") == scope)
    complete = isinstance(scope, str) and bool(scope.strip()) and isinstance(action, str) and bool(action.strip())
    ready = bool(target_matches and complete and authority_verified is True)
    return {"scope": scope, "action": action, "target_id": target_id,
            "resolution": resolution.get("outcome"), "decision": "candidate_ready" if ready else "blocked",
            "execution_verified": False}

def main():
    if len(sys.argv) != 2:
        raise SystemExit("usage: entity_role_resolver.py REGISTRY.json")
    validate_registry(json.loads(Path(sys.argv[1]).read_text(encoding="utf-8")))
    print("Entity registry structural validation passed (not a runtime or authority receipt)")

if __name__ == "__main__":
    main()
