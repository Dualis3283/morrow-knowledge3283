import copy
import json
from pathlib import Path
import unittest
import tempfile
import hashlib
import zipfile
import gzip
from linguistic_reference import validate_registry, references_for, lookup_language, lookup_intent_examples, verified_asset

REG=Path(__file__).parents[1]/"06-SOURCES/linguistic-source-registry-v1.json"

class RegistryTests(unittest.TestCase):
    def setUp(self): self.reg=json.loads(REG.read_text(encoding="utf-8"))
    def test_valid(self): validate_registry(self.reg)
    def test_intent_reference(self):
        self.assertIn("massive", [s["id"] for s in references_for(self.reg,"intent")])
    def test_language_reference(self):
        self.assertIn("glottolog",[s["id"] for s in references_for(self.reg,"language_identity")])
    def test_restricted_not_runtime(self):
        self.assertEqual(references_for(self.reg,"culture"),[])
    def test_reference_only_not_runtime(self):
        self.assertNotIn("talkbank",[s["id"] for s in references_for(self.reg,"repair")])
    def test_restricted_fail_closed(self):
        r=copy.deepcopy(self.reg)
        next(s for s in r["sources"] if s["id"]=="talkbank")["runtime_allowed"]=True
        with self.assertRaises(ValueError): validate_registry(r)
    def test_bad_digest(self):
        r=copy.deepcopy(self.reg)
        r["assets"][0]["sha256"]="invalid"
        with self.assertRaises(ValueError): validate_registry(r)
    def test_unknown_purpose(self):
        with self.assertRaises(ValueError): references_for(self.reg,"infer_person_culture")

    def test_local_lookup_and_digest_rejection(self):
        with tempfile.TemporaryDirectory() as tmp:
            d=Path(tmp)
            name="glottolog-5.4-languoid.csv.zip"
            file=d/name
            with zipfile.ZipFile(file,"w") as z:
                z.writestr("languoid.csv","id,name,level,iso639P3code,parent_id\nsynt1234,Synthetic,language,xyz,parent123\n")
            a=next(x for x in self.reg["assets"] if x["filename"]==name)
            a["bytes"]=file.stat().st_size
            a["sha256"]=hashlib.sha256(file.read_bytes()).hexdigest()
            self.assertEqual(lookup_language(self.reg,d,"xyz")[0]["id"],"synt1234")
            file.write_bytes(b"changed")
            with self.assertRaises(ValueError): verified_asset(self.reg,name,d)
    def test_local_intent_lookup(self):
        with tempfile.TemporaryDirectory() as tmp:
            d=Path(tmp)
            name="massive-1.1-test-intent-sample.jsonl.gz"
            file=d/name
            with gzip.open(file,"wt",encoding="utf-8") as f:
                f.write(json.dumps({"locale":"en-US","intent":"alarm_set","utt":"synthetic"})+"\n")
            a=next(x for x in self.reg["assets"] if x["filename"]==name)
            a["bytes"]=file.stat().st_size
            a["sha256"]=hashlib.sha256(file.read_bytes()).hexdigest()
            self.assertEqual(len(lookup_intent_examples(self.reg,d,"en-US","alarm_set")),1)
            self.assertEqual(lookup_intent_examples(self.reg,d,"en-US","other"),[])
