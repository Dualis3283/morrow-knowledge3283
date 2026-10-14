"""Prototype Morrow Bridge record validation. No AI-conformance or consent attestation."""
import json
from datetime import datetime, timezone
from pathlib import Path

from jsonschema import Draft202012Validator, FormatChecker

SCHEMA = Path(__file__).resolve().parents[1] / '02-KNOWLEDGE' / 'bridge-record-v0.1.schema.json'


def load_schema():
    schema = json.loads(SCHEMA.read_text(encoding='utf-8'))
    Draft202012Validator.check_schema(schema)
    return schema


def validate_record(record):
    """Return list of human-readable errors; never silently coerce invalid data."""
    validator = Draft202012Validator(load_schema(), format_checker=FormatChecker())
    errors = [f"schema {'.'.join(map(str, e.path)) or '$'}: {e.message}" for e in validator.iter_errors(record)]
    if errors:
        return sorted(errors)
    if record['status'] == 'confirmed' and not any(p['claim_status'] == 'confirmed' for p in record['provenance']):
        errors.append('a confirmed record requires at least one provenance entry marked confirmed')
    if record['kind'] == 'tombstone' and record['deletion']['target_record_id'] == record['record_id']:
        errors.append('a tombstone must have a distinct identifier')
    if record.get('privacy', {}).get('retention', {}).get('policy') == 'until_date':
        if not record['privacy']['retention'].get('expires_at'):
            errors.append('until_date retention requires expires_at')
    if record['privacy']['share_policy']['allowed'] is False and record['privacy']['share_policy']['destinations']:
        errors.append('blocked share policy cannot list destinations')
    if record.get('verification', {}).get('result') == 'passed':
        ver = record['verification']
        if ver.get('method') in ('none', 'tool_receipt') or not ver.get('checked_at') or not ver.get('evidence_refs'):
            errors.append('passed verification needs actual checking method, time and evidence references')
    if record.get('action', {}).get('state') == 'verified' and record.get('verification', {}).get('result') != 'passed':
        errors.append('verified action requires a passed verification record')
    if record['kind'] != 'tombstone' and record['status'] == 'tombstone':
        errors.append('tombstone status requires tombstone kind')
    return errors


def can_export(record, destination, authorized_destinations, *, now=None):
    """Fail-closed local export gate, not a consent verification or transfer implementation.

    `authorized_destinations` must come from an authenticated caller-side policy,
    NEVER from the imported record itself. A non-empty allow-list alone still
    cannot establish consent, contractual authority or transport security.
    """
    if validate_record(record):
        return False
    if not isinstance(authorized_destinations, (set, frozenset)):
        return False
    if destination not in authorized_destinations:
        return False
    if record['kind'] == 'tombstone' or record['status'] in ('retracted', 'superseded'):
        return False
    privacy = record['privacy']
    if privacy.get('deletion_requested_at'):
        return False
    share = privacy['share_policy']
    if not share['allowed'] or destination not in share['destinations']:
        return False
    now = now or datetime.now(timezone.utc)
    if now.tzinfo is None:
        return False
    if privacy['retention']['policy'] == 'until_date':
        expiry = datetime.fromisoformat(privacy['retention']['expires_at'].replace('Z', '+00:00'))
        if expiry <= now:
            return False
    # Ephemeral records cannot leave the local runtime unless an explicit future policy allows it.
    if privacy['retention']['policy'] == 'ephemeral' and destination != 'local':
        return False
    return True


if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser(description='Validate a local Morrow Bridge JSON record')
    parser.add_argument('record', type=Path)
    args = parser.parse_args()
    data = json.loads(args.record.read_text(encoding='utf-8'))
    issues = validate_record(data)
    if issues:
        for issue in issues:
            print('FAIL:', issue)
        raise SystemExit(1)
    print('PASS: structurally and locally semantically valid; NOT verified true or authorized for export')
