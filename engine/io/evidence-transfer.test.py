"""Draft executable regression cases. Run in approved Actions, not during PREP."""
import base64
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



if __name__ == '__main__':
    unittest.main(verbosity=2)
