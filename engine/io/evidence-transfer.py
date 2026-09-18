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

# FS24-F is a new, separately accounted successor.  It does not reopen any
# FS24-E allocation and it never reads the two historical job-log endpoints.
F_VERSION = 'FS24F/1'
F_CHECKPOINT = '2efe60ea7c74d301a1e2fc0ba52e1adc686f40dd'
F_CHECKPOINT_TREE = '8675b4487a577f24e974c65e9e347f521d6d7b69'
F_WP002 = 'e84ed63d77a07a5c89af7872a25a749f07aa5f98'
F_BASELINE_LEDGER = 184
F_SOURCE = {
    'artifact': 10459765118,
    'name': 'fs24e-failure-35125073370-prepare',
    'bytes': 1362257675,
    'sha256': 'a9379fb49992eb6554d15e8f60f7415265fcdaa481501439a204942a14eccd63',
    'expiresAtKnown': '2026-09-23T16:58:15Z',
    'run': 35125073370,
    'head': 'f08231650ce3f7fb26194c64ae3a9fa3ea18cdb0',
    'repositoryId': 1366804410,
}
F_PART_BYTES = 2 * 1024 * 1024
F_PARTS_PER_VOLUME = 8
F_VOLUME_BYTES = F_PART_BYTES * F_PARTS_PER_VOLUME
F_MAX_VOLUMES = 82
F_QUALIFICATION_BYTES = 32 * 1024 * 1024 + 97
# The upload-artifact v4 archive observed in R2C is the byte source addressed
# by HTTP Range.  Keep raw payload and carrier bytes as separate pins.
F_QUALIFICATION_ARCHIVE_BYTES = 33554691
F_ALLOW = ['engine/ops/work-packages/WP-002-evidence-recovery.md',
           '.github/workflows/recover-fs24-evidence.yml', 'engine/io/evidence-transfer.py',
           'engine/io/evidence-transfer.test.py', 'scripts/wp002-preflight.py',
           'scripts/guardrails/index.ts', 'scripts/guardrails/guardrails.test.ts']
F_AUTHORITY = {
    'version': F_VERSION,
    'repository': REPO,
    'checkpoint': {'main': F_CHECKPOINT, 'tree': F_CHECKPOINT_TREE,
                   'wp002': F_WP002, 'ledger': F_BASELINE_LEDGER},
    'source': F_SOURCE,
    'allocations': {'candidateCommits': 3, 'technicalMerges': 2,
                    'recoveryActivations': 1, 'continuationCommits': 2,
                    'continuationVolumesPerCommit': 8, 'dispatches': 0,
                    'reruns': 0, 'providerCalls': 0, 'dataCommits': 0},
    'caps': {'activeRuns': 36, 'jobsIncludingReservations': 384,
             'wholeWorkflowSkips': 16, 'artifactObjects': 384,
             'zipReceives': 256, 'agentLogReceives': 128,
             'authenticatedRedirects': 128, 'http206Ranges': 128,
             'rangeBytes': 1900000000, 'runnerMinutes': 1500,
             'newArtifactStorageBytes': 3221225472, 'reserveUsd': 25},
    'transfer': {'partBytes': F_PART_BYTES, 'partsPerVolume': F_PARTS_PER_VOLUME,
                 'maxVolumes': F_MAX_VOLUMES, 'qualificationBytes': F_QUALIFICATION_BYTES},
    'preserve': {'responseB': 'missing', 'WP002': 'todo',
                 'sourceReceiptReconciliation': 'pending', 'B1': 'unverified',
                 'B2': 'unverified', 'node20': 'reserved', 'node24': 'reserved',
                 'branchProtection': 'unverified'},
}

# FS24-G-R1 admits exactly one code-bearing transition after all three F
# candidate slots were consumed.  It does not replenish an F allocation.
G_VERSION = 'FS24G-R1/1'
G_PHASE = 'evidence-volume-admission'
G_PARENT = '6b13b756c021de9266ac449506e1e2912fbf290b'
G_PARENT_TREE = '7d8d3274cdf6f38fd617fa4aab1d3dd5e7de533e'
G_ALLOW = ['engine/ops/work-packages/WP-002-evidence-recovery.md',
           'engine/io/evidence-transfer.py', 'engine/io/evidence-transfer.test.py',
           'scripts/guardrails/index.ts', 'scripts/guardrails/guardrails.test.ts']
G_BASELINE_RUNS = [35170328551, 35170328555, 35170328625, 35170352884,
                   35170354386, 35170644608, 35170644609, 35170644653,
                   35170716611, 35170770513, 35171252396, 35171252399,
                   35171252421, 35171260379, 35171297099]
G_AUTHORITY = {
    'version': G_VERSION,
    'repository': REPO,
    'checkpoint': {'main': F_CHECKPOINT, 'mainTree': F_CHECKPOINT_TREE,
                   'wp002': G_PARENT, 'wp002Tree': G_PARENT_TREE, 'ledger': 199},
    'receipt': {'libraryId': 'libfile_65c160f2ee688191a7017dbe0d2a51d5',
                'name': 'FS24-G-PREMERGE-RETRIGGER-STOP.md', 'bytes': 8562,
                'sha256': 'a7ae1ceaebf2dad139966f91b5c513fcee7c5961ffaeae9eb55cdbc9f02a07ba'},
    'baseline': {'runIds': G_BASELINE_RUNS, 'activeRuns': 15,
                 'jobs': 57, 'wholeWorkflowSkips': 0, 'artifactObjects': 10,
                 'artifactStorageBytes': 36847031, 'legacyRelays': 6,
                 'assignedRunnerWallSeconds': 409, 'billingActualUsd': None},
    'allocations': {'admissionCommits': 1, 'remoteRefUpdates': 1,
                    'premergePullRequests': 1, 'technicalMerges': 0,
                    'recoveryActivations': 0, 'continuationCommits': 0,
                    'emptyCommits': 0, 'dispatches': 0, 'reruns': 0,
                    'providerCalls': 0, 'dataCommits': 0},
    'caps': {'workflowRuns': 11, 'activeRuns': 9,
             'jobsIncludingReservations': 161, 'wholeWorkflowSkips': 2,
             'legacyRelays': 4, 'artifactObjects': 48, 'zipReceives': 32,
             'agentLogReceives': 3, 'authenticatedRedirects': 3,
             'http206Ranges': 3, 'rangeBytes': F_QUALIFICATION_BYTES,
             'runnerMinutes': 800, 'newArtifactStorageBytes': 134217728,
             'reserveUsd': 5},
    'transition': {'phase': G_PHASE, 'parent': G_PARENT,
                   'parentTree': G_PARENT_TREE, 'paths': G_ALLOW},
    'preserve': F_AUTHORITY['preserve'],
}

# FS24-G-R2 is a dormant, separately authorized recovery transition.  R2C
# re-pins it after the R2B direct-main relay gate and binds the one admission
# proof that reached the exact intentional preflight boundary on four assigned
# ubuntu-24.04 runners.  G-R1, R2A, R2B, and every F allocation remain frozen.
G2_VERSION = 'FS24G-R2/2'
G2_PHASE = 'evidence-volume-admission-recovery'
G2_PARENT = 'ab6560edc704d8e2901d5afc87a6ebc1712a488a'
G2_PARENT_TREE = '459b80c99144705bc796406c693132853384b7a9'
G2_MAIN = '5ade77afe3fdfe4cb20c03f6234b7aec785f79ab'
G2_MAIN_TREE = 'c2e32130efcdfcb0026cc514018bb748067ee25b'
G2_RELAY_PATH = '.github/workflows/recover-fs24-evidence.yml'
G2_RELAY_BLOB = 'e26605cfbde8d2bf235d837b8da0e9dcd8ef34a7'
G2_ALLOW = [G2_RELAY_PATH] + list(G_ALLOW)
G2_STOP_READBACK = '2026-09-17T03:39:06.798Z'
G2_STOP_RUNS = [35178816801, 35178816736, 35178816706,
                35178823940, 35178823713]
G2_R2A_RUNS = [35211069523, 35211115853]
G2_READINESS_RUN = 35232709535
G2_READINESS_RECEIPT = 'c9e879fbdeaf8fc14362caa0044efda1b826cc00b19b5bcdcd8cfc21ae54a066'
G2_READINESS_JOBS = {
    'typecheck': {'id': 105240678537, 'runner': 'GitHub Actions 1000004521'},
    'validate': {'id': 105240678740, 'runner': 'GitHub Actions 1000004522'},
    'guardrails': {'id': 105240678872, 'runner': 'GitHub Actions 1000004523'},
    'report': {'id': 105240764021, 'runner': 'GitHub Actions 1000004524'},
}
G2B_AUTHORITY = '639e3393367a597961af952c597c77ffeeddbda89b77fd6d0ed9cb5687a8a30d'
G2B_PHASE = 'relay-gate-bootstrap'
G2B_PATCH = '3bb814bb64bc687a5e73cf74bb83c39cf2a778c17589105b254ecdac52f9bd2d'
G2B_MAIN_RELAY_BLOB = '70a18ea1e79e1e2eed3175ed4347adee122781ed'
G2B_RECORD = {'commit': G2_MAIN, 'parent': F_CHECKPOINT, 'tree': G2_MAIN_TREE,
              'authority': G2B_AUTHORITY, 'path': G2_RELAY_PATH,
              'blob': G2B_MAIN_RELAY_BLOB}
