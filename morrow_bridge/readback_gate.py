"""Bounded Bridge v0.1 destination readback gate; no model certification.

Checks actual destination bytes against a trusted digest collected before
transfer, then applies the existing structural/semantic Bridge validator.
Never advances a lifecycle state or authorizes publication.
"""
from __future__ import annotations
from dataclasses import dataclass, asdict
from pathlib import Path
import hashlib
import json
from typing import Any
from morrow_bridge.validate import validate_record

LIFECYCLE_STATES = (
    "planned", "attempted", "accepted", "active",
    "independently_verified", "user_confirmed",
)

@dataclass(frozen=True)
class ReadbackReport:
    result: str
    exists: bool
    integrity_checked: bool
    schema_checked: bool
    schema_valid: bool
    expected_record_checked: bool
    errors: tuple[str, ...]

    def to_dict(self) -> dict[str, Any]:
        obj = asdict(self)
        obj["errors"] = list(self.errors)
        return obj

class DuplicateMemberError(ValueError):
    pass

def _unique_members(pairs):
    obj = {}
    for key, value in pairs:
        if key in obj:
            raise DuplicateMemberError("duplicate JSON member")
        obj[key] = value
    return obj

class MorrowBridgeVerifier:
    def __init__(self, workspace_root: str | Path):
        self.root = Path(workspace_root).resolve(strict=True)
        if not self.root.is_dir():
            raise ValueError("workspace must be a directory")

    @staticmethod
    def _failed(exists, integrity, schema, valid, identity, messages):
        return ReadbackReport("failed", exists, integrity, schema, valid, identity, tuple(messages))

    def audit_context_payload(
        self, file_path: str | Path, *, expected_sha256: str,
        expected_record_id: str,
    ) -> ReadbackReport:
        """Return a bounded *local* destination integrity/schema result.

        expected_sha256 MUST come from a trusted pre-transfer source; computing
        it from the destination being validated defeats the integrity check.
        """
        if (not isinstance(expected_sha256, str) or len(expected_sha256) != 64
            or any(c not in "0123456789abcdefABCDEF" for c in expected_sha256)):
            return self._failed(False, False, False, False, False, ["invalid expected digest"])
        if not isinstance(expected_record_id, str) or not expected_record_id:
            return self._failed(False, False, False, False, False, ["invalid expected identity"])
        path = Path(file_path)
        if not path.is_absolute():
            path = self.root / path
        try:
            path = path.resolve(strict=True)
        except (OSError, RuntimeError):
            return self._failed(False, False, False, False, False, ["destination missing"])
        if not path.is_relative_to(self.root) or not path.is_file():
            return self._failed(False, False, False, False, False, ["outside workspace or not a file"])
        try:
            payload = path.read_bytes()
        except OSError:
            return self._failed(True, False, False, False, False, ["destination unreadable"])
        integrity_ok = hashlib.sha256(payload).hexdigest() == expected_sha256.lower()
        messages = [] if integrity_ok else ["destination digest mismatch"]
        try:
            record = json.loads(payload.decode("utf-8"), object_pairs_hook=_unique_members)
        except (UnicodeDecodeError, json.JSONDecodeError, DuplicateMemberError):
            return self._failed(True, True, False, False, False, messages + ["invalid/ambiguous JSON"])
        if not isinstance(record, dict):
            return self._failed(True, True, True, False, False, messages + ["record must be an object"])
        identity_ok = record.get("record_id") == expected_record_id
        if not identity_ok:
            messages.append("record identity mismatch")
        issues = validate_record(record)
        if issues:
            messages.append("Bridge structural/semantic validation failed")
        valid = not issues
        return ReadbackReport(
            "passed" if integrity_ok and identity_ok and valid else "failed",
            True, True, True, valid, identity_ok, tuple(messages)
        )

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Bounded destination readback")
    parser.add_argument("--workspace", required=True)
    parser.add_argument("--destination", required=True)
    parser.add_argument("--expected-sha256", required=True)
    parser.add_argument("--expected-record-id", required=True)
    args = parser.parse_args()
    report = MorrowBridgeVerifier(args.workspace).audit_context_payload(
        args.destination,
        expected_sha256=args.expected_sha256,
        expected_record_id=args.expected_record_id,
    )
    # No raw content, private paths, IDs or hashes in public CI output.
    print(json.dumps(report.to_dict(), sort_keys=True))
    raise SystemExit(0 if report.result == "passed" else 1)
