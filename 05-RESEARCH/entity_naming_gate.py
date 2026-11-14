"""Check project-owned operational names, not historical prose or card data."""
import re
import subprocess
import sys
from pathlib import Path

# Deliberately narrow: legacy identifier tokens in operational namespaces.
LEGACY = re.compile(r"(?i)(?<![a-z0-9])maro(?=[_.\-/]|$)")
DISPLAY = re.compile(r"(?i)^\s*name:\s*.*\bmaro\b")
PREFIXES = (".github/workflows/", "scripts/", "tests/", "05-RESEARCH/", "docs/retention/")
CODE = {".py", ".sh", ".yml", ".yaml", ".js", ".mjs", ".ts", ".json"}
# The checker and its tests necessarily describe the forbidden token.
SELF = {"entity_naming_gate.py", "test_entity_naming_gate.py"}

def inspect(path, content):
    if not path.startswith(PREFIXES):
        return []
    issues = []
    if LEGACY.search(path):
        issues.append(f"{path}: legacy project path")
    if Path(path).name in SELF or Path(path).suffix.lower() not in CODE:
        return issues
    for n, line in enumerate(content.splitlines(), 1):
        if LEGACY.search(line) or (path.startswith(".github/workflows/") and DISPLAY.search(line)):
            issues.append(f"{path}:{n}: legacy operational identifier")
    return issues

def scan(root):
    paths = subprocess.check_output(["git", "-C", str(root), "ls-files", "-z"]).decode().split("\0")
    issues = []
    for path in paths:
        if not path or not path.startswith(PREFIXES):
            continue
        file = root / path
        if not file.is_file():
            issues.append(f"{path}: tracked operational file missing")
            continue
        if file.is_symlink():
            issues.append(f"{path}: operational symlink requires review")
            continue
        content = file.read_text(encoding="utf-8") if file.suffix.lower() in CODE else ""
        issues.extend(inspect(path, content))
    return issues

if __name__ == "__main__":
    root = Path(sys.argv[1] if len(sys.argv) > 1 else ".").resolve()
    issues = scan(root)
    for issue in issues:
        print(issue)
    print(f"Morrow operational naming gate: {len(issues)} issue(s)")
    sys.exit(bool(issues))
