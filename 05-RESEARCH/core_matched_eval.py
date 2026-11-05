#!/usr/bin/env python3
"""Offline, standard-library preparation and audit for Morrow Core paired pilots.

Does not invoke an AI model, grant permissions, or evaluate response quality.
"""
import argparse
import hashlib
import json
import random
import re
from pathlib import Path

ALLOWED_OBS = {'RESPONDED', 'BLOCKED', 'ERROR', 'NOT_RUN'}
ALLOWED_SCORES = {'PASS', 'FAIL', 'NOT_OBSERVED', 'NOT_APPLICABLE'}
MC_RE = re.compile(r'^MC-(0[1-9]|1[0-5])$')


def raw_sha(data):
    return hashlib.sha256(data).hexdigest()


def git_blob_sha(data):
    return hashlib.sha1(b'blob ' + str(len(data)).encode() + b'\0' + data).hexdigest()


def read_json(path):
    return json.loads(Path(path).read_text(encoding='utf-8'))


def save_json(path, payload):
    dst = Path(path)
    if dst.exists():
        raise ValueError(f'Refusing to overwrite existing study artifact: {dst}')
    dst.parent.mkdir(parents=True, exist_ok=True)
    dst.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')


def validate_fixtures(fixtures, spec_bytes):
    if fixtures.get('privacy') != 'synthetic_no_private_personal_data':
        raise ValueError('Fixture set must be explicitly labeled synthetic and public-safe')
    observed_blob = fixtures.get('spec', {}).get('observed_blob_sha')
    if observed_blob != git_blob_sha(spec_bytes):
        raise ValueError('Pinned Core specification Git blob SHA does not match local bytes')
    cases = fixtures.get('cases')
    if not isinstance(cases, list) or not cases:
        raise ValueError('No executable cases')
    ids = set()
    for case in cases:
        cid = case.get('id')
        if not isinstance(cid, str) or not re.fullmatch(r'T\d\d', cid) or cid in ids:
            raise ValueError('Invalid or duplicate case id')
        ids.add(cid)
        if not isinstance(case.get('task_input'), str) or not case['task_input'].strip():
            raise ValueError(f'{cid}: missing task input')
        if not isinstance(case.get('pre_registered_success'), str) or not case['pre_registered_success'].strip():
            raise ValueError(f'{cid}: missing preregistered success criterion')
        checks = case.get('checks')
        if not isinstance(checks, list) or not checks or len(set(checks)) != len(checks) or not all(isinstance(x, str) and MC_RE.fullmatch(x) for x in checks):
            raise ValueError(f'{cid}: invalid normative checks')
    conditions = fixtures.get('conditions', {})
    if not all(isinstance(conditions.get(k), str) and conditions[k].strip() for k in ('A_baseline', 'B_morrow')):
        raise ValueError('Both paired conditions must be defined')
    return cases


def make_plan(fixtures, spec_bytes, fixture_bytes, provider, model, seed):
    if not provider.strip() or not model.strip():
        raise ValueError('Explicit provider and exact model version required')
    cases = validate_fixtures(fixtures, spec_bytes)
    trials = []
    for case in cases:
        for arm in ('A_baseline', 'B_morrow'):
            token = hashlib.sha256(f'{seed}:{case["id"]}:{arm}:MorrowMatchedEvalV1'.encode()).hexdigest()[:20]
            trials.append({'trial_id': f'run-{token}', 'case_id': case['id'],
                           'arm': arm, 'task_input': case['task_input'], 'checks': case['checks'],
                           'instruction': fixtures['conditions'][arm]})
    random.Random(seed).shuffle(trials)
    return {
        'state': 'PREPARED_NOT_EXECUTED', 'protocol': 'core-matched-eval-candidate-v0.1',
        'provider': provider, 'exact_model_version': model,
        'fixture_revision': fixtures['fixture_revision'],
        'fixture_sha256': raw_sha(fixture_bytes), 'spec_git_blob_sha': git_blob_sha(spec_bytes),
        'spec_sha256': raw_sha(spec_bytes),
        'constraints': 'Fresh chat per trial; same model/version/tools/context budget where feasible; no unapproved private context.',
        'trials': trials,
    }


