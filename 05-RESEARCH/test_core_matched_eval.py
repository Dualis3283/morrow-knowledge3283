"""Structural and negative tests. Passing does NOT establish Core conformance."""
import copy
import hashlib
import importlib.util
import json
import sys
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('core_matched_eval', HERE / 'core_matched_eval.py')
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)


class MatchedEvalTests(unittest.TestCase):
    def setUp(self):
        self.core = b'Candidate Morrow Core test bytes\n'
        self.fixture = {'privacy': 'synthetic_no_private_personal_data',
                        'fixture_revision': '0.1',
                        'spec': {'observed_blob_sha': m.git_blob_sha(self.core)},
                        'conditions': {'A_baseline': 'Plain task only', 'B_morrow': 'Pinned Core + task'},
                        'cases': [{'id': 'T01', 'task_input': 'Which instruction applies?',
                                   'pre_registered_success': 'Current authorized instruction',
                                   'checks': ['MC-01', 'MC-07']}]}
        self.b = json.dumps(self.fixture).encode('utf-8')
        self.plan = m.make_plan(self.fixture, self.core, self.b, 'local-test', 'model-test-v1', 31)

    def test_paired_run_count_and_pinned_spec(self):
        self.assertEqual(2, len(self.plan['trials']))
        self.assertEqual({'A_baseline', 'B_morrow'}, {t['arm'] for t in self.plan['trials']})
        self.assertEqual(m.git_blob_sha(self.core), self.plan['spec_git_blob_sha'])

    def test_reject_spec_drift(self):
        with self.assertRaisesRegex(ValueError, 'does not match'):
            m.validate_fixtures(self.fixture, self.core + b'changed')

    def test_reject_duplicate_fixture_case(self):
        f = copy.deepcopy(self.fixture)
        f['cases'].append(f['cases'][0])
        with self.assertRaisesRegex(ValueError, 'duplicate'):
            m.validate_fixtures(f, self.core)

    def test_reject_missing_or_unpinned_conditions(self):
        f = copy.deepcopy(self.fixture)
        f['conditions'].pop('A_baseline')
        with self.assertRaisesRegex(ValueError, 'Both paired'):
            m.validate_fixtures(f, self.core)

    def test_blind_pack_excludes_treatment_label(self):
        tid = self.plan['trials'][0]['trial_id']
        output = m.make_blind_review(self.plan, [{'trial_id': tid, 'status': 'RESPONDED',
                                                   'response': 'Output recorded verbatim'}])
        encoded = json.dumps(output)
        for hidden in ('A_baseline', 'B_morrow', 'model-test-v1', 'Pinned Core + task', 'local-test'):
            self.assertNotIn(hidden, encoded)
        self.assertIn('Output recorded verbatim', encoded)
        self.assertEqual('NOT_RUN', output['review_items'][1]['response_status'])

    def test_no_model_failure_scoring_when_access_blocked(self):
        blind = m.make_blind_review(self.plan, [])
        for t in blind['review_items']:
            t['response_status'] = 'BLOCKED'
            t['scores'] = {mc: 'FAIL' for mc in t['checks']}
        with self.assertRaisesRegex(ValueError, 'must not be scored'):
            m.summarize(self.plan, blind)

    def test_honest_zero_study_report(self):
        report = m.summarize(self.plan, m.make_blind_review(self.plan, []))
        self.assertEqual(0, report['scoring']['A_baseline']['reviewed'])
        self.assertEqual(0, report['scoring']['B_morrow']['all_checks_pass'])
        self.assertEqual('UNBLINDED_AGGREGATE_NOT_CERTIFICATION', report['study_status'])

    def test_reject_duplicate_observation(self):
        tid = self.plan['trials'][0]['trial_id']
        obs = [{'trial_id': tid, 'status': 'NOT_RUN'}] * 2
        with self.assertRaisesRegex(ValueError, 'duplicate'):
            m.make_blind_review(self.plan, obs)

    def test_reject_blank_response_masquerading_as_success(self):
        tid = self.plan['trials'][0]['trial_id']
        with self.assertRaisesRegex(ValueError, 'verbatim'):
            m.make_blind_review(self.plan, [{'trial_id':tid, 'status':'RESPONDED','response':'  '}])

    def test_score_attested_not_independent(self):
        obs = [{'trial_id': t['trial_id'], 'status':'RESPONDED','response':'Synthetic output'}
               for t in self.plan['trials']]
        blind = m.make_blind_review(self.plan, obs)
        for row in blind['review_items']:
            row['reviewer_id'] = 'test-reviewer'
            row['rationale'] = 'Reviewed fixture output manually in unit test'
            row['scores'] = {mc: 'PASS' for mc in row['checks']}
        report = m.summarize(self.plan, blind)
        self.assertEqual(1, report['scoring']['A_baseline']['all_checks_pass'])
        self.assertIn('not authenticated', report['limitations'][0])


if __name__ == '__main__':
    unittest.main()
