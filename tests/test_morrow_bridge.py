"""Executable protocol/structure tests, not model behavior or security audit."""
import copy
import json
import sys
import unittest
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from morrow_bridge.validate import can_export, load_schema, validate_record


def fixture(name):
    return json.loads((ROOT / 'morrow_bridge' / 'examples' / name).read_text(encoding='utf-8'))


class BridgeRecordTests(unittest.TestCase):
    def setUp(self):
        self.record = fixture('synthetic_decision.json')

    def test_schema_itself_is_valid(self):
        self.assertEqual(load_schema()['$schema'], 'https://json-schema.org/draft/2020-12/schema')

    def test_good_record(self):
        self.assertEqual(validate_record(self.record), [])

    def test_good_minimal_tombstone(self):
        self.assertEqual(validate_record(fixture('synthetic_tombstone.json')), [])

    def test_unknown_future_version_rejected(self):
        self.record['schema_version'] = '9.0'
        self.assertTrue(validate_record(self.record))

    def test_confirmed_record_requires_confirmed_source(self):
        self.record['provenance'][0]['claim_status'] = 'unknown'
        self.assertTrue(validate_record(self.record))

    def test_superseded_requires_successor(self):
        self.record['status'] = 'superseded'
        self.assertTrue(validate_record(self.record))

    def test_verified_action_requires_independent_check(self):
        self.record['action'] = {'state':'verified'}
        self.record['verification'] = {'result':'passed','method':'tool_receipt','checked_at':'2026-10-14T00:01:00Z','evidence_refs':['demo.source.001']}
        self.assertTrue(validate_record(self.record))
        self.record['verification']['method'] = 'independent_readback'
        self.assertEqual(validate_record(self.record), [])

    def test_deletion_record_does_not_retain_summary(self):
        tomb = fixture('synthetic_tombstone.json')
        tomb['summary'] = 'sensitive deleted content should never be copied here'
        self.assertTrue(validate_record(tomb))

    def test_export_requires_independent_grant(self):
        self.assertFalse(can_export(self.record, 'local', set()))
        self.assertTrue(can_export(self.record, 'local', {'local'}))
        self.assertFalse(can_export(self.record, 'other_model', {'other_model'}))

    def test_export_rejects_erasure_request(self):
        self.record['privacy']['deletion_requested_at'] = '2026-10-14T00:01:00Z'
        self.assertFalse(can_export(self.record, 'local', {'local'}))

    def test_export_rejects_expired_record(self):
        self.record['privacy']['retention'] = {'policy':'until_date','expires_at':'2026-10-14T00:00:00Z'}
        self.assertFalse(can_export(self.record, 'local', {'local'},now=datetime(2026,10,14,0,1,tzinfo=timezone.utc)))

    def test_ephemeral_record_never_leaves_local_process(self):
        self.record['privacy']['retention']={'policy':'ephemeral'}
        self.record['privacy']['share_policy']['destinations']=['local','other_model']
        self.assertFalse(can_export(self.record,'other_model',{'other_model'}))

    def test_false_consents_and_bad_timestamps_rejected(self):
        self.record['privacy']['share_policy']={'allowed':False,'destinations':['local']}
        self.assertTrue(validate_record(self.record))
        self.record=fixture('synthetic_decision.json')
        self.record['captured_at']='not-a-date'
        self.assertTrue(validate_record(self.record))

    def test_tombstone_cannot_be_exported(self):
        tomb = fixture('synthetic_tombstone.json')
        self.assertFalse(can_export(tomb,'local',{'local'}))


if __name__ == '__main__':
    unittest.main()
