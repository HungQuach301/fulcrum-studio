"""FS24 evidence v1. Stdlib only. No implicit network/retry in the receiver.
Draft: authorization and live qualification remain external, mandatory gates.
"""
import argparse
import base64
import hashlib
import json
import os
import pathlib
import re
import stat
import sys
import urllib.error
import urllib.parse
import urllib.request
import zipfile

REPO = 'HungQuach301/fulcrum-studio'
CHECKPOINT = 'c4a4445e619175c015469cd33ebd427ecdd687a1'
SOURCE_HEAD = '7578f55bbe1563be68623c2d35610852de4134ea'
SOURCE_RUN = 35041700609
SOURCE_JOBS = {'admit': 104622761595, 'controller': 104628070660}
PART_BYTES = 2 * 1024 * 1024
MAX_PARTS = 32
MAX_RAW = 2 * 1024 * 1024 * 1024
MAX_FILES = 4096
VERSION = 'FS24E/1'
sys.dont_write_bytecode = True
E_APPROVAL = 'aba01d018c9a3281dd4e100660264597510ec3005d8e1c0c1b74de5c4e5e0c1f'


def need(ok, reason):
    if not ok:
        raise ValueError(reason)


def canonical(value):
    return (json.dumps(value, sort_keys=True, separators=(',', ':'), ensure_ascii=True) + '\n').encode()


def sha(data):
    return hashlib.sha256(data).hexdigest()


def measure(path):
    h = hashlib.sha256()
    count = 0
    with pathlib.Path(path).open('rb') as f:
        for block in iter(lambda: f.read(1024 * 1024), b''):
            count += len(block)
            h.update(block)
    return {'bytes': count, 'sha256': h.hexdigest()}


def write_new(path, data):
    with pathlib.Path(path).open('xb') as f:
        f.write(data)


def safe_name(name):
    return isinstance(name, str) and re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9_.-]{0,199}', name) is not None


def files_in(directory):
    rows = []
    total = 0
    for path in sorted(pathlib.Path(directory).iterdir()):
        need(safe_name(path.name) and path.is_file() and not path.is_symlink(), 'UnsafeMember')
        info = measure(path)
        total += info['bytes']
        need(total <= MAX_RAW and len(rows) < MAX_FILES, 'RawResourceEnvelope')
        rows.append({'name': path.name, **info})
    need(rows, 'EmptyEvidence')
    return rows


def identity():
    need(os.environ.get('GITHUB_REPOSITORY') == REPO, 'Repository')
    need(os.environ.get('GITHUB_RUN_ATTEMPT') == '1', 'Attempt')
    head = os.environ.get('FS_HEAD') or os.environ.get('GITHUB_SHA', '')
    need(re.fullmatch('[a-f0-9]{40}', head), 'Head')
    return {'repository': REPO, 'run': os.environ['GITHUB_RUN_ID'], 'attempt': '1',
            'head': head, 'job': os.environ.get('FS_JOB', 'prepare'),
            'event': os.environ['GITHUB_EVENT_NAME']}


def pack(directory, target, source):
    """Read-only input. ZIP keeps original member bytes; no console base64."""
    rows = files_in(directory)
    manifest = {'version': VERSION, 'source': source, 'members': rows}
    need(all(x['name'] != 'bundle-manifest.json' for x in rows), 'ReservedMember')
    with zipfile.ZipFile(target, 'x', compression=zipfile.ZIP_DEFLATED, compresslevel=6, allowZip64=True) as z:
        z.writestr('bundle-manifest.json', canonical(manifest))
        for row in rows:
            z.write(pathlib.Path(directory) / row['name'], row['name'])
    need(measure(target)['bytes'] <= PART_BYTES * MAX_PARTS, 'CompressedResourceEnvelope')
    return manifest


def unpack(source, directory, expected=None):
    """Streaming CRC and member verification. Never extract untrusted paths."""
    directory = pathlib.Path(directory)
    directory.mkdir(exist_ok=False)
    with pathlib.Path(source).open('rb') as tail:
        tail.seek(-22, 2)
        eocd = tail.read()
        need(eocd[:4] == b'PK\x05\x06' and eocd[-2:] == b'\x00\x00', 'TrailingOrCommentedBundle')
    with zipfile.ZipFile(source) as z:
        infos = z.infolist()
        need(1 < len(infos) <= MAX_FILES + 1, 'MemberCount')
        names = [x.filename for x in infos]
        need(len(set(names)) == len(names), 'DuplicateMember')
        need(all(safe_name(x.filename) and not x.is_dir() and not x.flag_bits & 1
                 and not stat.S_ISLNK(x.external_attr >> 16) for x in infos), 'UnsafeZip')
        need(sum(x.file_size for x in infos) <= MAX_RAW + 1024 * 1024, 'ExpansionEnvelope')
        need(z.getinfo('bundle-manifest.json').file_size <= 1024 * 1024, 'ManifestEnvelope')
        manifest = json.loads(z.read('bundle-manifest.json'))
        need(manifest['version'] == VERSION, 'Version')
        if expected is not None:
            need(manifest['source'] == expected, 'SourceBinding')
        rows = manifest['members']
        need(len({r['name'] for r in rows}) == len(rows), 'DuplicateDeclaration')
        need(set(names) == {'bundle-manifest.json'} | {r['name'] for r in rows}, 'MemberInventory')
        for row in rows:
            need(safe_name(row['name']), 'UnsafeDeclaredMember')
            need(z.getinfo(row['name']).file_size == row['bytes'], 'MemberSize')
            with z.open(row['name']) as src, (directory / row['name']).open('xb') as out:
                count = 0
                for block in iter(lambda: src.read(1024 * 1024), b''):
                    count += len(block)
                    need(count <= row['bytes'], 'MemberOverflow')
                    out.write(block)
            need(measure(directory / row['name']) == {k: row[k] for k in ('bytes', 'sha256')}, 'MemberHash')
        write_new(directory / 'bundle-manifest.json', canonical(manifest))
    return manifest


