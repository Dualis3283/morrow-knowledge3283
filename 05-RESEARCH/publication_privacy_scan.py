#!/usr/bin/env python3
"""Conservative public-repository publication guard. No external packages.

Scans every git-tracked text file. Prints paths/line numbers but never the value
matched, so workflow logs do not inadvertently republish a secret.
A clean result is NOT a guarantee of GDPR compliance or semantic safety.
"""
from pathlib import Path
from datetime import date
import hashlib
import json
import re
import subprocess
import sys

PATTERNS = {
    "private-workspace-deep-link": re.compile(
        r"https?://(?:app\.|www\.)?(?:notion\.(?:so|com|site)|"
        r"docs\.google\.com|drive\.google\.com|mail\.google\.com|"
        r"app\.slack\.com|[\w-]+\.atlassian\.net)/[^\s<>)\"']+", re.I
    ),
    "email-address": re.compile(
        r"\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b", re.I
    ),
    "secret-token": re.compile(
        r"(?:\b(?:gh[pousr]_|github_pat_|sk-)[A-Za-z0-9_-]{20,}|"
        r"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----)"
    ),
    "credential-assignment": re.compile(
        r"\b(?:password|api[_-]?key|access[_-]?token|client[_-]?secret)"
        r"\s*[:=]\s*['\"]?[A-Za-z0-9_+./=-]{20,}(?:['\"]|$)", re.I
    ),
    "irish-iban": re.compile(r"\bIE\d{2}\s*[A-Z]{4}\s*(?:\d[\s-]*){14}\b", re.I),
    "irish-phone": re.compile(r"(?<!\w)\+353[\s-]?(?:\d[\s-]?){8,10}(?!\w)"),
    "disclosed-private-health": re.compile(
        r"\b(?:I was " r"diagnosed with|my medical " r"diagnosis is|"
        r"the owner's medical " r"diagnosis is)\b", re.I
    ),
    "unapproved-personal-testimonial": re.compile(
        r"\b(?:the user|the owner)\s+(?:reports|reported)\b"
        r".{0,100}\b(?:fatigue|medical|disability|bereavement|diagnosis)\b", re.I
    ),
}

# This is an exact artifact review, not an extension-based binary exemption.
# Adding a new binary path requires a separate policy/code review. Existing
# text files are always scanned, even when their path is in this set.
BINARY_REVIEW_MANIFEST = "06-SOURCES/DECK_LAB_BINARY_REVIEW.json"
DECK_LAB_BINARY_PATHS = frozenset({
    "apps/deck-lab/android/gradle/wrapper/gradle-wrapper.jar",
    "apps/deck-lab/downloads/morrow-deck-lab-debug.apk",
    "apps/deck-lab/downloads/source.zip",
    "apps/deck-lab/downloads/playmat-preview.png",
    "apps/deck-lab/web/assets/playmat.webp",
})

def reviewed_binaries(root: Path, paths):
    """Load the narrow, hash-pinned record; malformed records fail closed."""
    manifest = root / BINARY_REVIEW_MANIFEST
    if not manifest.exists():
        return {}, []
    tracked = {path.relative_to(root).as_posix() for path in paths}
    invalid = [(BINARY_REVIEW_MANIFEST, 0, "binary-review-manifest-invalid")]
    try:
        if BINARY_REVIEW_MANIFEST not in tracked or manifest.is_symlink():
            return {}, invalid
        record = json.loads(manifest.read_text(encoding="utf-8"))
        if set(record) != {"schema_version", "owner_request_date", "publication_scope", "assets"}:
            return {}, invalid
        if type(record["schema_version"]) is not int or record["schema_version"] != 1:
            return {}, invalid
        date.fromisoformat(record["owner_request_date"])
        if not isinstance(record["publication_scope"], str) or len(record["publication_scope"].strip()) < 30:
            return {}, invalid
        if not isinstance(record["assets"], list) or not record["assets"]:
            return {}, invalid
        approved = {}
        for asset in record["assets"]:
            if not isinstance(asset, dict) or set(asset) != {"path", "sha256", "review_evidence"}:
                return {}, invalid
            rel = asset["path"]
            if not isinstance(rel, str) or rel not in DECK_LAB_BINARY_PATHS or rel in approved or rel not in tracked:
                return {}, invalid
            path = root / rel
            if path.is_symlink() or not path.is_file():
                return {}, invalid
            digest = asset["sha256"]
            evidence = asset["review_evidence"]
            if not isinstance(digest, str) or not re.fullmatch(r"[0-9a-f]{64}", digest):
                return {}, invalid
            if not isinstance(evidence, str) or len(evidence.strip()) < 30:
                return {}, invalid
            approved[rel] = digest
        return approved, []
    except (OSError, UnicodeError, ValueError, TypeError, KeyError):
        return {}, invalid

def tracked_files(root: Path):
    out = subprocess.check_output(
        ["git", "-C", str(root), "ls-files", "-z"], stderr=subprocess.DEVNULL
    )
    return [root / p.decode("utf-8", "surrogateescape")
            for p in out.split(b"\0") if p]

def scan_text(text: str):
    matches = []
    for number, line in enumerate(text.splitlines(), 1):
        for label, regex in PATTERNS.items():
            if regex.search(line):
                matches.append((number, label))
    return matches

def scan_repository(root: Path):
    paths = tracked_files(root)
    approved, findings = reviewed_binaries(root, paths)
    for path in paths:
        if not path.is_file():
            continue
        try:
            content = path.read_text(encoding="utf-8")
        except UnicodeError:
            rel = path.relative_to(root).as_posix()
            if rel in approved:
                if hashlib.sha256(path.read_bytes()).hexdigest() != approved[rel]:
                    findings.append((rel, 0, "binary-digest-review-required"))
            else:
                findings.append((rel, 0, "non-utf8-review-required"))
            continue
        for lineno, label in scan_text(content):
            findings.append((str(path.relative_to(root)), lineno, label))
    return findings

def main():
    root = Path(sys.argv[1] if len(sys.argv) > 1 else ".").resolve()
    problems = scan_repository(root)
    for path, line, category in problems:
        print(f"{path}:{line}: {category} — publication review required")
    print(f"Publication privacy scan: {len(problems)} finding(s).")
    return 1 if problems else 0

if __name__ == "__main__":
    raise SystemExit(main())
