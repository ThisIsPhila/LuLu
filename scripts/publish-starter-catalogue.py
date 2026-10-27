#!/usr/bin/env python3
"""Atomically publish the checked-in fictional starter catalogue; dry-run by default."""
import argparse
import json
import pathlib
import subprocess
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
PROJECT = 'khora-lulu-2026'
DOCUMENTS = f'projects/{PROJECT}/databases/(default)/documents'
BASE = f'https://firestore.googleapis.com/v1/{DOCUMENTS}'
CATALOGUE = f'{DOCUMENTS}/demoCatalogues/johannesburg-v1'


def encode(value, field=''):
    if field == 'createdAt': return {'timestampValue': value}
    if isinstance(value, bool): return {'booleanValue': value}
    if isinstance(value, int): return {'integerValue': str(value)}
    if isinstance(value, str): return {'stringValue': value}
    if isinstance(value, list): return {'arrayValue': {'values': [encode(item) for item in value]}}
    raise ValueError(f'Unsupported field: {field}')


def fields(data): return {key: encode(value, key) for key, value in data.items()}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--apply', action='store_true', help='write the live shared catalogue')
    args = parser.parse_args()
    data = json.loads((ROOT / 'scripts/demo-catalogue-seed.json').read_text())
    entries, manifest = data['entries'], data['manifest']
    assert data['catalogueId'] == 'johannesburg-v1' and len(entries) == 10
    assert [entry['id'] for entry in entries] == manifest['entryIds']
    token = subprocess.check_output(['gcloud', 'auth', 'print-access-token'], text=True).strip()
    headers = {'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json'}
    with urllib.request.urlopen(urllib.request.Request(BASE + '/demoCatalogues/johannesburg-v1', headers=headers)) as response:
        current = json.load(response)
    old_ids = [v['stringValue'] for v in current['fields']['entryIds']['arrayValue']['values']]
    expected_old = ['demo-quiet-morning', 'demo-lantern-walk', 'demo-small-rituals']
    if old_ids != expected_old: raise SystemExit('Live manifest differs from the reviewed three-entry catalogue; no changes made.')
    writes = []
    for entry in entries:
        document = {key: value for key, value in entry.items() if key != 'id'}
        writes.append({'update': {'name': CATALOGUE + '/entries/' + entry['id'], 'fields': fields(document)}, 'currentDocument': {'exists': False}})
    writes.append({'update': {'name': CATALOGUE, 'fields': fields(manifest)}, 'currentDocument': {'updateTime': current['updateTime']}})
    print(f'Project {PROJECT}: atomically create {len(entries)} fictional entries and switch the manifest; existing account entries and old catalogue documents are untouched.')
    if not args.apply:
        print('Dry run only; no changes made.')
        return
    request = urllib.request.Request(BASE + ':commit', headers=headers, data=json.dumps({'writes': writes}).encode(), method='POST')
    with urllib.request.urlopen(request) as response: result = json.load(response)
    print(f"Published {len(result.get('writeResults', []))} documents in one commit.")

if __name__ == '__main__': main()
