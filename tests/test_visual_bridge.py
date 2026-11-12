"""Synthetic tests using the actual upstream Bridge validator and export gate."""
import copy, json, sys, unittest
from datetime import datetime, timezone
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from morrow_bridge.visual_gate import authorize_visual_export, validate_visual

def fixture():
    b=json.loads((ROOT/"morrow_bridge/examples/synthetic_decision.json").read_text())
    b["privacy"]["share_policy"]["destinations"]=["local","other_model","public"]
    p=b["provenance"][0]
    v={"id":"visual.example","version":"0.2.0","question":"What format was selected in the fictional example?",
       "audience":"Tester","purpose":"explanatory","representation":"prose","data_origin":"simulated",
       "sources":[{"id":"S1","reference":p["pointer"],"origin":"synthetic","observed_at":p["observed_at"],"bridge_record_id":b["record_id"]}],
       "claims":[{"id":"C1","statement":"Synthetic fixture records checklist choice","state":"confirmed","source_ids":["S1"]}],
       "edges":[],"text_fallback":"Fictional checklist choice.","privacy":"public_safe",
       "verification":{k:"not_run" for k in ("structural","source_fidelity","rendering","accessibility","independent_review")},
       "limitations":["Synthetic; no actual user data"]}
    return v,b

class VisualBridgeTests(unittest.TestCase):
    def test_actual_gate(self):
        v,b=fixture()
        self.assertEqual(validate_visual(v),[])
        self.assertTrue(authorize_visual_export(v,"public",bridge_records={b["record_id"]:b},authorized_destinations={"public"},independently_reviewed=True))
    def test_veto_cases(self):
        def change_v(v,b,key,val): v[key]=val
        cases=[
          ("missing grant",lambda v,b:None,set(),True),
          ("missing review",lambda v,b:None,{"public"},False),
          ("restricted visual",lambda v,b:v.update(privacy="restricted"),{"public"},True),
          ("private upstream",lambda v,b:b["privacy"].update(classification="private"),{"public"},True),
          ("destination veto",lambda v,b:b["privacy"]["share_policy"].update(destinations=["local"]),{"public"},True),
          ("deletion",lambda v,b:b["privacy"].update(deletion_requested_at="2026-10-14T00:01:00Z"),{"public"},True),
          ("expired",lambda v,b:b["privacy"].update(retention={"policy":"until_date","expires_at":"2026-10-14T00:00:00Z"}),{"public"},True),
          ("ephemeral",lambda v,b:b["privacy"].update(retention={"policy":"ephemeral"}),{"public"},True),
          ("retracted",lambda v,b:b.update(status="retracted"),{"public"},True),
          ("superseded",lambda v,b:b.update(status="superseded",supersession={"supersedes":[],"superseded_by":"new.record"}),{"public"},True),
          ("provisional upstream",lambda v,b:b.update(status="provisional"),{"public"},True),
          ("source mismatch",lambda v,b:v["sources"][0].update(reference="synthetic://other"),{"public"},True),
          ("time mismatch",lambda v,b:v["sources"][0].update(observed_at="2026-10-15T00:00:00Z"),{"public"},True),
          ("unresolved source",lambda v,b:v["claims"][0].update(source_ids=["S2"]),{"public"},True),
          ("unknown zero",lambda v,b:v["claims"][0].update(state="unknown",value=0,unit="ms"),{"public"},True),
          ("wrong dependency ID",lambda v,b:v["sources"][0].update(bridge_record_id="missing.record"),{"public"},True),
          ("invalid upstream schema",lambda v,b:b.update(schema_version="9.0"),{"public"},True),
          ("synthetic masquerade",lambda v,b:v.update(data_origin="observed"),{"public"},True),
          ("nonfinite value",lambda v,b:v["claims"][0].update(value=float("nan"),unit="ms"),{"public"},True),
        ]
        for name,mutate,grant,review in cases:
            with self.subTest(name=name):
                v,b=fixture(); mutate(v,b)
                self.assertFalse(authorize_visual_export(v,"public",bridge_records={b["record_id"]:b},authorized_destinations=grant,independently_reviewed=review,now=datetime(2026,11,12,tzinfo=timezone.utc)))
    def test_no_dependency(self):
        v,b=fixture()
        self.assertFalse(authorize_visual_export(v,"public",bridge_records={},authorized_destinations={"public"},independently_reviewed=True))
    def test_local_private_allowed_only_with_grant(self):
        v,b=fixture(); v["privacy"]="private"; b["privacy"]["classification"]="private"
        self.assertTrue(authorize_visual_export(v,"local",bridge_records={b["record_id"]:b},authorized_destinations={"local"}))
if __name__=="__main__": unittest.main()