G2_AUTHORITY = {
    'version': G2_VERSION,
    'repository': REPO,
    'checkpoint': {'main': G2_MAIN, 'mainTree': G2_MAIN_TREE,
                   'wp002': G2_PARENT, 'wp002Tree': G2_PARENT_TREE,
                   'ledger': 207, 'openWp002ToMainPullRequests': 0},
    'receipt': {'libraryId': 'libfile_e207c8e019588191b353be8a7492cf77',
                'name': 'FS24-G-R2B-EXECUTION-RECEIPT.md', 'bytes': 15464,
                'sha256': 'b0f3456d938960ca080a716fbb4075b01af9812ae5a1208e576edcfd496a0d4c'},
    'consumedG1': {'authority': 'fd6d3c27a2339d7517c03186096e22bc3a5c2dfa1ffaf1625ad6c707efa819e9',
                   'commit': G2_PARENT, 'tree': G2_PARENT_TREE,
                   'runIds': G2_STOP_RUNS, 'workflowRuns': 5, 'activeRuns': 5,
                   'jobs': 19, 'wholeWorkflowSkips': 0, 'legacyRelays': 2,
                   'artifactObjects': 0, 'artifactStorageBytes': 0,
                   'http206Ranges': 0, 'consumerReceipts': 0},
    'consumedR2A': {'authority': '55a830dafb2ecf6294246667565ac8a2c4e6d9458a0e5e6bbc7481cf4bba51e4',
                    'runIds': G2_R2A_RUNS, 'workflowRuns': 2, 'activeRuns': 2,
                    'jobs': 7, 'legacyRelays': 1, 'artifactObjects': 1,
                    'artifactStorageBytes': None, 'dispatches': 1, 'budgetChanges': 1},
    'consumedR2B': {'authority': G2B_AUTHORITY, 'commit': G2_MAIN,
                    'tree': G2_MAIN_TREE, 'runIds': [G2_READINESS_RUN],
                    'workflowRuns': 1, 'activeRuns': 1, 'jobs': 4,
                    'legacyRelays': 0, 'artifactObjects': 0,
                    'artifactStorageBytes': 0, 'dispatches': 1,
                    'remoteRefUpdates': 1},
    'readiness': {'runId': G2_READINESS_RUN, 'repositoryId': 1366804410,
                  'head': G2_PARENT, 'headBranch': 'wp/002',
                  'workflowPath': '.github/workflows/ci.yml',
                  'event': 'workflow_dispatch', 'runAttempt': 1,
                  'runStatus': 'completed', 'runConclusion': 'failure',
                  'expectedBoundary': 'Preflight scope secret policy and checkpoint',
                  'jobPredicate': 'exact-four-assigned-at-intentional-preflight-boundary',
                  'runnerLabel': 'ubuntu-24.04',
                  'receiptVersion': 'FS24G-R2-readiness/2',
                  'receiptSha256': G2_READINESS_RECEIPT,
                  'chargedToG2': False},
    'allocations': {'admissionRecoveryCommits': 1, 'remoteRefUpdates': 1,
                    'premergePullRequests': 1, 'candidateCommits': 0,
                    'repairCommits': 0, 'retriggerCommits': 0,
                    'technicalMerges': 0, 'recoveryActivations': 0,
                    'continuationCommits': 0, 'emptyCommits': 0,
                    'dispatches': 0, 'reruns': 0, 'providerCalls': 0,
                    'dataCommits': 0},
    'caps': {'workflowRuns': 5, 'activeRuns': 5,
             'jobsIncludingReservations': 25, 'wholeWorkflowSkips': 0,
             'legacyRelays': 0, 'artifactObjects': 20, 'zipReceives': 16,
             'agentLogReceives': 3, 'authenticatedRedirects': 3,
             'http206Ranges': 3, 'rangeBytes': F_QUALIFICATION_BYTES,
             'runnerMinutes': 600, 'newArtifactStorageBytes': 134217728,
             'reserveUsd': 5},
    'transition': {'phase': G2_PHASE, 'parent': G2_PARENT,
                   'parentTree': G2_PARENT_TREE, 'mainBase': G2_MAIN,
                   'mainBaseTree': G2_MAIN_TREE, 'paths': G2_ALLOW,
                   'relayGateBlob': G2_RELAY_BLOB},
    'mergeGate': {'authorized': False, 'platformRequiredChecks': [],
                  'classicBranchProtectionConfigured': False, 'rulesets': 0,
                  'agentRequiredRuns': ['push:Fulcrum CI', 'push:WP-002 Foundation Acceptance',
                                        'push:FS24 Evidence Transfer',
                                        'pull_request:Fulcrum CI',
                                        'pull_request:WP-002 Foundation Acceptance']},
    'preserve': F_AUTHORITY['preserve'],
}

# FS24-G-R2D is a one-shot, code-bearing repair of the six R2C regressions.
# It preserves the consumed R2C transition and gives the observed artifact
# archive its own explicit Range cap instead of silently treating raw payload
# bytes as transport bytes.
G2D_VERSION = 'FS24G-R2D/1'
G2D_PHASE = 'evidence-volume-admission-repair'
G2D_PARENT = '96cceb58a9dac119aabffe93b11f62990ef62905'
G2D_PARENT_TREE = '569a2f260662a185efb34ea4bf3cd708bfc9b1b7'
G2D_ALLOW = ['engine/ops/work-packages/WP-002-evidence-recovery.md',
             'engine/io/evidence-transfer.py', 'engine/io/evidence-transfer.test.py',
             'scripts/guardrails/index.ts', 'scripts/guardrails/scope.ts',
             'scripts/guardrails/guardrails.test.ts']
G2C_RUNS = [35243814149, 35243814163, 35243814309]
G2D_AUTHORITY = {
    'version': G2D_VERSION,
    'repository': REPO,
    'checkpoint': {'main': G2_MAIN, 'mainTree': G2_MAIN_TREE,
                   'wp002': G2D_PARENT, 'wp002Tree': G2D_PARENT_TREE,
                   'ledger': 210, 'openWp002ToMainPullRequests': 0},
    'receipt': {'libraryId': 'libfile_30a630abd3548191851c70e71805c9c1',
                'name': 'FS24-G-R2C-PREMERGE-EXECUTION-STOP.md', 'bytes': 22513,
                'sha256': 'c85cfbdc447d70bc749540e56de2e9db8211b554e003b39f1f5e5beab68cea58'},
    'inheritedAuthorities': {
        'F': 'cc0187edbfd555887dc021f3f1b7ed0de6c9fd97757e32b46636bafeb96a46e8',
        'G1': 'fd6d3c27a2339d7517c03186096e22bc3a5c2dfa1ffaf1625ad6c707efa819e9',
        'R2A': '55a830dafb2ecf6294246667565ac8a2c4e6d9458a0e5e6bbc7481cf4bba51e4',
        'R2B': G2B_AUTHORITY,
        'R2C': '4447512a984015f41021286e75e3988e9b96abf522257a36068b59718a7c864f'},
    'consumedR2C': {
        'authority': '4447512a984015f41021286e75e3988e9b96abf522257a36068b59718a7c864f',
        'commit': G2D_PARENT, 'tree': G2D_PARENT_TREE, 'runIds': G2C_RUNS,
        'workflowRuns': 3, 'activeRuns': 3, 'jobs': 15,
        'wholeWorkflowSkips': 0, 'legacyRelays': 0,
        'artifactObjects': 11, 'artifactStorageBytes': 33903067,
        'zipReceives': 7, 'agentLogReceives': 0,
        'authenticatedRedirectPaths': 3, 'standaloneRedirectReceipts': 0,
        'http206Ranges': 3, 'rangeBytes': F_QUALIFICATION_ARCHIVE_BYTES,
        'approvedRangeBytes': F_QUALIFICATION_BYTES, 'rangeDeltaBytes': 162,
        'consumerReceipts': 0, 'assignedRunnerWallSeconds': 326,
        'budgetActualUsd': 0.20, 'result': 'STOP'},
    'allocations': {'repairCommits': 1, 'remoteRefUpdates': 1,
                    'premergePullRequests': 1, 'candidateCommits': 0,
                    'admissionRecoveryCommits': 0, 'retriggerCommits': 0,
                    'technicalMerges': 0, 'recoveryActivations': 0,
                    'continuationCommits': 0, 'emptyCommits': 0,
                    'dispatches': 0, 'reruns': 0, 'providerCalls': 0,
                    'dataCommits': 0},
    'caps': {'workflowRuns': 5, 'activeRuns': 5,
             'jobsIncludingReservations': 25, 'wholeWorkflowSkips': 0,
             'legacyRelays': 0, 'artifactObjects': 20, 'zipReceives': 16,
             'agentLogReceives': 3, 'authenticatedRedirects': 3,
             'http206Ranges': 3, 'rangeBytes': F_QUALIFICATION_ARCHIVE_BYTES,
             'runnerMinutes': 600, 'newArtifactStorageBytes': 134217728,
             'reserveUsd': 5},
    'qualification': {'rawPayloadBytes': F_QUALIFICATION_BYTES,
                      'artifactArchiveBytes': F_QUALIFICATION_ARCHIVE_BYTES,
                      'archiveOverheadBytes': 162, 'httpStatus': 206,
                      'rangeCount': 3, 'rangeByteSumMustEqualCap': True},
    'transition': {'phase': G2D_PHASE, 'parent': G2D_PARENT,
                   'parentTree': G2D_PARENT_TREE, 'mainBase': G2_MAIN,
                   'mainBaseTree': G2_MAIN_TREE, 'paths': G2D_ALLOW,
                   'priorPhase': G2_PHASE,
                   'priorAuthority': '4447512a984015f41021286e75e3988e9b96abf522257a36068b59718a7c864f',
                   'relayGateBlob': G2_RELAY_BLOB},
    'mergeGate': {'authorized': False, 'platformRequiredChecks': [],
                  'classicBranchProtectionConfigured': False, 'rulesets': 0,
                  'agentRequiredRuns': ['push:Fulcrum CI', 'push:WP-002 Foundation Acceptance',
                                        'push:FS24 Evidence Transfer',
                                        'pull_request:Fulcrum CI',
                                        'pull_request:WP-002 Foundation Acceptance']},
    'preserve': F_AUTHORITY['preserve'],
}


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


# GitHub concatenated log segments can begin with BOM at an interior line.
# Recognize it only before the timestamp/frame; never normalize payload bytes.
LINE = re.compile(r'^\ufeff?(?:\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d+Z\s+)?(FS24E_(?:BEGIN|DATA|END)\t[^\r\n]*)\r?$')


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


def f_authority_sha():
    return sha(canonical(F_AUTHORITY))


def g_authority_sha():
    return sha(canonical(G_AUTHORITY))


def g2_authority_sha():
    return sha(canonical(G2_AUTHORITY))


def g2d_authority_sha():
    return sha(canonical(G2D_AUTHORITY))


def validate_g2d_transition(root, commit, parents, delta, state, git, field, message):
    """Validate the one-shot R2D repair independently of historical traversal."""
    approval = field(message, 'FS24-G-R2D-Authority')
    need(field(message, 'FS24-G-R2-Authority') == g2_authority_sha()
         and approval == g2d_authority_sha()
         and field(message, 'Owner-Approval-Receipt') == approval,
         'G2D-Authority')
    need(len(parents) == 1 and parents[0] == G2D_PARENT, 'G2D-Parent')
    need(git(root, 'rev-parse', G2D_PARENT + '^{tree}').strip()
         == G2D_PARENT_TREE, 'G2D-ParentTree')
    need(set(delta) == set(G2D_ALLOW), 'G2D-Scope')
    need(field(message, 'FS24-G-R2D-Round') == '1', 'G2D-Round')
    range_bytes = field(message, 'FS24-G-R2D-Range-Bytes')
    need(re.fullmatch('[1-9][0-9]*', range_bytes)
         and int(range_bytes) == F_QUALIFICATION_ARCHIVE_BYTES,
         'G2D-RangeCap')
    recovery = state.get('evidenceAdmissionRecovery')
    need(recovery and recovery['commit'] == G2D_PARENT
         and recovery['parent'] == G2_PARENT
         and recovery['approval'] == g2_authority_sha()
         and recovery['paths'] == G2_ALLOW
         and recovery['readinessRun'] == G2_READINESS_RUN
         and recovery['readinessReceipt'] == G2_READINESS_RECEIPT,
         'G2D-R2CPreserved')
    need(state.get('evidenceAdmission')
         and state['evidenceAdmission']['commit'] == G2_PARENT
         and state['candidateBase'] == G2_MAIN and state['unmerged']
         and state['unmerged'][-1] == G2D_PARENT
         and not state.get('evidenceAdmissionRepair'), 'G2D-Lineage')
    need(git(root, 'rev-parse', commit + ':' + G2_RELAY_PATH).strip()
         == G2_RELAY_BLOB, 'G2D-RelayGate')
    return {'commit': commit, 'parent': G2D_PARENT, 'approval': approval,
            'paths': G2D_ALLOW, 'rangeBytes': int(range_bytes)}


