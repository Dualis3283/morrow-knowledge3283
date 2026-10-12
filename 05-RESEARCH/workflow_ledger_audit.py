#!/usr/bin/env python3
"""Read-only, reproducible Morrow workflow-ledger audit (public-safe).

Usage: python3 05-RESEARCH/workflow_ledger_audit.py [--json]
No network access, credentials, writes, or external packages required.
Does NOT infer accuracy/improvement percentages or treat missing as zero.
"""
import argparse
import json
import re
from pathlib import Path
from collections import Counter

ROOT = Path(__file__).resolve().parents[1]
LEDGER = ROOT / "05-RESEARCH" / "WORKFLOW_LOG.md"
REGISTER = ROOT / "03-WORKING_STATE" / "TASK_REGISTER.md"
HEAD = re.compile(r"^## Workflow\s+(\d+)\s+[—-]\s+(.+)$", re.M)
ROW = re.compile(r"^\|\s*([^|\n]+?)\s*\|\s*([^|\n]+?)\s*\|$", re.M)
MANDATORY = (
    "Prior context required?",
    "Context retrieved successfully?",
    "User repetition required?",
    "Evidence validation required?",
    "External write/action?",
    "Independent verification performed?",
    "Post-release defect?",
    "Material rework after completion declared?",
    "Final outcome",
)
def flag(value):
    value = value.strip().casefold()
    if value.startswith("yes"): return "yes"
    if value.startswith("not applicable"): return "not_applicable"
    if value.startswith("no observed"): return "not_observed"
    if value.startswith("no"): return "no"
    return "unknown"
def audit():
    text = LEDGER.read_text(encoding="utf-8")
    matches = list(HEAD.finditer(text))
    rows = []
    for i, match in enumerate(matches):
        body = text[match.end():matches[i+1].start() if i+1<len(matches) else len(text)]
        fields = {k.strip():v.strip() for k,v in ROW.findall(body) if k.strip() not in ("Field", "---")}
        date = re.search(r"^\*\*Date:\*\*\s*(.+)", body, re.M)
        rows.append({"number":int(match.group(1)), "title":match.group(2).strip(),
                     "date":date.group(1).strip() if date else None, "fields":fields})
    ids = [row["number"] for row in rows]
    required_missing = [
        {"workflow":r["number"],"fields":[k for k in MANDATORY if k not in r["fields"]]}
        for r in rows if any(k not in r["fields"] for k in MANDATORY)
    ]
    counts = Counter()
    for r in rows:
        f=r["fields"]
        for key,alias in (("Prior context required?","context_required"),
                          ("Context retrieved successfully?","context_retrieved"),
                          ("User repetition required?","user_repetition"),
                          ("Evidence validation required?","evidence_validation"),
                          ("External write/action?","external_action"),
                          ("Independent verification performed?","independent_verification"),
                          ("Post-release defect?","post_release_defect"),
                          ("Material rework after completion declared?","material_rework")):
            counts[alias+"_"+flag(f.get(key,""))] += 1
    register=REGISTER.read_text(encoding="utf-8")
    reg_match=re.search(r"### Project Morrow measurement foundation[\s\S]{0,200}?\*\*Status:\*\*\s*In progress\s*[—-]\s*(\d+)\s*/\s*20",register)
    register_count=int(reg_match.group(1)) if reg_match else None
    issues=[]
    if ids != list(range(1,len(ids)+1)):issues.append("Non-contiguous or repeated workflow numbers")
    if required_missing:issues.append("Mandatory fields missing in at least one workflow")
    if register_count is not None and register_count != len(rows):
        issues.append("Working State task register and ledger counts disagree")
    if len(rows)<20:issues.append("Twenty-workflow foundation is not complete")
    if len(rows)>=20:issues.append("Before freezing: reconcile the chronological sampling gap after 2 October, resolve defect nomenclature and validate per-action and per-conclusion denominators")
    issues.append("Defect field names vary; event-level defect discovery/catch denominators cannot safely be inferred")
    issues.append("Independent verification is logged per workflow, not per eligible write/action")
    issues.append("Evidence traceability is not coded per eligible conclusion")
    return {
        "schema":"morrow-workflow-audit-v1",
        "ledger_path":str(LEDGER.relative_to(ROOT)),
        "count":len(rows),
        "numbers_contiguous":ids==list(range(1,len(ids)+1)),
        "last_coded_date":rows[-1]["date"] if rows else None,
        "last_coded_workflow":rows[-1]["title"] if rows else None,
        "task_register_count":register_count,
        "observed_raw_field_counts":dict(sorted(counts.items())),
        "mandatory_field_coverage":len(rows)-len(required_missing),
        "missing_required":required_missing,
        "defect_field_variants":sorted({k for row in rows for k in row["fields"] if "defect" in k.lower()}),
        "foundation_sample_complete":len(rows)>=20 and not required_missing,
        "metric_definition_v1_frozen":False,
        "six_core_metric_rates":{"material_rework_rate":None,
            "pre_release_defect_catch_rate":None,
            "continuity_retrieval_success":None,
            "verification_coverage_per_action":None,
            "evidence_traceability_per_conclusion":None,
            "repeated_context_burden_rate":None},
        "readiness_issues":issues,
        "scope_note":"Counts describe the coded, selected workflows, not all work since 2 October; do not infer Morrow caused improvement."
    }
if __name__=="__main__":
    result=audit()
    cli=argparse.ArgumentParser(description=__doc__)
    cli.add_argument("--json",action="store_true",help="emit machine-readable evidence including null unavailable rates")
    args=cli.parse_args()
    if args.json:print(json.dumps(result,indent=2,ensure_ascii=False,sort_keys=True))
    else:
        print(f"Morrow ledger: {result['count']} coded, register {result['task_register_count']}, definitions frozen: {result['metric_definition_v1_frozen']}")
        for issue in result["readiness_issues"]:print("HOLD:",issue)
