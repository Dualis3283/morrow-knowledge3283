"""Deterministic negative cases for the Morrow structural/state gates."""
import importlib.util
from pathlib import Path
import tempfile
import json
import unittest

SOURCE = Path(__file__).with_name("morrow_checkpoint_gate.py")
spec = importlib.util.spec_from_file_location("morrow_checkpoint_gate", SOURCE)
gate = importlib.util.module_from_spec(spec)
spec.loader.exec_module(gate)

NOW = "2026-10-19T10:00:00Z"

def events(states):
    return [{"state": name, "evidence_ref": f"synthetic:{name}", "observed_at": NOW}
            for name in states]

def example(stage="attempted", persistence="saved"):
    return {
        "schema_version": "morrow-checkpoint-candidate-0.1",
        "record_id": "synthetic.example",
        "lifecycle_state": stage,
        "lifecycle_events": events(gate.LIFECYCLE[:gate.LIFECYCLE.index(stage) + 1]),
        "persistence_state": persistence,
        "persistence_events": events(gate.PERSISTENCE[:gate.PERSISTENCE.index(persistence) + 1]),
    }

def verified():
    record = example("independently_verified", "verified")
    record["verification"] = {
        "method": "independent_readback",
        "expected_sha256": "a" * 64,
        "readback_sha256": "a" * 64,
        "observed_at": NOW,
        "evidence_ref": "synthetic:destination-check",
    }
    return record

class MorrowCheckpointGateTests(unittest.TestCase):
    def test_synthetic_progress_is_structurally_valid(self):
        self.assertEqual(gate.validate_checkpoint(example()), [])

    def test_missing_stage_is_rejected(self):
        record = example()
        del record["lifecycle_events"][0]
        self.assertTrue(gate.validate_checkpoint(record))

    def test_unsequenced_state_is_rejected(self):
        record = example()
        record["lifecycle_state"] = "user_confirmed"
        self.assertTrue(gate.validate_checkpoint(record))

    def test_invalid_state_rejected(self):
        record = example()
        record["lifecycle_state"] = "verified"
        self.assertTrue(gate.validate_checkpoint(record))

    def test_state_without_evidence_is_rejected(self):
        record = example()
        record["lifecycle_events"][0]["evidence_ref"] = ""
        self.assertTrue(gate.validate_checkpoint(record))

    def test_missing_observation_time_is_rejected(self):
        record = example()
        record["persistence_events"][-1]["observed_at"] = ""
        self.assertTrue(gate.validate_checkpoint(record))

    def test_verified_requires_digest_readback(self):
        record = verified()
        self.assertEqual(gate.validate_checkpoint(record), [])
        record["verification"]["readback_sha256"] = "b" * 64
        self.assertTrue(gate.validate_checkpoint(record))

    def test_tool_receipt_not_independent_verification(self):
        record = verified()
        record["verification"]["method"] = "tool_receipt"
        self.assertTrue(gate.validate_checkpoint(record))

    def test_user_confirmed_requires_separate_user_record(self):
        record = verified()
        record["lifecycle_state"] = "user_confirmed"
        record["lifecycle_events"].append(events(("user_confirmed",))[0])
        self.assertTrue(gate.validate_checkpoint(record))
        record["user_confirmation"] = {
            "evidence_ref": "synthetic:human-signoff", "observed_at": NOW
        }
        self.assertEqual(gate.validate_checkpoint(record), [])

    def test_not_observed_is_not_a_pass_claim(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            for folder in gate.REQUIRED_DIRECTORIES:
                (root / folder).mkdir()
            for file in gate.REQUIRED_DOCUMENTS:
                path = root / file
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_text("")
            (root / "README.md").write_text(
                "planned → attempted → accepted → active → independently verified → user confirmed\n"
                "prepared ≠ saved ≠ uploaded ≠ synced ≠ verified\n"
            )
            issues, count = gate.validate_repo(root)
            self.assertEqual((issues, count), ([], 0))

    def test_invalid_public_manifest_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            for folder in gate.REQUIRED_DIRECTORIES:
                (root / folder).mkdir()
            for file in gate.REQUIRED_DOCUMENTS:
                path = root / file
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_text("")
            (root / "README.md").write_text(
                "planned → attempted → accepted → active → independently verified → user confirmed\n"
                "prepared ≠ saved ≠ uploaded ≠ synced ≠ verified\n"
            )
            folder = root / gate.CHECKPOINT_FOLDER
            folder.mkdir()
            (folder / "bad.json").write_text(json.dumps({"lifecycle_state": "verified"}))
            issues, count = gate.validate_repo(root)
            self.assertEqual(count, 1)
            self.assertTrue(issues)

if __name__ == "__main__":
    unittest.main()