def f_plan(source, binding, selected=None):
    """Describe every byte before any Range request; selected limits this run only."""
    need(source['artifact'] > 0 and safe_name(source['name']), 'F-SourceIdentity')
    need(0 < source['bytes'] <= MAX_RAW and re.fullmatch('[a-f0-9]{64}', source['sha256']), 'F-SourcePin')
    parts = []
    offset = 0
    while offset < source['bytes']:
        number = len(parts)
        size = min(F_PART_BYTES, source['bytes'] - offset)
        parts.append({'part': number, 'name': 'part-%04d.bin' % number,
                      'offset': offset, 'bytes': size})
        offset += size
    volumes = []
    for first in range(0, len(parts), F_PARTS_PER_VOLUME):
        rows = parts[first:first + F_PARTS_PER_VOLUME]
        start = rows[0]['offset']
        size = sum(x['bytes'] for x in rows)
        volumes.append({'volume': len(volumes), 'start': start, 'end': start + size - 1,
                        'bytes': size, 'parts': [x['part'] for x in rows]})
    need(1 <= len(volumes) <= F_MAX_VOLUMES, 'F-VolumeCount')
    chosen = list(range(len(volumes))) if selected is None else selected
    need(chosen and chosen == sorted(set(chosen)) and len(chosen) <= len(volumes)
         and all(isinstance(x, int) and 0 <= x < len(volumes) for x in chosen), 'F-SelectedVolumes')
    plan = {'version': F_VERSION, 'authoritySha256': f_authority_sha(), 'binding': binding,
            'source': source, 'partBytes': F_PART_BYTES, 'partsPerVolume': F_PARTS_PER_VOLUME,
            'parts': parts, 'volumes': volumes, 'selectedVolumes': chosen,
            'preserve': F_AUTHORITY['preserve']}
    validate_f_plan(plan)
    return plan


def validate_f_plan(plan):
    need(plan['version'] == F_VERSION and plan['authoritySha256'] == f_authority_sha(), 'F-PlanAuthority')
    source = plan['source']
    need(isinstance(source['artifact'], int) and source['artifact'] > 0 and safe_name(source['name']), 'F-SourceIdentity')
    need(isinstance(source['bytes'], int) and 0 < source['bytes'] <= MAX_RAW
         and re.fullmatch('[a-f0-9]{64}', source['sha256']), 'F-SourcePin')
    need(plan['partBytes'] == F_PART_BYTES and plan['partsPerVolume'] == F_PARTS_PER_VOLUME, 'F-LayoutConstants')
    offset = 0
    for number, row in enumerate(plan['parts']):
        need(row == {'part': number, 'name': 'part-%04d.bin' % number, 'offset': offset,
                     'bytes': min(F_PART_BYTES, source['bytes'] - offset)}, 'F-PartInventory')
        offset += row['bytes']
    need(offset == source['bytes'] and 1 <= len(plan['parts']) <= 1024, 'F-PartCoverage')
    expected_volumes = []
    for first in range(0, len(plan['parts']), F_PARTS_PER_VOLUME):
        rows = plan['parts'][first:first + F_PARTS_PER_VOLUME]
        start = rows[0]['offset']; size = sum(x['bytes'] for x in rows)
        expected_volumes.append({'volume': len(expected_volumes), 'start': start,
                                 'end': start + size - 1, 'bytes': size,
                                 'parts': [x['part'] for x in rows]})
    need(plan['volumes'] == expected_volumes and len(expected_volumes) <= F_MAX_VOLUMES, 'F-VolumeInventory')
    selected = plan['selectedVolumes']
    need(selected and selected == sorted(set(selected)) and len(selected) <= len(expected_volumes)
         and all(isinstance(x, int) and 0 <= x < len(expected_volumes) for x in selected), 'F-SelectedVolumes')
    need(plan['preserve'] == F_AUTHORITY['preserve'], 'F-Preservation')


def f_source_from_metadata(value, expected):
    digest = str(value.get('digest') or '').removeprefix('sha256:')
    source = {'artifact': value.get('id'), 'name': value.get('name'),
              'bytes': value.get('size_in_bytes'), 'sha256': digest,
              'expiresAt': value.get('expires_at'),
              'workflowRun': value.get('workflow_run')}
    need(not value.get('expired') and source['artifact'] == expected['artifact']
         and source['name'] == expected['name'] and source['bytes'] == expected['bytes']
         and source['sha256'] == expected['sha256'], 'F-ArtifactMetadataPin')
    if 'expiresAtKnown' in expected:
        workflow = source['workflowRun'] or {}
        need(source['expiresAt'] == expected['expiresAtKnown']
             and workflow.get('id') == expected['run'] and workflow.get('head_sha') == expected['head']
             and workflow.get('repository_id') == expected['repositoryId']
             and workflow.get('head_repository_id') == expected['repositoryId'], 'F-ArtifactLineagePin')
    return source


def f_volume_manifest(plan, volume_number, data, http):
    validate_f_plan(plan)
    need(volume_number in plan['selectedVolumes'], 'F-VolumeNotSelected')
    volume = plan['volumes'][volume_number]
    need(len(data) == volume['bytes'], 'F-RangeLength')
    rows = []
    cursor = 0
    for number in volume['parts']:
        declared = plan['parts'][number]
        raw = data[cursor:cursor + declared['bytes']]
        need(len(raw) == declared['bytes'], 'F-PartSlice')
        rows.append({**declared, 'sha256': sha(raw)})
        cursor += len(raw)
    need(cursor == len(data), 'F-VolumeCoverage')
    manifest = {'version': F_VERSION, 'authoritySha256': f_authority_sha(),
                'planSha256': sha(canonical(plan)), 'binding': plan['binding'],
                'source': plan['source'], 'volume': volume_number,
                'range': {'start': volume['start'], 'end': volume['end'],
                          'bytes': volume['bytes'], **http}, 'parts': rows,
                'volumeSha256': sha(data), 'preserve': F_AUTHORITY['preserve']}
    validate_f_volume(manifest, plan)
    return manifest


def validate_f_volume(manifest, plan):
    validate_f_plan(plan)
    need(manifest['version'] == F_VERSION and manifest['authoritySha256'] == f_authority_sha()
         and manifest['planSha256'] == sha(canonical(plan)), 'F-VolumePlanPin')
    need(manifest['binding'] == plan['binding'] and manifest['source'] == plan['source'], 'F-VolumeBinding')
    number = manifest['volume']
    need(number in plan['selectedVolumes'], 'F-VolumeNotSelected')
    volume = plan['volumes'][number]
    receipt = manifest['range']
    need(receipt['start'] == volume['start'] and receipt['end'] == volume['end']
         and receipt['bytes'] == volume['bytes'] and receipt['status'] == 206
         and receipt['contentRange'] == 'bytes %d-%d/%d' % (volume['start'], volume['end'], plan['source']['bytes'])
         and receipt['contentLength'] == str(volume['bytes'])
         and receipt['contentEncoding'] in [None, 'identity'] and receipt['attempts'] == 1
         and receipt['authorizationForwarded'] is False, 'F-HTTP206Receipt')
    declared = [plan['parts'][x] for x in volume['parts']]
    need(len(manifest['parts']) == len(declared), 'F-VolumePartCount')
    for row, expected in zip(manifest['parts'], declared):
        need({k: row[k] for k in expected} == expected and re.fullmatch('[a-f0-9]{64}', row['sha256']), 'F-VolumePartPin')
    need(re.fullmatch('[a-f0-9]{64}', manifest['volumeSha256']) is not None
         and manifest['preserve'] == F_AUTHORITY['preserve'], 'F-VolumeDigest')


def emit_volume(manifest, data, output=sys.stdout):
    header = {'manifest': manifest, 'manifestSha256': sha(canonical(manifest))}
    print('FS24F_BEGIN\t' + base64.b64encode(canonical(header)).decode(), file=output)
    cursor = 0
    for row in manifest['parts']:
        raw = data[cursor:cursor + row['bytes']]
        encoded = base64.b64encode(raw).decode()
        for sequence, at in enumerate(range(0, len(encoded), 2048)):
            print('FS24F_DATA\t%d\t%d\t%s' % (row['part'], sequence, encoded[at:at + 2048]), file=output)
        print('FS24F_PART_END\t%d\t%s' % (row['part'], row['sha256']), file=output)
        cursor += row['bytes']
    print('FS24F_END\t%d\t%s' % (manifest['volume'], sha(canonical(manifest))), file=output)


F_LINE = re.compile(r'^\ufeff?(?:\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d+Z\s+)?(FS24F_(?:BEGIN|DATA|PART_END|END)\t[^\r\n]*)\r?$')


def volume_log_manifest_hash(path):
    with pathlib.Path(path).open('r', encoding='utf-8', errors='strict', newline='') as f:
        for line in f:
            match = F_LINE.fullmatch(line.rstrip('\n'))
            if match and match[1].startswith('FS24F_BEGIN\t'):
                header = json.loads(base64.b64decode(match[1].split('\t')[1], validate=True))
                need(header['manifestSha256'] == sha(canonical(header['manifest'])), 'F-ManifestSelfHash')
                return header['manifestSha256']
    raise ValueError('F-MissingBegin')


def decode_volume(path, expected_manifest):
    need(measure(path)['bytes'] <= 24 * 1024 * 1024, 'F-JobLogEnvelope')
    header = None; chunks = {}; ended = False; part_ended = set()
    with pathlib.Path(path).open('r', encoding='utf-8', errors='strict', newline='') as f:
        for line in f:
            match = F_LINE.fullmatch(line.rstrip('\n'))
            if not match:
                continue
            bits = match[1].split('\t')
            if bits[0] == 'FS24F_BEGIN':
                need(header is None and len(bits) == 2, 'F-DuplicateBegin')
                header = json.loads(base64.b64decode(bits[1], validate=True))
                need(header['manifest'] == expected_manifest
                     and header['manifestSha256'] == sha(canonical(expected_manifest)), 'F-ManifestPin')
                chunks = {row['part']: [] for row in expected_manifest['parts']}
            elif bits[0] == 'FS24F_DATA':
                need(header is not None and not ended and len(bits) == 4, 'F-DataState')
                part = int(bits[1]); sequence = int(bits[2])
                need(part in chunks and part not in part_ended and sequence == len(chunks[part])
                     and 0 < len(bits[3]) <= 2048, 'F-DataSequence')
                chunks[part].append(bits[3])
            elif bits[0] == 'FS24F_PART_END':
                need(header is not None and not ended and len(bits) == 3, 'F-PartEndState')
                part = int(bits[1]); row = next((x for x in expected_manifest['parts'] if x['part'] == part), None)
                need(row is not None and part not in part_ended and bits[2] == row['sha256'], 'F-PartEndPin')
                part_ended.add(part)
            else:
                need(header is not None and not ended and len(bits) == 3
                     and int(bits[1]) == expected_manifest['volume']
                     and bits[2] == sha(canonical(expected_manifest)), 'F-VolumeEndPin')
                ended = True
    need(header is not None and ended and part_ended == set(chunks), 'F-MissingTerminal')
    result = {}
    for row in expected_manifest['parts']:
        data = base64.b64decode(''.join(chunks[row['part']]), validate=True)
        need(len(data) == row['bytes'] and sha(data) == row['sha256'], 'F-PartHash')
        result[row['part']] = data
    joined = b''.join(result[x['part']] for x in expected_manifest['parts'])
    need(sha(joined) == expected_manifest['volumeSha256'], 'F-VolumeHash')
    return result


