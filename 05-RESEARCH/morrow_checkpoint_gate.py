#!/usr/bin/env python3
"""Public-safe Morrow repository structure and checkpoint-metadata lint.

A lint PASS establishes only structural conformance of the *checked inputs*.
It does not independently authenticate receipts, prove a remote sync, ratify a
draft standard, or advance a workflow's lifecycle state.
"""
from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path
import re
import sys

REQUIRED_DIRECTORIES = (
    "00-CORE", "01-PROJECTS", "02-KNOWLEDGE", "03-WORKING_STATE",
    "04-DECISIONS", "05-RESEARCH", "06-SOURCES", "07-ARCHIVE",
)
REQUIRED_DOCUMENTS = (
    "README.md", "00-CORE/CONSISTENCY_PROTOCOL.md",
    "00-CORE/PUBLICATION_PRIVACY.md",
    "03-WORKING_STATE/TASK_REGISTER.md", "04-DECISIONS/DECISION_LOG.md",
    "06-SOURCES/SOURCE_REGISTRY.md",
)
LIFECYCLE = (
    "planned", "attempted", "accepted", "active",
    "independently_verified", "user_confirmed",
)
PERSISTENCE = ("prepared", "saved", "uploaded", "synced", "verified")
SHA256 = re.compile(r"[a-fA-F0-9]{64}\Z")
READBACK_METHODS = {"independent_readback", "independent_test"}
CHECKPOINT_FOLDER = Path("03-WORKING_STATE/public-checkpoints")

def valid_time(value):
    if not isinstance(value, str):
        return False
    try:
        dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return False
    return dt.tzinfo is not None and dt.utcoffset() is not None

def _events(value, stages, selected, name):
    if selected not in stages:
        return [f"{name}: invalid state"]
    if not isinstance(value, list):
        return [f"{name}: events must be a list"]
    required = stages[: stages.index(selected) + 1]
    actual = [v.get("state") if isinstance(v, dict) else None for v in value]
    if actual != list(required):
        return [f"{name}: stages missing, duplicated or out of order"]
    failures = []
    for index, event in enumerate(value):
        if not isinstance(event.get("evidence_ref"), str) or not event["evidence_ref"].strip():
            failures.append(f"{name}: stage {index + 1} lacks evidence reference")
        if not valid_time(event.get("observed_at")):
            failures.append(f"{name}: stage {index + 1} lacks dated observation")
    return failures

def validate_checkpoint(record):
    """Syntax + evidence-presence lint; a self-declared receipt is not trusted proof."""
    if not isinstance(record, dict):
        return ["checkpoint: expected JSON object"]
    issues = []
    if record.get("schema_version") != "morrow-checkpoint-candidate-0.1":
        issues.append("checkpoint: unsupported candidate schema version")
    if not isinstance(record.get("record_id"), str) or not record["record_id"].strip():
        issues.append("checkpoint: missing record ID")
    state = record.get("lifecycle_state")
    if state not in LIFECYCLE:
        issues.append("checkpoint: invalid lifecycle state")
    else:
        issues += _events(record.get("lifecycle_events"), LIFECYCLE, state, "lifecycle")
    persistence = record.get("persistence_state")
    if persistence is not None:
        if persistence not in PERSISTENCE:
            issues.append("checkpoint: invalid persistence state")
        else:
            issues += _events(record.get("persistence_events"), PERSISTENCE, persistence, "persistence")
    if state in ("independently_verified", "user_confirmed") or persistence == "verified":
        ver = record.get("verification")
        if not isinstance(ver, dict):
            issues.append("checkpoint: verification evidence missing")
        else:
            if ver.get("method") not in READBACK_METHODS:
                issues.append("checkpoint: method is not independent readback/test")
            if not valid_time(ver.get("observed_at")):
                issues.append("checkpoint: verification has no observed timestamp")
            if not isinstance(ver.get("evidence_ref"), str) or not ver["evidence_ref"].strip():
                issues.append("checkpoint: verification evidence pointer missing")
            left, right = ver.get("expected_sha256"), ver.get("readback_sha256")
            if not (isinstance(left, str) and isinstance(right, str)
                    and SHA256.fullmatch(left) and SHA256.fullmatch(right)
                    and left.lower() == right.lower()):
                issues.append("checkpoint: expected and readback digest differ or are missing")
    if state == "user_confirmed":
        conf = record.get("user_confirmation")
        if (not isinstance(conf, dict)
            or not isinstance(conf.get("evidence_ref"), str)
            or not conf["evidence_ref"].strip()
            or not valid_time(conf.get("observed_at"))):
            issues.append("checkpoint: user confirmation evidence missing")
    return issues

def validate_repo(root):
    root = Path(root)
    issues = []
    for folder in REQUIRED_DIRECTORIES:
        if not (root / folder).is_dir():
            issues.append(f"missing required directory: {folder}")
    for file in REQUIRED_DOCUMENTS:
        if not (root / file).is_file():
            issues.append(f"missing required document: {file}")
    readme = root / "README.md"
    if readme.is_file():
        content = readme.read_text(encoding="utf-8")
        lifecycle_words = (
            "planned → attempted → accepted → active → independently verified → user confirmed"
        )
        persistence_words = (
            "prepared ≠ saved ≠ uploaded ≠ synced ≠ verified"
        )
        if lifecycle_words not in content:
            issues.append("README lifecycle definition changed; review required")
        if persistence_words not in content:
            issues.append("README persistence definition changed; review required")
    folder = root / CHECKPOINT_FOLDER
    paths = sorted(folder.rglob("*.json")) if folder.is_dir() else []
    for path in paths:
        relative = path.relative_to(root)
        if path.is_symlink():
            issues.append(f"{relative}: symlinked manifest not allowed")
            continue
        try:
            record = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, ValueError, UnicodeDecodeError):
            issues.append(f"{relative}: malformed checkpoint JSON")
            continue
        for issue in validate_checkpoint(record):
            issues.append(f"{relative}: {issue}")
    return issues, len(paths)

def main():
    root = Path(sys.argv[1] if len(sys.argv) > 1 else ".").resolve()
    issues, count = validate_repo(root)
    for message in issues:
        print(f"::error::{message}")
    print(f"Canonical structure and state definitions: {'PASS' if not issues else 'FAIL'}")
    print(f"Public checkpoint metadata: {count} file(s) linted"
          + (", NOT OBSERVED (none published)" if not count else ""))
    print("Structural lint is not authenticated action, sync, or user confirmation.")
    return 1 if issues else 0

if __name__ == "__main__":
    raise SystemExit(main())
