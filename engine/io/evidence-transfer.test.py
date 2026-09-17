"""Executable network-free codec, lineage, and HTTP contract regression cases."""
import base64
import hashlib
import importlib.util
import io
import json
import pathlib
import tempfile
import sys
sys.dont_write_bytecode = True
import unittest
import zipfile

spec = importlib.util.spec_from_file_location('evidence', pathlib.Path(__file__).with_name('evidence-transfer.py'))
e = importlib.util.module_from_spec(spec)
spec.loader.exec_module(e)


class TransferTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = pathlib.Path(self.tmp.name)
        self.raw = self.root / 'raw'
        self.raw.mkdir()
        self.original = bytes(range(256)) * 1024 + b'\x00\xff\r\n'
        (self.raw / 'original.log').write_bytes(self.original)
        self.binding = {'repository': e.REPO, 'run': 'fixture', 'attempt': '1', 'head': 'a' * 40}
        e.pack(self.raw, self.root / 'bundle.zip', self.binding)
        self.index = e.split(self.root / 'bundle.zip', self.root / 'parts', self.binding)
        self.index_hash = e.sha(e.canonical(self.index))
        self.logs = []
        for part in range(len(self.index['parts'])):
            stream = io.StringIO()
            e.emit_part(self.root / 'parts', part, stream)
            path = self.root / ('job-%d.log' % part)
            path.write_text(''.join('2026-09-16T12:00:00.0000000Z ' + row + '\n' for row in stream.getvalue().splitlines()))
            self.logs.append(path)

    def test_binary_roundtrip_crc_hash(self):
        receipt = e.receive(self.logs, self.root / 'received', self.index_hash, self.binding)
        self.assertEqual((self.root / 'received/members/original.log').read_bytes(), self.original)
        self.assertEqual(receipt['ownerAcceptance'], 'pending')
        self.assertEqual(receipt['sourceReceiptReconciliation'], 'pending')

    def test_missing_tail(self):
        p = self.logs[0]
        p.write_text('\n'.join(p.read_text().splitlines()[:-1]) + '\n')
        with self.assertRaisesRegex(ValueError, 'MissingTerminal'):
            e.decode_part(p, self.index_hash)

    def test_interior_segment_bom_preserves_bytes(self):
        p = self.logs[0]
        lines = p.read_text().splitlines(keepends=True)
        p.write_text(''.join('\ufeff' + row for row in lines))
        e.receive(self.logs, self.root / 'segment-bom', self.index_hash, self.binding)
        self.assertEqual((self.root / 'segment-bom/members/original.log').read_bytes(), self.original)

    def test_payload_bom_is_rejected(self):
        p = self.logs[0]
        p.write_text(p.read_text().replace('FS24E_DATA\t0\t', 'FS24E_DATA\t0\t\ufeff', 1))
        with self.assertRaises((ValueError, UnicodeEncodeError)):
            e.decode_part(p, self.index_hash)

    def test_masked_payload(self):
        p = self.logs[0]
        p.write_text(p.read_text().replace('FS24E_DATA\t0\t', 'FS24E_DATA\t0\t***', 1))
        with self.assertRaises(ValueError):
            e.decode_part(p, self.index_hash)

    def test_duplicate_log(self):
        with self.assertRaisesRegex(ValueError, 'MixedOrDuplicatePart'):
            e.receive(self.logs + self.logs, self.root / 'duplicate', self.index_hash, self.binding)

    def test_wrong_index_pin(self):
        with self.assertRaisesRegex(ValueError, 'IndexPin'):
            e.decode_part(self.logs[0], '0' * 64)

    def test_wrong_source(self):
        with self.assertRaisesRegex(ValueError, 'TransferBinding'):
            e.receive(self.logs, self.root / 'wrong', self.index_hash, {**self.binding, 'run': 'other'})

    def test_no_overwrite(self):
        with self.assertRaises(FileExistsError):
            e.pack(self.raw, self.root / 'bundle.zip', self.binding)

    def test_path_traversal(self):
        path = self.root / 'bad.zip'
        with zipfile.ZipFile(path, 'w') as z:
            z.writestr('../escape', b'bad')
            z.writestr('bundle-manifest.json', b'{}')
        with self.assertRaisesRegex(ValueError, 'UnsafeZip'):
            e.unpack(path, self.root / 'bad')
        self.assertFalse((self.root / 'escape').exists())

    def test_member_digest(self):
        manifest = {'version': e.VERSION, 'source': self.binding,
                    'members': [{'name': 'file', 'bytes': 3, 'sha256': '0' * 64}]}
        path = self.root / 'wrong-hash.zip'
        with zipfile.ZipFile(path, 'w') as z:
            z.writestr('bundle-manifest.json', e.canonical(manifest))
            z.writestr('file', b'abc')
        with self.assertRaisesRegex(ValueError, 'MemberHash'):
            e.unpack(path, self.root / 'wrong-hash')

    def test_multiple_parts(self):
        e.fixture(self.raw)
        e.pack(self.raw, self.root / 'large.zip', self.binding)
        index = e.split(self.root / 'large.zip', self.root / 'large-parts', self.binding)
        self.assertGreaterEqual(len(index['parts']), 3)
        logs = []
        for i in range(len(index['parts'])):
            stream = io.StringIO()
            e.emit_part(self.root / 'large-parts', i, stream)
            path = self.root / ('large-%d.log' % i)
            path.write_text(stream.getvalue())
            logs.append(path)
        with self.assertRaisesRegex(ValueError, 'MissingPart'):
            e.receive(logs[:-1], self.root / 'missing', e.sha(e.canonical(index)), self.binding)
        e.receive(list(reversed(logs)), self.root / 'full', e.sha(e.canonical(index)), self.binding)
        self.assertEqual(e.measure(self.root / 'full/members/synthetic-original.bin'), e.measure(self.raw / 'synthetic-original.bin'))

    def test_receiver_has_no_network_dependency(self):
        old = e.urllib.request.build_opener
        e.urllib.request.build_opener = lambda *a, **k: self.fail('receiver attempted network')
        try:
            e.receive(self.logs, self.root / 'offline', self.index_hash, self.binding)
        finally:
            e.urllib.request.build_opener = old

    def test_candidate_native_logs_bind_before_get(self):
        import unittest.mock
        reader = unittest.mock.Mock()
        run = {'id': 123, 'status': 'completed', 'run_attempt': 1, 'head_sha': 'a' * 40}
        job = {'id': 456, 'run_id': 123, 'head_sha': 'a' * 40, 'status': 'completed', 'conclusion': 'success', 'name': 'report'}
        path = self.raw / 'native.log'
        path.write_bytes(b'\xef\xbb\xbffinal cleanup\r\n')
        reader.get.return_value = path
        source = {'originals': []}
        e.collect_candidate_job_logs(reader, source, run, [job, {**job, 'id': 457, 'conclusion': 'skipped'}])
        reader.get.assert_called_once_with('/actions/jobs/456/logs', 'candidate-job-456.log', 4 * 1024 * 1024, True)
        self.assertEqual(source['originals'][0]['sha256'], e.measure(path)['sha256'])
        reader.reset_mock()
        for bad in [{**job, 'run_id': 999}, {**job, 'head_sha': 'b' * 40}, {**job, 'status': 'in_progress'}]:
            with self.assertRaisesRegex(ValueError, 'CandidateLogJob'):
                e.collect_candidate_job_logs(reader, source, run, [job, {**bad, 'id': 458}])
        with self.assertRaisesRegex(ValueError, 'CandidateLogRun'):
            e.collect_candidate_job_logs(reader, source, {**run, 'id': e.SOURCE_RUN}, [])
        reader.get.assert_not_called()

    def test_historical_reader_outside_actions_denied(self):
        import unittest.mock
        with unittest.mock.patch.dict(e.os.environ, {'GITHUB_ACTIONS': 'false'}):
            with self.assertRaisesRegex(ValueError, 'ActionsOnly'):
                e.Reader(self.raw)

    def test_http403_raw_once(self):
        import unittest.mock
        class Response(io.BytesIO):
            status = 403
            headers = {'Content-Length': '9'}
        class Opener:
            calls = 0
            def open(self, request):
                self.calls += 1
                return Response(b'forbidden')
        opener = Opener()
        with unittest.mock.patch.dict(e.os.environ, {'GITHUB_ACTIONS': 'true', 'GITHUB_REPOSITORY': e.REPO, 'GH_TOKEN': 'fixture'}):
            reader = e.Reader(self.raw)
            reader.opener = opener
            with self.assertRaisesRegex(ValueError, 'HTTP-no-retry:403'):
                reader.get('/actions/runs/1', 'error.json')
        self.assertEqual(opener.calls, 1)
        self.assertEqual((self.raw / 'error.json').read_bytes(), b'forbidden')
        self.assertFalse(json.loads((self.raw / '0001-http.json').read_bytes())['complete'])

    def test_http_short_content_length(self):
        import unittest.mock
        class Response(io.BytesIO):
            status = 200
            headers = {'Content-Length': '99'}
        class Opener:
            def open(self, request):
                return Response(b'{}')
        with unittest.mock.patch.dict(e.os.environ, {'GITHUB_ACTIONS': 'true', 'GITHUB_REPOSITORY': e.REPO, 'GH_TOKEN': 'fixture'}):
            reader = e.Reader(self.raw)
            reader.opener = Opener()
            with self.assertRaisesRegex(ValueError, 'ContentLengthMismatch'):
                reader.get('/actions/runs/1', 'short.json')
        self.assertFalse(json.loads((self.raw / '0001-http.json').read_bytes())['complete'])

    def test_f_reader_continues_receipts_across_commands(self):
        import unittest.mock
        class Response(io.BytesIO):
            status = 200
            headers = {'Content-Length': '2'}
        class Opener:
            def open(self, request):
                return Response(b'{}')
        env = {'GITHUB_ACTIONS': 'true', 'GITHUB_REPOSITORY': e.REPO, 'GH_TOKEN': 'fixture'}
        with unittest.mock.patch.dict(e.os.environ, env):
            first = e.Reader(self.raw); first.opener = Opener()
            first.get('/actions/runs/1', 'first.json')
            second = e.Reader(self.raw); second.opener = Opener()
            second.get('/actions/runs/2', 'second.json')
        self.assertTrue((self.raw / '0001-http.json').is_file())
        self.assertTrue((self.raw / '0002-http.json').is_file())

    def test_denied_zip_zero_get(self):
        import unittest.mock
        with unittest.mock.patch.dict(e.os.environ, {'GITHUB_ACTIONS': 'true', 'GITHUB_REPOSITORY': e.REPO, 'GH_TOKEN': 'fixture'}):
            reader = e.Reader(self.raw)
            reader.opener = unittest.mock.Mock()
            with self.assertRaisesRegex(ValueError, 'DeniedHistoricZIP'):
                reader.get('/actions/artifacts/10425898194/zip', 'denied.zip', binary=True)
            reader.opener.open.assert_not_called()

    def test_big_log_zero_get_without_recovery(self):
        import unittest.mock
        with unittest.mock.patch.dict(e.os.environ, {'GITHUB_ACTIONS': 'true', 'GITHUB_REPOSITORY': e.REPO,
                                                    'GH_TOKEN': 'fixture', 'FS_TRANSFER_MODE': 'qualify'}):
            reader = e.Reader(self.raw)
            reader.opener = unittest.mock.Mock()
            with self.assertRaisesRegex(ValueError, 'HistoricLogGate'):
                reader.get('/actions/jobs/104622761595/logs', 'denied.log', binary=True)
            reader.opener.open.assert_not_called()

    def test_f_recovery_still_denies_historic_job_log_endpoints(self):
        import unittest.mock
        with unittest.mock.patch.dict(e.os.environ, {'GITHUB_ACTIONS': 'true', 'GITHUB_REPOSITORY': e.REPO,
                'GH_TOKEN': 'fixture', 'FS_TRANSFER_MODE': 'recover', 'FS24_F_ACTIVE': 'true'}):
            reader = e.Reader(self.raw); reader.opener = unittest.mock.Mock()
            for job in [104622761595, 104628070660]:
                with self.assertRaisesRegex(ValueError, 'HistoricLogGate'):
                    reader.get('/actions/jobs/%d/logs' % job, 'denied-%d.log' % job, binary=True)
            reader.opener.open.assert_not_called()
            with self.assertRaisesRegex(ValueError, 'F-SavedArtifactFullGET'):
                reader.get('/actions/artifacts/10459765118/zip', 'saved.zip', binary=True)
            reader.opener.open.assert_not_called()

    def test_trailing_bundle_bytes(self):
        with (self.root / 'bundle.zip').open('ab') as out:
            out.write(b'junk')
        with self.assertRaisesRegex(ValueError, 'TrailingOrCommentedBundle'):
            e.unpack(self.root / 'bundle.zip', self.root / 'trailing')


    def test_redirect_does_not_forward_token(self):
        import unittest.mock
        class Response(io.BytesIO):
            def __init__(self, body, status, headers):
                super().__init__(body)
                self.status = status
                self.headers = headers
        class Opener:
            def __init__(self):
                self.requests = []
            def open(self, request):
                self.requests.append(request)
                if len(self.requests) == 1:
                    return Response(b'', 302, {'Location': 'https://fixture.blob.core.windows.net/log'})
                return Response(b'original', 200, {'Content-Length': '8'})
        opener = Opener()
        with unittest.mock.patch.dict(e.os.environ, {'GITHUB_ACTIONS': 'true', 'GITHUB_REPOSITORY': e.REPO, 'GH_TOKEN': 'fixture'}):
            reader = e.Reader(self.raw)
            reader.opener = opener
            reader.get('/actions/jobs/1/logs', 'redirect.log', binary=True)
        self.assertEqual(len(opener.requests), 2)
        self.assertEqual(opener.requests[0].get_header('Authorization'), 'Bearer fixture')
        self.assertIsNone(opener.requests[1].get_header('Authorization'))
        self.assertEqual((self.raw / 'redirect.log').read_bytes(), b'original')

    def test_crc_corruption(self):
        body = b'\x00CRC-fixture\xff'
        manifest = {'version': e.VERSION, 'source': self.binding,
                    'members': [{'name': 'file', 'bytes': len(body), 'sha256': e.sha(body)}]}
        path = self.root / 'crc.zip'
        with zipfile.ZipFile(path, 'w', compression=zipfile.ZIP_STORED) as z:
            z.writestr('bundle-manifest.json', e.canonical(manifest))
            z.writestr('file', body)
        raw = bytearray(path.read_bytes())
        where = raw.index(body)
        raw[where + 2] ^= 1
        path.write_bytes(raw)
        with self.assertRaises(zipfile.BadZipFile):
            e.unpack(path, self.root / 'crc')

    def f_binding(self, mode='qualify'):
        return {'repository': e.REPO, 'run': '123', 'attempt': '1', 'head': 'f' * 40,
                'event': 'push', 'mode': mode, 'authoritySha256': e.f_authority_sha()}

    def test_f_saved_layout_is_650_parts_82_volumes(self):
        source = {'artifact': e.F_SOURCE['artifact'], 'name': e.F_SOURCE['name'],
                  'bytes': e.F_SOURCE['bytes'], 'sha256': e.F_SOURCE['sha256']}
        plan = e.f_plan(source, self.f_binding('recover'))
        self.assertEqual(len(plan['parts']), 650)
        self.assertEqual(len(plan['volumes']), 82)
        self.assertEqual(plan['parts'][-1]['bytes'], 1206027)
        self.assertEqual(plan['volumes'][-1]['bytes'], 3303179)
        self.assertEqual(plan['selectedVolumes'], list(range(82)))

    def test_f_saved_artifact_metadata_is_fully_pinned(self):
        value = {'id': e.F_SOURCE['artifact'], 'name': e.F_SOURCE['name'],
                 'size_in_bytes': e.F_SOURCE['bytes'], 'digest': 'sha256:' + e.F_SOURCE['sha256'],
                 'expires_at': e.F_SOURCE['expiresAtKnown'], 'expired': False,
                 'workflow_run': {'id': e.F_SOURCE['run'], 'head_sha': e.F_SOURCE['head'],
                                  'repository_id': e.F_SOURCE['repositoryId'],
                                  'head_repository_id': e.F_SOURCE['repositoryId']}}
        self.assertEqual(e.f_source_from_metadata(value, e.F_SOURCE)['artifact'], e.F_SOURCE['artifact'])
        for mutation in [{'expires_at': '2026-09-23T16:58:16Z'},
                         {'workflow_run': {**value['workflow_run'], 'head_sha': '0' * 40}}]:
            with self.assertRaisesRegex(ValueError, 'F-ArtifactLineagePin'):
                e.f_source_from_metadata({**value, **mutation}, e.F_SOURCE)

    def test_f_range_requires_exact_206_and_never_forwards_auth(self):
        import unittest.mock
        body = b'range-bytes'
        class Response(io.BytesIO):
            def __init__(self, payload, status, headers):
                super().__init__(payload); self.status = status; self.headers = headers
        class Opener:
            def __init__(self, status=206, content_range=None):
                self.requests = []; self.status = status; self.content_range = content_range
            def open(self, request):
                self.requests.append(request)
                return Response(body, self.status, {'Content-Length': str(len(body)),
                    'Content-Range': self.content_range or 'bytes 10-20/100'})
        env = {'GITHUB_ACTIONS': 'true', 'GITHUB_REPOSITORY': e.REPO, 'GH_TOKEN': 'fixture'}
        with unittest.mock.patch.dict(e.os.environ, env):
            reader = e.Reader(self.raw); opener = Opener(); reader.opener = opener
            target, receipt = reader.range_get('https://fixture.blob.core.windows.net/archive?sig=secret',
                                               10, 20, 100, self.root / 'range.bin', 'range')
            self.assertEqual(target.read_bytes(), body)
            self.assertEqual(receipt['status'], 206)
            self.assertIsNone(opener.requests[0].get_header('Authorization'))
            self.assertEqual(opener.requests[0].get_header('Range'), 'bytes=10-20')
        for status, content_range, reason in [(200, None, 'F-HTTP206Required'),
                                               (206, 'bytes 0-10/100', 'F-ContentRange')]:
            with self.subTest(status=status, content_range=content_range), unittest.mock.patch.dict(e.os.environ, env):
                reader = e.Reader(self.raw); reader.opener = Opener(status, content_range)
                with self.assertRaisesRegex(ValueError, reason):
                    reader.range_get('https://fixture.blob.core.windows.net/archive', 10, 20, 100,
                                     self.root / ('bad-%d.bin' % status), 'bad-%d' % status)

    def test_f_volume_roundtrip_large_zip_crc_and_offline_receiver(self):
        archive = self.root / 'large-source.zip'
        payload = hashlib.shake_256(b'FS24F test large zip').digest(e.F_VOLUME_BYTES + 97)
        with zipfile.ZipFile(archive, 'x', compression=zipfile.ZIP_STORED, allowZip64=True) as z:
            z.writestr('large.bin', payload)
        source = {'artifact': 123, 'name': 'fixture-source', **e.measure(archive)}
        plan = e.f_plan(source, self.f_binding())
        self.assertEqual(len(plan['volumes']), 2)
        logs = []; manifests = []
        raw = archive.read_bytes()
        for volume in plan['volumes']:
            data = raw[volume['start']:volume['end'] + 1]
            http = {'status': 206,
                    'contentRange': 'bytes %d-%d/%d' % (volume['start'], volume['end'], source['bytes']),
                    'contentLength': str(volume['bytes']), 'contentEncoding': None,
                    'attempts': 1, 'authorizationForwarded': False}
            manifest = e.f_volume_manifest(plan, volume['volume'], data, http); manifests.append(manifest)
            stream = io.StringIO(); e.emit_volume(manifest, data, stream)
            log = self.root / ('f-volume-%d.log' % volume['volume'])
            log.write_text(''.join('2026-09-16T12:00:00.0000000Z ' + line + '\n'
                                   for line in stream.getvalue().splitlines()))
            logs.append(log)
        root = {'version': e.F_VERSION, 'authoritySha256': e.f_authority_sha(),
                'planSha256': e.sha(e.canonical(plan)), 'plan': plan,
                'volumeManifests': manifests, 'missingVolumes': [], 'producerResult': 'success',
                'agentReceive': 'unproven', 'preserve': e.F_AUTHORITY['preserve'],
                'billingActualUsd': None}
        root_path = self.root / 'root-manifest.json'; root_path.write_bytes(e.canonical(root))
        old = e.urllib.request.build_opener
        e.urllib.request.build_opener = lambda *a, **k: self.fail('F receiver attempted network')
        try:
            receipt = e.receive_f_volumes(list(reversed(logs)), [root_path], self.root / 'f-received')
        finally:
            e.urllib.request.build_opener = old
        self.assertEqual(receipt['archive'], e.measure(archive))
        self.assertEqual(receipt['sourceReceiptReconciliation'], 'pending')
        self.assertEqual(receipt['B1'], 'unverified')
        with self.assertRaisesRegex(ValueError, 'F-LogCount'):
            e.receive_f_volumes(logs[:-1], [root_path], self.root / 'f-missing')
        partial = {**root, 'volumeManifests': manifests[:-1],
                   'missingVolumes': [plan['volumes'][-1]['volume']], 'producerResult': 'failure'}
        partial_path = self.root / 'partial-root.json'; partial_path.write_bytes(e.canonical(partial))
        e.validate_root_manifest(partial)
        selected = [plan['volumes'][-1]['volume']]
        continuation_plan = e.f_plan(source, self.f_binding('continue'), selected)
        volume = continuation_plan['volumes'][selected[0]]
        data = raw[volume['start']:volume['end'] + 1]
        http = {'status': 206,
                'contentRange': 'bytes %d-%d/%d' % (volume['start'], volume['end'], source['bytes']),
                'contentLength': str(volume['bytes']), 'contentEncoding': None,
                'attempts': 1, 'authorizationForwarded': False}
        continuation_manifest = e.f_volume_manifest(continuation_plan, selected[0], data, http)
        stream = io.StringIO(); e.emit_volume(continuation_manifest, data, stream)
        continuation_log = self.root / 'continuation.log'; continuation_log.write_text(stream.getvalue())
        continuation_root = {'version': e.F_VERSION, 'authoritySha256': e.f_authority_sha(),
            'planSha256': e.sha(e.canonical(continuation_plan)), 'plan': continuation_plan,
            'volumeManifests': [continuation_manifest], 'missingVolumes': [],
            'producerResult': 'success', 'agentReceive': 'unproven',
            'preserve': e.F_AUTHORITY['preserve'], 'billingActualUsd': None}
        continuation_path = self.root / 'continuation-root.json'
        continuation_path.write_bytes(e.canonical(continuation_root))
        repaired = e.receive_f_volumes([logs[0], continuation_log],
                                       [partial_path, continuation_path], self.root / 'f-repaired')
        self.assertEqual(repaired['archive'], e.measure(archive))

    def test_f_saved_receipt_reconciliation_keeps_semantics_unverified(self):
        archive = self.root / 'saved-fixture.zip'
        with zipfile.ZipFile(archive, 'x', compression=zipfile.ZIP_STORED) as z:
            for index, job in enumerate([104622761595, 104628070660], 1):
                name = 'raw/original-%d.log' % job; body = ('job-%d\n' % job).encode()
                z.writestr(name, body)
                receipt = {'body': name, 'bytes': len(body), 'sha256': e.sha(body),
                           'complete': True, 'attempts': 1, 'contentEncoding': None,
                           'hops': [{'status': 302}, {'status': 200}]}
                z.writestr('raw/%04d-http.json' % index, e.canonical(receipt))
        target = self.root / 'historic'; target.mkdir()
        rows = e.reconcile_saved_artifact(archive, target)
        self.assertEqual([x['job'] for x in rows], [104622761595, 104628070660])
        self.assertTrue(all(x['savedReceiptVerified'] and x['semanticClaim'] == 'unverified' for x in rows))

    def test_f_volume_rejects_manifest_or_payload_mutation(self):
        archive = self.root / 'tiny.zip'
        with zipfile.ZipFile(archive, 'x') as z: z.writestr('a', b'abc')
        source = {'artifact': 123, 'name': 'tiny', **e.measure(archive)}
        plan = e.f_plan(source, self.f_binding()); volume = plan['volumes'][0]; data = archive.read_bytes()
        http = {'status': 206, 'contentRange': 'bytes 0-%d/%d' % (len(data)-1, len(data)),
                'contentLength': str(len(data)), 'contentEncoding': None,
                'attempts': 1, 'authorizationForwarded': False}
        manifest = e.f_volume_manifest(plan, 0, data, http)
        stream = io.StringIO(); e.emit_volume(manifest, data, stream)
        log = self.root / 'tiny.log'; log.write_text(stream.getvalue())
        bad = json.loads(json.dumps(manifest)); bad['parts'][0]['sha256'] = '0' * 64
        with self.assertRaisesRegex(ValueError, 'F-ManifestPin'):
            e.decode_volume(log, bad)
        log.write_text(log.read_text().replace('FS24F_DATA\t0\t0\t', 'FS24F_DATA\t0\t0\t***', 1))
        with self.assertRaises(ValueError): e.decode_volume(log, manifest)

    def e_lineage(self, delta=None, policy_changed=False, data_changed=False, ordinal='1'):
        anchor = e.CHECKPOINT
        candidate = 'c' * 40
        baseline = {'head': anchor, 'code': e.SOURCE_HEAD, 'epochs': [{'code': e.SOURCE_HEAD}],
                    'data': [{'commit': 'd' * 40}], 'unmerged': [], 'candidateBase': anchor,
                    'closure': False, 'paths': [], 'dataPaths': ['pipeline/state.json']}
        message = '\n'.join(['Fulcrum-Grant: FS24-D', 'FS24-E-Checkpoint: ' + anchor,
                             'Owner-Approval-Receipt: ' + e.E_APPROVAL, 'Fulcrum-Phase: evidence-implementation',
                             'FS24-E-Round: ' + ordinal])
        def git(root, *args):
            if args == ('rev-parse', anchor + '^{tree}'):
                return '9fa66086d963bd6de2380fea25d8b2553bca5323\n'
            if args == ('rev-list', '--parents', '-n', '1', candidate):
                return candidate + ' ' + anchor + '\n'
            if args == ('show', '-s', '--format=%B', candidate):
                return message
            if args == ('rev-parse', candidate + ':AGENTS.md'):
                return ('b' if policy_changed else 'a') * 40
            if args[0] == 'ls-tree':
                blob = 'b' if data_changed and args[1] == candidate and args[-1] == 'pipeline/state.json' else 'a'
                return '100644 blob ' + blob * 40 + '\t' + args[-1] + '\n'
            self.fail('unexpected git request: ' + str(args))
        def field(text, key):
            rows = [x[len(key) + 2:] for x in text.splitlines() if x.startswith(key + ': ')]
            e.need(len(rows) == 1, 'Trailer:' + key)
            return rows[0]
        state = e.inspect_suffix(self.root, candidate, baseline, git, field,
                                 lambda *a: delta if delta is not None else [e.ALLOW[2]],
                                 {'AGENTS.md': 'a' * 40}, ['pipeline/state.json'])
        return baseline, state

    def test_e_suffix_preserves_history_and_accounting(self):
        before, after = self.e_lineage()
        self.assertEqual(before['data'], after['data'])
        self.assertEqual(before['epochs'], after['epochs'])
        self.assertEqual(before['code'], after['code'])
        self.assertEqual(len(after['evidenceRepair']['rounds']), 1)

    def test_e_suffix_rejects_scope(self):
        with self.assertRaisesRegex(ValueError, 'E-TotalScope'):
            self.e_lineage(delta=['package.json'])

    def test_e_suffix_rejects_policy(self):
        with self.assertRaisesRegex(ValueError, 'E-PolicyFreeze'):
            self.e_lineage(policy_changed=True)

    def test_e_suffix_rejects_data(self):
        with self.assertRaisesRegex(ValueError, 'E-DataFreeze'):
            self.e_lineage(data_changed=True)

    def test_e_suffix_rejects_round_reset(self):
        with self.assertRaisesRegex(ValueError, 'E-RoundOrder'):
            self.e_lineage(ordinal='0')

    def f_lineage(self, delta=None, ordinal='1', authority=None):
        anchor = e.F_CHECKPOINT; branch = e.F_WP002; candidate = 'f' * 40
        repair = {'rounds': ['r1'], 'merges': [], 'approval': e.E_APPROVAL,
                  'paths': e.ALLOW, 'activations': []}
        baseline = {'head': anchor, 'code': e.SOURCE_HEAD, 'epochs': [{'code': e.SOURCE_HEAD}],
                    'data': [{'commit': 'd' * 40}], 'unmerged': [], 'candidateBase': anchor,
                    'closure': False, 'paths': e.ALLOW, 'dataPaths': ['pipeline/state.json'],
                    'evidenceRepair': repair}
        approval = authority or e.f_authority_sha()
        message = '\n'.join(['Fulcrum-Grant: FS24-D', 'Fulcrum-Phase: evidence-volume-implementation',
                             'FS24-F-Checkpoint: ' + anchor, 'FS24-F-Authority: ' + approval,
                             'Owner-Approval-Receipt: ' + approval, 'FS24-F-Round: ' + ordinal])
        def git(root, *args):
            if args == ('rev-parse', anchor + '^{tree}'): return e.F_CHECKPOINT_TREE + '\n'
            if args == ('rev-list', '--parents', '-n', '1', candidate): return candidate + ' ' + branch + '\n'
            if args == ('show', '-s', '--format=%B', candidate): return message
            if args == ('rev-parse', candidate + ':AGENTS.md'): return 'a' * 40 + '\n'
            if args[0] == 'ls-tree': return '100644 blob ' + 'a' * 40 + '\t' + args[-1] + '\n'
            self.fail('unexpected F git request: ' + str(args))
        def field(text, key):
            rows = [x[len(key) + 2:] for x in text.splitlines() if x.startswith(key + ': ')]
            e.need(len(rows) == 1, 'Trailer:' + key); return rows[0]
        state = e.inspect_f_suffix(self.root, candidate, baseline, git, field,
                                   lambda *a: delta if delta is not None else [e.F_ALLOW[2]],
                                   {'AGENTS.md': 'a' * 40}, ['pipeline/state.json'])
        return baseline, state

    def test_f_suffix_separate_authority_preserves_d_and_e(self):
        before, after = self.f_lineage()
        self.assertEqual(after['evidenceRepair'], before['evidenceRepair'])
        self.assertEqual(after['data'], before['data'])
        self.assertEqual(len(after['evidenceVolume']['rounds']), 1)
        self.assertNotEqual(after['evidenceVolume']['approval'], e.E_APPROVAL)

    def test_f_suffix_rejects_scope_authority_and_round_reset(self):
        with self.assertRaisesRegex(ValueError, 'F-TotalScope'):
            self.f_lineage(delta=['package.json'])
        with self.assertRaisesRegex(ValueError, 'F-Authority'):
            self.f_lineage(authority='0' * 64)
        with self.assertRaisesRegex(ValueError, 'F-RoundOrder'):
            self.f_lineage(ordinal='0')

    def g_lineage(self, authority=None, parent=None, delta=None, repeat=False):
        c1 = '3ceb822b8b0f3bd69952ed7510c6dc269d92e8be'
        c2 = '44fb08b87bf6690c2f18128b5940b0fb40c05a95'
        c3 = e.G_PARENT
        g1 = 'a' * 40; g2 = 'b' * 40
        repair = {'rounds': ['r1'], 'merges': [], 'approval': e.E_APPROVAL,
                  'paths': e.ALLOW, 'activations': []}
        baseline = {'head': e.F_CHECKPOINT, 'code': e.SOURCE_HEAD,
                    'epochs': [{'code': e.SOURCE_HEAD}], 'data': [{'commit': 'd' * 40}],
                    'unmerged': [], 'candidateBase': e.F_CHECKPOINT, 'closure': False,
                    'paths': e.ALLOW, 'dataPaths': ['pipeline/state.json'],
                    'evidenceRepair': repair}
        f_approval = e.f_authority_sha(); g_approval = authority or e.g_authority_sha()
        f_message = lambda ordinal: '\n'.join([
            'Fulcrum-Grant: FS24-D', 'Fulcrum-Phase: evidence-volume-implementation',
            'FS24-F-Checkpoint: ' + e.F_CHECKPOINT, 'FS24-F-Authority: ' + f_approval,
            'Owner-Approval-Receipt: ' + f_approval, 'FS24-F-Round: ' + str(ordinal)])
        g_message = '\n'.join([
            'Fulcrum-Grant: FS24-D', 'Fulcrum-Phase: ' + e.G_PHASE,
            'FS24-F-Checkpoint: ' + e.F_CHECKPOINT, 'FS24-F-Authority: ' + f_approval,
            'FS24-G-Authority: ' + g_approval, 'Owner-Approval-Receipt: ' + g_approval,
            'FS24-G-Round: 1'])
        parents = {c1: e.F_WP002, c2: c1, c3: c2, g1: parent or c3, g2: g1}
        messages = {c1: f_message(1), c2: f_message(2), c3: f_message(3),
                    g1: g_message, g2: g_message}
        g_delta = list(e.G_ALLOW) if delta is None else delta

        def git(root, *args):
            if args == ('rev-parse', e.F_CHECKPOINT + '^{tree}'):
                return e.F_CHECKPOINT_TREE + '\n'
            if args[:4] == ('rev-list', '--parents', '-n', '1') and args[4] in parents:
                return args[4] + ' ' + parents[args[4]] + '\n'
            if args[:3] == ('show', '-s', '--format=%B') and args[3] in messages:
                return messages[args[3]]
            if args[0] == 'rev-parse' and args[1].endswith(':AGENTS.md'):
                return 'a' * 40 + '\n'
            if args[0] == 'ls-tree':
                return '100644 blob ' + 'a' * 40 + '\t' + args[-1] + '\n'
            self.fail('unexpected G git request: ' + str(args))

        def field(text, key):
            rows = [x[len(key) + 2:] for x in text.splitlines() if x.startswith(key + ': ')]
            e.need(len(rows) == 1, 'Trailer:' + key); return rows[0]

        def changed(root, before, after):
            if before == e.F_CHECKPOINT:
                return ([e.F_ALLOW[2]] if after in [c1, c2, c3]
                        else sorted(set([e.F_ALLOW[2]] + g_delta)))
            return g_delta if after in [g1, g2] else [e.F_ALLOW[2]]

        head = g2 if repeat else g1
        state = e.inspect_f_suffix(self.root, head, baseline, git, field, changed,
                                   {'AGENTS.md': 'a' * 40}, ['pipeline/state.json'])
        return baseline, state, g1

    def test_g_admission_is_separate_and_does_not_replenish_f(self):
        before, after, commit = self.g_lineage()
        self.assertEqual(e.f_authority_sha(),
                         'cc0187edbfd555887dc021f3f1b7ed0de6c9fd97757e32b46636bafeb96a46e8')
        self.assertEqual(after['evidenceVolume']['rounds'][-1], e.G_PARENT)
        self.assertEqual(len(after['evidenceVolume']['rounds']), 3)
        self.assertEqual(after['evidenceVolume']['approval'], e.f_authority_sha())
        self.assertEqual(after['evidenceAdmission'], {
            'commit': commit, 'parent': e.G_PARENT, 'approval': e.g_authority_sha(),
            'paths': e.G_ALLOW})
        self.assertEqual(after['evidenceRepair'], before['evidenceRepair'])
        self.assertEqual(after['unmerged'][-1], commit)

    def test_g_admission_rejects_authority_parent_repeat_and_scope(self):
        with self.assertRaisesRegex(ValueError, 'G-Authority'):
            self.g_lineage(authority='0' * 64)
        with self.assertRaisesRegex(ValueError, 'G-Parent'):
            self.g_lineage(parent='44fb08b87bf6690c2f18128b5940b0fb40c05a95')
        with self.assertRaisesRegex(ValueError, 'G-Parent'):
            self.g_lineage(repeat=True)
        with self.assertRaisesRegex(ValueError, 'G-Scope'):
            self.g_lineage(delta=e.G_ALLOW[:-1])
        with self.assertRaisesRegex(ValueError, 'F-TotalScope'):
            self.g_lineage(delta=['package.json'])

    def test_g_ledger_is_charged_separately_from_f(self):
        old_head = 'c' * 40; g_head = 'e' * 40

        def run(run_id, head=old_head, path='.github/workflows/ci.yml', event='push',
                conclusion='success', title='fixture'):
            return {'id': run_id, 'head_sha': head, 'head_branch': 'wp/002',
                    'event': event, 'status': 'completed', 'conclusion': conclusion,
                    'run_attempt': 1, 'path': path, 'display_title': title,
                    'repository': {'full_name': e.REPO},
                    'head_repository': {'full_name': e.REPO}}

        pin = run(1, head=e.F_CHECKPOINT, path='.github/workflows/ci.yml')
        baseline = []
        ids = list(e.G_BASELINE_RUNS)
        for index, run_id in enumerate(ids):
            if index < 6:
                baseline.append(run(run_id, head=e.F_CHECKPOINT,
                    path='.github/workflows/recover-fs24-evidence.yml', event='workflow_run',
                    conclusion='failure', title='FS24E ' + str(ids[6 + index])))
            else:
                baseline.append(run(run_id, conclusion='failure'))
        direct_id = 35180000001
        direct = run(direct_id, head=g_head, conclusion='success')
        relay = run(35180000002, head=e.F_CHECKPOINT,
                    path='.github/workflows/recover-fs24-evidence.yml', event='workflow_run',
                    conclusion='failure', title='FS24E ' + str(direct_id))
        whole_skip = run(35180000003, head=g_head,
                         path='.github/workflows/acceptance-wp000.yml',
                         event='pull_request', conclusion='skipped')
        current = [pin] + baseline + [direct, relay, whole_skip]
        jobs = {row['id']: [{}] * (4 if index < 12 else 3)
                for index, row in enumerate(baseline)}
        jobs[direct_id] = [{}] * 4; jobs[relay['id']] = [{}] * 3; jobs[whole_skip['id']] = []
        artifacts = {row['id']: [] for row in current}
        for index, row in enumerate(baseline[:10]):
            artifacts[row['id']] = [{'size_in_bytes': 1 if index < 9 else 36847022}]
        artifacts[direct_id] = [{'size_in_bytes': 11}, {'size_in_bytes': 13}]

        class Reader:
            def __init__(self, directory): self.directory = directory
            def page(self, path, key, label):
                if path == '/actions/runs': return current
                match = __import__('re').fullmatch(r'/actions/runs/(\d+)/(jobs|artifacts)', path)
                self_outer.assertIsNotNone(match)
                return jobs[int(match.group(1))] if match.group(2) == 'jobs' else artifacts[int(match.group(1))]

        class Preflight:
            @staticmethod
            def git(root, *args):
                self.assertEqual(args[:3], ('show', '-s', '--format=%B'))
                return ('Fulcrum-Phase: ' + (e.G_PHASE if args[3] == g_head
                                             else 'evidence-volume-implementation') + '\n')
            @staticmethod
            def field(message, name):
                return [line[len(name) + 2:] for line in message.splitlines()
                        if line.startswith(name + ': ')][0]
            @staticmethod
            def inspect(root, head):
                value = {'evidenceVolume': {'approval': e.f_authority_sha()}}
                if head == g_head:
                    value['evidenceAdmission'] = {'commit': g_head,
                                                  'approval': e.g_authority_sha()}
                return value

        self_outer = self
        original_baseline, original_preflight = e.f_baseline, e.load_preflight
        e.f_baseline = lambda root: [{key: pin[key] for key in e.F_LEDGER_FIELDS}]
        e.load_preflight = lambda root: Preflight()
        directory = self.root / 'ledger'; directory.mkdir()
        try:
            e.check_f_ledger(Reader(directory), self.root)
        finally:
            e.f_baseline, e.load_preflight = original_baseline, original_preflight
        summary = json.loads((directory / 'f-ledger-summary.json').read_text())
        self.assertEqual(summary['fCharged']['activeRuns'], 15)
        self.assertEqual(summary['fCharged']['jobsIncludingReservations'], 57)
        self.assertEqual(summary['fCharged']['legacyRelays'], 6)
        self.assertEqual(summary['gNew'], {
            'workflowRuns': 3, 'activeRuns': 2, 'jobsIncludingReservations': 7,
            'wholeWorkflowSkips': 1, 'legacyRelays': 1, 'artifactObjects': 2,
            'artifactStorageBytes': 24})



if __name__ == '__main__':
    unittest.main(verbosity=2)