def validate_root_manifest(root):
    need(root['version'] == F_VERSION and root['authoritySha256'] == f_authority_sha(), 'F-RootAuthority')
    plan = root['plan']; validate_f_plan(plan)
    if plan['binding'].get('mode') == 'qualify':
        need(plan['source']['bytes'] == F_QUALIFICATION_ARCHIVE_BYTES,
             'F-QualificationArchiveBytes')
    need(root['planSha256'] == sha(canonical(plan)), 'F-RootPlanPin')
    manifests = root['volumeManifests']
    present = [x['volume'] for x in manifests]
    missing = [x for x in plan['selectedVolumes'] if x not in present]
    need(present == sorted(set(present)) and set(present) <= set(plan['selectedVolumes'])
         and root['missingVolumes'] == missing, 'F-RootVolumeInventory')
    for manifest in manifests:
        validate_f_volume(manifest, plan)
    need(root['producerResult'] in ['success', 'failure']
         and (root['producerResult'] != 'success' or not missing)
         and root['agentReceive'] == 'unproven'
         and root['preserve'] == F_AUTHORITY['preserve'], 'F-RootProducerClaim')


def zip_inventory(path):
    rows = []
    with zipfile.ZipFile(path) as z:
        infos = z.infolist()
        need(infos and len(infos) <= MAX_FILES and len({x.filename for x in infos}) == len(infos), 'F-ZipInventory')
        need(all(not x.is_dir() and not x.flag_bits & 1 and not stat.S_ISLNK(x.external_attr >> 16)
                 and not pathlib.PurePosixPath(x.filename).is_absolute() and '..' not in pathlib.PurePosixPath(x.filename).parts
                 for x in infos), 'F-UnsafeZip')
        need(sum(x.file_size for x in infos) <= MAX_RAW, 'F-ZipExpansionEnvelope')
        need(z.testzip() is None, 'F-ZipCRC')
        rows = [{'name': x.filename, 'bytes': x.file_size, 'crc32': '%08x' % x.CRC,
                 'compressedBytes': x.compress_size} for x in infos]
    return rows


def reconcile_saved_artifact(path, directory):
    wanted = [104622761595, 104628070660]
    results = []
    with zipfile.ZipFile(path) as z:
        names = z.namelist()
        for job in wanted:
            matches = [n for n in names if pathlib.PurePosixPath(n).name == 'original-%d.log' % job]
            need(len(matches) == 1, 'F-HistoricMember:%d' % job)
            target = pathlib.Path(directory) / ('original-%d.log' % job)
            with z.open(matches[0]) as src, target.open('xb') as out:
                for block in iter(lambda: src.read(1024 * 1024), b''):
                    out.write(block)
            info = measure(target)
            receipts = []
            for name in names:
                if not re.search(r'\d{4}-http\.json$', name):
                    continue
                try:
                    value = json.loads(z.read(name))
                except (json.JSONDecodeError, UnicodeDecodeError):
                    continue
                if pathlib.PurePosixPath(str(value.get('body', ''))).name == target.name:
                    receipts.append(value)
            need(len(receipts) == 1, 'F-HistoricHTTPReceipt:%d' % job)
            receipt = receipts[0]
            need(receipt.get('complete') is True and receipt.get('attempts') == 1
                 and receipt.get('bytes') == info['bytes'] and receipt.get('sha256') == info['sha256']
                 and receipt.get('contentEncoding') in [None, 'identity'], 'F-HistoricReceiptPin:%d' % job)
            hops = receipt.get('hops', [])
            need(hops and hops[-1].get('status') == 200, 'F-HistoricHTTPStatus:%d' % job)
            results.append({'job': job, **info, 'savedReceiptVerified': True,
                            'semanticClaim': 'unverified'})
    return results


def receive_f_volumes(logs, roots, directory):
    """Network-free consumer. Roots may span rescue plus bounded continuations."""
    directory = pathlib.Path(directory); directory.mkdir(exist_ok=False)
    root_values = [json.loads(pathlib.Path(x).read_bytes()) for x in roots]
    need(root_values, 'F-MissingRoot')
    for root in root_values:
        validate_root_manifest(root)
    first = root_values[0]['plan']
    need(all(root['plan']['source'] == first['source'] and root['plan']['binding']['mode'] in ['recover', 'continue', 'qualify']
             and root['authoritySha256'] == root_values[0]['authoritySha256'] for root in root_values), 'F-MixedRoots')
    declared = {}
    for root in root_values:
        for manifest in root['volumeManifests']:
            number = manifest['volume']; need(number not in declared, 'F-DuplicateVolume')
            declared[number] = manifest
    need(len(logs) == len(declared), 'F-LogCount')
    by_hash = {sha(canonical(value)): value for value in declared.values()}
    need(len(by_hash) == len(declared), 'F-DuplicateManifest')
    archive = directory / 'source-artifact.zip'; parts = set(); log_receipts = []
    with archive.open('xb') as assembled:
        assembled.truncate(first['source']['bytes'])
        for path in logs:
            manifest_hash = volume_log_manifest_hash(path)
            need(manifest_hash in by_hash, 'F-LogManifestMatch')
            manifest = by_hash[manifest_hash]; number = manifest['volume']
            value = decode_volume(path, manifest)
            need(all(part not in parts for part in value), 'F-DuplicatePart')
            for part, raw in value.items():
                row = first['parts'][part]
                need(len(raw) == row['bytes'], 'F-PartAssembly')
                assembled.seek(row['offset']); assembled.write(raw); parts.add(part)
            log_receipts.append({'volume': number, **measure(path)})
    need(sorted(parts) == list(range(len(first['parts']))), 'F-MissingPart')
    need(measure(archive) == {k: first['source'][k] for k in ['bytes', 'sha256']}, 'F-ArchivePin')
    members = zip_inventory(archive)
    historic = []
    if first['source']['artifact'] == F_SOURCE['artifact']:
        historic = reconcile_saved_artifact(archive, directory)
    receipt = {'version': F_VERSION, 'status': 'bytes-crc-members-verified',
               'authoritySha256': f_authority_sha(), 'source': first['source'],
               'archive': measure(archive), 'members': members, 'historicLogs': historic,
               'carrierLogs': sorted(log_receipts, key=lambda x: x['volume']),
               'savedArtifactReceiptReconciliation': 'bytes-verified' if historic else 'not-applicable',
               'sourceReceiptReconciliation': 'pending', 'responseB': 'missing',
               'WP002': 'todo', 'B1': 'unverified', 'B2': 'unverified',
               'node20': 'reserved', 'node24': 'reserved',
               'branchProtection': 'unverified', 'ownerAcceptance': 'pending'}
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
        # Several deliberately separate commands share the prepare directory.
        # Continue the immutable receipt sequence instead of overwriting the
        # first command's raw HTTP receipts when the next process starts.
        prior = [int(path.name[:4]) for path in self.directory.iterdir()
                 if path.is_file() and re.fullmatch(r'[0-9]{4}-http\.json', path.name)]
        self.sequence = max(prior, default=0)
        self.opener = urllib.request.build_opener(NoRedirect())

    def get(self, path, name, cap=1024 * 1024, binary=False):
        need(re.fullmatch(r'/(?:actions|git|pulls)/[A-Za-z0-9_/?=&.%-]+', path) and '..' not in path, 'GETScope')
        need('10425898194' not in path and safe_name(name), 'DeniedHistoricZIP')
        need(not (os.environ.get('FS24_F_ACTIVE') == 'true'
                  and path == '/actions/artifacts/10459765118/zip'), 'F-SavedArtifactFullGET')
        need(path != '/actions/jobs/104622761595/logs' and path != '/actions/jobs/104628070660/logs'
             or os.environ.get('FS_TRANSFER_MODE') == 'recover' and os.environ.get('FS24_F_ACTIVE') != 'true',
             'HistoricLogGate')
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

    def artifact_redirect(self, artifact_id, label):
        """Resolve once, retain only non-secret hop metadata, and never follow with auth."""
        need(isinstance(artifact_id, int) and artifact_id > 0 and safe_name(label), 'F-RedirectInput')
        path = '/actions/artifacts/%d/zip' % artifact_id
        url = 'https://api.github.com/repos/' + REPO + path
        request = urllib.request.Request(url, headers={
            'Authorization': 'Bearer ' + os.environ['GH_TOKEN'],
            'Accept': 'application/vnd.github+json', 'Accept-Encoding': 'identity',
            'X-GitHub-Api-Version': '2022-11-28'}, method='GET')
        try:
            response = self.opener.open(request)
        except urllib.error.HTTPError as error:
            response = error
        try:
            status = response.status; location = response.headers.get('Location', '')
            target = urllib.parse.urlparse(location)
            receipt = {'path': path, 'status': status,
                       'requestId': response.headers.get('x-github-request-id'),
                       'apiVersion': response.headers.get('x-github-api-version-selected'),
                       'locationPresent': bool(location), 'attempts': 1,
                       'authorizationForwarded': False}
            write_new(self.directory / (label + '-redirect.json'), canonical(receipt))
            need(status == 302 and target.scheme == 'https' and target.hostname
                 and not target.username and not target.password and target.port in [None, 443]
                 and not target.fragment, 'F-RedirectShape')
            need(target.hostname.endswith(('.blob.core.windows.net', '.actions.githubusercontent.com',
                                           '.githubusercontent.com')), 'F-RedirectHost')
            return target.geturl(), receipt
        finally:
            response.close()

    def range_get(self, signed_url, start, end, total, target, label):
        """Exactly one unauthenticated Range request.  A full 200 is a hard failure."""
        parsed = urllib.parse.urlparse(signed_url)
        need(parsed.scheme == 'https' and parsed.hostname and not parsed.username and not parsed.password
             and parsed.port in [None, 443] and parsed.hostname.endswith(('.blob.core.windows.net',
             '.actions.githubusercontent.com', '.githubusercontent.com')), 'F-RangeURL')
        need(0 <= start <= end < total and end - start + 1 <= F_VOLUME_BYTES, 'F-RangeBounds')
        request = urllib.request.Request(signed_url, headers={'Accept-Encoding': 'identity',
                                         'Range': 'bytes=%d-%d' % (start, end)}, method='GET')
        try:
            response = self.opener.open(request)
        except urllib.error.HTTPError as error:
            response = error
        target = pathlib.Path(target); expected = end - start + 1; used = 0
        receipt_path = self.directory / (label + '-range.json')
        receipt = {'status': response.status, 'contentRange': response.headers.get('Content-Range'),
                   'contentLength': response.headers.get('Content-Length'),
                   'contentEncoding': response.headers.get('Content-Encoding'),
                   'etag': response.headers.get('ETag'), 'requestId': response.headers.get('x-ms-request-id'),
                   'attempts': 1, 'authorizationForwarded': False}
        try:
            need(response.status == 206, 'F-HTTP206Required:' + str(response.status))
            need(receipt['contentRange'] == 'bytes %d-%d/%d' % (start, end, total)
                 and receipt['contentLength'] == str(expected)
                 and receipt['contentEncoding'] in [None, 'identity'], 'F-ContentRange')
            with target.open('xb') as out:
                for block in iter(lambda: response.read(1024 * 1024), b''):
                    used += len(block); need(used <= expected, 'F-RangeOverflow'); out.write(block)
            need(used == expected, 'F-RangeShort')
            return target, receipt
        finally:
            response.close()
            write_new(receipt_path, canonical({**receipt, 'start': start, 'end': end,
                      'expectedBytes': expected, 'bytes': used,
                      'sha256': measure(target)['sha256'] if target.is_file() else None,
                      'complete': target.is_file() and used == expected and response.status == 206}))


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