def split(source, directory, binding):
    size = measure(source)
    need(0 < size['bytes'] <= PART_BYTES * MAX_PARTS, 'TransferEnvelope')
    directory = pathlib.Path(directory)
    directory.mkdir(exist_ok=False)
    rows = []
    with pathlib.Path(source).open('rb') as f:
        while True:
            data = f.read(PART_BYTES)
            if not data:
                break
            number = len(rows)
            name = 'part-%03d.bin' % number
            write_new(directory / name, data)
            rows.append({'part': number, 'name': name, 'offset': number * PART_BYTES,
                         'bytes': len(data), 'sha256': sha(data)})
    index = {'version': VERSION, 'binding': binding, 'archive': size, 'parts': rows}
    write_new(directory / 'transfer.json', canonical(index))
    return index


def validate_index(index):
    need(index['version'] == VERSION, 'Version')
    rows = index['parts']
    need(1 <= len(rows) <= MAX_PARTS, 'PartCount')
    offset = 0
    for i, r in enumerate(rows):
        need(r['part'] == i and r['name'] == 'part-%03d.bin' % i and r['offset'] == offset, 'PartOrder')
        need(0 < r['bytes'] <= PART_BYTES and (i == len(rows) - 1 or r['bytes'] == PART_BYTES), 'PartSize')
        need(re.fullmatch('[a-f0-9]{64}', r['sha256']), 'PartDigest')
        offset += r['bytes']
    need(index['archive']['bytes'] == offset and re.fullmatch('[a-f0-9]{64}', index['archive']['sha256']), 'ArchiveDeclaration')


