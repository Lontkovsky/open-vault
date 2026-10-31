#!/usr/bin/env python3
"""Idempotently create/link the declared backlog. GitHub owns execution status."""
import json
import pathlib
import re
import subprocess

ROOT = pathlib.Path(__file__).resolve().parents[1]
PATH = ROOT / 'docs/backlog.json'
data = json.loads(PATH.read_text())
repo = data['repository']


def gh(*args, payload=None):
    command = ['gh', *args]
    if payload is not None:
        command += ['--input', '-']
    completed = subprocess.run(command, input=json.dumps(payload) if payload is not None else None,
                               text=True, check=True, capture_output=True)
    return json.loads(completed.stdout) if completed.stdout.strip() else None


milestones = {m['title']: m['number'] for m in gh('api', f'repos/{repo}/milestones?state=all&per_page=100')}
for title in ['Development release', 'Production Readiness']:
    if title not in milestones:
        milestones[title] = gh('api', f'repos/{repo}/milestones', '--method', 'POST', payload={'title': title})['number']
labels = {x['name'] for x in gh('api', f'repos/{repo}/labels?per_page=100')}
for name, color in [('epic', '312e81'), ('development', '0e7490'), ('production-readiness', 'a16207'), ('security', 'b91c1c'), ('P0', '991b1b'), ('P1', '1d4ed8'), ('P2', '475569')]:
    if name not in labels:
        gh('api', f'repos/{repo}/labels', '--method', 'POST', payload={'name': name, 'color': color})
issues = [x for x in gh('api', f'repos/{repo}/issues?state=all&per_page=100') if 'pull_request' not in x]
existing_by_identifier = {x['title'].split(' — ')[0]: x for x in issues}
existing_by_number = {x['number']: x for x in issues}
project_items = gh('project', 'item-list', str(data['projectNumber']), '--owner', data['owner'], '--limit', '200', '--format', 'json')['items']
linked = {x.get('content', {}).get('url') for x in project_items}
resolved = {}
created_count = 0
updated_body_count = 0
bound_issues = {}
declared = set()

for item in data['items']:
    identifier = item['id']
    missing_dependencies = [dependency for dependency in item['dependencies'] if dependency not in declared]
    if missing_dependencies:
        raise RuntimeError(f"{identifier}: dependencies must be declared first: {', '.join(missing_dependencies)}")
    stored_number = item.get('number')
    stored_url = item.get('issue')
    if (stored_number is None) != (stored_url is None):
        raise RuntimeError(f'{identifier}: issue number and URL must be declared together')
    if stored_number is not None:
        issue = existing_by_number.get(stored_number)
        if issue is None:
            raise RuntimeError(f'{identifier}: stored issue #{stored_number} does not exist')
        if issue['html_url'] != stored_url:
            raise RuntimeError(f"{identifier}: stored URL {stored_url} does not match {issue['html_url']}")
        bound_issues[identifier] = issue
    declared.add(identifier)


def dependency_text(item):
    if not item['dependencies']:
        return 'No implementation prerequisites.'
    missing = [dependency for dependency in item['dependencies'] if dependency not in resolved]
    if missing:
        raise RuntimeError(f"{item['id']}: unresolved dependencies: {', '.join(missing)}")
    return ', '.join(f"[{dependency}]({resolved[dependency]['html_url']})" for dependency in item['dependencies'])


def synchronize_dependency_links(body, item):
    for dependency in item['dependencies']:
        expected = f"[{dependency}]({resolved[dependency]['html_url']})"
        body = re.sub(rf'\[{re.escape(dependency)}\]\([^)]+\)', expected, body)
    return body


for item in data['items']:
    identifier = item['id']
    issue = bound_issues.get(identifier) or existing_by_identifier.get(identifier)
    if issue is None:
        body = '\n\n'.join([
            f"## Goal and user value\n{item['goal']}",
            f"## Scope\n{item['scope']}\n\nOut of scope: {item['outOfScope']}",
            '## Dependencies\n' + dependency_text(item),
            '## Acceptance criteria\n' + '\n'.join(f'- [ ] {x}' for x in item['acceptance']),
            f"## Positive and negative verification\n{item['verification']}",
            f"## Privacy and security\n{item['privacy']}",
            f"## Fixtures\n{item['fixtures']}",
            f"## How to verify\n{item['howToVerify']}",
            '## Definition of Done\nAll listed criteria have reproducible evidence, linked PR and passing required CI. Browser behavior is checked in the existing in-app session where applicable. Requirements and attack registries reflect actual outcomes. External audit is never inferred from self-review.',
            f"Requirement references: {', '.join(item['requirements'])}. Epic: {item['epic']}. Risk: {item['risk']}. Phase: {item['phase']}.",
        ])
        labels = [item['priority'], 'production-readiness' if item['phase'] == 'Production Readiness' else 'development']
        if identifier.startswith('E'):
            labels.append('epic')
        issue = gh('api', f'repos/{repo}/issues', '--method', 'POST', payload={
            'title': f"{identifier} — {item['title']}", 'body': body,
            'milestone': milestones[item['phase']], 'labels': labels,
        })
        created_count += 1
    else:
        body = synchronize_dependency_links(issue.get('body') or '', item)
        if body != issue.get('body'):
            issue = gh('api', f'repos/{repo}/issues/{issue["number"]}', '--method', 'PATCH', payload={'body': body})
            updated_body_count += 1
    existing_by_identifier[identifier] = issue
    existing_by_number[issue['number']] = issue
    resolved[identifier] = issue
    item['issue'] = issue['html_url']
    item['number'] = issue['number']
    PATH.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')
    if issue['html_url'] not in linked:
        gh('project', 'item-add', str(data['projectNumber']), '--owner', data['owner'], '--url', issue['html_url'], '--format', 'json')
    print(f"{identifier}: {issue['html_url']}", flush=True)
print(f'Summary: created {created_count}; dependency bodies updated {updated_body_count}', flush=True)
