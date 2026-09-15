import { GitSource, Schemas, Validator, frozen } from "../../scripts/validate";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, readdirSync, writeFileSync, rmSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn, spawnSync } from "node:child_process";
import type { ArtifactRef, ArtifactWrite, WriteReceipt } from "./index";
import { RepoStore, SerializedRepositoryWriter, RepositoryBackend, RepositoryConflict,
  RepositoryTransport, StoredWrite, WriteCommand, blobHash, schemaChecker } from "./repo-store";
import { EpisodeStates, inspectEpisode } from "./episode-state";
import { RunLog } from "./run-log";
import { buildIndex } from "./reindex";

const check = schemaChecker(readdirSync("engine/contracts").filter(x => x.endsWith(".schema.json"))
  .map(name => JSON.parse(readFileSync(join("engine/contracts", name), "utf8"))));
// The fixture's duration is sourced from the existing contract, not an Engine content constant.
const runLogSchema = JSON.parse(readFileSync("engine/contracts/run-log.schema.json", "utf8")) as {
  properties: { durationMs: { minimum: number } }
};
const stamp = "2026-09-15T00:00:00.000Z";
const channel = "fixture-channel";
const episode = (name: string) => channel + "/2026-09-" + name;
const pathFor = (name: string) => "episodes/" + episode(name) + "/state.json";
const state = (name: string, revision = 1) => ({ episodeId: episode(name), channel,
  currentStage: "fixture", stageStatus: "pending", updatedAt: stamp, spendUsd: 0, versions: {}, revision });
const line = (id: string) => ({ ts: stamp, runId: id, episodeId: episode("a"), stage: "fixture",
  attempt: 1, verdict: "pass", durationMs: runLogSchema.properties.durationMs.minimum, costUsd: 0 });
