"""MVR candidate: structural checks and local-only dependency veto.
Neither validation nor a caller grant authenticates evidence, consent or review.
"""
import json
import math
from datetime import datetime
from pathlib import Path
from jsonschema import Draft202012Validator
from morrow_bridge.validate import FORMAT_CHECKER, can_export as bridge_can_export

SCHEMA = Path(__file__).resolve().parents[1] / "02-KNOWLEDGE" / "visual-reasoning-record-v0.2.schema.json"
_schema = json.loads(SCHEMA.read_text(encoding="utf-8"))
Draft202012Validator.check_schema(_schema)
_validator = Draft202012Validator(_schema, format_checker=FORMAT_CHECKER)

def validate_visual(record):
    errors = [f"{list(e.path)}: {e.message}" for e in _validator.iter_errors(record)]
    if errors:
        return errors
    sources = {s["id"]: s for s in record["sources"]}
    claims = {c["id"]: c for c in record["claims"]}
    if len(sources) != len(record["sources"]) or len(claims) != len(record["claims"]):
        errors.append("duplicate source or claim ID")
    for c in record["claims"] + record["edges"]:
        if not set(c["source_ids"]) <= sources.keys():
            errors.append("unresolved source")
        if "value" in c and not math.isfinite(c["value"]):
            errors.append("non-finite number")
    for e in record["edges"]:
        if e["from"] not in claims or e["to"] not in claims:
            errors.append("unresolved endpoint")
        elif e["state"] == "confirmed" and any(claims[k]["state"] != "confirmed" for k in (e["from"], e["to"])):
            errors.append("confirmed edge requires confirmed endpoints")
    if record["data_origin"] == "observed" and any(s["origin"] in ("synthetic","illustrative","reconstructed") for s in sources.values()):
        errors.append("non-observed source presented as solely observed")
    if record["id"] in record.get("supersedes", []):
        errors.append("self supersession")
    return errors

def authorize_visual_export(record, destination, *, bridge_records, authorized_destinations,
                            independently_reviewed=False, now=None):
    """Veto-only check against actual Bridge v0.1. Never transfers data.
    Resolve dependencies from trusted current storage, not imported snapshots.
    Caller owns authenticated policy and review; imported flags are not grants.
    """
    try:
        if validate_visual(record) or destination not in {"local","other_model","public"}:
            return False
        if not isinstance(authorized_destinations, (set, frozenset)) or destination not in authorized_destinations:
            return False
        if record["privacy"] in {"restricted","unreviewed"} or (destination != "local" and record["privacy"] != "public_safe"):
            return False
        if destination == "public" and independently_reviewed is not True:
            return False
        if not record["sources"]:
            return False
        matched_confirmed = set()
        for source in record["sources"]:
            rid = source.get("bridge_record_id")
            upstream = bridge_records.get(rid)
            if not rid or not upstream or upstream.get("record_id") != rid:
                return False
            if not bridge_can_export(upstream, destination, authorized_destinations, now=now):
                return False
            if destination != "local" and upstream["privacy"]["classification"] != "public":
                return False
            # Match the actual provenance pointer and observation instant, not just a record ID.
            matches = [p for p in upstream["provenance"] if p["pointer"] == source["reference"]
                       and datetime.fromisoformat(p["observed_at"].replace("Z","+00:00"))
                       == datetime.fromisoformat(source["observed_at"].replace("Z","+00:00"))]
            if not matches:
                return False
            if upstream["status"] == "confirmed" and any(p["claim_status"] == "confirmed" for p in matches):
                matched_confirmed.add(source["id"])
        for claim in record["claims"] + record["edges"]:
            if claim["state"] == "confirmed" and not set(claim["source_ids"]) <= matched_confirmed:
                return False
        return True
    except Exception:
        return False
