"""Synthetic regression tests for MORROW-WF-001 gates (no user inventory)."""
import hashlib
import tempfile
from pathlib import Path
import sys
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parent))
from collection_audit_gate import audit, inventory_csv, parse_deck, sha256, check_rules_snapshot


def receipt(name="Alpha", text="Put a counter on a creature."):
    return {"name": name, "canonical_id": "fictional-id:001",
            "oracle_text": text, "oracle_text_sha256": sha256(text.encode()),
            "source_ref": "synthetic:rules-fixture", "checked_at": "2026-10-25T10:00:00Z"}


class CollectionAuditGateTests(unittest.TestCase):
    def make_inventory(self, text="Name,Quantity\nAlpha,1\nBeta,2\n"):
        with tempfile.TemporaryDirectory() as d:
            f = Path(d) / "cards.csv"
            f.write_text(text, encoding="utf-8-sig")
            return inventory_csv(f)

    def test_01_csv_rows_copies_exact_names(self):
        inv = self.make_inventory('Name,Quantity\n"Test, Card",2\nAlpha,3\nAlpha,1\n')
        self.assertEqual((inv["rows"], inv["copies"], inv["unique_names"]), (3, 6, 2))
        self.assertEqual(inv["names"]["Test, Card"], 2)

    def test_02_deck_reconciles_without_inventing_ownership(self):
        d = parse_deck("[COMMANDER]\n1 Alpha\n[LANDS]\n3 Forest\n1 Missing Card")
        self.assertEqual(d["cards"], 5)
        self.assertIn("Missing Card", d["entries"])

    def test_03_unobserved_rules_do_not_imply_rejection(self):
        r = audit(self.make_inventory())
        self.assertEqual(r["records"][0]["rules_state"], "NOT_CHECKED")
        self.assertEqual(r["coverage"]["rules_verified"], 0)
        self.assertFalse(r["gates"]["RULES_COMPLETE"])

    def test_04_rate_limit_persists_queue(self):
        r = audit(self.make_inventory(), [{"name": "Alpha", "status": "BLOCKED_RATE_LIMIT"}])
        self.assertEqual(r["verification_queue"][0]["state"], "BLOCKED_RATE_LIMIT")
        self.assertFalse(r["gates"]["RULES_COMPLETE"])

    def test_05_forged_digest_is_conflicted(self):
        x = receipt(); x["oracle_text_sha256"] = "0" * 64
        r = audit(self.make_inventory(), [x])
        self.assertEqual(r["records"][0]["rules_state"], "CONFLICTED")

    def test_06_duplicate_names_are_conflicted(self):
        r = audit(self.make_inventory(), [receipt(), receipt()])
        self.assertEqual(r["records"][0]["rules_state"], "CONFLICTED")

    def test_07_complete_rules_receipts_pass_structural_gate(self):
        r = audit(self.make_inventory(), [receipt(), receipt("Beta")])
        self.assertEqual(r["coverage"]["percent"], 100)
        self.assertTrue(r["gates"]["RULES_COMPLETE"])
        self.assertFalse(r["gates"]["RECOMMENDATIONS_VALIDATED"])

    def test_08_interaction_requires_rules_on_all_cards(self):
        case = {"cards": ["Alpha", "Beta"], "steps": ["A", "B"],
                "setup": "Both in play", "outcome": "Repeatable value",
                "evidence_ref": "synthetic:table", "test_method": "manual stack trace",
                "tested_at": "2026-10-25T10:00:00Z", "result": "PASS"}
        r = audit(self.make_inventory(), [receipt()], [case])
        self.assertEqual(r["interactions"][0]["status"], "NOT_VERIFIED")
        r2 = audit(self.make_inventory(), [receipt(), receipt("Beta")], [case])
        self.assertTrue(r2["gates"]["INTERACTIONS_VERIFIED"])

    def test_09_self_declared_pass_without_evidence_ref_is_not_verified(self):
        case = {"cards": ["Alpha"], "steps": ["A"], "setup": "test",
                "outcome": "test", "test_method": "manual", "tested_at": "2026-10-25T10:00:00Z", "result": "PASS"}
        r = audit(self.make_inventory("Name,Quantity\nAlpha,1\n"), [receipt()], [case])
        self.assertFalse(r["gates"]["INTERACTIONS_VERIFIED"])

    def test_10_bad_csv_must_fail_inventory_gate(self):
        r = audit(self.make_inventory("Name,Quantity\nAlpha,0\nBeta,2\n"))
        self.assertFalse(r["gates"]["INVENTORY_COMPLETE"])

    def test_11_timestamp_must_have_timezone(self):
        x = receipt(); x["checked_at"] = "2026-10-25T10:00:00"
        self.assertIn("invalid or missing checked_at", check_rules_snapshot("Alpha", x))

    def test_12_no_implicit_allocation_confirmation(self):
        r = audit(self.make_inventory(), [receipt(), receipt("Beta")], allocations={"Alpha": "CURRENT_DECK"})
        self.assertFalse(r["gates"]["ALLOCATION_CONFIRMED"])
        self.assertEqual(r["records"][1]["allocation"], "UNKNOWN")

    def test_13_deterministic_equal_inputs_equal_outputs(self):
        a = self.make_inventory()
        self.assertEqual(audit(a, [receipt()]), audit(a, [receipt()]))

    def test_14_bom_and_empty_inventory(self):
        a = self.make_inventory("Name,Quantity\n")
        self.assertFalse(audit(a)["gates"]["INVENTORY_COMPLETE"])
        self.assertEqual(a["unique_names"], 0)


if __name__ == "__main__":
    unittest.main()
