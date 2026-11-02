"""MORROW-WF-001 candidate: deterministic inventory and evidence-coverage gates.

This is a provenance/coverage validator, NOT a rules interpreter or a guarantee
that supplied rules data are true. No network, third-party dependencies or PII.
"""
from __future__ import annotations

import argparse
import csv
from datetime import datetime
import hashlib
import json
from pathlib import Path
import re
from typing import Any

SCHEMA = "morrow-collection-audit-candidate-0.1"
HASH = re.compile(r"^[0-9a-f]{64}$")
STATES = {"NOT_CHECKED", "RULES_VERIFIED", "CONFLICTED", "BLOCKED_RATE_LIMIT"}


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def observed_at(value: Any) -> bool:
    if not isinstance(value, str):
        return False
    try:
        dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
        return dt.utcoffset() is not None
    except (ValueError, TypeError):
        return False


def inventory_csv(path: str | Path) -> dict[str, Any]:
    """Read CSV strictly, retaining exact names and source digest.

    Import errors are reported, never silently filtered. Does not resolve
    alternate names, split faces or Oracle IDs; that requires a domain adapter.
    """
    data = Path(path).read_bytes()
    errors: list[str] = []
    try:
        content = data.decode("utf-8-sig")
        rdr = csv.DictReader(content.splitlines())
        if not rdr.fieldnames or "Name" not in rdr.fieldnames or "Quantity" not in rdr.fieldnames:
            raise ValueError("CSV requires Name and Quantity columns")
        counts: dict[str, int] = {}
        rows = 0
        copies = 0
        for row in rdr:
            rows += 1
            name = (row.get("Name") or "").strip()
            raw_qty = (row.get("Quantity") or "").strip()
            if not name:
                errors.append(f"row {rows}: missing name")
                continue
            try:
                quantity = int(raw_qty)
                if quantity < 1:
                    raise ValueError
            except ValueError:
                errors.append(f"row {rows}: invalid quantity")
                continue
            # Case-sensitive exact-name aggregation; this is not canonicalisation.
            counts[name] = counts.get(name, 0) + quantity
            copies += quantity
        return {"source_sha256": sha256(data), "rows": rows, "copies": copies,
                "unique_names": len(counts), "names": counts,
                "errors": errors, "inventory_complete": not errors}
    except (UnicodeError, csv.Error, ValueError) as exc:
        return {"source_sha256": sha256(data), "rows": 0, "copies": 0,
                "unique_names": 0, "names": {}, "errors": [str(exc)],
                "inventory_complete": False}


def parse_deck(text: str) -> dict[str, Any]:
    """Parse list sections and quantities; do not infer ownership from absence."""
    entries: dict[str, int] = {}
    errors: list[str] = []
    for n, line in enumerate(text.splitlines(), 1):
        line = line.strip()
        if not line or (line.startswith("[") and line.endswith("]")):
            continue
        m = re.fullmatch(r"(\d+)\s+(.+)", line)
        if not m or int(m.group(1)) < 1:
            errors.append(f"line {n}: malformed deck row")
            continue
        name = m.group(2).strip()
        entries[name] = entries.get(name, 0) + int(m.group(1))
    return {"entries": entries, "cards": sum(entries.values()), "errors": errors}


def check_rules_snapshot(name: str, receipt: dict[str, Any]) -> list[str]:
    """Checks the reproducibility of a receipt, not independent correctness."""
    errors = []
    if receipt.get("name") != name:
        errors.append("exact name mismatch")
    for field in ("canonical_id", "source_ref", "oracle_text"):
        if not isinstance(receipt.get(field), str) or not receipt[field].strip():
            errors.append(f"missing {field}")
    if not observed_at(receipt.get("checked_at")):
        errors.append("invalid or missing checked_at")
    digest = receipt.get("oracle_text_sha256")
    if not isinstance(digest, str) or not HASH.fullmatch(digest):
        errors.append("missing or invalid text digest")
    elif isinstance(receipt.get("oracle_text"), str) and sha256(receipt["oracle_text"].encode("utf-8")) != digest:
        errors.append("text digest mismatch")
    return errors


