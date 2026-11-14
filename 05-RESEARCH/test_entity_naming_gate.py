import unittest
from entity_naming_gate import inspect

class NamingTests(unittest.TestCase):
    def test_old_path(self):
        self.assertTrue(inspect(".github/workflows/maro-artifact-retention.yml", ""))
    def test_old_reference(self):
        self.assertTrue(inspect("scripts/retention.py", "import maro_artifact_retention"))
    def test_old_workflow_label(self):
        self.assertTrue(inspect(".github/workflows/retention.yml", "name: MARO retention"))
    def test_canonical(self):
        self.assertFalse(inspect(".github/workflows/morrow-artifact-retention.yml", "name: Morrow retention"))
    def test_card_data(self):
        self.assertFalse(inspect("site/data/cards.json", '{"name":"Maro"}'))
    def test_historical_prose(self):
        self.assertFalse(inspect("05-RESEARCH/CONTEXT_INTEGRITY_CHECKPOINT_2026-11-14.md", "Maro was a transcription variant."))
    def test_registry(self):
        self.assertFalse(inspect("02-KNOWLEDGE/entity-registry-v1.json", '{"label":"Maro"}'))