def inspect_f_suffix(root, head, baseline, git, field, changed, policy, data):
    """Bound FS24-F without changing or replenishing the exhausted E record."""
    need(git(root, 'rev-parse', F_CHECKPOINT + '^{tree}').strip() == F_CHECKPOINT_TREE, 'F-CheckpointTree')
    # The long-lived wp/002 branch points at the second parent of the
    # checkpoint merge, so its first F candidate is not a descendant of
    # F_CHECKPOINT.  Both refs represent the same canonical starting state
    # for the separately-accounted F suffix; seeding both avoids replaying the
    # already-merged E candidate as an unmerged F ancestor.
    cache = {F_CHECKPOINT: json.loads(json.dumps(baseline)),
             F_WP002: json.loads(json.dumps(baseline))}

    def r2b_bootstrap_state():
        parents = git(root, 'rev-list', '--parents', '-n', '1', G2_MAIN).split()
        need(parents == [G2_MAIN, F_CHECKPOINT], 'G2B-Parent')
        need(git(root, 'rev-parse', G2_MAIN + '^{tree}').strip() == G2_MAIN_TREE,
             'G2B-Tree')
        need(changed(root, F_CHECKPOINT, G2_MAIN) == [G2_RELAY_PATH],
             'G2B-Scope')
        need(git(root, 'rev-parse', G2_MAIN + ':' + G2_RELAY_PATH).strip()
             == G2B_MAIN_RELAY_BLOB, 'G2B-RelayBlob')
        message = git(root, 'show', '-s', '--format=%B', G2_MAIN)
        need(field(message, 'Fulcrum-Grant') == 'FS24-G-R2B'
             and field(message, 'Fulcrum-Phase') == G2B_PHASE
             and field(message, 'FS24-G-R2B-Authority') == G2B_AUTHORITY
             and field(message, 'Owner-Approval-Receipt') == G2B_AUTHORITY
             and field(message, 'FS24-G-R2B-Parent') == F_CHECKPOINT
             and field(message, 'FS24-G-R2B-Patch') == G2B_PATCH
             and field(message, 'FS24-G-R2B-Target-Tree') == G2_MAIN_TREE
             and field(message, 'FS24-G-R2B-Round') == '1', 'G2B-Trailers')
        state = json.loads(json.dumps(baseline))
        state['head'] = G2_MAIN
        state['candidateBase'] = G2_MAIN
        state['unmerged'] = []
        state['relayGateBootstrap'] = json.loads(json.dumps(G2B_RECORD))
        return state

    def visit(commit):
        if commit in cache:
            return cache[commit]
        if commit == G2_MAIN:
            cache[commit] = r2b_bootstrap_state()
            return cache[commit]
        parents = git(root, 'rev-list', '--parents', '-n', '1', commit).split()[1:]
        need(len(parents) in [1, 2], 'F-ParentCount')
        previous = visit(parents[0]); state = json.loads(json.dumps(previous))
        message = git(root, 'show', '-s', '--format=%B', commit)
        need(field(message, 'Fulcrum-Grant') == 'FS24-D', 'F-PreserveGrant')
        need(field(message, 'FS24-F-Checkpoint') == F_CHECKPOINT, 'F-Checkpoint')
        phase = field(message, 'Fulcrum-Phase')
        approval = field(message, 'FS24-F-Authority')
        need(approval == f_authority_sha(), 'F-Authority')
        owner_approval = field(message, 'Owner-Approval-Receipt')
        if phase == G_PHASE:
            g_approval = field(message, 'FS24-G-Authority')
            need(g_approval == g_authority_sha() and owner_approval == g_approval, 'G-Authority')
        elif phase == G2_PHASE:
            g2_approval = field(message, 'FS24-G-R2-Authority')
            need(g2_approval == g2_authority_sha() and owner_approval == g2_approval,
                 'G2-Authority')
        elif phase == G2D_PHASE:
            g2d_approval = field(message, 'FS24-G-R2D-Authority')
            need(field(message, 'FS24-G-R2-Authority') == g2_authority_sha()
                 and g2d_approval == g2d_authority_sha()
                 and owner_approval == g2d_approval, 'G2D-Authority')
        else:
            need(owner_approval == approval, 'F-Authority')
        extension = state.setdefault('evidenceVolume', {'rounds': [], 'merges': [],
            'approval': approval, 'paths': F_ALLOW, 'activations': [], 'continuations': []})
        need(extension['approval'] == approval and extension['paths'] == F_ALLOW, 'F-AuthorityChanged')
        delta = changed(root, parents[0], commit)
        total_allow = set(F_ALLOW)
        if phase == G2D_PHASE or state.get('evidenceAdmissionRepair') is not None:
            total_allow |= set(G2D_ALLOW)
        need(set(changed(root, F_CHECKPOINT, commit)) <= total_allow, 'F-TotalScope')
        for path, blob in policy.items():
            need(git(root, 'rev-parse', commit + ':' + path).strip() == blob, 'F-PolicyFreeze')
        for path in data:
            need(git(root, 'ls-tree', F_CHECKPOINT, '--', path) == git(root, 'ls-tree', commit, '--', path), 'F-DataFreeze')
        for path in delta:
            need(path in total_allow and git(root, 'ls-tree', commit, '--', path).startswith('100644 '), 'F-ScopeMode')
        if len(parents) == 2:
            need(phase == 'evidence-volume-merge', 'F-MergePhase')
            candidate = visit(parents[1])
            need(candidate['candidateBase'] == parents[0] and candidate['unmerged'], 'F-MergeBase')
            need(candidate['evidenceVolume']['approval'] == approval, 'F-MergeAuthority')
            need(git(root, 'rev-parse', commit + '^{tree}') == git(root, 'rev-parse', parents[1] + '^{tree}'), 'F-MergeTree')
            state = json.loads(json.dumps(candidate)); extension = state['evidenceVolume']
            number = int(field(message, 'Fulcrum-Integration-PR'))
            need(number > 18, 'F-MergePR')
            need(re.fullmatch('[1-9][0-9]*', field(message, 'FS24-F-Qualification-Run')), 'F-MergeQualification')
            need(re.fullmatch('[a-f0-9]{64}', field(message, 'FS24-F-Consumer-Receipt')), 'F-MergeReceipt')
            extension['merges'].append({'head': commit, 'base': parents[0],
                                        'candidate': parents[1], 'pr': number})
            need(len(extension['merges']) <= F_AUTHORITY['allocations']['technicalMerges'], 'F-MergeAllocation')
            state['unmerged'] = []; state['candidateBase'] = commit
        elif phase == 'evidence-volume-implementation':
            need(len(parents) == 1 and delta
                 and int(field(message, 'FS24-F-Round')) == len(extension['rounds']) + 1, 'F-RoundOrder')
            need(not extension['activations'], 'F-CodeAfterActivation')
            extension['rounds'].append(commit)
            need(len(extension['rounds']) <= F_AUTHORITY['allocations']['candidateCommits'], 'F-CandidateAllocation')
            if not state['unmerged']:
                # Preserve the canonical main base when publication starts
                # from the checkpointed wp/002 tip (the merge's second
                # parent).  Later rounds based on a merged main keep their
                # ordinary first-parent base.
                state['candidateBase'] = F_CHECKPOINT if parents[0] == F_WP002 else parents[0]
            state['unmerged'].append(commit)
        elif phase == G_PHASE:
            need(len(parents) == 1 and parents[0] == G_PARENT, 'G-Parent')
            need(set(delta) == set(G_ALLOW), 'G-Scope')
            need(field(message, 'FS24-G-Round') == '1', 'G-Round')
            need(len(extension['rounds']) == F_AUTHORITY['allocations']['candidateCommits']
                 and extension['rounds'][-1] == G_PARENT and not extension['merges']
                 and not extension['activations'] and not extension['continuations'],
                 'G-FState')
            need(state['candidateBase'] == F_CHECKPOINT and state['unmerged']
                 and state['unmerged'][-1] == G_PARENT and not state.get('evidenceAdmission'),
                 'G-Lineage')
            state['evidenceAdmission'] = {'commit': commit, 'parent': G_PARENT,
                                          'approval': g_authority_sha(), 'paths': G_ALLOW}
            state['unmerged'].append(commit)
        elif phase == G2_PHASE:
            need(len(parents) == 1 and parents[0] == G2_PARENT, 'G2-Parent')
            need(git(root, 'rev-parse', G2_PARENT + '^{tree}').strip() == G2_PARENT_TREE,
                 'G2-ParentTree')
            need(set(delta) == set(G2_ALLOW), 'G2-Scope')
            need(field(message, 'FS24-G-R2-Round') == '1', 'G2-Round')
            readiness_run = field(message, 'FS24-G-R2-Readiness-Run')
            readiness_receipt = field(message, 'FS24-G-R2-Readiness-Receipt')
            need(re.fullmatch('[1-9][0-9]*', readiness_run)
                 and int(readiness_run) == G2_READINESS_RUN
                 and readiness_receipt == G2_READINESS_RECEIPT,
                 'G2-ReadinessTrailer')
            need(len(extension['rounds']) == F_AUTHORITY['allocations']['candidateCommits']
                 and extension['rounds'][-1] == G_PARENT and not extension['merges']
                 and not extension['activations'] and not extension['continuations'],
                 'G2-FState')
            admission = state.get('evidenceAdmission')
            need(admission and admission['commit'] == G2_PARENT
                 and admission['parent'] == G_PARENT
                 and admission['approval'] == g_authority_sha()
                 and admission['paths'] == G_ALLOW, 'G2-G1Preserved')
            need(state['candidateBase'] == F_CHECKPOINT and state['unmerged']
                 and state['unmerged'][-1] == G2_PARENT
                 and not state.get('evidenceAdmissionRecovery'), 'G2-Lineage')
            need(git(root, 'rev-parse', commit + ':' + G2_RELAY_PATH).strip()
                 == G2_RELAY_BLOB, 'G2-RelayGate')
            state['evidenceAdmissionRecovery'] = {
                'commit': commit, 'parent': G2_PARENT, 'approval': g2_authority_sha(),
                'paths': G2_ALLOW, 'readinessRun': int(readiness_run),
                'readinessReceipt': readiness_receipt}
            state['relayGateBootstrap'] = json.loads(json.dumps(G2B_RECORD))
            state['candidateBase'] = G2_MAIN
            state['unmerged'].append(commit)
        elif phase == G2D_PHASE:
            state['evidenceAdmissionRepair'] = validate_g2d_transition(
                root, commit, parents, delta, state, git, field, message)
            state['unmerged'].append(commit)
        elif phase == 'evidence-volume-recover':
            need(len(parents) == 1 and not delta and not state['unmerged'] and extension['merges']
                 and not extension['activations'] and not extension['continuations'], 'F-RecoveryTree')
            need(re.fullmatch('[1-9][0-9]*', field(message, 'FS24-F-Qualification-Run')), 'F-QualificationRun')
            need(re.fullmatch('[a-f0-9]{64}', field(message, 'FS24-F-Consumer-Receipt')), 'F-ConsumerReceipt')
            extension['activations'].append(commit)
            need(len(extension['activations']) <= F_AUTHORITY['allocations']['recoveryActivations'], 'F-ActivationAllocation')
            state['candidateBase'] = parents[0]; state['unmerged'] = [commit]
        elif phase == 'evidence-volume-continue':
            need(len(parents) == 1 and not delta and len(extension['activations']) == 1
                 and state['unmerged'], 'F-ContinuationTree')
            number = int(field(message, 'FS24-F-Continuation'))
            need(number == len(extension['continuations']) + 1, 'F-ContinuationOrder')
            volumes = json.loads(field(message, 'FS24-F-Missing-Volumes'))
            used = {x for row in extension['continuations'] for x in row['volumes']}
            need(isinstance(volumes, list) and volumes == sorted(set(volumes))
                 and 1 <= len(volumes) <= F_AUTHORITY['allocations']['continuationVolumesPerCommit']
                 and all(isinstance(x, int) and 0 <= x < F_MAX_VOLUMES and x not in used for x in volumes), 'F-ContinuationVolumes')
            source_run = int(field(message, 'FS24-F-Recovery-Run'))
            need(source_run > 0 and re.fullmatch('[a-f0-9]{64}', field(message, 'FS24-F-Consumer-Receipt')), 'F-ContinuationReceipt')
            need(not extension['continuations'] or extension['continuations'][0]['sourceRun'] == source_run,
                 'F-ContinuationSourceChanged')
            extension['continuations'].append({'head': commit, 'round': number,
                                               'sourceRun': source_run, 'volumes': volumes})
            need(len(extension['continuations']) <= F_AUTHORITY['allocations']['continuationCommits'], 'F-ContinuationAllocation')
            state['unmerged'].append(commit)
        else:
            raise ValueError('F-UnclassifiedPhase')
        state['head'] = commit
        state['paths'] = sorted(set(baseline['paths']) | set(F_ALLOW)
                                | (set(G2D_ALLOW) if state.get('evidenceAdmissionRepair') else set()))
        need(state['epochs'] == baseline['epochs'] and state['data'] == baseline['data']
             and state['code'] == baseline['code'] and state['closure'] == baseline['closure']
             and state.get('evidenceRepair') == baseline.get('evidenceRepair'), 'F-HistoryPreserved')
        if previous.get('evidenceAdmission') is not None:
            need(state.get('evidenceAdmission') == previous['evidenceAdmission'], 'G-HistoryPreserved')
        if previous.get('evidenceAdmissionRecovery') is not None:
            need(state.get('evidenceAdmissionRecovery') == previous['evidenceAdmissionRecovery'],
                 'G2-HistoryPreserved')
        if previous.get('evidenceAdmissionRepair') is not None:
            need(state.get('evidenceAdmissionRepair') == previous['evidenceAdmissionRepair'],
                 'G2D-HistoryPreserved')
        if previous.get('relayGateBootstrap') is not None:
            need(state.get('relayGateBootstrap') == previous['relayGateBootstrap'],
                 'G2B-HistoryPreserved')
        cache[commit] = state
        return state
    return visit(head)