def emit_part(directory, part, output=sys.stdout):
    directory = pathlib.Path(directory)
    index = json.loads((directory / 'transfer.json').read_bytes())
    validate_index(index)
    need(0 <= part < len(index['parts']), 'PartNumber')
    row = index['parts'][part]
    data = (directory / row['name']).read_bytes()
    need({'bytes': len(data), 'sha256': sha(data)} == {k: row[k] for k in ('bytes', 'sha256')}, 'PartHash')
    header = {'index': index, 'part': part, 'indexSha256': sha(canonical(index))}
    print('FS24E_BEGIN\t' + base64.b64encode(canonical(header)).decode(), file=output)
    encoded = base64.b64encode(data).decode()
    for i in range(0, len(encoded), 2048):
        print('FS24E_DATA\t%d\t%s' % (i // 2048, encoded[i:i + 2048]), file=output)
    print('FS24E_END\t%d\t%s' % (part, row['sha256']), file=output)


LINE = re.compile(r'^(?:\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d+Z\s+)?(FS24E_(?:BEGIN|DATA|END)\t[^\r\n]*)\r?$')


def decode_part(path, expected_index_hash):
    need(measure(path)['bytes'] <= 4 * 1024 * 1024, 'JobLogEnvelope')
    header = None
    chunks = []
    ended = False
    with pathlib.Path(path).open('r', encoding='utf-8', errors='strict', newline='') as f:
        for line in f:
            match = LINE.fullmatch(line.rstrip('\n'))
            if not match:
                continue
            bits = match[1].split('\t')
            if bits[0] == 'FS24E_BEGIN':
                need(header is None, 'DuplicateBegin')
                need(len(bits) == 2, 'HeaderShape')
                header = json.loads(base64.b64decode(bits[1], validate=True))
                validate_index(header['index'])
                need(sha(canonical(header['index'])) == expected_index_hash == header['indexSha256'], 'IndexPin')
                need(0 <= header['part'] < len(header['index']['parts']), 'PartNumber')
            elif bits[0] == 'FS24E_DATA':
                need(header is not None and not ended and len(bits) == 3, 'DataState')
                need(bits[1] == str(len(chunks)) and 0 < len(bits[2]) <= 2048, 'Sequence')
                chunks.append(bits[2])
                need(len(chunks) <= (PART_BYTES * 4 // 3 + 4) // 2048 + 1, 'FrameEnvelope')
            else:
                need(header is not None and not ended and len(bits) == 3, 'EndState')
                row = header['index']['parts'][header['part']]
                need(bits[1] == str(header['part']) and bits[2] == row['sha256'], 'EndBinding')
                ended = True
    need(header is not None and ended, 'MissingTerminal')
    data = base64.b64decode(''.join(chunks), validate=True)
    row = header['index']['parts'][header['part']]
    need(len(data) == row['bytes'] and sha(data) == row['sha256'], 'PartHash')
    return header, data


def receive(logs, directory, index_hash, expected_binding):
    """Caller supplies API-verified source binding and index hash from prepare log."""
    directory = pathlib.Path(directory)
    directory.mkdir(exist_ok=False)
    parts = {}
    index = None
    for path in logs:
        header, data = decode_part(path, index_hash)
        need(header['index']['binding'] == expected_binding, 'TransferBinding')
        if index is None:
            index = header['index']
        need(header['index'] == index and header['part'] not in parts, 'MixedOrDuplicatePart')
        part = header['part']
        write_new(directory / ('part-%03d.bin' % part), data)
        parts[part] = measure(path)
    need(index is not None and sorted(parts) == list(range(len(index['parts']))), 'MissingPart')
    archive = directory / 'original-bundle.zip'
    with archive.open('xb') as out:
        for r in index['parts']:
            with (directory / r['name']).open('rb') as src:
                for data in iter(lambda: src.read(1024 * 1024), b''):
                    out.write(data)
    need(measure(archive) == index['archive'], 'ArchiveHash')
    manifest = unpack(archive, directory / 'members', expected_binding)
    receipt = {'version': VERSION, 'status': 'bytes-verified', 'binding': expected_binding,
               'indexSha256': index_hash, 'archive': measure(archive), 'members': manifest['members'],
               'carrierLogs': [{'part': k, **parts[k]} for k in sorted(parts)],
               'sourceReceiptReconciliation': 'pending', 'nestedBundles': verify_nested_bundles(directory / 'members', expected_binding), 'ownerAcceptance': 'pending',
               'Q0': 'BLOCKED_HTTP_403', 'responseB': 'missing', 'WP002': 'todo'}
    write_new(directory / 'consumer-receipt.json', canonical(receipt))
    return receipt



def verify_nested_bundles(directory, binding):
    results = []
    declared = [x for x in binding.get('originals', []) if 'artifact' in x]
    for row in declared:
        options = [directory / ('candidate-artifact-%d.zip' % row['artifact']),
                   directory / ('source-artifact-%d.zip' % row['artifact'])]
        matches = [p for p in options if p.is_file()]
        need(len(matches) == 1 and measure(matches[0]) == {k: row[k] for k in ('bytes', 'sha256')}, 'NestedArchivePin')
        with zipfile.ZipFile(matches[0]) as outer:
            need(outer.namelist() == ['evidence-bundle.zip'], 'NestedArtifactInventory')
            info = outer.getinfo('evidence-bundle.zip')
            need(info.file_size <= PART_BYTES * MAX_PARTS and not stat.S_ISLNK(info.external_attr >> 16), 'NestedArchiveEnvelope')
            nested = directory / ('nested-%d.zip' % row['artifact'])
            write_new(nested, outer.read('evidence-bundle.zip'))
        target = directory / ('nested-%d' % row['artifact'])
        manifest = unpack(nested, target)
        source = manifest['source']
        need(source['repository'] == REPO and source['run'] == str(row['run'])
             and source['head'] == row['head'] and source['attempt'] == '1', 'NestedSourceBinding')
        names = {m['name'] for m in manifest['members']}
        for name in sorted(names):
            if re.fullmatch(r'observation-[a-f0-9-]+\.json', name):
                observation = json.loads((target / name).read_bytes())
                need(observation['version'] == VERSION and observation['stored'] in names
                     and all(observation[k] == source[k] for k in ['run', 'attempt', 'head', 'job']), 'ObservationBinding')
                need(measure(target / observation['stored']) == {k: observation[k] for k in ('bytes', 'sha256')}, 'ObservationByteHash')
        results.append({'artifact': row['artifact'], 'source': source, 'members': len(names),
                        'bytesVerified': True, 'finalJobStatus': 'requires-API-readback'})
    return results


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        return None


class Reader:
    """GET-only Actions reader. One attempt; raw error retained before parsing."""
    def __init__(self, directory):
        need(os.environ.get('GITHUB_ACTIONS') == 'true' and os.environ.get('GITHUB_REPOSITORY') == REPO, 'ActionsOnly')
        self.directory = pathlib.Path(directory)
        self.sequence = 0
        self.opener = urllib.request.build_opener(NoRedirect())

    def get(self, path, name, cap=1024 * 1024, binary=False):
        need(re.fullmatch(r'/(?:actions|git|pulls)/[A-Za-z0-9_/?=&.%-]+', path) and '..' not in path, 'GETScope')
        need('10425898194' not in path and safe_name(name), 'DeniedHistoricZIP')
        need(path != '/actions/jobs/104622761595/logs' and path != '/actions/jobs/104628070660/logs'
             or os.environ.get('FS_TRANSFER_MODE') == 'recover', 'HistoricLogGate')
        self.sequence += 1
        prefix = '%04d-' % self.sequence
        dest = self.directory / name
        need(not dest.exists(), 'NoRepeatReceive')
        url = 'https://api.github.com/repos/' + REPO + path
        headers = {'Authorization': 'Bearer ' + os.environ['GH_TOKEN'], 'Accept': 'application/vnd.github+json',
                   'Accept-Encoding': 'identity', 'X-GitHub-Api-Version': '2022-11-28'}
        hops = []
        for hop in range(2):
            req = urllib.request.Request(url, headers=headers, method='GET')
            try:
                response = self.opener.open(req)
            except urllib.error.HTTPError as error:
                response = error
            status = response.status
            hops.append({'status': status, 'requestId': response.headers.get('x-github-request-id'),
                         'apiVersion': response.headers.get('x-github-api-version-selected'), 'hop': hop})
            if status == 302 and binary and hop == 0:
                target = urllib.parse.urlparse(response.headers.get('Location', ''))
                need(target.scheme == 'https' and target.hostname and not target.username and not target.password
                     and target.port in (None, 443) and not target.fragment, 'RedirectShape')
                need(target.hostname.endswith(('.blob.core.windows.net', '.actions.githubusercontent.com', '.githubusercontent.com')),
                     'RedirectHostNeedsReview')
                response.close()
                url = target.geturl()
                headers = {'Accept-Encoding': 'identity'}  # never forward GitHub authentication
                continue
            if status != 200:
                cap = min(cap, 1024 * 1024)
            used = 0
            complete = False
            try:
                with dest.open('xb') as f:
                    for block in iter(lambda: response.read(1024 * 1024), b''):
                        used += len(block)
                        f.write(block)
                        need(used <= cap, 'ResponseEnvelope')
                length = response.headers.get('Content-Length')
                need(length is None or length.isdecimal() and used == int(length), 'ContentLengthMismatch')
                complete = status == 200
            finally:
                response.close()
                write_new(self.directory / (prefix + 'http.json'), canonical({'path': path, 'hops': hops,
                          'body': name, **measure(dest), 'contentLength': response.headers.get('Content-Length'),
                          'contentEncoding': response.headers.get('Content-Encoding'), 'complete': complete,
                          'attempts': 1, 'billingActualUsd': None}))
            need(status == 200, 'HTTP-no-retry:' + str(status))
            return dest if binary else json.loads(dest.read_bytes())
        raise ValueError('RedirectLimit')

    def page(self, path, key, label):
        rows = []
        page = 1
        while True:
            join = '&' if '?' in path else '?'
            value = self.get(path + join + 'per_page=50&page=' + str(page), '%s-%03d.json' % (label, page))
            chunk = value[key]
            rows.extend(chunk)
            need(len({x['id'] for x in rows}) == len(rows), 'PaginationDuplicate')
            if len(chunk) < 50:
                need(len(rows) == value.get('total_count', len(rows)), 'PaginationIncomplete')
                return rows
            page += 1


def bound_run(reader, run_id, label):
    run = reader.get('/actions/runs/' + str(run_id), label + '.json')
    need(run['id'] == run_id and run['repository']['full_name'] == REPO
         and run['head_repository']['full_name'] == REPO and run['run_attempt'] == 1, 'RunBinding')
    return run


def source_logs(reader, source, mode):
    run = bound_run(reader, SOURCE_RUN, 'historic-run')
    need(run['head_sha'] == SOURCE_HEAD and run['head_branch'] == 'main'
         and run['event'] == 'workflow_dispatch' and run['status'] == 'completed'
         and run['path'] == '.github/workflows/acceptance-wp002.yml', 'HistoricRunPin')
    jobs = reader.page('/actions/runs/%d/jobs' % SOURCE_RUN, 'jobs', 'historic-jobs')
    targets = SOURCE_JOBS if mode == 'recover' else {'report': 104641026916}
    for name, job_id in targets.items():
        matches = [j for j in jobs if j['id'] == job_id and j['name'] == name
                   and j['run_id'] == SOURCE_RUN and j['status'] == 'completed']
        need(len(matches) == 1, 'HistoricJobPin')
        path = reader.get('/actions/jobs/%d/logs' % job_id, 'original-%d.log' % job_id, MAX_RAW // 2, True)
        info = measure(path)
        if name == 'report':
            need(info == {'bytes': 4714, 'sha256': '747517b13effe28dfd935d7c1e8bf63c0cc68a6589da7d90c28785274fe18e76'}, 'ReportPin')
        source['originals'].append({'run': SOURCE_RUN, 'job': job_id, 'name': name, 'head': SOURCE_HEAD, **info})


ALLOW = ['engine/ops/work-packages/WP-002-evidence-recovery.md',
         '.github/workflows/recover-fs24-evidence.yml', 'engine/io/evidence-transfer.py',
         'engine/io/evidence-transfer.test.py', '.github/workflows/ci.yml',
         '.github/workflows/acceptance-wp002.yml', '.github/workflows/commit-artifacts.yml',
         '.github/workflows/reindex.yml', 'engine/io/github-transport.ts',
         'engine/io/wp002-integration.ts', 'engine/io/wp002-integration.test.ts',
         'scripts/wp002-preflight.py', 'scripts/guardrails/index.ts',
         'scripts/guardrails/guardrails.test.ts', 'scripts/ci-report.ts']
WORKFLOWS = {'.github/workflows/ci.yml': 4, '.github/workflows/acceptance-wp002.yml': 6,
             '.github/workflows/commit-artifacts.yml': 2, '.github/workflows/reindex.yml': 1,
             '.github/workflows/recover-fs24-evidence.yml': 34}


def inspect_suffix(root, head, baseline, git, field, changed, policy, data):
    need(git(root, 'rev-parse', CHECKPOINT + '^{tree}').strip() ==
         '9fa66086d963bd6de2380fea25d8b2553bca5323', 'E-CheckpointTree')
    cache = {CHECKPOINT: json.loads(json.dumps(baseline))}

    def visit(commit):
        if commit in cache:
            return cache[commit]
        parents = git(root, 'rev-list', '--parents', '-n', '1', commit).split()[1:]
        need(len(parents) in (1, 2), 'E-ParentCount')
        previous = visit(parents[0])
        state = json.loads(json.dumps(previous))
        message = git(root, 'show', '-s', '--format=%B', commit)
        need(field(message, 'Fulcrum-Grant') == 'FS24-D', 'E-PreserveGrant')
        need(field(message, 'FS24-E-Checkpoint') == CHECKPOINT, 'E-Checkpoint')
        approval = field(message, 'Owner-Approval-Receipt')
        need(approval == E_APPROVAL, 'E-ApprovalDigest')
        extension = state.setdefault('evidenceRepair', {'rounds': [], 'merges': [], 'approval': approval,
                                                        'paths': ALLOW, 'activations': []})
        need(extension['approval'] == approval, 'E-AuthorityChanged')
        delta = changed(root, parents[0], commit)
        need(set(changed(root, CHECKPOINT, commit)) <= set(ALLOW), 'E-TotalScope')
        for path, blob in policy.items():
            need(git(root, 'rev-parse', commit + ':' + path).strip() == blob, 'E-PolicyFreeze')
        for path in data:
            need(git(root, 'ls-tree', CHECKPOINT, '--', path) == git(root, 'ls-tree', commit, '--', path), 'E-DataFreeze')
        for path in delta:
            need(path in ALLOW and git(root, 'ls-tree', commit, '--', path).startswith('100644 '), 'E-ScopeMode')
        phase = field(message, 'Fulcrum-Phase')
        if len(parents) == 2:
            need(phase == 'evidence-merge', 'E-MergePhase')
            candidate = visit(parents[1])
            need(candidate['candidateBase'] == parents[0] and candidate['unmerged'], 'E-MergeBase')
            need(candidate['evidenceRepair']['approval'] == approval, 'E-MergeAuthority')
            need(git(root, 'rev-parse', commit + '^{tree}') == git(root, 'rev-parse', parents[1] + '^{tree}'), 'E-MergeTree')
            state = json.loads(json.dumps(candidate))
            extension = state['evidenceRepair']
            number = int(field(message, 'Fulcrum-Integration-PR'))
            need(number > 14, 'E-MergePR')
            extension['merges'].append({'head': commit, 'base': parents[0], 'candidate': parents[1], 'pr': number})
            need(len(extension['merges']) <= 2, 'E-MergeAllocation')
            state['unmerged'] = []
            state['candidateBase'] = commit
        elif phase == 'evidence-implementation':
            need(delta and int(field(message, 'FS24-E-Round')) == len(extension['rounds']) + 1, 'E-RoundOrder')
            # A later code repair may reuse preserved bytes; activations stay recorded and cannot repeat.
            extension['rounds'].append(commit)
            need(len(extension['rounds']) <= 3, 'E-RepairAllocation')
            if not state['unmerged']:
                state['candidateBase'] = parents[0]
            state['unmerged'].append(commit)
        elif phase == 'evidence-recover':
            need(not delta and not state['unmerged'] and extension['merges'] and not extension['activations'], 'E-RecoveryTree')
            need(re.fullmatch('[1-9][0-9]*', field(message, 'FS24-E-Qualification-Run')), 'E-QualificationRun')
            need(re.fullmatch('[a-f0-9]{64}', field(message, 'FS24-E-Consumer-Receipt')), 'E-ConsumerReceipt')
            extension['activations'].append(commit)
            state['candidateBase'] = parents[0]
            state['unmerged'] = [commit]  # no content change; a later approved repair retains this history
        else:
            raise ValueError('E-UnclassifiedPhase')
        state['head'] = commit
        state['paths'] = sorted(set(baseline['paths']) | set(ALLOW))
        need(state['epochs'] == baseline['epochs'] and state['data'] == baseline['data']
             and state['code'] == baseline['code'] and not state['closure'], 'E-HistoryPreserved')
        cache[commit] = state
        return state
    return visit(head)


def load_preflight(root):
    import importlib.util
    spec = importlib.util.spec_from_file_location('fs24_preflight', root / 'scripts/wp002-preflight.py')
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def fixture(directory):
    # Deterministic, practically incompressible, includes NUL/non-UTF8/CRLF and >2 parts.
    target = pathlib.Path(directory) / 'synthetic-original.bin'
    with target.open('xb') as f:
        for i in range((PART_BYTES * 2 + 97) // 32 + 1):
            f.write(hashlib.sha256(('FS24E-fixture-v1:%d' % i).encode()).digest())
        f.write(bytes(range(256)) + b'\r\n\x00\xff')
    write_new(pathlib.Path(directory) / 'synthetic-pin.json', canonical(measure(target)))


def check_ledger(reader, root):
    text = (root / ALLOW[0]).read_text()
    pins = json.loads(text.split('<!-- BEGIN_BASELINE_JSON -->\n')[1].split('\n<!-- END_BASELINE_JSON -->')[0])
    need(sha(canonical(pins)) == '63edad3e69a17bc5f1d7656459781f0be3ccb270bed2754cd88af0ada18ea980', 'BaselineDigest')
    fields = ['id', 'head_sha', 'head_branch', 'event', 'status', 'conclusion', 'run_attempt', 'path', 'display_title']
    runs = reader.page('/actions/runs', 'workflow_runs', 'ledger')
    by_id = {r['id']: r for r in runs}
    need(len(pins) == 150 and len({r['id'] for r in pins}) == 150, 'BaselineInventory')
    for row in pins:
        need(row['id'] in by_id and all(by_id[row['id']].get(k) == row.get(k) for k in fields), 'BaselineDelta')
    old_ids = {r['id'] for r in pins}
    added = [r for r in runs if r['id'] not in old_ids]
    pf = load_preflight(root)
    active = 45
    jobs = 189
    skipped = 8
    records = []
    for run in added:
        need(run['repository']['full_name'] == REPO and run['head_repository']['full_name'] == REPO
             and run['run_attempt'] == 1, 'E-LedgerIdentity')
        state = pf.inspect(root, run['head_sha'])
        need(state.get('evidenceRepair'), 'E-UnclassifiedHead')
        if run['path'] not in WORKFLOWS:
            need(run['path'] in ['.github/workflows/acceptance-wp000.yml', '.github/workflows/review-wp000-spec.yml']
                 and run['conclusion'] == 'skipped', 'E-UnclassifiedWorkflow')
            skipped += 1
            continue
        # Reserve the declared graph while a run is nonterminal; API readback later closes actual.
        fetched = reader.page('/actions/runs/%d/jobs' % run['id'], 'jobs', 'jobs-%d' % run['id'])
        if fetched:
            active += 1
            jobs += WORKFLOWS[run['path']] if run['status'] != 'completed' else len(fetched)
        elif run['status'] != 'completed':
            active += 1
            jobs += WORKFLOWS[run['path']]
        else:
            need(run['conclusion'] == 'skipped', 'E-MissingJobs')
            skipped += 1
        records.append({'run': run['id'], 'jobs': fetched})
    need(active + 6 <= 96 and jobs + 30 <= 1152 and skipped <= 36, 'E-WholeCycleReservation')
    write_new(reader.directory / 'e-ledger-summary.json', canonical({'baseline': {'ledger': 150, 'active': 45, 'jobs': 189},
              'activeIncludingReservations': active, 'jobsIncludingReservations': jobs, 'skipped': skipped,
              'closureReserve': {'active': 6, 'jobs': 30}, 'records': records, 'billingActualUsd': None}))


def collect_candidate_bundles(reader, source, head):
    """Before merge, capture both push and PR evidence; workflow_run is not yet installed on main."""
    import time
    wanted = {(path, event) for path in ['.github/workflows/ci.yml', '.github/workflows/acceptance-wp002.yml']
              for event in ['push', 'pull_request']}
    poll = 0
    while True:
        poll += 1
        runs = reader.page('/actions/runs?head_sha=' + head, 'workflow_runs', 'candidate-runs-%d' % poll)
        chosen = [r for r in runs if (r['path'], r['event']) in wanted and r['head_sha'] == head]
        need(len({(r['path'], r['event']) for r in chosen}) == len(chosen), 'DuplicateCandidateRun')
        if len(chosen) == 4 and all(r['status'] == 'completed' for r in chosen):
            break
        # Metadata polling only. No retry of log/artifact GETs and no task timeout inference.
        time.sleep(5)
    source['candidateRuns'] = []
    for r in chosen:
        run = bound_run(reader, r['id'], 'candidate-run-%d' % r['id'])
        need(run['head_sha'] == head and run['run_attempt'] == 1, 'CandidateRunIdentity')
        jobs = reader.page('/actions/runs/%d/jobs' % run['id'], 'jobs', 'candidate-jobs-%d' % run['id'])
        artifacts = reader.page('/actions/runs/%d/artifacts' % run['id'], 'artifacts', 'candidate-artifacts-%d' % run['id'])
        selected = [a for a in artifacts if a['name'].startswith('fs24e-%d-1-' % run['id'])]
        # Missing failed-job bundles remain explicit; producer success is never CI acceptance.
        source['candidateRuns'].append({'id': run['id'], 'path': run['path'], 'event': run['event'],
                                       'conclusion': run['conclusion'], 'jobs': jobs, 'artifacts': selected})
        for a in selected:
            need(not a['expired'] and a['workflow_run']['id'] == run['id'] and a['workflow_run']['head_sha'] == head, 'CandidateArtifactBinding')
            path = reader.get('/actions/artifacts/%d/zip' % a['id'], 'candidate-artifact-%d.zip' % a['id'], PART_BYTES * MAX_PARTS, True)
            source['originals'].append({'artifact': a['id'], 'run': run['id'], 'head': head, **measure(path)})


def collect(args):
    root = pathlib.Path(os.environ['GITHUB_WORKSPACE'])
    pf = load_preflight(root)
    ident = identity()
    head = ident['head']
    need(pf.git(root, 'rev-parse', 'HEAD').strip() == head, 'CollectorCheckout')
    state = pf.inspect(root, head)
    need(state.get('evidenceRepair'), 'CollectorAuthority')
    event = json.loads(pathlib.Path(os.environ['GITHUB_EVENT_PATH']).read_bytes())
    directory = pathlib.Path(args.directory)
    directory.mkdir(exist_ok=False)
    for name in ['codec.stdout.txt', 'codec.stderr.txt']:
        origin = directory.parent / name
        need(origin.is_file(), 'MissingCodecEvidence')
        write_new(directory / name, origin.read_bytes())
    reader = Reader(directory)
    main = reader.get('/git/ref/heads/main', 'collector-main-before.json')['object']['sha']
    need(main == (state['candidateBase'] if state['unmerged'] else head), 'CollectorMainDelta')
    message = pf.git(root, 'show', '-s', '--format=%B', head)
    phase = pf.field(message, 'Fulcrum-Phase')
    mode = 'relay' if ident['event'] == 'workflow_run' else ('recover' if phase == 'evidence-recover' else 'qualify')
    need(ident['event'] in ['push', 'workflow_run'], 'CollectorEvent')
    if mode != 'relay':
        need(os.environ['GITHUB_REF'] == 'refs/heads/wp/002', 'CollectorBranch')
    if mode == 'recover':
        qid = int(pf.field(message, 'FS24-E-Qualification-Run'))
        q = bound_run(reader, qid, 'qualification-run')
        need(q['path'] == '.github/workflows/recover-fs24-evidence.yml' and q['conclusion'] == 'success'
             and q['event'] == 'push' and q['head_branch'] == 'wp/002', 'QualificationRunBinding')
        for path in ALLOW:
            need(pf.git(root, 'ls-tree', q['head_sha'], '--', path) == pf.git(root, 'ls-tree', head, '--', path), 'QualificationCodeChanged')
        # The agent must verify the actual external receipt before creating this empty commit.
        # A green workflow alone is deliberately insufficient to authorize that commit.
    os.environ['FS_TRANSFER_MODE'] = mode
    check_ledger(reader, root)
    current = bound_run(reader, int(os.environ['GITHUB_RUN_ID']), 'collector-current-run')
    need(current['head_sha'] == os.environ['GITHUB_SHA'] and current['path'] == '.github/workflows/recover-fs24-evidence.yml', 'CollectorRunBinding')
    source = {'workflowRunHead': current['head_sha'], 'repository': REPO, 'collector': ident, 'mode': mode, 'originals': [],
              'approval': state['evidenceRepair']['approval'], 'Q0': 'BLOCKED_HTTP_403'}
    if mode == 'qualify':
        fixture(directory)
        source_logs(reader, source, mode)
        collect_candidate_bundles(reader, source, head)
    elif mode == 'recover':
        source_logs(reader, source, mode)
    else:
        cause = event['workflow_run']
        run = bound_run(reader, cause['id'], 'relay-source-run')
        need(run['head_sha'] == head and run['status'] == 'completed' and run['path'] in WORKFLOWS
             and run['path'] != '.github/workflows/recover-fs24-evidence.yml', 'RelayCause')
        artifacts = reader.page('/actions/runs/%d/artifacts' % run['id'], 'artifacts', 'relay-artifacts')
        selected = [a for a in artifacts if a['name'].startswith('fs24e-%d-1-' % run['id'])]
        need(selected, 'NoSourceBundle')
        need(len({a['name'] for a in selected}) == len(selected), 'DuplicateSourceArtifact')
        for a in selected:
            need(not a['expired'] and a['workflow_run']['id'] == run['id'] and a['workflow_run']['head_sha'] == head, 'SourceArtifactBinding')
            path = reader.get('/actions/artifacts/%d/zip' % a['id'], 'source-artifact-%d.zip' % a['id'], PART_BYTES * MAX_PARTS, True)
            # Preserve the downloaded ZIP itself. Nested source manifests are verified by consumer, not summarized away.
            source['originals'].append({'artifact': a['id'], 'run': run['id'], 'head': head, **measure(path)})
    after = reader.get('/git/ref/heads/main', 'collector-main-after.json')['object']['sha']
    need(after == main, 'CollectorPreservation')
    write_new(directory / 'collector-source.json', canonical(source))
    archive = pathlib.Path(args.file)
    pack(directory, archive, source)
    parts = archive.parent / 'parts'
    index = split(archive, parts, source)
    with open(os.environ['GITHUB_OUTPUT'], 'a') as output:
        output.write('matrix=' + json.dumps({'part': list(range(len(index['parts'])))}, separators=(',', ':')) + '\n')
        output.write('index_hash=' + sha(canonical(index)) + '\n')
    print('FS24E_INDEX\t' + base64.b64encode(canonical(index)).decode())


def download_carrier(args):
    root = pathlib.Path(os.environ['GITHUB_WORKSPACE'])
    directory = pathlib.Path(args.directory)
    directory.mkdir(exist_ok=False)
    reader = Reader(directory)
    run_id = int(os.environ['GITHUB_RUN_ID'])
    artifact_id = int(os.environ['FS_CARRIER_ID'])
    run = bound_run(reader, run_id, 'carrier-run')
    need(run['head_sha'] == os.environ['GITHUB_SHA'] and run['path'] == '.github/workflows/recover-fs24-evidence.yml', 'CarrierRun')
    value = reader.get('/actions/artifacts/%d' % artifact_id, 'carrier-metadata.json')
    need(value['name'] == 'fs24e-transfer-%d' % run_id and not value['expired']
         and value['workflow_run']['id'] == run_id, 'CarrierArtifact')
    path = reader.get('/actions/artifacts/%d/zip' % artifact_id, 'carrier.zip', PART_BYTES * MAX_PARTS + 1024 * 1024, True)
    need(measure(path)['sha256'] == os.environ['FS_CARRIER_DIGEST'].removeprefix('sha256:'), 'CarrierArchiveDigest')
    return path


def main():
    p = argparse.ArgumentParser()
    p.add_argument('mode', choices=['pack', 'split', 'emit', 'receive', 'collect', 'download-carrier', 'unpack-artifact', 'extract-carrier'])
    p.add_argument('--directory', required=True)
    p.add_argument('--file')
    p.add_argument('--part', type=int)
    p.add_argument('--binding')
    p.add_argument('--index-hash')
    p.add_argument('--logs', nargs='*')
    args = p.parse_args()
    directory = pathlib.Path(args.directory)
    if args.mode == 'pack':
        source = identity()
        pack(directory, args.file, source)
        print('FS24E_REF\t' + json.dumps({'source': source, 'bundle': measure(args.file)}, separators=(',', ':')))
    elif args.mode == 'split':
        print(json.dumps(split(args.file, directory, json.loads(pathlib.Path(args.binding).read_bytes()))))
    elif args.mode == 'emit':
        emit_part(directory, args.part)
    elif args.mode == 'receive':
        receive(args.logs, directory, args.index_hash, json.loads(pathlib.Path(args.binding).read_bytes()))
    elif args.mode == 'unpack-artifact':
        with zipfile.ZipFile(args.file) as z:
            need(z.namelist() == ['evidence-bundle.zip'], 'ArtifactInventory')
            need(z.getinfo('evidence-bundle.zip').file_size <= PART_BYTES * MAX_PARTS, 'ArtifactEnvelope')
            target = pathlib.Path(args.file).with_name('evidence-bundle.zip')
            write_new(target, z.read('evidence-bundle.zip'))
        need(measure(target)['sha256'] == args.index_hash, 'BundleReferenceHash')
        unpack(target, directory, json.loads(pathlib.Path(args.binding).read_bytes()))
    elif args.mode == 'extract-carrier':
        # The artifact wraps only transfer.json and numbered parts. ZIP CRC is checked by read().
        directory.mkdir(exist_ok=False)
        with zipfile.ZipFile(args.file) as z:
            names = z.namelist()
            need(len(set(names)) == len(names) and 2 <= len(names) <= MAX_PARTS + 1, 'CarrierMembers')
            need(all(n == 'transfer.json' or re.fullmatch(r'part-\d{3}\.bin', n) for n in names), 'CarrierNames')
            need(sum(x.file_size for x in z.infolist()) <= PART_BYTES * MAX_PARTS + 65536, 'CarrierEnvelope')
            for n in names:
                write_new(directory / n, z.read(n))
        index = json.loads((directory / 'transfer.json').read_bytes())
        validate_index(index)
        need(set(names) == {'transfer.json'} | {r['name'] for r in index['parts']}, 'CarrierInventory')
        need(sha(canonical(index)) == args.index_hash, 'CarrierIndexPin')
    elif args.mode == 'download-carrier':
        download_carrier(args)
    else:
        collect(args)


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        # Do not echo urllib URLs or token-bearing exception representations.
        detail = str(error) if isinstance(error, ValueError) and re.fullmatch(r'[A-Za-z0-9:-]+', str(error)) else type(error).__name__
        print('FS24E_FAILURE\t' + detail, file=sys.stderr)
        raise SystemExit(1)
