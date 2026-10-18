"""Regression cases for the publication privacy scanner."""
import importlib.util
from pathlib import Path
import unittest

source = Path(__file__).with_name("publication_privacy_scan.py")
spec = importlib.util.spec_from_file_location("privacy_scanner", source)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

class PublicationPrivacyTests(unittest.TestCase):
    def kinds(self, text):
        return {kind for _, kind in mod.scan_text(text)}

    def test_private_workspace_link_blocked(self):
        url = "https://app." + "notion.com/p/private-record-example"
        self.assertIn("private-workspace-deep-link", self.kinds(url))

    def test_email_blocked(self):
        email = "dave" + "@" + "example.com"
        self.assertIn("email-address", self.kinds(email))

    def test_secret_blocked(self):
        token = "ghp_" + "ABCDEFGHIJKLMNOPQRSTUVWXYZ12345"
        self.assertIn("secret-token", self.kinds(token))

    def test_private_health_statement_blocked(self):
        self.assertIn("disclosed-private-health", self.kinds("I was " + "diagnosed with X"))

    def test_public_methodology_allowed(self):
        text = "Context → Evidence → Pattern → Interpretation → Action → Verification."
        self.assertEqual(self.kinds(text), set())

    def test_public_website_and_repo_allowed(self):
        text = "https://github.com/Dualis3283/morrow-knowledge3283\nhttps://david-walsh.pages.dev/"
        self.assertEqual(self.kinds(text), set())

if __name__ == "__main__":
    unittest.main()
