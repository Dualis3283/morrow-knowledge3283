import copy
import json
from pathlib import Path
import unittest

from entity_role_resolver import resolve, validate_registry, intent_checkpoint

REG = Path(__file__).parents[1] / "02-KNOWLEDGE/entity-registry-v1.json"

def synthetic():
    def entity(id, label, scopes):
        return dict(id=id, label=label, type="person", classification="private", scopes=scopes, source="synthetic")
    def role(id, label, scopes):
        return dict(id=id, label=label, classification="private", scopes=scopes, source="synthetic")
    def assignment(id, entity_id, role_id, scope, start, end=None, status="confirmed"):
        return dict(id=id, entity_id=entity_id, role_id=role_id, scope=scope, valid_from=start,
                    valid_to=end, status=status, classification="private", source="synthetic")
    return dict(schema_version="morrow-entity-registry-1", visibility="private",
        contexts=[dict(id="work", label="Work"), dict(id="social", label="Social")],
        entities=[entity("p-001", "Person 001", ["work", "social"]), entity("p-002", "Person 002", ["work"])],
        roles=[role("manager", "Manager", ["work"]), role("friend", "Friend", ["social"])],
        assignments=[assignment("a-001", "p-001", "manager", "work", "2025-01-01", "2026-01-01", "superseded"),
                     assignment("a-002", "p-002", "manager", "work", "2026-01-01"),
                     assignment("a-003", "p-001", "friend", "social", "2025-01-01")],
        aliases=[dict(label="Former name", target="p-001", kind="entity", scopes=["work"],
                      status="confirmed", source="synthetic")])

class ResolverTests(unittest.TestCase):
    def setUp(self):
        self.reg = json.loads(REG.read_text())
        self.private = synthetic()
    def role(self, name="manager", scope="work", as_of="2026-01-01", **kw):
        return resolve(self.private, name, scope=scope, as_of=as_of, private_access=True, **kw)
    def test_registry(self):
        validate_registry(self.reg)
        validate_registry(self.private)
    def test_alias(self):
        for name in ("Maro", " MORROW ", "Morrow method"):
            self.assertEqual(resolve(self.reg, name, scope="morrow")["entity_id"], "morrow")
    def test_unrelated_card(self):
        reg = copy.deepcopy(self.reg)
        reg["entities"].append(dict(id="card-maro", label="Maro", type="card", classification="public",
                                    scopes=["mtg"], source="synthetic"))
        self.assertEqual(resolve(reg, "Maro", scope="mtg")["entity_id"], "card-maro")
        self.assertEqual(resolve(reg, "Maro", scope="morrow")["entity_id"], "morrow")
        self.assertEqual(resolve(self.reg, "Maro", scope="mtg")["outcome"], "unresolved")
    def test_missing_context(self):
        self.assertEqual(resolve(self.reg, "Maro", scope=None)["outcome"], "clarification_required")
    def test_unknown_variant_not_guessed(self):
        self.assertEqual(resolve(self.reg, "Morro", scope="morrow")["outcome"], "unresolved")
    def test_role_change(self):
        self.assertEqual(self.role(as_of="2025-12-31")["entity_id"], "p-001")
        self.assertEqual(self.role()["entity_id"], "p-002")
    def test_multiple_roles_one_person(self):
        self.assertEqual(self.role(as_of="2025-12-31")["entity_id"],
                         self.role("friend", "social")["entity_id"])
    def test_role_only(self):
        self.assertEqual(self.role(identity_required=False), {"outcome": "role_only", "role_id": "manager"})
    def test_role_date_required(self):
        self.assertEqual(self.role(as_of=None)["outcome"], "clarification_required")
    def test_collision(self):
        self.private["assignments"].append(dict(self.private["assignments"][1], id="a-004", entity_id="p-001"))
        self.assertEqual(self.role()["outcome"], "clarification_required")
    def test_unknown_start(self):
        self.private["assignments"][1]["valid_from"] = None
        self.assertEqual(self.role()["outcome"], "clarification_required")
    def test_alias_name_change(self):
        self.assertEqual(self.role("Former name")["entity_id"], "p-001")
    def test_privacy(self):
        self.assertEqual(resolve(self.private, "manager", scope="work"), {"outcome":"not_available","candidates":[]})
        self.private["visibility"] = "public"
        with self.assertRaises(ValueError):
            validate_registry(self.private)
    def test_provisional_collision(self):
        self.reg["aliases"].append(dict(label="Morrow", target="context-bridge", kind="entity", scopes=["morrow"],
                                        status="provisional", source="synthetic"))
        self.assertEqual(resolve(self.reg, "Morrow", scope="morrow")["outcome"], "clarification_required")
    def test_dangling_assignment(self):
        self.private["assignments"][0]["entity_id"] = "absent"
        with self.assertRaises(ValueError):
            validate_registry(self.private)
    def test_duplicate_id(self):
        self.reg["entities"].append(self.reg["entities"][0].copy())
        with self.assertRaises(ValueError):
            validate_registry(self.reg)
    def test_intent_authority_and_target(self):
        result = resolve(self.reg, "Maro", scope="morrow")
        base = dict(scope="morrow", action="review", target_id="morrow")
        self.assertEqual(intent_checkpoint(result, **base)["decision"], "blocked")
        self.assertEqual(intent_checkpoint(result, **dict(base,target_id="other"), authority_verified=True)["decision"], "blocked")
        self.assertEqual(intent_checkpoint(result, **base, authority_verified=True)["decision"], "candidate_ready")
        self.assertFalse(intent_checkpoint(result, **base, authority_verified=True)["execution_verified"])
    def test_scope_mismatch_blocks_write(self):
        result = resolve(self.reg, "Morrow", scope="morrow")
        self.assertEqual(intent_checkpoint(result, scope="website", action="review", target_id="morrow",
                                           authority_verified=True)["decision"], "blocked")
    def test_contextual_method_alias(self):
        self.assertEqual(resolve(self.reg, "Maro method", scope="mtg")["entity_id"], "morrow")
    def test_private_truthy_not_authority(self):
        self.assertEqual(resolve(self.private, "manager", scope="work", private_access="yes"),
                         {"outcome":"not_available","candidates":[]})
    def test_current_intent_not_historical(self):
        result = resolve(self.reg, "Morrow", scope="morrow")
        self.assertEqual(intent_checkpoint(result, scope="morrow", action="stop", target_id="morrow",
                                           authority_verified=True)["action"], "stop")

if __name__ == "__main__":
    unittest.main()
