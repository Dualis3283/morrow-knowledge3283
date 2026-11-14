"""Read-only reference selection: no automatic remote retrieval or cultural inference."""
import json
import csv
import gzip
import hashlib
import io
import zipfile
import re
import sys
from pathlib import Path

PURPOSES={"language_identity","intent","speech","pragmatics","repair","culture","discovery"}
OPEN={"CC-BY-4.0","CC0-1.0"}
def validate_registry(reg):
    if reg.get("schema_version")!="morrow-linguistic-sources-1":
        raise ValueError("unsupported registry")
    ids=set()
    for s in reg["sources"]:
        if s["id"] in ids: raise ValueError("duplicate source")
        ids.add(s["id"])
        if not s["url"].startswith("https://") or not s["terms_url"].startswith("https://"):
            raise ValueError("untrusted URL scheme")
        if not set(s["purposes"]) <= PURPOSES: raise ValueError("invalid purpose")
        if type(s["runtime_allowed"]) is not bool: raise ValueError("invalid runtime flag")
        if s["runtime_allowed"] and (s["license"] not in OPEN or s["status"]!="archived"):
            raise ValueError("unreviewed or restricted runtime source")
        if not s["limitations"] or not s["attribution"]: raise ValueError("missing source context")
    filenames=set()
    for a in reg["assets"]:
        if a["source_id"] not in ids or not re.fullmatch(r"[a-f0-9]{64}",a["sha256"]):
            raise ValueError("invalid asset provenance")
        if a["filename"] in filenames or Path(a["filename"]).name!=a["filename"] or a["bytes"]<=0:
            raise ValueError("invalid asset")
        filenames.add(a["filename"])
    return True

def references_for(reg,purpose):
    validate_registry(reg)
    if purpose not in PURPOSES: raise ValueError("unknown reference purpose")
    return [dict(s) for s in reg["sources"] if purpose in s["purposes"] and s["runtime_allowed"]]

def verified_asset(reg, filename, archive_dir):
    validate_registry(reg)
    asset=next((a for a in reg["assets"] if a["filename"]==filename),None)
    if asset is None: raise ValueError("asset not registered")
    permitted={s["id"] for s in reg["sources"] if s["runtime_allowed"]}
    if asset["source_id"] not in permitted: raise ValueError("asset not approved for candidate lookup")
    path=Path(archive_dir)/filename
    if path.is_symlink() or not path.is_file(): raise ValueError("missing or unsafe asset")
    h=hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda:f.read(1024*1024),b""): h.update(chunk)
    if path.stat().st_size!=asset["bytes"] or h.hexdigest()!=asset["sha256"]:
        raise ValueError("asset integrity mismatch")
    return path

def lookup_language(reg,archive_dir,identifier,limit=20):
    if not isinstance(identifier,str) or not identifier.strip() or not 1<=limit<=100:
        raise ValueError("invalid query")
    path=verified_asset(reg,"glottolog-5.4-languoid.csv.zip",archive_dir)
    needle=identifier.strip().casefold()
    results=[]
    with zipfile.ZipFile(path) as z, z.open("languoid.csv") as f:
        for row in csv.DictReader(io.TextIOWrapper(f,encoding="utf-8-sig")):
            if needle in {row.get(k,"").casefold() for k in ("id","name","iso639P3code")}:
                results.append({k:row[k] for k in ("id","name","level","iso639P3code","parent_id")})
                if len(results)>=limit: break
    return results

def lookup_intent_examples(reg,archive_dir,locale,intent,limit=10):
    if not all(isinstance(x,str) and x.strip() for x in (locale,intent)) or not 1<=limit<=100:
        raise ValueError("invalid query")
    path=verified_asset(reg,"massive-1.1-test-intent-sample.jsonl.gz",archive_dir)
    result=[]
    with gzip.open(path,"rt",encoding="utf-8") as f:
        for line in f:
            row=json.loads(line)
            if row["locale"]==locale and row["intent"]==intent:
                result.append(row)
                if len(result)>=limit: break
    return result

if __name__=="__main__":
    validate_registry(json.loads(Path(sys.argv[1]).read_text(encoding="utf-8")))
    print("Linguistic source registry validated; not a licence or retrieval guarantee")