function git(root: string, args: string[], input?: string, extra?: NodeJS.ProcessEnv): string {
  const r = spawnSync("git", ["-C", root, ...args], { encoding: "utf8", input,
    env: { ...process.env, GIT_AUTHOR_NAME: "Fixture", GIT_AUTHOR_EMAIL: "fixture@example.invalid",
      GIT_COMMITTER_NAME: "Fixture", GIT_COMMITTER_EMAIL: "fixture@example.invalid", ...extra } });
  if (r.error) throw r.error;
  if (r.status !== 0) throw new Error("FixtureGit:" + args[0] + ":" + r.stderr);
  return r.stdout.trimEnd();
}
/** Local bare Git fixture only: no remote, token, production ref or transport. */
class GitFixture implements RepositoryBackend {
  commitsAttempted = 0;
  constructor(readonly root: string) {}
  head(): string { return git(this.root, ["rev-parse", "refs/heads/main"]); }
  async snapshot(path: string) {
    const head = this.head();
    const r = spawnSync("git", ["-C", this.root, "show", head + ":" + path], { encoding: "utf8" });
    if (r.error) throw r.error;
    if (r.status !== 0 && !r.stderr.includes("does not exist in")) throw new Error("SnapshotFailed:" + r.stderr);
    return { head, content: r.status === 0 ? r.stdout : null };
  }
  async readAt(ref: ArtifactRef) {
    const r = spawnSync("git", ["-C", this.root, "show", ref.sourceCommit + ":" + ref.path], { encoding: "utf8" });
    if (r.error) throw r.error;
    if (r.status !== 0) throw new Error("MissingArtifact");
    return r.stdout;
  }
  async isAncestor(a: string, b: string) {
    const r = spawnSync("git", ["-C", this.root, "merge-base", "--is-ancestor", a, b]);
    if (r.error) throw r.error;
    if (r.status !== 0 && r.status !== 1) throw new Error("AncestryReadFailed");
    return r.status === 0;
  }
  async findWrite(writeId: string): Promise<StoredWrite | null> {
    for (const commit of git(this.root, ["rev-list", "refs/heads/main"]).split("\n")) {
      const message = git(this.root, ["show", "-s", "--format=%B", commit]);
      if (message.split("\n").includes("Write-Id: " + writeId)) {
        const digest = /^Write-Digest: ([a-f0-9]+)$/m.exec(message)?.[1];
        const path = /^Write-Path: (.+)$/m.exec(message)?.[1];
        if (!digest || !path) throw new Error("CorruptWriteHistory");
        return { digest, receipt: { writeId, commit, blob: git(this.root, ["rev-parse", commit + ":" + path]) } };
      }
    }
    return null;
  }
  async atomicCommit(head: string, command: WriteCommand, content: string, digest: string): Promise<WriteReceipt> {
    this.commitsAttempted++;
    const directory = mkdtempSync(join(tmpdir(), "fs24-index-"));
    try {
      const env = { GIT_INDEX_FILE: join(directory, "index") };
      git(this.root, ["read-tree", head], undefined, env);
      const blob = git(this.root, ["hash-object", "-w", "--stdin"], content);
      git(this.root, ["update-index", "--add", "--cacheinfo", "100644," + blob + "," + command.path], undefined, env);
      const tree = git(this.root, ["write-tree"], undefined, env);
      const commit = git(this.root, ["commit-tree", tree, "-p", head],
        "Fixture write\n\nWrite-Id: " + command.writeId + "\nWrite-Digest: " + digest + "\nWrite-Path: " + command.path + "\n");
      const result = spawnSync("git", ["-C", this.root, "update-ref", "refs/heads/main", commit, head], { encoding: "utf8" });
      if (result.error) throw result.error;
      if (result.status !== 0) {
        if (this.head() !== head) throw new RepositoryConflict("FixtureCASConflict");
        throw new Error("FixtureRefError:" + result.stderr);
      }
      return { writeId: command.writeId, commit, blob };
    } finally { rmSync(directory, { recursive: true, force: true }); }
  }
}
function fixture() {
  const root = mkdtempSync(join(tmpdir(), "fs24-git-"));
  git(root, ["init", "--bare", "--initial-branch=main"]);
  const tree = git(root, ["mktree"], "");
  const base = git(root, ["commit-tree", tree], "Fixture base\n");
  git(root, ["update-ref", "refs/heads/main", base]);
  const backend = new GitFixture(root), writer = new SerializedRepositoryWriter(backend, check);
  return { root, base, backend, writer, store: new RepoStore(check, writer) };
}
function request(base: string, name: string, writeId = name, revision = 1): ArtifactWrite {
  return { path: pathFor(name), content: JSON.stringify(state(name, revision)) + "\n",
    schemaId: "episode-state.schema.json", expectedSourceCommit: base, writeId };
}
type CaseResult = { name: string; result: string; error?: string };
const cases: CaseResult[] = [], proofs: unknown[] = [];
async function test(name: string, work: () => void | Promise<void>) {
  try { await work(); cases.push({ name, result: "pass" }); }
  catch (error) { cases.push({ name, result: "fail", error: String(error) }); }
  console.log(JSON.stringify(cases[cases.length - 1]));
}
async function withFixture(work: (f: ReturnType<typeof fixture>) => Promise<void>) {
  const f = fixture();
  try { await work(f); proofs.push({ base: f.base, head: f.backend.head(),
    history: git(f.root, ["log", "--format=%H%n%P%n%B", "refs/heads/main"]),
    files: git(f.root, ["ls-tree", "-r", "HEAD"]) }); }
  finally { rmSync(f.root, { recursive: true, force: true }); }
}
async function concurrent(root: string, base: string, mode: string) {
  const tsx = process.env.FS_TSX;
  if (!tsx) throw new Error("MissingFixtureRuntime");
  // Two producer processes submit to ONE writer queue, mirroring D-15's boundary.
  // These are not two Actions jobs and IPC is not a production artifact transport.
  const queuedWriter = new SerializedRepositoryWriter(new GitFixture(root), check);
  const workers = ["left", "right"].map(name => {
    const child = spawn(process.execPath, [tsx, __filename, "--worker", root, base, mode, name],
      { stdio: ["ignore", "pipe", "pipe", "ipc"], env: process.env });
    let out = "", err = "";
    child.stdout!.on("data", chunk => out += chunk); child.stderr!.on("data", chunk => err += chunk);
    child.on("message", message => {
      if (!message || typeof message !== "object" || !("rpc" in message)) return;
      const call = message as { rpc: number; method: string; value: ArtifactRef | WriteCommand };
      const result = call.method === "read" ? queuedWriter.read(call.value as ArtifactRef) : queuedWriter.submit(call.value as WriteCommand);
      void result.then(value => child.send({ rpc: call.rpc, value }), error => child.send({ rpc: call.rpc, error: String(error) }));
    });
    const ready = new Promise<void>((resolve, reject) => {
      child.once("message", message => message === "ready" ? resolve() : reject(new Error("WorkerProtocol")));
      child.once("error", reject); child.once("exit", code => reject(new Error("WorkerBeforeReady:" + code)));
    });
    const done = new Promise<void>((resolve, reject) => {
      child.once("error", reject); child.once("exit", code => code === 0 ? resolve() : reject(new Error("WorkerFailed:" + code + ":" + err)));
    });
    // Register rejection observers before waiting for either barrier.
    void ready.catch(() => undefined); void done.catch(() => undefined);
    return { child, ready, done, output: () => ({ out, err }) };
  });
  try {
    await Promise.all(workers.map(w => w.ready)); workers.forEach(w => w.child.send("go"));
    await Promise.all(workers.map(w => w.done)); proofs.push({ mode, writers: 1, producerProcesses: 2,
      transport: "fixture-IPC-only", workers: workers.map(w => w.output()), commonBase: base });
  } finally {
    for (const worker of workers) if (worker.child.exitCode === null) worker.child.kill();
    await Promise.allSettled(workers.map(w => w.done));
  }
}
async function worker() {
  const [root, base, mode, name] = process.argv.slice(3);
  // Root is passed solely as fixture identity; only the parent writer accesses Git.
  assert.ok(root);
  let sequence = 0;
  const pending = new Map<number, { resolve: (value: unknown) => void; reject: (error: Error) => void }>();
  process.on("message", message => {
    if (!message || typeof message !== "object" || !("rpc" in message)) return;
    const result = message as { rpc: number; value?: unknown; error?: string };
    const task = pending.get(result.rpc); if (!task) throw new Error("UnexpectedRPCReceipt");
    pending.delete(result.rpc);
    if (result.error) task.reject(new Error(result.error)); else task.resolve(result.value);
  });
  const rpc = (method: string, value: ArtifactRef | WriteCommand): Promise<unknown> => new Promise((resolve, reject) => {
    const id = ++sequence; pending.set(id, { resolve, reject }); process.send?.({ rpc: id, method, value });
  });
  const store = new RepoStore(check, { read: async ref => await rpc("read", ref) as string,
    submit: async command => await rpc("submit", command) as WriteReceipt });
  await new Promise<void>(resolve => { process.once("message", () => resolve()); process.send?.("ready"); });
  if (mode === "states") console.log(JSON.stringify(await store.write(request(base, name))));
  else for (let i = 0; i < 25; i++) console.log(JSON.stringify(await new RunLog(store, check).append(line(name + i), base, name + i)));
  process.disconnect?.();
}
async function main() {

  await test("F1-identity-compatible-with-production-validator", async () => {
    const root=mkdtempSync(join(tmpdir(),"fs24-cross-validator-"));
    try {
      const source=process.env.GITHUB_WORKSPACE;
      assert.ok(source,"Actions source checkout required");
      const clone=spawnSync("git",["clone","--shared","--no-checkout",source,root],{encoding:"utf8"});
      assert.equal(clone.status,0,clone.stderr);
      const base="bd7f0eb5b225ed43d610af12b5febbe82a7dbec4";
      git(root,["checkout","--detach",base]);
      const channelPath=git(root,["ls-tree","-r","--name-only",base,"--","channels"]).split("\n").find(x=>x.endsWith("/channel.json"))!;
      const slug=channelPath.split("/")[1], id=slug+"/2026-09-fs24-left";
      const gs=new GitSource(root,base), schemas=new Schemas(gs), context=frozen(gs,schemas,id,base);
      const format=context.format, pack=context.channel;
      const limits=format.limits as Record<string,unknown>;
      const brief={episodeId:id,channel:slug,topic:"FS24 synthetic integration fixture",thesis:"FS24 synthetic test fixture; no production claim or publication approval is represented.",
        thesisId:String(pack.genre)+"/TB-001",thesisArchetype:(format.thesisArchetypes as string[])[0],pillar:(pack.pillars as string[])[0],audience:{ageRange:"fixture",decisionContext:"Synthetic test context only",priorBelief:"Synthetic test assumption only"},targetDurationMin:(limits.targetDurationMin as number[])[0],proposedBy:"machine",approvedBy:"human",workingTitle:"FS24 synthetic fixture",noveltyCheck:{videosChecked:limits.noveltyVideosCheckedMin,contradictingVideos:0,verdict:"novel",checkedBy:"machine"},versions:context.versions};
      const value={...state("a"),episodeId:id,channel:slug,versions:context.versions};
      const path="episodes/"+id+"/state.json";
      const transport:RepositoryTransport={read:async()=>JSON.stringify(value)+"\n",submit:async command=>({writeId:command.writeId,commit:base,blob:blobHash(command.content)})};
      const store=new RepoStore(check,transport);
      await store.write({path,content:JSON.stringify(value)+"\n",schemaId:"episode-state.schema.json",expectedSourceCommit:base,writeId:"F1-valid"});
      for(const invalid of [{...value,episodeId:id.split("/")[1]},{...value,episodeId:slug+"/2026-09-other"},{...value,channel:"other"},{...value,episodeId:"other/2026-09-fs24-left"}]) {
        await assert.rejects(()=>store.write({path,content:JSON.stringify(invalid),schemaId:"episode-state.schema.json",expectedSourceCommit:base,writeId:"F1-invalid"}),/StatePathMismatch/);
      }
      mkdirSync(join(root,"episodes",id),{recursive:true});
      writeFileSync(join(root,path),JSON.stringify(value)+"\n");
      writeFileSync(join(root,"episodes",id,"00-brief.json"),JSON.stringify(brief)+"\n");
      git(root,["add","episodes"]);git(root,["commit","-m","Synthetic integration fixture"]);
      const candidate=git(root,["rev-parse","HEAD"]);
      const result=new Validator(new GitSource(root,candidate),new Schemas(new GitSource(root,candidate)),[{episodeId:id,commit:base}]).run();
      assert.equal(result.sourceValidation,"pass",JSON.stringify(result.issues));
      proofs.push({kind:"F1-production-validator",base,candidate,identity:id,result});
    } finally {rmSync(root,{recursive:true,force:true});}
  });
  await test("pending-done-reindex-is-blocked",()=>{
    const value={...state("a"),stageStatus:"done",pendingSideEffects:[{kind:"fixture",writeId:"pending-write",startedAt:stamp}]};
    const output=buildIndex([value],"a".repeat(40),stamp,check) as {episodes:{stageStatus:string}[]};
    assert.equal(output.episodes[0].stageStatus,"blocked");
    assert.equal(value.stageStatus,"done");
  });

  await test("default-transport-denied", async () => {
    await assert.rejects(new RepoStore(check).write(request("a".repeat(40), "a")), /TransportUnavailable/);
  });
  for (const path of ["/episodes/a/x/state.json", "episodes/a/../state.json", "episodes/a/2026-09-a//state.json",
    "episodes/a/2026-09-a/./state.json", "episodes/a/2026-09-a/secret\\file", "pipeline/state.json", "PROJECT.md",
    "episodes/a/2026-19-a/state.json", "episodes/a/2026-09-a/.git/config", "episodes/a/2026-09-a/%2e%2e/x"]) {
    await test("path-reject:" + path, async () => {
      let called = false;
      const transport: RepositoryTransport = { read: async () => "", submit: async () => { called = true; throw new Error("UnexpectedWrite"); } };
      await assert.rejects(new RepoStore(check, transport).write({ ...request("a".repeat(40), "a"), path })); assert.equal(called, false);
    });
  }
  await test("schema-and-identity-reject-before-write", async () => {
    let called = 0;
    const store = new RepoStore(check, { read: async () => "", submit: async () => { called++; throw new Error("UnexpectedWrite"); } });
    const r = request("a".repeat(40), "a");
    await assert.rejects(store.write({ ...r, content: "{}" }), /SchemaRejected/);
    await assert.rejects(store.write({ ...r, content: JSON.stringify(state("b")) }), /StatePathMismatch/);
    await assert.rejects(store.write({ ...r, schemaId: "run-log.schema.json" }), /StateSchemaMismatch/);
    await assert.rejects(store.write({ ...r, expectedSourceCommit: "bad" }), /InvalidCommit/);
    await assert.rejects(store.write({ ...r, writeId: "bad\ntrailer" }), /InvalidWriteId/);
    assert.equal(called, 0);
  });
  await test("immutable-read-and-valid-receipt", () => withFixture(async f => {
    const a = await f.store.write(request(f.base, "a"));
    const b = await f.store.write(request(f.base, "a", "a2", 2));
    assert.equal(JSON.parse(await f.store.read({ path: pathFor("a"), sourceCommit: a.commit })).revision, 1);
    assert.equal(JSON.parse(await f.store.read({ path: pathFor("a"), sourceCommit: b.commit })).revision, 2);
    assert.equal(a.blob, blobHash(request(f.base, "a").content));
    const original = await f.backend.snapshot(pathFor("a"));
    assert.equal(original.head, b.commit);
  }));
  await test("two-processes-common-base-distinct-episodes", () => withFixture(async f => {
    await concurrent(f.root, f.base, "states");
    for (const name of ["left", "right"]) assert.equal(JSON.parse((await f.backend.snapshot(pathFor(name))).content!).episodeId, episode(name));
    assert.equal(git(f.root, ["rev-list", "--count", f.base + "..HEAD"]), "2");
  }));
  await test("serialized-same-episode-latest-state", () => withFixture(async f => {
    await Promise.all([f.store.write(request(f.base, "a", "first", 1)), f.store.write(request(f.base, "a", "second", 2))]);
    assert.equal(JSON.parse((await f.backend.snapshot(pathFor("a"))).content!).revision, 2);
    await assert.rejects(f.store.write(request(f.base, "a", "stale", 1)), /StaleRevision/);
    await assert.rejects(f.store.write(request(f.base, "a", "equal", 2)), /StaleRevision/);
    assert.equal(git(f.root, ["rev-list", "--count", f.base + "..HEAD"]), "2");
  }));
  await test("duplicate-write-and-id-collision", () => withFixture(async f => {
    const r = request(f.base, "a"), receipt = await f.store.write(r);
    assert.deepEqual(await f.store.write(r), receipt);
    await assert.rejects(f.store.write({ ...r, content: JSON.stringify(state("a", 2)) }), /WriteIdCollision/);
    assert.equal(git(f.root, ["rev-list", "--count", f.base + "..HEAD"]), "1");
  }));
  await test("interruption-after-model-commit-new-writer-deduplicates", () => withFixture(async f => {
    const r = request(f.base, "a");
    const broken: RepositoryTransport = { read: ref => f.writer.read(ref), submit: async command => {
      await f.writer.submit(command); throw new Error("SimulatedLostAcknowledgement");
    } };
    await assert.rejects(new RepoStore(check, broken).write(r), /SimulatedLostAcknowledgement/);
    const head = f.backend.head();
    const recovered = await new RepoStore(check, new SerializedRepositoryWriter(f.backend, check)).write(r);
    assert.equal(recovered.commit, head); assert.equal(f.backend.head(), head);
  }));
  await test("pending-side-effect-remains-incomplete-after-state-write-fails", () => withFixture(async f => {
    const value = { ...state("a"), stageStatus: "done", pendingSideEffects: [{ kind: "fixture", writeId: "side", startedAt: stamp }] };
    await f.store.write({ ...request(f.base, "a"), content: JSON.stringify(value) });
    const artifact = await f.store.write({ ...request(f.base, "a", "artifact"), path: pathFor("a").replace("state.json", "payload.json") });
    await assert.rejects(f.store.write({ ...request(f.base, "a", "failed-state"), content: "{}" }), /SchemaRejected/);
    const read = await new EpisodeStates(f.store, check).read({ path: pathFor("a"), sourceCommit: artifact.commit });
    assert.equal(read.complete, false); assert.deepEqual(read.pendingWriteIds, ["side"]);
    assert.equal(inspectEpisode({ ...state("a"), stageStatus: "done" }, check).complete, true);
  }));
  await test("two-processes-append-exactly-fifty-lines", () => withFixture(async f => {
    await concurrent(f.root, f.base, "logs");
    const text = (await f.backend.snapshot("pipeline/runs.jsonl")).content!;
    const records = text.trimEnd().split("\n").map(x => JSON.parse(x));
    assert.equal(records.length, 50);
    const expected = ["left", "right"].flatMap(name => Array.from({ length: 25 }, (_, i) => name + i));
    assert.deepEqual(records.map(x => x.runId).sort(), expected.sort());
    records.forEach(value => check("run-log.schema.json", value));
    proofs.push({ logBytes: Buffer.byteLength(text), logSha256: createHash("sha256").update(text).digest("hex"), text });
  }));
  await test("invalid-log-and-replace-rejected", async () => {
    const store = new RepoStore(check);
    const r = { ...request("a".repeat(40), "a"), path: "pipeline/runs.jsonl", schemaId: "run-log.schema.json" };
    await assert.rejects(store.appendLine({ ...r, content: "{}" }), /SchemaRejected/);
    await assert.rejects(store.appendLine({ ...r, content: JSON.stringify(line("x")) + "\n{}\n" }), /ExpectedOneLogLine/);
    await assert.rejects(store.write(r), /LogReplaceRejected/);
    assert.throws(() => new RunLog(store, check).append({ ...line("x"), costUsd: undefined }, r.expectedSourceCommit, "x"), /SchemaRejected/);
  });
  await test("receipt-writeid-blob-content-rejected", async () => {
    const r = request("a".repeat(40), "a"), receipt = { writeId: r.writeId, commit: "b".repeat(40), blob: blobHash(r.content) };
    for (const altered of [{ ...receipt, writeId: "other" }, { ...receipt, blob: "c".repeat(40) }, { ...receipt, commit: "bad" }]) {
      await assert.rejects(new RepoStore(check, { read: async () => r.content, submit: async () => altered }).write(r));
    }
    const other = JSON.stringify(state("a", 2));
    await assert.rejects(new RepoStore(check, { read: async () => other, submit: async () => ({ ...receipt, blob: blobHash(other) }) }).write(r), /ReceiptContentMismatch/);
  });
  await test("bounded-conflict-only-retry-and-increasing-backoff", () => withFixture(async f => {
    const delays: number[] = []; let calls = 0;
    f.backend.atomicCommit = async () => { calls++; throw new RepositoryConflict("injected"); };
    const store = new RepoStore(check, new SerializedRepositoryWriter(f.backend, check, async n => { delays.push(n); }));
    await assert.rejects(store.write(request(f.base, "a")), RepositoryConflict);
    assert.equal(calls, 5); assert.deepEqual(delays, [1, 2, 3, 4]);
    calls = 0; f.backend.atomicCommit = async () => { calls++; throw new Error("HTTP403"); };
    await assert.rejects(store.write(request(f.base, "a")), /HTTP403/); assert.equal(calls, 1);
  }));
  await test("rebase-after-conflict-preserves-independent-write", () => withFixture(async f => {
    const original = f.backend.atomicCommit.bind(f.backend); let inject = true;
    f.backend.atomicCommit = async (head, command, content, digest) => {
      if (inject) {
        inject = false;
        const other = new RepoStore(check, new SerializedRepositoryWriter(new GitFixture(f.root), check));
        await other.write(request(f.base, "b"));
      }
      return original(head, command, content, digest);
    };
    await f.store.write(request(f.base, "a"));
    assert.equal(f.backend.commitsAttempted, 2);
    assert.ok((await f.backend.snapshot(pathFor("a"))).content); assert.ok((await f.backend.snapshot(pathFor("b"))).content);
  }));
  await test("reindex-pure-valid-deterministic-and-negative", () => {
    const input = [state("b"), state("a")], before = JSON.stringify(input);
    const output = buildIndex(input, "a".repeat(40), stamp, check);
    assert.deepEqual(output, buildIndex([...input].reverse(), "a".repeat(40), stamp, check));
    assert.equal(JSON.stringify(input), before); check("pipeline-state.schema.json", output);
    assert.throws(() => buildIndex([state("a"), state("a")], "a".repeat(40), stamp, check), /DuplicateEpisode/);
    assert.throws(() => buildIndex([{}], "a".repeat(40), stamp, check), /SchemaRejected/);
    assert.throws(() => buildIndex([], "bad", stamp, check), /InvalidCommit/);
    assert.throws(() => buildIndex([], "a".repeat(40), "invalid-date", check), /SchemaRejected/);
    proofs.push({ index: output });
  });
  const report = { grant: "FS24-A", kind: "temporary-git-model-only", cases, proofs,
    passed: cases.filter(x => x.result === "pass").length, failed: cases.filter(x => x.result !== "pass").length,
    productionTransportTested: false, actualTwoActionsJobsTested: false, productionWrites: false };
  if (process.env.FS_EVIDENCE) writeFileSync(join(process.env.FS_EVIDENCE, "repo-store-tests.json"), JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify({ passed: report.passed, failed: report.failed }));
  if (report.failed) process.exitCode = 1;
}
(process.argv[2] === "--worker" ? worker() : main()).catch(error => { console.error(error); process.exitCode = 1; process.disconnect?.(); });