def load_preflight(root):
    import importlib.util
    spec = importlib.util.spec_from_file_location('fs24_preflight', root / 'scripts/wp002-preflight.py')
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def g2_readiness_record(run, jobs):
    """Canonical, log-free proof of the exact R2B admission-only boundary."""
    need(isinstance(run, dict) and isinstance(jobs, list), 'G2-ReadinessShape')
    need(run.get('id') == G2_READINESS_RUN, 'G2-ReadinessRun')
    need(run.get('repository', {}).get('id') == G2_AUTHORITY['readiness']['repositoryId']
         and run.get('head_repository', {}).get('id') == G2_AUTHORITY['readiness']['repositoryId']
         and run['repository'].get('full_name') == REPO
         and run['head_repository'].get('full_name') == REPO, 'G2-ReadinessRepository')
    need(run.get('run_attempt') == 1 and run.get('event') == 'workflow_dispatch'
         and run.get('status') == 'completed' and run.get('conclusion') == 'failure'
         and run.get('path') == '.github/workflows/ci.yml'
         and run.get('head_branch') == 'wp/002' and run.get('head_sha') == G2_PARENT
         and run.get('created_at') == '2026-09-17T14:18:42Z'
         and run.get('run_started_at') == '2026-09-17T14:18:42Z'
         and run.get('updated_at') == '2026-09-17T14:19:10Z'
         and run.get('display_title')
         == 'FS24-D 1707fd757f62dc7a94d964aed9ca03ffffcdd52f5837fa36a66147c6cd646919',
         'G2-ReadinessRunState')
    need(len(jobs) == 4 and all(isinstance(x, dict) for x in jobs)
         and {x.get('name') for x in jobs} == set(G2_READINESS_JOBS)
         and len({x.get('id') for x in jobs}) == 4, 'G2-ReadinessJobs')
    common_steps = [
        (1, 'Set up job', 'success'),
        (2, 'Initialize evidence directory', 'success'),
        (3, 'Checkout exact candidate', 'success'),
        (4, 'Preflight scope secret policy and checkpoint', 'failure'),
        (5, 'Checksum-pinned runtime', 'skipped'),
        (6, 'Set up action runtime tooling', 'skipped'),
        (7, 'Install exact lockfile without lifecycle scripts', 'skipped'),
        (8, None, 'skipped'),
        (9, 'Verify source mirror and live main unchanged', 'failure'),
        (10, 'Remove temporary execution data', 'success'),
        (11, 'Emit complete evidence bytes', 'success'),
        (12, 'Preserve original evidence bundle', 'skipped'),
        (13, 'Remove final report data', 'success'),
        (26, 'Post Checkout exact candidate', 'success'),
        (27, 'Complete job', 'success'),
    ]
    normalized_jobs = []
    for job in sorted(jobs, key=lambda x: x.get('name', '')):
        pin = G2_READINESS_JOBS[job['name']]
        need(isinstance(job.get('id'), int) and job.get('run_id') == run['id']
             and job.get('id') == pin['id'] and job.get('run_attempt') == 1
             and job.get('status') == 'completed' and job.get('conclusion') == 'failure',
             'G2-ReadinessJobBinding')
        labels = job.get('labels'); steps = job.get('steps')
        need(labels == ['ubuntu-24.04'] and job.get('runner_name') == pin['runner']
             and job.get('runner_group_name') == 'GitHub Actions'
             and isinstance(steps, list) and len(steps) == len(common_steps),
             'G2-RunnerNotReady')
        expected = [(number, ('Run ' + job['name'] + ' checks') if name is None else name,
                     conclusion) for number, name, conclusion in common_steps]
        observed = [(x.get('number'), x.get('name'), x.get('conclusion')) for x in steps]
        need(observed == expected and all(x.get('status') == 'completed' for x in steps),
             'G2-ReadinessSteps')
        normalized_jobs.append({
            'id': job['id'], 'name': job.get('name'), 'runId': job['run_id'],
            'runAttempt': job['run_attempt'], 'status': job['status'],
            'conclusion': job.get('conclusion'), 'runnerName': job.get('runner_name'),
            'runnerGroupName': job.get('runner_group_name'), 'labels': sorted(labels),
            'steps': [{'number': x.get('number'), 'name': x.get('name'),
                       'status': x.get('status'), 'conclusion': x.get('conclusion')}
                      for x in sorted(steps, key=lambda x: x.get('number', -1))]})
    return {'version': 'FS24G-R2-readiness/2',
            'run': {'id': run['id'], 'repositoryId': run['repository']['id'],
                    'repository': run['repository']['full_name'],
                    'headRepositoryId': run['head_repository']['id'],
                    'headRepository': run['head_repository']['full_name'],
                    'headSha': run.get('head_sha'), 'headBranch': run.get('head_branch'),
                    'event': run['event'], 'path': run['path'],
                    'runAttempt': run['run_attempt'], 'status': run['status'],
                    'conclusion': run['conclusion'], 'createdAt': run['created_at'],
                    'runStartedAt': run['run_started_at'],
                    'updatedAt': run.get('updated_at'),
                    'displayTitle': run['display_title']},
            'jobs': normalized_jobs}


def check_g2_readiness(reader, preflight, message):
    value = preflight.field(message, 'FS24-G-R2-Readiness-Run')
    need(re.fullmatch('[1-9][0-9]*', value), 'G2-ReadinessRunTrailer')
    run_id = int(value); run = bound_run(reader, run_id, 'g2-readiness-run')
    jobs = reader.page('/actions/runs/%d/jobs' % run_id, 'jobs', 'g2-readiness-jobs')
    record = g2_readiness_record(run, jobs)
    receipt = preflight.field(message, 'FS24-G-R2-Readiness-Receipt')
    need(re.fullmatch('[a-f0-9]{64}', receipt) and sha(canonical(record)) == receipt,
         'G2-ReadinessReceipt')
    return record


def g2_readiness_cli(args):
    need(args.file and args.binding, 'G2-ReadinessInputs')
    run = json.loads(pathlib.Path(args.file).read_bytes())
    jobs_value = json.loads(pathlib.Path(args.binding).read_bytes())
    jobs = jobs_value.get('jobs') if isinstance(jobs_value, dict) else jobs_value
    record = g2_readiness_record(run, jobs)
    directory = pathlib.Path(args.directory); directory.mkdir(exist_ok=False)
    target = directory / 'g2-readiness.json'; write_new(target, canonical(record))
    print('FS24G2_READINESS\t' + json.dumps({'run': run['id'],
          'receipt': sha(canonical(record)), **measure(target)}, separators=(',', ':')))


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


F_LEDGER_FIELDS = ['id', 'head_sha', 'head_branch', 'event', 'status', 'conclusion',
                   'run_attempt', 'path', 'display_title']
F_JOB_RESERVE = {'.github/workflows/ci.yml': 4,
                 '.github/workflows/acceptance-wp002.yml': 6}


def f_baseline(root):
    text = (root / F_ALLOW[0]).read_text()
    rows = json.loads(text.split('<!-- BEGIN_FS24F_BASELINE_JSON -->\n')[1]
                      .split('\n<!-- END_FS24F_BASELINE_JSON -->')[0])
    need(len(rows) == F_BASELINE_LEDGER and len({x['id'] for x in rows}) == F_BASELINE_LEDGER,
         'F-BaselineInventory')
    return rows


