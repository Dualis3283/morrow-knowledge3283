"""Minimal source-only contract test; stdlib only."""
import importlib.util
import pathlib
import unittest

HERE = pathlib.Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location("auditmod", HERE/"workflow_ledger_audit.py")
mod=importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

class TestLedger(unittest.TestCase):
    def test_coded_workflows_are_contiguous(self):
        a=mod.audit()
        self.assertTrue(a["numbers_contiguous"])
        self.assertGreaterEqual(a["count"],19)
        self.assertEqual(a["task_register_count"],a["count"])
        self.assertEqual(a["mandatory_field_coverage"],a["count"])
    def test_rates_require_explicit_freeze(self):
        a=mod.audit()
        if not a["metric_definition_v1_frozen"]:
            self.assertTrue(all(v is None for v in a["six_core_metric_rates"].values()))
    def test_unknown_is_not_zero(self):
        self.assertEqual(mod.flag("Not applicable — staging"),"not_applicable")
        self.assertEqual(mod.flag("No observed defect"),"not_observed")
        self.assertEqual(mod.flag(""),"unknown")
if __name__=="__main__":
    unittest.main()
