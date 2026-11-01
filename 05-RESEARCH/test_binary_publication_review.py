"""Hash-pinned binary publication records stay narrow and fail closed."""
import hashlib
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

source = Path(__file__).with_name("publication_privacy_scan.py")
spec = importlib.util.spec_from_file_location("binary_privacy_scanner", source)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)


class BinaryPublicationReviewTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.rel = "apps/deck-lab/downloads/morrow-deck-lab-debug.apk"
        self.binary = self.root / self.rel
        self.binary.parent.mkdir(parents=True)
        self.binary.write_bytes(b"\xff\x00reviewed artifact fixture")
        self.manifest = self.root / mod.BINARY_REVIEW_MANIFEST
        self.manifest.parent.mkdir(parents=True)
        self.record = {
            "schema_version": 1,
            "owner_request_date": "2026-11-01",
            "publication_scope": "Owner explicitly requested publication of the exact app artifacts.",
            "assets": [{
                "path": self.rel,
                "sha256": hashlib.sha256(self.binary.read_bytes()).hexdigest(),
                "review_evidence": "Archive contents and metadata were inspected before publication.",
            }],
        }
        self.save()

    def save(self):
        self.manifest.write_text(json.dumps(self.record), encoding="utf-8")

    def scan(self, extra=()):
        with patch.object(mod, "tracked_files", return_value=[self.manifest, self.binary, *extra]):
            return mod.scan_repository(self.root)

    def kinds(self, extra=()):
        return {kind for _, _, kind in self.scan(extra)}

    def test_exact_reviewed_binary_allowed(self):
        self.assertEqual(self.scan(), [])

    def test_changed_bytes_require_new_review(self):
        self.binary.write_bytes(self.binary.read_bytes() + b"changed")
        self.assertIn("binary-digest-review-required", self.kinds())

    def test_unreviewed_binary_remains_blocked(self):
        other = self.root / "unreviewed.bin"
        other.write_bytes(b"\xff\x00other")
        self.assertIn("non-utf8-review-required", self.kinds([other]))

    def test_missing_manifest_does_not_authorize_binary(self):
        self.manifest.unlink()
        self.assertIn("non-utf8-review-required", self.kinds())

    def test_malformed_manifest_fails_closed(self):
        self.manifest.write_text("{invalid-json", encoding="utf-8")
        self.assertIn("binary-review-manifest-invalid", self.kinds())
        self.assertIn("non-utf8-review-required", self.kinds())

    def test_missing_or_empty_evidence_fails_closed(self):
        for evidence in [None, "", "   "]:
            with self.subTest(evidence=evidence):
                if evidence is None:
                    self.record["assets"][0].pop("review_evidence", None)
                else:
                    self.record["assets"][0]["review_evidence"] = evidence
                self.save()
                self.assertIn("binary-review-manifest-invalid", self.kinds())
                self.assertIn("non-utf8-review-required", self.kinds())

    def test_manifest_cannot_expand_binary_path_scope(self):
        self.record["assets"][0]["path"] = "arbitrary-private.zip"
        self.save()
        self.assertIn("binary-review-manifest-invalid", self.kinds())

    def test_duplicate_record_and_invalid_schema_date_are_rejected(self):
        variants = [
            {"schema_version": True},
            {"owner_request_date": "not-a-date"},
            {"publication_scope": ""},
            {"assets": self.record["assets"] * 2},
        ]
        for changes in variants:
            with self.subTest(changes=changes):
                original = self.record
                self.record = {**original, **changes}
                self.save()
                self.assertIn("binary-review-manifest-invalid", self.kinds())
                self.record = original

    def test_reviewed_path_never_bypasses_text_secret_scanning(self):
        self.binary.write_bytes(b"ghp_" + b"A" * 30)
        self.record["assets"][0]["sha256"] = hashlib.sha256(self.binary.read_bytes()).hexdigest()
        self.save()
        self.assertIn("secret-token", self.kinds())


if __name__ == "__main__":
    unittest.main()