def check_f_ledger(reader, root):
    """Account only post-210 runs online; every consumed group stays frozen."""
    pins = f_baseline(root)
    current = reader.page('/actions/runs', 'workflow_runs', 'f-ledger')
    by_id = {x['id']: x for x in current}
    for row in pins:
        need(row['id'] in by_id and all(by_id[row['id']].get(k) == row.get(k)
             for k in F_LEDGER_FIELDS), 'F-BaselineDelta')

    frozen_groups = {
        'fBaseline': set(G_BASELINE_RUNS),
        'g1': set(G2_STOP_RUNS),
        'r2a': set(G2_R2A_RUNS),
        'r2b': {G2_READINESS_RUN},
        'r2c': set(G2C_RUNS),
    }
    frozen_ids = set().union(*frozen_groups.values())
    need(sum(len(x) for x in frozen_groups.values()) == len(frozen_ids),
         'G2-FrozenRunOverlap')
    added = [x for x in current if x['id'] not in {p['id'] for p in pins}]
    need(frozen_ids <= {x['id'] for x in added}, 'G2-FrozenRunInventory')
    for run in [x for x in added if x['id'] in frozen_ids]:
        need(run.get('repository', {}).get('full_name') == REPO
             and run.get('head_repository', {}).get('full_name') == REPO
             and run.get('run_attempt') == 1, 'G2-FrozenRunBinding')

    pf = load_preflight(root)
    phase_cache = {}

    def head_phase(head):
        if head not in phase_cache:
            message = pf.git(root, 'show', '-s', '--format=%B', head)
            phases = re.findall(r'^Fulcrum-Phase: (.+)$', message, re.M)
            state = pf.inspect(root, head)
            if phases == [G2D_PHASE]:
                repair = state.get('evidenceAdmissionRepair')
                phase_cache[head] = ('g2d' if repair
                    and repair['commit'] == head
                    and repair['approval'] == g2d_authority_sha()
                    and repair['rangeBytes'] == F_QUALIFICATION_ARCHIVE_BYTES else None)
            else:
                volume = state.get('evidenceVolume')
                phase_cache[head] = ('f' if volume
                    and volume['approval'] == f_authority_sha() else None)
        return phase_cache[head]

    old_f = G_AUTHORITY['baseline']
    f_charged = {
        'workflowRuns': len(old_f['runIds']),
        'activeRuns': old_f['activeRuns'],
        'jobsIncludingReservations': old_f['jobs'],
        'wholeWorkflowSkips': old_f['wholeWorkflowSkips'],
        'legacyRelays': old_f['legacyRelays'],
        'artifactObjects': old_f['artifactObjects'],
        'artifactStorageBytes': old_f['artifactStorageBytes'],
    }
    g1 = G2_AUTHORITY['consumedG1']
    r2a = G2_AUTHORITY['consumedR2A']
    r2b = G2_AUTHORITY['consumedR2B']
    r2c = G2D_AUTHORITY['consumedR2C']
    g2d = {'workflowRuns': 0, 'activeRuns': 0, 'jobsIncludingReservations': 0,
           'wholeWorkflowSkips': 0, 'legacyRelays': 0, 'artifactObjects': 0,
           'artifactStorageBytes': 0}
    records = [{'run': run['id'], 'frozenGroup': name}
               for name, ids in frozen_groups.items()
               for run in added if run['id'] in ids]
    reserve_by_path = {
        '.github/workflows/ci.yml': 4,
        '.github/workflows/acceptance-wp002.yml': 6,
        '.github/workflows/recover-fs24-evidence.yml': 5,
    }

    for run in [x for x in added if x['id'] not in frozen_ids]:
        need(run.get('repository', {}).get('full_name') == REPO
             and run.get('head_repository', {}).get('full_name') == REPO
             and run.get('run_attempt') == 1, 'F-LedgerIdentity')
        path = run['path']
        is_legacy = path == '.github/workflows/recover-fs24-evidence.yml' \
            and run['event'] == 'workflow_run'
        if is_legacy:
            source_match = re.fullmatch(r'FS24[EF] ([1-9][0-9]*)',
                                        str(run.get('display_title', '')))
            need(source_match and int(source_match.group(1)) in by_id,
                 'F-LegacyRelaySource')
            phase = head_phase(by_id[int(source_match.group(1))]['head_sha'])
        else:
            phase = head_phase(run['head_sha'])
        need(phase in ['f', 'g2d'], 'F-UnclassifiedHead')
        target = g2d if phase == 'g2d' else f_charged
        if phase == 'g2d':
            need(run['event'] in ['push', 'pull_request'], 'G2D-LegacyRelayForbidden')
            need(path in reserve_by_path or path in [
                '.github/workflows/acceptance-wp000.yml',
                '.github/workflows/review-wp000-spec.yml'], 'G2D-WorkflowScope')
        else:
            need(run['event'] in ['push', 'pull_request', 'workflow_run'],
                 'F-LedgerEvent')

        if run['status'] == 'completed' and run['conclusion'] == 'skipped':
            need(run['event'] == 'pull_request'
                 and path in ['.github/workflows/acceptance-wp000.yml',
                              '.github/workflows/review-wp000-spec.yml'],
                 'F-UnclassifiedWholeSkip')
            target['workflowRuns'] += 1
            target['wholeWorkflowSkips'] += 1
            records.append({'run': run['id'], 'phase': phase, 'reserve': 0,
                            'jobs': 0, 'artifacts': 0,
                            'wholeWorkflowSkipped': True})
            continue

        reserve = reserve_by_path.get(path)
        if phase == 'f' and is_legacy:
            reserve = 34
        need(reserve is not None, 'F-UnclassifiedWorkflow')
        fetched = reader.page('/actions/runs/%d/jobs' % run['id'], 'jobs',
                              'f-jobs-%d' % run['id'])
        listed = reader.page('/actions/runs/%d/artifacts' % run['id'], 'artifacts',
                             'f-artifacts-%d' % run['id'])
        sizes = [x.get('size_in_bytes') for x in listed]
        need(all(isinstance(x, int) and x >= 0 for x in sizes), 'F-ArtifactSize')
        if fetched:
            run_jobs = len(fetched) if run['status'] == 'completed' else max(len(fetched), reserve)
        else:
            need(run['status'] != 'completed', 'F-MissingJobs')
            run_jobs = reserve
        target['workflowRuns'] += 1
        target['activeRuns'] += 1
        target['jobsIncludingReservations'] += run_jobs
        target['legacyRelays'] += int(is_legacy)
        target['artifactObjects'] += len(listed)
        target['artifactStorageBytes'] += sum(sizes)
        records.append({'run': run['id'], 'phase': phase, 'reserve': reserve,
                        'jobs': len(fetched), 'jobsIncludingReservation': run_jobs,
                        'artifacts': len(listed), 'artifactBytes': sum(sizes),
                        'legacy': is_legacy})

    caps = F_AUTHORITY['caps']
    need(f_charged['activeRuns'] <= caps['activeRuns']
         and f_charged['jobsIncludingReservations'] <= caps['jobsIncludingReservations']
         and f_charged['wholeWorkflowSkips'] <= caps['wholeWorkflowSkips']
         and f_charged['artifactObjects'] <= caps['artifactObjects']
         and f_charged['artifactStorageBytes'] <= caps['newArtifactStorageBytes']
         and f_charged['legacyRelays']
             <= 2 * (F_AUTHORITY['allocations']['candidateCommits'] + 1),
         'F-WholeCycleCap')
    g2d_caps = G2D_AUTHORITY['caps']
    need(g2d['workflowRuns'] <= g2d_caps['workflowRuns']
         and g2d['activeRuns'] <= g2d_caps['activeRuns']
         and g2d['jobsIncludingReservations'] <= g2d_caps['jobsIncludingReservations']
         and g2d['wholeWorkflowSkips'] <= g2d_caps['wholeWorkflowSkips']
         and g2d['legacyRelays'] == 0
         and g2d['artifactObjects'] <= g2d_caps['artifactObjects']
         and g2d['artifactStorageBytes'] <= g2d_caps['newArtifactStorageBytes'],
         'G2D-WholeCycleCap')
    write_new(reader.directory / 'f-ledger-summary.json', canonical({
        'baseline': {'ledger': F_BASELINE_LEDGER, 'active': 77, 'jobs': 327,
                     'wholeWorkflowSkips': 10, 'artifactObjects': 71,
                     'zipReceives': 95},
        'fCharged': f_charged,
        'g1Frozen': g1,
        'r2aFrozen': r2a,
        'r2bFrozen': r2b,
        'r2cFrozen': r2c,
        'g2dNew': g2d,
        'g2dCaps': g2d_caps,
        'frozenArtifactStorageUnknown': r2a['artifactStorageBytes'] is None,
        'preservedClosureReserve': {'active': 6, 'jobs': 30},
        'billingActualUsd': None,
        'records': records,
    }))
def f_message_state(root, head):
    pf = load_preflight(root); state = pf.inspect(root, head)
    need(state.get('evidenceVolume') and state['evidenceVolume']['approval'] == f_authority_sha(), 'F-CollectorAuthority')
    message = pf.git(root, 'show', '-s', '--format=%B', head)
    return pf, state, message, pf.field(message, 'Fulcrum-Phase')


