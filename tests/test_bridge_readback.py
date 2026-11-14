"""Synthetic unit tests for the bounded readback gate."""
import hashlib
import json
from pathlib import Path
import tempfile
import unittest
from morrow_bridge.readback_gate import MorrowBridgeVerifier, LIFECYCLE_STATES

ROOT = Path(__file__).resolve().parents[1]
FIXTURE = ROOT / "morrow_bridge/examples/synthetic_decision.json"

class BridgeReadbackTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.payload = FIXTURE.read_bytes()
        self.digest = hashlib.sha256(self.payload).hexdigest()
        (self.root / "staged").mkdir()
        self.dest = self.root / "staged" / "record.json"
        self.dest.write_bytes(self.payload)
        self.verifier = MorrowBridgeVerifier(self.root)

    def check(self, *, path="staged/record.json", digest=None, record_id="demo.decision.001"):
        return self.verifier.audit_context_payload(
            path, expected_sha256=self.digest if digest is None else digest,
            expected_record_id=record_id,
        )

    def test_clean_destination_readback(self):
        result = self.check()
        self.assertEqual(result.result, "passed")
        self.assertTrue(result.schema_valid)

    def test_missing_file_fails_closed(self):
        self.dest.unlink()
        self.assertEqual(self.check().result, "failed")

    def test_tampered_bytes_fails(self):
        self.dest.write_bytes(self.payload + b"\n")
        self.assertIn("destination digest mismatch", self.check().errors)

    def test_digest_mismatch_fails(self):
        self.assertEqual(self.check(digest="0" * 64).result, "failed")

    def test_wrong_expected_identity_fails(self):
        self.assertEqual(self.check(record_id="demo.different.002").result, "failed")

    def test_invalid_schema_fails_despite_correct_digest(self):
        record = json.loads(self.payload)
        del record["privacy"]
        content = json.dumps(record).encode()
        self.dest.write_bytes(content)
        report = self.check(digest=hashlib.sha256(content).hexdigest())
        self.assertEqual(report.result, "failed")
        self.assertFalse(report.schema_valid)

    def test_duplicate_json_keys_fail_even_with_matching_digest(self):
        content = self.payload.strip()[:-1] + b',"record_id":"demo.decision.001"}'
        self.dest.write_bytes(content)
        report = self.check(digest=hashlib.sha256(content).hexdigest())
        self.assertEqual(report.result, "failed")

    def test_outside_workspace_fails(self):
        with tempfile.TemporaryDirectory() as other:
            outside = Path(other) / "record.json"
            outside.write_bytes(self.payload)
            self.assertEqual(self.check(path=outside).result, "failed")

    def test_non_json_fails(self):
        content = b"not json"
        self.dest.write_bytes(content)
        self.assertEqual(self.check(digest=hashlib.sha256(content).hexdigest()).result, "failed")

    def test_not_auto_promoted_to_lifecycle_state(self):
        self.assertEqual(LIFECYCLE_STATES[0], "planned")
        self.assertEqual(LIFECYCLE_STATES[-1], "user_confirmed")
        self.assertFalse(hasattr(self.verifier, "advance_state"))

if __name__ == "__main__":
    unittest.main()
