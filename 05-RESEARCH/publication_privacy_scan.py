#!/usr/bin/env python3
"""Conservative public-repository publication guard. No external packages.

Scans every git-tracked text file. Prints paths/line numbers but never the value
matched, so workflow logs do not inadvertently republish a secret.
A clean result is NOT a guarantee of GDPR compliance or semantic safety.
"""
from pathlib import Path
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
    findings = []
    for path in tracked_files(root):
        if not path.is_file():
            continue
        try:
            content = path.read_text(encoding="utf-8")
        except UnicodeError:
            findings.append((str(path.relative_to(root)), 0, "non-utf8-review-required"))
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