def f_prepare(args):
    root = pathlib.Path(os.environ['GITHUB_WORKSPACE']); ident = identity(); head = ident['head']
    pf, state, message, phase = f_message_state(root, head)
    need(pf.git(root, 'rev-parse', 'HEAD').strip() == head, 'F-CollectorCheckout')
    event = ident['event']; need(event in ['push', 'workflow_run'], 'F-CollectorEvent')
    reader = Reader(pathlib.Path(args.directory)); main = reader.get('/git/ref/heads/main', 'f-main-before.json')['object']['sha']
    need(main == (state['candidateBase'] if state['unmerged'] else head), 'F-CollectorMainDelta')
    if phase == G2_PHASE:
        readiness = check_g2_readiness(reader, pf, message)
    elif phase == G2D_PHASE:
        readiness = {'inheritedRun': G2_READINESS_RUN,
                     'inheritedReceipt': G2_READINESS_RECEIPT,
                     'sourceAuthority': g2_authority_sha(),
                     'newLogReads': 0}
    else:
        readiness = None
    check_f_ledger(reader, root)
    if phase in ['evidence-volume-implementation', G_PHASE, G2_PHASE, G2D_PHASE,
                 'evidence-volume-merge']:
        mode = 'qualify'; selected = None
        target = pathlib.Path(args.directory) / 'qualification-source.bin'
        write_new(target, hashlib.shake_256(b'FS24F/1 deterministic range qualification').digest(F_QUALIFICATION_BYTES))
    elif phase == 'evidence-volume-recover':
        mode = 'recover'; selected = None
        qid = int(pf.field(message, 'FS24-F-Qualification-Run'))
        q = bound_run(reader, qid, 'f-qualification-run')
        need(q['path'] == '.github/workflows/recover-fs24-evidence.yml' and q['conclusion'] == 'success'
             and q['event'] == 'workflow_run' and q['head_branch'] == 'main'
             and q['head_sha'] == state['candidateBase'] and q['run_attempt'] == 1,
             'F-QualificationRunBinding')
        for path in F_ALLOW:
            need(pf.git(root, 'ls-tree', q['head_sha'], '--', path)
                 == pf.git(root, 'ls-tree', head, '--', path), 'F-QualificationCodeChanged')
    elif phase == 'evidence-volume-continue':
        mode = 'continue'; selected = json.loads(pf.field(message, 'FS24-F-Missing-Volumes'))
        recovery_id = int(pf.field(message, 'FS24-F-Recovery-Run'))
        recovery = bound_run(reader, recovery_id, 'f-recovery-run')
        need(recovery['path'] == '.github/workflows/recover-fs24-evidence.yml'
             and recovery['event'] == 'push' and recovery['head_branch'] == 'wp/002'
             and recovery['head_sha'] == state['evidenceVolume']['activations'][0]
             and recovery['status'] == 'completed' and recovery['run_attempt'] == 1,
             'F-RecoveryRunBinding')
    else:
        raise ValueError('F-CollectorPhase')
    current = bound_run(reader, int(os.environ['GITHUB_RUN_ID']), 'f-current-run')
    need(current['head_sha'] == os.environ['GITHUB_SHA']
         and current['path'] == '.github/workflows/recover-fs24-evidence.yml', 'F-CollectorRunBinding')
    after = reader.get('/git/ref/heads/main', 'f-main-after.json')['object']['sha']; need(after == main, 'F-CollectorPreservation')
    with open(os.environ['GITHUB_OUTPUT'], 'a') as output:
        output.write('mode=' + mode + '\n')
        output.write('selected=' + json.dumps(selected, separators=(',', ':')) + '\n')
        output.write('source_name=' + ('fs24f-range-source-%s' % ident['run'] if mode == 'qualify' else F_SOURCE['name']) + '\n')
    write_new(pathlib.Path(args.directory) / 'prepare.json', canonical({
        'version': F_VERSION, 'authoritySha256': f_authority_sha(), 'identity': ident,
        'phase': phase, 'mode': mode, 'selectedVolumes': selected,
        'g2AuthoritySha256': g2_authority_sha() if phase in [G2_PHASE, G2D_PHASE] else None,
        'g2dAuthoritySha256': g2d_authority_sha() if phase == G2D_PHASE else None,
        'g2Readiness': readiness,
        'preserve': F_AUTHORITY['preserve'], 'billingActualUsd': None}))


def f_expected_source(reader, mode):
    artifact = int(os.environ['FS_SOURCE_ID'])
    value = reader.get('/actions/artifacts/%d' % artifact, 'f-source-metadata.json')
    if mode == 'qualify':
        digest = os.environ['FS_SOURCE_DIGEST'].removeprefix('sha256:')
        expected = {'artifact': artifact, 'name': os.environ['FS_SOURCE_NAME'],
                    'bytes': value.get('size_in_bytes'), 'sha256': digest}
        workflow = value.get('workflow_run', {})
        need(workflow.get('id') == int(os.environ['GITHUB_RUN_ID'])
             and workflow.get('head_sha') == os.environ['GITHUB_SHA']
             and workflow.get('repository_id') == F_SOURCE['repositoryId']
             and workflow.get('head_repository_id') == F_SOURCE['repositoryId']
             and expected['bytes'] == F_QUALIFICATION_ARCHIVE_BYTES,
             'F-QualificationArtifact')
    else:
        expected = F_SOURCE
    return f_source_from_metadata(value, expected)


def f_binding(mode):
    return {'repository': REPO, 'run': os.environ['GITHUB_RUN_ID'], 'attempt': '1',
            'head': os.environ['FS_HEAD'], 'event': os.environ['GITHUB_EVENT_NAME'],
            'mode': mode, 'authoritySha256': f_authority_sha()}


def f_plan_live(args):
    directory = pathlib.Path(args.directory); reader = Reader(directory)
    mode = os.environ['FS_TRANSFER_MODE']; source = f_expected_source(reader, mode)
    selected = None if os.environ.get('FS_SELECTED', 'null') == 'null' else json.loads(os.environ['FS_SELECTED'])
    plan = f_plan(source, f_binding(mode), selected)
    if mode == 'qualify': need(len(plan['volumes']) == 3, 'F-QualificationVolumeCount')
    if mode == 'recover': need(len(plan['volumes']) == F_MAX_VOLUMES, 'F-RecoveryVolumeCount')
    write_new(directory / 'root-plan.json', canonical(plan))
    with open(os.environ['GITHUB_OUTPUT'], 'a') as output:
        output.write('matrix=' + json.dumps({'volume': plan['selectedVolumes']}, separators=(',', ':')) + '\n')
        output.write('plan_hash=' + sha(canonical(plan)) + '\n')
        output.write('source_id=' + str(source['artifact']) + '\n')
        output.write('source_name=' + source['name'] + '\n')
        output.write('source_bytes=' + str(source['bytes']) + '\n')
        output.write('source_sha256=' + source['sha256'] + '\n')


def f_emit_live(args):
    directory = pathlib.Path(args.directory)
    need(directory.is_dir() and not directory.is_symlink() and not any(directory.iterdir()),
         'F-EmitterDirectory')
    reader = Reader(directory)
    mode = os.environ['FS_TRANSFER_MODE']; source = f_expected_source(reader, mode)
    selected = json.loads(os.environ['FS_SELECTED']); plan = f_plan(source, f_binding(mode), selected)
    need(sha(canonical(plan)) == os.environ['FS_PLAN_HASH'], 'F-EmitterPlanPin')
    volume = int(os.environ['FS_VOLUME']); need(volume in selected, 'F-EmitterVolume')
    signed, redirect = reader.artifact_redirect(source['artifact'], 'f-source')
    row = plan['volumes'][volume]; target = directory / ('volume-%03d.bin' % volume)
    target, receipt = reader.range_get(signed, row['start'], row['end'], source['bytes'], target, 'f-volume-%03d' % volume)
    data = target.read_bytes(); manifest = f_volume_manifest(plan, volume, data, receipt)
    write_new(directory / 'volume-manifest.json', canonical(manifest)); emit_volume(manifest, data)


def extract_single_json_artifact(path, expected):
    with zipfile.ZipFile(path) as z:
        infos = z.infolist()
        need(len(infos) == 1 and pathlib.PurePosixPath(infos[0].filename).name == expected
             and not infos[0].flag_bits & 1 and not stat.S_ISLNK(infos[0].external_attr >> 16)
             and infos[0].file_size <= 2 * 1024 * 1024, 'F-SmallArtifactInventory')
        raw = z.read(infos[0])
    return json.loads(raw)


def f_collect_root(args):
    directory = pathlib.Path(args.directory)
    need(directory.is_dir() and not directory.is_symlink() and not any(directory.iterdir()),
         'F-ReportDirectory')
    reader = Reader(directory)
    run_id = int(os.environ['GITHUB_RUN_ID']); artifacts = reader.page('/actions/runs/%d/artifacts' % run_id,
                                                                       'artifacts', 'f-report-artifacts')
    def one(name, required=True):
        rows = [x for x in artifacts if x['name'] == name]
        if not rows and not required:
            return None
        need(len(rows) == 1 and not rows[0]['expired'] and rows[0]['workflow_run']['id'] == run_id,
             'F-ReportArtifact:' + name)
        target = reader.get('/actions/artifacts/%d/zip' % rows[0]['id'], 'artifact-%d.zip' % rows[0]['id'],
                            3 * 1024 * 1024, True)
        need(measure(target)['sha256'] == str(rows[0].get('digest') or '').removeprefix('sha256:'),
             'F-ReportArtifactDigest')
        return target
    plan = extract_single_json_artifact(one('fs24f-plan-%d' % run_id), 'root-plan.json')
    validate_f_plan(plan); need(sha(canonical(plan)) == os.environ['FS_PLAN_HASH'], 'F-ReportPlanPin')
    manifests = []
    for volume in plan['selectedVolumes']:
        artifact = one('fs24f-volume-%d-%d' % (run_id, volume), False)
        if artifact is None:
            continue
        value = extract_single_json_artifact(artifact,
                                             'volume-manifest.json')
        validate_f_volume(value, plan); manifests.append(value)
    missing = [x for x in plan['selectedVolumes'] if x not in {m['volume'] for m in manifests}]
    producer = 'success' if os.environ.get('EMIT_RESULT') == 'success' and not missing else 'failure'
    root = {'version': F_VERSION, 'authoritySha256': f_authority_sha(),
            'planSha256': sha(canonical(plan)), 'plan': plan, 'volumeManifests': manifests,
            'missingVolumes': missing, 'producerResult': producer, 'agentReceive': 'unproven',
            'preserve': F_AUTHORITY['preserve'], 'billingActualUsd': None}
    validate_root_manifest(root); write_new(directory / 'root-manifest.json', canonical(root))
    print(json.dumps({'producerResult': producer, 'planSha256': root['planSha256'],
                      'volumes': len(manifests), 'missingVolumes': missing, 'agentReceive': 'unproven',
                      **F_AUTHORITY['preserve'], 'billingActualUsd': None}, separators=(',', ':')))


def collect_candidate_job_logs(reader, source, run, jobs):
    # Preserve final cleanup/report lines as well as the earlier uploaded bundle.
    need(run['id'] != SOURCE_RUN and run['status'] == 'completed' and run['run_attempt'] == 1, 'CandidateLogRun')
    need(len({j['id'] for j in jobs}) == len(jobs), 'CandidateLogDuplicate')
    need(all(j['run_id'] == run['id'] and j['head_sha'] == run['head_sha'] and j['status'] == 'completed' for j in jobs), 'CandidateLogJob')
    for job in jobs:
        if job['conclusion'] == 'skipped':
            continue
        name = 'candidate-job-%d.log' % job['id']
        path = reader.get('/actions/jobs/%d/logs' % job['id'], name, 4 * 1024 * 1024, True)
        source['originals'].append({'kind': 'candidate-job-log', 'file': name, 'run': run['id'],
                                    'job': job['id'], 'name': job['name'], 'head': run['head_sha'], **measure(path)})


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
        collect_candidate_job_logs(reader, source, run, jobs)
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
    p.add_argument('mode', choices=['pack', 'split', 'emit', 'receive', 'collect', 'download-carrier',
                                    'unpack-artifact', 'extract-carrier', 'prepare-f', 'plan-f',
                                    'emit-volume-f', 'collect-root-f', 'receive-volumes-f',
                                    'readiness-g2'])
    p.add_argument('--directory', required=True)
    p.add_argument('--file')
    p.add_argument('--part', type=int)
    p.add_argument('--binding')
    p.add_argument('--index-hash')
    p.add_argument('--logs', nargs='*')
    p.add_argument('--roots', nargs='*')
    args = p.parse_args()
    directory = pathlib.Path(args.directory)
    if args.mode == 'readiness-g2':
        g2_readiness_cli(args)
    elif args.mode == 'prepare-f':
        f_prepare(args)
    elif args.mode == 'plan-f':
        f_plan_live(args)
    elif args.mode == 'emit-volume-f':
        f_emit_live(args)
    elif args.mode == 'collect-root-f':
        f_collect_root(args)
    elif args.mode == 'receive-volumes-f':
        receive_f_volumes(args.logs or [], args.roots or [], directory)
    elif args.mode == 'pack':
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