def audit(inventory: dict[str, Any], rules: list[dict[str, Any]] | None = None,
          interactions: list[dict[str, Any]] | None = None,
          allocations: dict[str, str] | None = None) -> dict[str, Any]:
    rules = rules or []
    interactions = interactions or []
    allocations = allocations or {}
    names: dict[str, int] = inventory.get("names") or {}
    by_name: dict[str, list[dict[str, Any]]] = {}
    for record in rules:
        if not isinstance(record, dict):
            continue
        by_name.setdefault(str(record.get("name", "")), []).append(record)

    records = []
    blocked = []
    verified = 0
    for name in sorted(names):
        matching = by_name.get(name, [])
        state = "NOT_CHECKED"
        reason = "no rules receipt"
        if len(matching) > 1:
            state, reason = "CONFLICTED", "duplicate rules receipts"
        elif matching:
            receipt = matching[0]
            if receipt.get("status") == "BLOCKED_RATE_LIMIT":
                state, reason = "BLOCKED_RATE_LIMIT", "provider request did not complete"
            else:
                errs = check_rules_snapshot(name, receipt)
                if errs:
                    state, reason = "CONFLICTED", "; ".join(errs)
                else:
                    state, reason = "RULES_VERIFIED", "reproducible rules receipt present"
                    verified += 1
        if state != "RULES_VERIFIED":
            blocked.append({"name": name, "state": state, "reason": reason})
        records.append({"name": name, "quantity": names[name], "rules_state": state,
                        "reason": reason, "allocation": allocations.get(name, "UNKNOWN")})

    tested = []
    for i, item in enumerate(interactions):
        if not isinstance(item, dict):
            tested.append({"index": i, "status": "NOT_VERIFIED", "reason": "invalid record"})
            continue
        cards = item.get("cards")
        card_states = {x["name"]: x["rules_state"] for x in records}
        issues = []
        if not isinstance(cards, list) or not cards or not all(isinstance(c, str) for c in cards):
            issues.append("missing card identities")
        else:
            for card in cards:
                if card_states.get(card) != "RULES_VERIFIED":
                    issues.append(f"card not rules-verified: {card}")
        if not isinstance(item.get("steps"), list) or not item["steps"] or not all(isinstance(s, str) and s.strip() for s in item["steps"]):
            issues.append("missing ordered steps")
        for k in ("setup", "outcome", "evidence_ref", "test_method"):
            if not isinstance(item.get(k), str) or not item[k].strip():
                issues.append(f"missing {k}")
        if not observed_at(item.get("tested_at")):
            issues.append("missing tested_at")
        if item.get("result") != "PASS":
            issues.append("no observed PASS")
        tested.append({"index": i, "status": "SCENARIO_VERIFIED" if not issues else "NOT_VERIFIED",
                       "reason": "; ".join(issues) or "evidence metadata and prerequisites recorded"})

    applicable = len(names)
    gates = {
        "INVENTORY_COMPLETE": bool(inventory.get("inventory_complete")) and applicable > 0,
        "RULES_COMPLETE": verified == applicable and applicable > 0,
        "INTERACTIONS_VERIFIED": bool(tested) and all(x["status"] == "SCENARIO_VERIFIED" for x in tested),
        # No scoring or allocation certification implemented in this candidate.
        "RECOMMENDATIONS_VALIDATED": False,
        "ALLOCATION_CONFIRMED": False,
        "EXPORT_QA_PASSED": False,
    }
    return {"schema_version": SCHEMA,
            "inventory": {k: inventory.get(k) for k in ("source_sha256", "rows", "copies", "unique_names", "errors")},
            "coverage": {"eligible": applicable, "rules_verified": verified,
                         "unresolved": applicable - verified,
                         "percent": round(100 * verified / applicable, 2) if applicable else 0},
            "gates": gates, "records": records, "verification_queue": blocked,
            "interactions": tested,
            "caveat": "Receipts and scenario metadata are structurally checked; truth and independent MTG adjudication are NOT certified."}


def main() -> int:
    parser = argparse.ArgumentParser(description="MORROW-WF-001 evidence and coverage gate")
    parser.add_argument("inventory_csv")
    parser.add_argument("--rules", help="optional JSON array of rules receipts")
    parser.add_argument("--deck", help="optional text decklist, for separate reconciliation")
    parser.add_argument("--out", help="optional output JSON path")
    args = parser.parse_args()
    inv = inventory_csv(args.inventory_csv)
    rules = json.loads(Path(args.rules).read_text(encoding="utf-8")) if args.rules else []
    result = audit(inv, rules)
    if args.deck:
        deck = parse_deck(Path(args.deck).read_text(encoding="utf-8"))
        result["deck"] = {"cards": deck["cards"], "errors": deck["errors"],
                          "not_in_csv": sorted(set(deck["entries"]) - set(inv["names"]))}
    output = json.dumps(result, indent=2, sort_keys=True, ensure_ascii=False)
    if args.out:
        Path(args.out).write_text(output + "\n", encoding="utf-8")
    else:
        print(output)
    return 0 if result["gates"]["INVENTORY_COMPLETE"] else 2


if __name__ == "__main__":
    raise SystemExit(main())