def make_blind_review(plan, observations):
    expected = {t['trial_id']: t for t in plan['trials']}
    if len(expected) != len(plan['trials']):
        raise ValueError('Duplicate plan IDs')
    actual = {}
    for o in observations:
        tid = o.get('trial_id')
        if tid not in expected or tid in actual:
            raise ValueError('Unexpected or duplicate observation ID')
        if o.get('status') not in ALLOWED_OBS:
            raise ValueError(f'{tid}: invalid status')
        if o['status'] == 'RESPONDED' and (not isinstance(o.get('response'), str) or not o['response'].strip()):
            raise ValueError(f'{tid}: RESPONDED needs verbatim output')
        if o['status'] != 'RESPONDED' and o.get('response'):
            raise ValueError(f'{tid}: non-response cannot be attributed as model output')
        actual[tid] = o
    # No arm, provider, exact model version, intervention text or assignment key in reviewer packet.
    return {'state': 'UNSCORED_BLINDED_PACK', 'protocol': plan['protocol'], 'review_items': [
        {'trial_id': t['trial_id'], 'case_id': t['case_id'], 'checks': t['checks'],
         'response_status': actual.get(t['trial_id'], {'status': 'NOT_RUN'})['status'],
         'observed_response': actual.get(t['trial_id'], {}).get('response', ''),
         'scores': {mc: 'NOT_OBSERVED' for mc in t['checks']},
         'reviewer_id': '', 'rationale': ''}
        for t in plan['trials']
    ]}


def summarize(plan, review):
    expected = {t['trial_id']: t for t in plan['trials']}
    rows = review['review_items']
    seen = set()
    counts = {arm: {'planned': 0, 'responded': 0, 'reviewed': 0, 'all_checks_pass': 0,
                    'any_fail': 0, 'not_observed_or_incomplete': 0} for arm in ('A_baseline', 'B_morrow')}
    for t in plan['trials']:
        counts[t['arm']]['planned'] += 1
    for row in rows:
        tid = row.get('trial_id')
        if tid not in expected or tid in seen:
            raise ValueError('Unexpected or duplicate review ID')
        seen.add(tid)
        t = expected[tid]
        arm_counts = counts[t['arm']]
        status = row.get('response_status')
        if status not in ALLOWED_OBS:
            raise ValueError(f'{tid}: invalid response status')
        ratings = row.get('scores')
        if not isinstance(ratings, dict) or set(ratings) != set(t['checks']) or any(v not in ALLOWED_SCORES for v in ratings.values()):
            raise ValueError(f'{tid}: missing or invalid requirement ratings')
        if status != 'RESPONDED' and any(v in {'PASS','FAIL'} for v in ratings.values()):
            raise ValueError(f'{tid}: blocked/unobserved trial must not be scored')
        reviewed = bool(row.get('reviewer_id','').strip()) and bool(row.get('rationale','').strip())
        if status == 'RESPONDED':
            arm_counts['responded'] += 1
        if reviewed and status == 'RESPONDED':
            arm_counts['reviewed'] += 1
            if all(v == 'PASS' for v in ratings.values()):
                arm_counts['all_checks_pass'] += 1
            elif any(v == 'FAIL' for v in ratings.values()):
                arm_counts['any_fail'] += 1
            else:
                arm_counts['not_observed_or_incomplete'] += 1
        else:
            arm_counts['not_observed_or_incomplete'] += 1
    if len(seen) != len(expected):
        raise ValueError('Review pack missing expected trials')
    return {'study_status': 'UNBLINDED_AGGREGATE_NOT_CERTIFICATION',
            'scoring': counts, 'limitations': [
                'Human reviewer independence is not authenticated by this program.',
                'Insufficient or missing observations are not failures of a model.',
                'No effectiveness, compatibility, or universal applicability claim follows from this report.',
                'A matching paired causal comparison also needs audited model/settings/tool parity and case-level reviewer adjudication.',
            ]}


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    sub = ap.add_subparsers(dest='command', required=True)
    p = sub.add_parser('plan', help='Prepare paired runs without invoking any model')
    p.add_argument('--fixtures', required=True)
    p.add_argument('--spec', required=True)
    p.add_argument('--provider', required=True)
    p.add_argument('--model-version', required=True)
    p.add_argument('--seed', type=int, required=True)
    p.add_argument('--out', required=True)
    p = sub.add_parser('blind', help='Strip arm metadata from observed responses')
    p.add_argument('--plan', required=True)
    p.add_argument('--observations', required=True)
    p.add_argument('--out', required=True)
    p = sub.add_parser('summary', help='Audit and unblind completed manual scores')
    p.add_argument('--plan', required=True)
    p.add_argument('--review', required=True)
    p.add_argument('--out', required=True)
    args = ap.parse_args()
    if args.command == 'plan':
        source = Path(args.fixtures).read_bytes()
        spec = Path(args.spec).read_bytes()
        result = make_plan(json.loads(source), spec, source, args.provider, args.model_version, args.seed)
    elif args.command == 'blind':
        result = make_blind_review(read_json(args.plan), read_json(args.observations)['observations'])
    else:
        result = summarize(read_json(args.plan), read_json(args.review))
    save_json(args.out, result)
    print(f'{args.command.upper()}: wrote {args.out} (not a model evaluation result)')


if __name__ == '__main__':
    main()
