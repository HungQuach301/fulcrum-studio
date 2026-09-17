import { integrationPolicy, IntegrationPolicy } from "./index";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { inspect, Bootstrap, successorPolicy, FS24C, FS24D, closureLineage } from "./index";
import { at, git, parseScope, matches, safePath } from "./scope";
import { assertEvidenceBundleRef, render, frame, decode, Identity, Need, Verdict } from "../ci-report";
import { scanContent, contentPath } from "./content";
import { secretLine } from "./secrets";

const rows: { name: string; result: string; detail?: unknown }[] = [];
let failures = 0;
function test(name: string, fn: () => unknown): void {
  try { const detail = fn(); rows.push({ name, result: "pass", detail }); }
  catch (error) { failures++; rows.push({ name, result: "fail", detail: String(error) }); }
}
const work = mkdtempSync(join(tmpdir(), "fs23-fixtures-"));
const write = (root: string, path: string, value: string): void => { mkdirSync(join(root, path, ".."), { recursive: true }); writeFileSync(join(root, path), value); };
const commit = (root: string, message: string): string => { git(root, "add", "-A"); git(root, "-c", "user.name=FS23 Fixture", "-c", "user.email=fixture@example.invalid", "commit", "-qm", message); return git(root, "rev-parse", "HEAD").trim(); };
const wp = "engine/ops/work-packages/WP-001-fixture.md";
let count = 0;
function fixture(): { root: string; base: string } {
  const root = join(work, String(++count)); mkdirSync(root); git(root, "init", "-q");
  write(root, wp, "### 4. Phạm vi cho phép\n`engine/io/index.ts` · `engine/contracts/example.json` · `engine/docs/02-decisions.md` · `engine/docs/01-architecture.md` · `scripts/ci-report.ts` · `scripts/guardrails/**`\n### 5. Ràng buộc\nNo scope from candidate.\n");
  write(root, "engine/ops/content-packages/CP-001-fixture.md", "### 4. Phạm vi cho phép\n`engine/docs/01-architecture.md`\n### 5. Ràng buộc\nfixture\n");
  write(root, "engine/docs/02-decisions.md", "## D-01\nBase.\n");
  write(root, "engine/docs/01-architecture.md", "Architecture.\n");
  write(root, "engine/ops/backlog.md", "| WP-001 | CI | architectural | WP-000 | todo |\n");
  write(root, "engine/contracts/example.json", "{}\n"); write(root, "engine/io/index.ts", "export const value = true;\n");
  write(root, "scripts/ci-report.ts", "export const report = true;\n");
  write(root, "genres/fixture/layouts.json", JSON.stringify({ landscapeLayouts: [{ id: "fixture-layout" }], verticalLayouts: [] }));
  write(root, "channels/fixture/channel.json", JSON.stringify({ pillars: ["housing"] }));
  return { root, base: commit(root, "fixture baseline") };
}
function cli(root: string, base: string, head: string, branch = "wp/001", title = "WP-001 fixture", event = "push") {
  const cliPath = require.resolve("../guardrails/index.ts");
  const tsx = process.env.FS_TSX; assert.ok(tsx, "owning workflow must identify tsx CLI");
  const run = spawnSync(process.execPath, [tsx, cliPath, "--root", root, "--base", base, "--head", head, "--branch", branch, "--event", event], { encoding: "utf8", env: { ...process.env, FS_TITLE: title, FS_SCAN_REPORT: "" }, maxBuffer: 1024 * 1024 });
  assert.equal(run.error, undefined); assert.equal(run.signal, null);
  const value = JSON.parse(run.stdout); assert.equal(run.status, value.result === "pass" ? 0 : 1);
  return { exit: run.status, ...value } as { exit: number; result: string; wpPath: string; errors: { rule: string; path: string; line: number }[] };
}
function scenario(name: string, path: string, text: string, rule?: string, message = "fixture change"): void {
  test(name, () => {
    const f = fixture(); write(f.root, path, text); const head = commit(f.root, message); const r = cli(f.root, f.base, head);
    assert.equal(r.result, rule ? "fail" : "pass");
    if (rule) assert.ok(r.errors.some(e => e.path === path && e.rule.includes(rule)));
    return { expected: rule ?? "pass", exit: r.exit, wpPath: r.wpPath, errors: r.errors };
  });
}
try {
  scenario("WP001-1:harmless-valid-branch", "scripts/ci-report.ts", "export const report = false;\n");
  scenario("WP001-2:outside-scope", "outside.txt", "fixture\n", "outside-scope");
  scenario("WP001-3:contract-no-label", "engine/contracts/example.json", "{\"fixture\":true}\n", "contract-locked");
  scenario("contract-label-no-decision", "engine/contracts/example.json", "{\"fixture\":true}\n", "contract-locked", "fixture [contract-change]");
  test("contract-label-with-new-decision", () => { const f=fixture();write(f.root,"engine/contracts/example.json","{\"fixture\":true}\n");write(f.root,"engine/docs/02-decisions.md",at(f.root,f.base,"engine/docs/02-decisions.md")+"\n## D-02\nFixture approval.\n");const r=cli(f.root,f.base,commit(f.root,"fixture [contract-change]"));assert.equal(r.result,"pass");return r; });
  scenario("WP001-4:hex-color", "engine/io/index.ts", "export const color = '#abcdef';\n", "content-color");
  scenario("domain-layout", "engine/io/index.ts", "export const layout = 'fixture-layout';\n", "content-domain-token");
  scenario("domain-pillar", "engine/io/index.ts", "export const pillar = 'housing';\n", "content-domain-token");
  scenario("content-number-property", "engine/io/index.ts", "export const item = { wordCount: 3200 };\n", "content-number-assignment");
  scenario("content-number-variable", "engine/io/index.ts", "export const durationMs = 1200;\n", "content-number-assignment");
  // FS23-R1: run new rejects through the production CLI in isolated Git fixtures.
  function numberCase(name: string, path: string, source: string, expectedLines: number[], before?: string): void {
    test("F1:" + name, () => {
      const f = fixture();
      write(f.root, wp, at(f.root, f.base, wp).replace("### 5.", "`.github/workflows/fixture.yml`\n### 5."));
      if (before !== undefined) write(f.root, path, before);
      const base = commit(f.root, "fixture baseline for numeric coverage");
      write(f.root, path, source); const head = commit(f.root, "fixture numeric assignment");
      const r = cli(f.root, base, head);
      assert.equal(r.result, expectedLines.length ? "fail" : "pass");
      assert.deepEqual(r.errors.map(e => ({ path: e.path, line: e.line, rule: e.rule })).sort((a,b) => a.line-b.line), expectedLines.map(line => ({ path, line, rule: "content-number-assignment" })));
      return { exit: r.exit, expectedLines, errors: r.errors, wpPath: r.wpPath };
    });
  }
  for (const value of [180, 220, 3200, 3600, 1200]) {
    numberCase("arbitrary-variable-" + value, "engine/io/index.ts", "export const minWords = " + value + ";\n", [1]);
    numberCase("arbitrary-property-" + value, "engine/io/index.ts", "export const settings = { limit: " + value + " };\n", [1]);
    numberCase("yaml-arbitrary-key-" + value, ".github/workflows/fixture.yml", "customLimit: " + value + "\n", [1]);
  }
  numberCase("ts-multiline-literal-only", "engine/io/index.ts", "export const minWords =\n  3200;\n", [2], "export const minWords =\n  1000;\n");
  numberCase("ts-property-literal-only", "engine/io/index.ts", "export const config = {\n  minWords:\n    3600\n};\n", [3], "export const config = {\n  minWords:\n    1000\n};\n");
  numberCase("known-key-multiline", "engine/io/index.ts", "export const durationMs =\n  77;\n", [2], "export const durationMs =\n  76;\n");
  numberCase("ts-reassignment", "engine/io/index.ts", "let quota = 10;\nquota = 220;\n", [2]);
  numberCase("ts-class-field", "engine/io/index.ts", "class Config { limit = 1200; }\n", [1]);
  numberCase("ts-array", "engine/io/index.ts", "const limits = [180,\n  3200];\n", [1,2]);
  numberCase("yaml-multiline-literal-only", ".github/workflows/fixture.yml", "customLimit:\n  3200\n", [2], "customLimit:\n  1000\n");
  numberCase("yaml-array", ".github/workflows/fixture.yml", "customLimits: [180,\n  3200]\n", [1,2]);
  numberCase("yaml-flow-map", ".github/workflows/fixture.yml", "settings: { minWords: 3200, maxWords: 3600 }\n", [1]);
  numberCase("yaml-quoted-key", ".github/workflows/fixture.yml", '"minWords": 3200\n', [1]);
  numberCase("yaml-quoted-before-number", ".github/workflows/fixture.yml", 'label: "3200"\nminWords: 3200\n', [2]);
  numberCase("docs-excluded", "engine/docs/01-architecture.md", "const minWords = 3200;\n", []);
  numberCase("ts-comments-strings-and-sha", "engine/io/index.ts", '// minWords = 3200\n/* durationMs = 1200 */\nconst text = "minWords = 3200";\nconst pin = "' + "a1".repeat(20) + '";\n', []);
  numberCase("ts-unrelated-numbers", "engine/io/index.ts", "const retries = 3;\nconst request = call(3200);\n", []);
  numberCase("yaml-comments-strings-and-sha", ".github/workflows/fixture.yml", '# minWords: 3200\nlabel: "minWords: 3200"\nsingle: \'durationMs: 1200\'\npin: ' + "a1".repeat(20) + '\nretries: 3\n', []);
  numberCase("yaml-block-string", ".github/workflows/fixture.yml", "description: |\n  minWords: 3200\n  durationMs: 1200\nretries: 3\n", []);
  numberCase("yaml-comment-after-number", ".github/workflows/fixture.yml", "minWords: 3200 # numeric value\n", [1]);
  numberCase("yaml-known-key", ".github/workflows/fixture.yml", "durationMs: 77\n", [1]);
  scenario("WP001-5:housing-docs-not-false-positive", "engine/docs/01-architecture.md", "Architecture housing fixture.\n");
  scenario("WP001-6:synthetic-secret", "scripts/ci-report.ts", "const fixture = '" + "sk-" + "A".repeat(24) + "';\n", "secret-pattern-redacted");
  test("secret-values-redacted", () => { const f=fixture();const secret="sk-"+"B".repeat(24);write(f.root,"scripts/ci-report.ts",secret+"\n");const r=cli(f.root,f.base,commit(f.root,"fixture"));assert.equal(r.result,"fail");assert.ok(!JSON.stringify(r).includes(secret)); });
  test("base64-secret-pattern", () => assert.ok(secretLine("'" + "QWxwaGEv".repeat(12) + "'")));
  test("private-key-pattern", () => assert.ok(secretLine("BEGIN " + "PRIVATE" + " KEY")));
  test("sha-pins-not-secret", () => assert.equal(secretLine("a1".repeat(64)), false));
  test("scope-from-main-not-candidate", () => {const f=fixture();write(f.root,wp,at(f.root,f.base,wp).replace("### 5.","`outside.txt`\n### 5."));write(f.root,"outside.txt","fixture\n");const r=cli(f.root,f.base,commit(f.root,"narrow test"));assert.ok(r.errors.some(e=>e.path==="outside.txt"&&e.rule.includes("outside-scope")));assert.ok(r.errors.some(e=>e.rule==="candidate-wp-rule-change"));return r;});
  test("wp-change-doc-only", () => {const f=fixture();write(f.root,wp,at(f.root,f.base,wp)+"\nFixture note.\n");assert.equal(cli(f.root,f.base,commit(f.root,"fixture [wp-change]")).result,"pass");});
  test("wp-change-mixed-code-rejected", () => {const f=fixture();write(f.root,wp,at(f.root,f.base,wp)+"\nFixture note.\n");write(f.root,"scripts/ci-report.ts","export const report = false;\n");assert.equal(cli(f.root,f.base,commit(f.root,"fixture [wp-change]")).result,"fail");});
  test("actual-workflow-preflight-wp-change-parity", () => {
    const workflow=git(process.env.GITHUB_WORKSPACE!,"show",FS24D.base+":.github/workflows/ci.yml");
    const blocks=Array.from(workflow.matchAll(/          # FS23_WP_CHANGE_RULE_BEGIN\n([\s\S]*?)          # FS23_WP_CHANGE_RULE_END/g),x=>x[1].split("\n").map(line=>line.startsWith("          ")?line.slice(10):line).join("\n"));
    assert.equal(blocks.length,4);assert.ok(blocks.every(x=>x===blocks[0]));
    assert.equal(workflow.split("if wp_change_exception(path,wp[0],diff,messages):continue").length-1,4);
    const cases=[{path:wp,wp,paths:[wp],message:"fixture [wp-change]",expected:true},{path:wp,wp,paths:[wp,"scripts/ci-report.ts"],message:"fixture [wp-change]",expected:false},{path:wp,wp,paths:[wp],message:"fixture",expected:false},{path:"outside.md",wp,paths:[wp,"outside.md"],message:"fixture [wp-change]",expected:false}];
    const program=blocks[0]+"\nimport json,sys\ncases=json.load(sys.stdin)\nfor c in cases:\n assert wp_change_exception(c['path'],c['wp'],c['paths'],c['message'])==c['expected']\nprint('4 workflow preflight cases pass')\n";
    const r=spawnSync("python3",["-c",program],{input:JSON.stringify(cases),encoding:"utf8"});assert.equal(r.status,0,r.stderr);return {cases:4,stdout:r.stdout,source:"four pinned historical T ci.yml preflight blocks"};
  });
  test("cp-context", () => {const f=fixture();write(f.root,"engine/docs/01-architecture.md","Updated.\n");const r=cli(f.root,f.base,commit(f.root,"fixture"),"cp/001","CP-001 fixture","pull_request");assert.equal(r.result,"pass");assert.ok(r.wpPath.includes("CP-001"));});
  for (const [name,branch,title,event] of [["unknown-branch","other/001","WP-001","push"],["conflicting-title","wp/001","WP-002","pull_request"],["missing-wp","wp/999","WP-999","push"]]) test(name,()=>{const f=fixture();write(f.root,"scripts/ci-report.ts","changed\n");assert.equal(cli(f.root,f.base,commit(f.root,"fixture"),branch,title,event).result,"fail");});
  test("main-push-scope-only-exemption",()=>{const f=fixture();write(f.root,"outside.txt","valid\n");assert.equal(cli(f.root,f.base,commit(f.root,"fixture"),"main","","push").result,"pass");write(f.root,"engine/io/index.ts","const color = '#abcdef';\n");assert.equal(cli(f.root,f.base,commit(f.root,"fixture"),"main","","push").result,"fail");});
  test("rename-checks-both-paths",()=>{const f=fixture();git(f.root,"mv","scripts/ci-report.ts","outside.txt");const r=cli(f.root,f.base,commit(f.root,"fixture"));assert.ok(r.errors.some(e=>e.path==="outside.txt"));return r;});
  test("delete-in-scope",()=>{const f=fixture();git(f.root,"rm","scripts/ci-report.ts");assert.equal(cli(f.root,f.base,commit(f.root,"fixture")).result,"pass");});
  test("single-backlog-done",()=>{const f=fixture();write(f.root,"engine/ops/backlog.md",at(f.root,f.base,"engine/ops/backlog.md").replace("todo","done"));assert.equal(cli(f.root,f.base,commit(f.root,"fixture")).result,"pass");});
  test("backlog-extra-change-denied",()=>{const f=fixture();write(f.root,"engine/ops/backlog.md",at(f.root,f.base,"engine/ops/backlog.md").replace("todo","done")+"extra\n");assert.equal(cli(f.root,f.base,commit(f.root,"fixture")).result,"fail");});
  test("ambiguous-cp",()=>{const f=fixture();write(f.root,"engine/ops/content-packages/CP-001-other.md","### 4. Phạm vi cho phép\n`outside.txt`\n");const base=commit(f.root,"fixture baseline extension");write(f.root,"outside.txt","change\n");assert.equal(cli(f.root,base,commit(f.root,"fixture"),"cp/001","CP-001").result,"fail");});
  test("unsafe-path-parser",()=>{for(const p of ["../x","/tmp/x","x/../y","x\\y","x\ny"])assert.throws(()=>safePath(p));});
  test("scope-parser-missing-section",()=>assert.throws(()=>parseScope("scope omitted")));
  test("scope-boundary",()=>{assert.ok(matches("scripts/guardrails/a.ts","scripts/guardrails/**"));assert.ok(!matches("scripts/guardrails-other/a.ts","scripts/guardrails/**"));});
  test("wrong-baseline",()=>{const f=fixture();const r=inspect({root:f.root,base:"0".repeat(40),head:f.base,branch:"wp/001",title:"WP-001",event:"push"});assert.equal(r.result,"fail");});
  test("bootstrap-freeze-and-decision",()=>{const f=fixture();const path="engine/docs/02-decisions.md";write(f.root,path,at(f.root,f.base,path)+"\n## D-02\nFixture policy.\n");const policy=commit(f.root,"fixture [wp-change]\n\nFulcrum-Grant: FS23-WP001\nFulcrum-Phase: policy");const boot:Bootstrap={base:f.base,policy,files:{[path]:git(f.root,"rev-parse",policy+":"+path).trim()}};write(f.root,"scripts/ci-report.ts","changed\n");let head=commit(f.root,"fixture code");const opts={root:f.root,base:f.base,head,branch:"wp/001",title:"WP-001",event:"push",bootstrap:boot};assert.equal(inspect(opts).result,"pass");write(f.root,path,at(f.root,f.base,path));head=commit(f.root,"remove policy");assert.equal(inspect({...opts,head}).result,"fail");});
  test("content-scan-exclusions",()=>{assert.equal(contentPath("engine/docs/a.md"),false);assert.equal(contentPath("engine/contracts/a.yml"),false);assert.equal(scanContent("engine/library/a.md","housing",[{line:1,text:"housing"}],["housing"]).length,0);});

  test("B-policy-freeze-scope-and-trailer",()=>{
    const f=fixture(),path="engine/docs/02-decisions.md";
    write(f.root,path,at(f.root,f.base,path)+"\n## D-24\nFixture grant.\n");
    const policy=commit(f.root,"fixture policy\n\nFulcrum-Grant: FS24-B\nFulcrum-Phase: policy");
    const spec:IntegrationPolicy={base:f.base,start:f.base,policy,files:{[path]:git(f.root,"rev-parse",policy+":"+path).trim()},paths:[path,"scripts/ci-report.ts"]};
    write(f.root,"scripts/ci-report.ts","changed\n");
    const msg="fixture implementation\n\nFulcrum-Grant: FS24-B\nFulcrum-Phase: implementation\nFulcrum-Iteration: 1";
    const h=commit(f.root,msg);assert.deepEqual(integrationPolicy(f.root,h,spec),spec.paths);
    assert.throws(()=>integrationPolicy(f.root,h,{...spec,files:{[path]:"0".repeat(40)}}),/B-policy-freeze/);
    assert.throws(()=>integrationPolicy(f.root,h,{...spec,paths:[path]}),/B-outside-scope/);
    assert.throws(()=>integrationPolicy(f.root,h,{...spec,start:policy}),/B-policy-parent/);
    write(f.root,"scripts/ci-report.ts","changed again\n");const wrong=commit(f.root,"missing trailers");
    assert.throws(()=>integrationPolicy(f.root,wrong,spec),/B-trailer/);
  });
  const head="a".repeat(40),base="b".repeat(40);
  function needs(verdict:Verdict):Record<string,Need>{return Object.fromEntries(["validate","typecheck","guardrails"].map(job=>[job,{result:verdict,outputs:{summary:JSON.stringify({job,head,base,result:verdict,errors:[]})}}]));}
  for(const verdict of ["success","failure","skipped","cancelled"] as Verdict[])test("report-verdict-"+verdict,()=>{const r=render(head,base,needs(verdict));assert.equal(r.pass,verdict==="success");assert.ok(r.text.includes("verdict="+verdict));assert.ok(r.text.split("\n").length<100);});
  test("report-missing-output",()=>{const n=needs("success");n.validate.outputs={};assert.equal(render(head,base,n).pass,false);});
  test("report-wrong-sha",()=>{const n=needs("success");n.validate.outputs={summary:JSON.stringify({head:base,base,job:"validate",errors:[]})};assert.throws(()=>render(head,base,n));});
  test("report-bounded-errors",()=>{const n=needs("failure");for(const job of Object.keys(n))n[job].outputs={summary:JSON.stringify({head,base,job,result:"failure",errors:Array(100).fill("multiline\nerror")})};const r=render(head,base,n);assert.equal(r.text.split("\n").filter(x=>x.startsWith("error=")).length,60);assert.ok(r.text.split("\n").length<100);});
  const id:Identity={grant:"FS23-WP001",run:"1",attempt:"1",head,job:"guardrails",event:"push",base};const good=frame(id,{"fixture.txt":Buffer.from("fixture bytes\n"),"empty.txt":Buffer.alloc(0)});
  test("frame-roundtrip",()=>assert.equal(decode(good,id)["fixture.txt"].toString(),"fixture bytes\n"));
  for(const [name,mutate] of [["missing-complete",(s:string)=>s.replace(/FS23_COMPLETE[^\n]*\n/,"")],["wrong-hash",(s:string)=>s.replace(/(FS23_FILE\t[^\t]+\t\d+\t)[a-f0-9]{64}/,"$1"+"0".repeat(64))],["missing-chunk",(s:string)=>s.replace(/FS23_DATA[^\n]*\n/,"")],["duplicate-chunk",(s:string)=>s.replace(/(FS23_DATA[^\n]*\n)/,"$1$1")]] as [string,(s:string)=>string][])test("frame-"+name,()=>assert.throws(()=>decode(mutate(good),id)));
  for(const key of ["head","attempt","job","event","base"] as const)test("frame-identity-"+key,()=>assert.throws(()=>decode(good,{...id,[key]:"wrong"})));
  test("frame-unsafe-name",()=>assert.throws(()=>frame(id,{"../x":Buffer.from("x")})));
  const actualRoot=process.env.GITHUB_WORKSPACE!,eventHead="9af238d7772bba56d6b98d568fcd34d57a7d6473";
  if(actualRoot&&eventHead&&spawnSync("git",["-C",actualRoot,"merge-base","--is-ancestor",FS24C.base,eventHead]).status===0) {
    const parents=git(actualRoot,"rev-list","--parents","-n","1",eventHead).trim().split(" ");
    const actualHead=parents.length===3&&parents[1]===FS24C.base?parents[2]:eventHead;
    test("C-production-scanner-valid",()=>assert.equal(inspect({root:actualRoot,base:FS24C.base,head:actualHead,branch:"wp/002",title:"WP-002 successor",event:"push"}).result,"pass"));
    test("C-policy-reject-base-only",()=>assert.throws(()=>successorPolicy(actualRoot,FS24C.base),/C-count/));
    test("C-policy-reject-tree",()=>assert.throws(()=>successorPolicy(actualRoot,actualHead,{...FS24C,tree:"0".repeat(40)}),/C-base/));
    test("C-policy-reject-freeze",()=>assert.throws(()=>successorPolicy(actualRoot,actualHead,{...FS24C,files:Object.fromEntries(Object.keys(FS24C.files).map(p=>[p,"0".repeat(40)])) as typeof FS24C.files}),/C-policy-freeze/));
    test("C-policy-reject-scope",()=>assert.throws(()=>successorPolicy(actualRoot,actualHead,{...FS24C,paths:FS24C.paths.slice(0,2)}),/C-scope/));
    test("C-production-scanner-reject-branch",()=>assert.equal(inspect({root:actualRoot,base:FS24C.base,head:actualHead,branch:"bad",title:"",event:"push"}).result,"fail"));
  }
  const currentHead=process.env.FS_HEAD!,currentLineage=closureLineage(actualRoot,currentHead);
  const finalELineage=currentLineage.evidenceVolume?closureLineage(actualRoot,"2efe60ea7c74d301a1e2fc0ba52e1adc686f40dd"):currentLineage;
  const historicalDLineage=finalELineage.evidenceRepair?closureLineage(actualRoot,"c4a4445e619175c015469cd33ebd427ecdd687a1"):finalELineage;
  test("D-current-lineage",()=>{assert.ok(historicalDLineage.unmerged.length||historicalDLineage.epochs.length);assert.equal(historicalDLineage.paths.length,24);});
  test("E-current-lineage-preserves-D",()=>{
    if(!finalELineage.evidenceRepair)return;
    assert.equal(finalELineage.evidenceRepair.paths.length,15);
    assert.equal(finalELineage.paths.length,28);
    assert.deepEqual([...finalELineage.paths].sort(),[...new Set([...historicalDLineage.paths,...finalELineage.evidenceRepair.paths])].sort());
    assert.equal(finalELineage.code,historicalDLineage.code);
    assert.deepEqual(finalELineage.epochs,historicalDLineage.epochs);
    assert.deepEqual(finalELineage.data,historicalDLineage.data);
    assert.deepEqual(finalELineage.dataPaths,historicalDLineage.dataPaths);
  });
  test("E-scanner-resolves-original-WP-after-companion",()=>{
    if(!currentLineage.evidenceRepair)return;
    const base=currentLineage.unmerged.length?currentLineage.candidateBase:currentHead;
    const report=inspect({root:actualRoot,base,head:currentHead,branch:currentLineage.unmerged.length?"wp/002":"main",title:"WP-002 evidence repair",event:"push"});
    assert.equal(report.result,"pass",JSON.stringify(report.errors));
    if(currentLineage.unmerged.length)assert.equal(report.wpPath,"engine/ops/work-packages/WP-002-interfaces.md");
  });
  test("E-original-activation-empty-tree-scan",()=>{
    if(!currentLineage.evidenceRepair)return;
    const activation="f08231650ce3f7fb26194c64ae3a9fa3ea18cdb0",base="8deb1164c1de4f041a34ba6c8fa2a211c4c78943";
    const report=inspect({root:actualRoot,base,head:activation,branch:"wp/002",title:"",event:"push"});
    assert.equal(report.result,"pass",JSON.stringify(report.errors));assert.deepEqual(report.checkedPaths,[]);
    assert.equal(inspect({root:actualRoot,base,head:activation,branch:"wp/003",title:"",event:"push"}).result,"fail");
  });
  test("F-current-lineage-preserves-exhausted-E",()=>{
    if(!currentLineage.evidenceVolume)return;
    assert.equal(currentLineage.evidenceVolume.paths.length,7);
    assert.deepEqual(currentLineage.evidenceRepair,finalELineage.evidenceRepair);
    assert.deepEqual(currentLineage.epochs,finalELineage.epochs);
    assert.deepEqual(currentLineage.data,finalELineage.data);
    assert.equal(currentLineage.code,finalELineage.code);
    assert.equal(currentLineage.evidenceVolume.approval.length,64);
    assert.notEqual(currentLineage.evidenceVolume.approval,currentLineage.evidenceRepair?.approval);
  });
  test("G-current-lineage-preserves-F-accounting",()=>{
    const currentMessage=git(actualRoot,"show","-s","--format=%B",currentHead);
    if(!currentMessage.split("\n").includes("Fulcrum-Phase: evidence-volume-admission"))return;
    assert.ok(currentLineage.evidenceAdmission);
    assert.equal(currentLineage.evidenceAdmission?.commit,currentHead);
    assert.equal(currentLineage.evidenceAdmission?.parent,"6b13b756c021de9266ac449506e1e2912fbf290b");
    assert.equal(currentLineage.evidenceAdmission?.paths.length,5);
    assert.equal(currentLineage.evidenceVolume?.rounds.length,3);
    assert.equal(currentLineage.evidenceVolume?.activations.length,0);
    assert.equal(currentLineage.evidenceVolume?.continuations.length,0);
  });
  test("G2-current-lineage-preserves-G1-and-F-accounting",()=>{
    const currentMessage=git(actualRoot,"show","-s","--format=%B",currentHead);
    if(!currentMessage.split("\n").includes("Fulcrum-Phase: evidence-volume-admission-recovery"))return;
    assert.ok(currentLineage.evidenceAdmissionRecovery);
    assert.equal(currentLineage.evidenceAdmissionRecovery?.commit,currentHead);
    assert.equal(currentLineage.evidenceAdmissionRecovery?.parent,"ab6560edc704d8e2901d5afc87a6ebc1712a488a");
    assert.equal(currentLineage.evidenceAdmission?.commit,"ab6560edc704d8e2901d5afc87a6ebc1712a488a");
    assert.equal(currentLineage.candidateBase,"5ade77afe3fdfe4cb20c03f6234b7aec785f79ab");
    assert.equal(currentLineage.relayGateBootstrap?.blob,"70a18ea1e79e1e2eed3175ed4347adee122781ed");
    assert.equal(currentLineage.evidenceVolume?.rounds.length,3);
    assert.equal(currentLineage.evidenceVolume?.activations.length,0);
    assert.equal(currentLineage.evidenceVolume?.continuations.length,0);
  });
  if(currentLineage.evidenceAdmission) {
    const gRoot=join(work,"g-history");
    const clonedG=spawnSync("git",["clone","--shared","--no-checkout",actualRoot,gRoot],{encoding:"utf8"});assert.equal(clonedG.status,0,clonedG.stderr);
    git(gRoot,"checkout","--detach",currentHead);
    const gEnv={...process.env,GIT_AUTHOR_NAME:"fixture",GIT_AUTHOR_EMAIL:"fixture@example.invalid",GIT_COMMITTER_NAME:"fixture",GIT_COMMITTER_EMAIL:"fixture@example.invalid",GIT_INDEX_FILE:join(work,"g-index")};
    const ggit=(args:string[],input?:string)=>{const p=spawnSync("git",["-C",gRoot,...args],{encoding:"utf8",env:gEnv,input});assert.equal(p.status,0,p.stderr);return p.stdout.trimEnd();};
    const gPaths=currentLineage.evidenceAdmission.paths;
    const gMessage=(authority:string)=>"Fixture G admission\n\nFulcrum-Grant: FS24-D\nFulcrum-Phase: evidence-volume-admission\nFS24-F-Checkpoint: 2efe60ea7c74d301a1e2fc0ba52e1adc686f40dd\nFS24-F-Authority: "+currentLineage.evidenceVolume!.approval+"\nFS24-G-Authority: "+authority+"\nOwner-Approval-Receipt: "+authority+"\nFS24-G-Round: 1\n";
    const gCommit=(parent:string,paths:string[],message:string,suffix="")=>{ggit(["read-tree",parent]);for(const path of paths){const blob=ggit(["hash-object","-w","--stdin"],at(actualRoot,currentHead,path)+suffix);ggit(["update-index","--add","--cacheinfo","100644,"+blob+","+path]);}return ggit(["commit-tree",ggit(["write-tree"]),"-p",parent],message);};
    const validG=gCommit(currentLineage.evidenceAdmission.parent,gPaths,gMessage(currentLineage.evidenceAdmission.approval));
    test("G-admission-fixture-valid",()=>{const state=closureLineage(gRoot,validG);assert.equal(state.evidenceAdmission?.commit,validG);assert.equal(state.evidenceVolume?.rounds.length,3);});
    test("G-admission-reject-wrong-authority",()=>assert.throws(()=>closureLineage(gRoot,gCommit(currentLineage.evidenceAdmission!.parent,gPaths,gMessage("0".repeat(64)))),/G-Authority/));
    test("G-admission-reject-wrong-parent",()=>assert.throws(()=>closureLineage(gRoot,gCommit("44fb08b87bf6690c2f18128b5940b0fb40c05a95",gPaths,gMessage(currentLineage.evidenceAdmission!.approval))),/G-Parent/));
    test("G-admission-reject-incomplete-scope",()=>assert.throws(()=>closureLineage(gRoot,gCommit(currentLineage.evidenceAdmission!.parent,gPaths.slice(0,1),gMessage(currentLineage.evidenceAdmission!.approval))),/G-Scope/));
    test("G-admission-reject-repeat",()=>assert.throws(()=>closureLineage(gRoot,gCommit(validG,gPaths,gMessage(currentLineage.evidenceAdmission!.approval),"\nfixture repeat\n")),/G-Parent/));
    const g2Authority="4447512a984015f41021286e75e3988e9b96abf522257a36068b59718a7c864f";
    const g2Receipt="c9e879fbdeaf8fc14362caa0044efda1b826cc00b19b5bcdcd8cfc21ae54a066",g2Run="35232709535";
    const g2Paths=[".github/workflows/recover-fs24-evidence.yml",...gPaths];
    const g2Message=(authority:string,run=g2Run,receipt=g2Receipt)=>"Fixture G2 admission recovery\n\nFulcrum-Grant: FS24-D\nFulcrum-Phase: evidence-volume-admission-recovery\nFS24-F-Checkpoint: 2efe60ea7c74d301a1e2fc0ba52e1adc686f40dd\nFS24-F-Authority: "+currentLineage.evidenceVolume!.approval+"\nFS24-G-R2-Authority: "+authority+"\nOwner-Approval-Receipt: "+authority+"\nFS24-G-R2-Round: 1\nFS24-G-R2-Readiness-Run: "+run+"\nFS24-G-R2-Readiness-Receipt: "+receipt+"\n";
    const g2Commit=(parent:string,paths:string[],message:string,suffix="")=>{ggit(["read-tree",parent]);for(const path of paths){const blob=ggit(["hash-object","-w","--stdin"],readFileSync(join(actualRoot,path),"utf8")+suffix);ggit(["update-index","--add","--cacheinfo","100644,"+blob+","+path]);}return ggit(["commit-tree",ggit(["write-tree"]),"-p",parent],message);};
    const validG2=g2Commit(currentHead,g2Paths,g2Message(g2Authority));git(gRoot,"checkout","--detach",validG2);
    test("G2-admission-fixture-valid",()=>{const state=closureLineage(gRoot,validG2);assert.equal(state.evidenceAdmissionRecovery?.commit,validG2);assert.equal(state.evidenceAdmission?.commit,currentHead);assert.equal(state.candidateBase,"5ade77afe3fdfe4cb20c03f6234b7aec785f79ab");assert.equal(state.relayGateBootstrap?.commit,"5ade77afe3fdfe4cb20c03f6234b7aec785f79ab");assert.equal(state.evidenceVolume?.rounds.length,3);});
    test("G2-admission-reject-wrong-authority",()=>assert.throws(()=>closureLineage(gRoot,g2Commit(currentHead,g2Paths,g2Message("0".repeat(64)))),/G2-Authority/));
    test("G2-admission-reject-wrong-parent",()=>assert.throws(()=>closureLineage(gRoot,g2Commit(currentLineage.evidenceAdmission!.parent,g2Paths,g2Message(g2Authority))),/G2-Parent/));
    test("G2-admission-reject-incomplete-scope",()=>assert.throws(()=>closureLineage(gRoot,g2Commit(currentHead,g2Paths.slice(0,-1),g2Message(g2Authority))),/G2-Scope/));
    test("G2-admission-reject-old-readiness",()=>assert.throws(()=>closureLineage(gRoot,g2Commit(currentHead,g2Paths,g2Message(g2Authority,"35178816801"))),/G2-ReadinessTrailer/));
    test("G2-admission-reject-wrong-readiness-receipt",()=>assert.throws(()=>closureLineage(gRoot,g2Commit(currentHead,g2Paths,g2Message(g2Authority,g2Run,"0".repeat(64)))),/G2-ReadinessTrailer/));
    test("G2-admission-reject-repeat",()=>assert.throws(()=>closureLineage(gRoot,g2Commit(validG2,g2Paths,g2Message(g2Authority),"\nfixture repeat\n")),/G2-Parent/));
  }
  test("F-scanner-resolves-canonical-WP-at-final-E",()=>{
    if(!currentLineage.evidenceVolume)return;
    const base=currentLineage.unmerged.length?currentLineage.candidateBase:currentHead;
    const report=inspect({root:actualRoot,base,head:currentHead,branch:currentLineage.unmerged.length?"wp/002":"main",title:"WP-002 FS24-F volume recovery",event:"push"});
    assert.equal(report.result,"pass",JSON.stringify(report.errors));
    if(currentLineage.unmerged.length)assert.equal(report.wpPath,"engine/ops/work-packages/WP-002-interfaces.md");
  });
  const dRoot=join(work,"d-history");
  const cloned=spawnSync("git",["clone","--shared","--no-checkout",actualRoot,dRoot],{encoding:"utf8"});assert.equal(cloned.status,0,cloned.stderr);
  const dEnv={...process.env,GIT_AUTHOR_NAME:"fixture",GIT_AUTHOR_EMAIL:"fixture@example.invalid",GIT_COMMITTER_NAME:"fixture",GIT_COMMITTER_EMAIL:"fixture@example.invalid",GIT_INDEX_FILE:join(work,"d-index")};
  const dgit=(args:string[],input?:string)=>{const p=spawnSync("git",["-C",dRoot,...args],{encoding:"utf8",env:dEnv,input});assert.equal(p.status,0,p.stderr);return p.stdout.trimEnd();};
  const candidate=currentLineage.epochs[0]?.candidate??currentHead;
  const dCommit=(parent:string,path:string,content:string,message:string)=>{dgit(["read-tree",parent]);const blob=dgit(["hash-object","-w","--stdin"],content);dgit(["update-index","--add","--cacheinfo","100644,"+blob+","+path]);const tree=dgit(["write-tree"]);return dgit(["commit-tree",tree,"-p",parent],message);};
  const dMessage="Fixture\n\nFulcrum-Grant: FS24-D\nFulcrum-Phase: implementation\nFulcrum-Candidate-Round: 1\n";
  test("D-policy-reject-mutated-blob",()=>{const sha=dCommit(candidate,"AGENTS.md",at(dRoot,candidate,"AGENTS.md")+"\nfixture\n",dMessage);assert.throws(()=>closureLineage(dRoot,sha),/D-policy-freeze/);});
  test("D-code-reject-outside-path",()=>{const sha=dCommit(candidate,"outside.txt","fixture\n",dMessage);assert.throws(()=>closureLineage(dRoot,sha),/D-code-scope/);});
  const merge=dgit(["commit-tree",git(dRoot,"rev-parse",candidate+"^{tree}").trim(),"-p",FS24D.base,"-p",candidate],"Fixture local merge\n\nFulcrum-Grant: FS24-D\nFulcrum-Phase: integration-bootstrap\nFulcrum-Integration-PR: 999\n");
  test("D-merge-parent-and-data-lineage",()=>{const value=closureLineage(dRoot,merge);assert.equal(value.epochs.length,1);assert.equal(value.code,merge);assert.equal(value.epochs[0].candidate,candidate);assert.deepEqual(value.data,[]);});
  const dataMessage=(op:string,paths:string[])=>"Fixture data\n\nFulcrum-Grant: FS24-D\nFulcrum-Phase: data\nFS24-D-Batch: 345\nWrite-Id: FS24-D:345:"+op+"\nPayload-Origin: "+merge+"\nInput-Payload: "+"a".repeat(64)+"\nWrite-Paths: "+JSON.stringify(paths.sort())+"\n";
  const statePath="episodes/us-personal-finance/2026-09-fs24-left/state.json";
  // Structural fixtures do not replace full payload/schema or live-main acceptance.
  const initialData=(parent:string,side:string)=>{const paths=["episodes/us-personal-finance/2026-09-fs24-"+side+"/00-brief.json","episodes/us-personal-finance/2026-09-fs24-"+side+"/state.json"];dgit(["read-tree",parent]);for(const path of paths){const blob=dgit(["hash-object","-w","--stdin"],"{}\n");dgit(["update-index","--add","--cacheinfo","100644,"+blob+","+path]);}return dgit(["commit-tree",dgit(["write-tree"]),"-p",parent],dataMessage("initial-"+side,paths));};
  const initialPair=initialData(initialData(merge,"left"),"right");
  const firstData=dCommit(initialPair,statePath,'{"revision":2}\n',dataMessage("update-one",[statePath]));
  test("D-data-duplicate-operation",()=>{const duplicate=dCommit(firstData,statePath,'{"revision":3}\n',dataMessage("update-one",[statePath]));assert.throws(()=>closureLineage(dRoot,duplicate),/D-duplicate-operation/);});
  test("D-data-reject-index-before-eight",()=>{const premature=dCommit(merge,"pipeline/state.json",JSON.stringify({sourceCommit:merge})+"\n",dataMessage("reindex",["pipeline/state.json"]));assert.throws(()=>closureLineage(dRoot,premature),/D-index-order/);});
  const recoveryBase="b1af7ecff4a16605918b21522027f9a6358b2f9c",recoveryPath="engine/io/github-transport.ts";
  const recoveryMessage=(round:number)=>"Fixture recovery\n\nFulcrum-Grant: FS24-D\nFulcrum-Phase: implementation\nFulcrum-Candidate-Round: "+round+"\nOwner-Approval-Receipt: b5e6faaf95ff26b2a24adfbba618595ba3e117cd0aa6b07ade92f43159beca28\nFS24-D-Recovery-Report: 59c0e928a9ff0ec508b0b24c3b8a7ba46356b514c560585c2c61e93556cdf6fa\nRecovery-Checkpoint: "+recoveryBase+"\nFS24-D-Batch: 35037496723\nPayload-Origin: b50f56c636f415be64b4b2b1f14e8093a3b67fe0\n";
  const recoveryCommit=(parent:string,message:string)=>dCommit(parent,recoveryPath,at(dRoot,parent,recoveryPath)+"\n// recovery fixture\n",message);
  const sixth=recoveryCommit(recoveryBase,recoveryMessage(6)),seventh=recoveryCommit(sixth,recoveryMessage(7));
  test("D-recovery-six-and-seven-preserve-data",()=>{for(const head of [sixth,seventh]){const value=closureLineage(dRoot,head);assert.deepEqual(value.data.map(x=>x.commit),["7e4fec11b9906e3fcffebd229e11d8538e7e54a4",recoveryBase]);assert.equal(value.candidateBase,recoveryBase);assert.equal(value.origin,"b50f56c636f415be64b4b2b1f14e8093a3b67fe0");}});
  test("D-recovery-reject-eight",()=>assert.throws(()=>closureLineage(dRoot,recoveryCommit(seventh,recoveryMessage(8))),/D-recovery-round/));
  test("D-recovery-reject-round-reset",()=>assert.throws(()=>closureLineage(dRoot,recoveryCommit(recoveryBase,recoveryMessage(1))),/D-candidate-round/));
  test("D-recovery-reject-round-repeat",()=>assert.throws(()=>closureLineage(dRoot,recoveryCommit(sixth,recoveryMessage(6))),/D-recovery-round/));
  test("D-recovery-reject-skipped-six",()=>assert.throws(()=>closureLineage(dRoot,recoveryCommit(recoveryBase,recoveryMessage(7))),/D-recovery-round/));
  test("D-recovery-reject-missing-approval",()=>assert.throws(()=>closureLineage(dRoot,recoveryCommit(recoveryBase,recoveryMessage(6).replace(/Owner-Approval-Receipt: [^\n]+\n/,""))),/Trailer:Owner-Approval-Receipt/));
  test("D-recovery-reject-wrong-approval",()=>assert.throws(()=>closureLineage(dRoot,recoveryCommit(recoveryBase,recoveryMessage(6).replace("b5e6faaf95ff26b2a24adfbba618595ba3e117cd0aa6b07ade92f43159beca28","0".repeat(64)))),/D-recovery-approval/));
  test("D-recovery-reject-wrong-binding",()=>assert.throws(()=>closureLineage(dRoot,recoveryCommit(recoveryBase,recoveryMessage(6).replace("FS24-D-Batch: 35037496723","FS24-D-Batch: 1"))),/D-recovery-binding/));
  test("D-recovery-reject-before-checkpoint",()=>assert.throws(()=>closureLineage(dRoot,recoveryCommit(candidate,recoveryMessage(6))),/D-recovery-checkpoint/));
  test("D-recovery-reject-extra-scope",()=>{const path="engine/io/repo-store.ts",head=dCommit(recoveryBase,path,at(dRoot,recoveryBase,path)+"\n// fixture\n",recoveryMessage(6));assert.throws(()=>closureLineage(dRoot,head),/D-recovery-scope/);});
  test("D-recovery-reject-policy-change",()=>{const head=dCommit(recoveryBase,"AGENTS.md",at(dRoot,recoveryBase,"AGENTS.md")+"\nfixture\n",recoveryMessage(6));assert.throws(()=>closureLineage(dRoot,head),/D-policy-freeze/);});
  test("D-recovery-reject-data-change",()=>{const head=dCommit(recoveryBase,statePath,at(dRoot,recoveryBase,statePath)+"\n",recoveryMessage(6));assert.throws(()=>closureLineage(dRoot,head),/D-code-scope/);});
  const eSource={repository:"HungQuach301/fulcrum-studio",run:"1",attempt:"1",head:"a".repeat(40),job:"report",event:"push"};
  test("E-reference-identity",()=>assertEvidenceBundleRef({source:eSource,bundle:{bytes:17,sha256:"b".repeat(64)}},eSource));
  test("E-reference-wrong-head",()=>assert.throws(()=>assertEvidenceBundleRef({source:{...eSource,head:"c".repeat(40)},bundle:{bytes:17,sha256:"b".repeat(64)}},eSource),/E-BundleReference/));
  test("E-reference-overflow",()=>assert.throws(()=>assertEvidenceBundleRef({source:eSource,bundle:{bytes:64*1024*1024+1,sha256:"b".repeat(64)}},eSource),/E-BundleReference/));
} finally {
  rmSync(work,{recursive:true,force:true});
  test("temporary-fixture-cleanup",()=>assert.equal(existsSync(work),false));
  const report={result:failures?"fail":"pass",tests:rows.length,failures,fixturesAreSynthetic:true,realNegativeWebhookRuns:false,rows};
  if(process.env.FS_EVIDENCE)writeFileSync(join(process.env.FS_EVIDENCE,"guardrails-tests.json"),JSON.stringify(report,null,2)+"\n");
  process.stdout.write(JSON.stringify(report,null,2)+"\n");process.exitCode=failures?1:0;
}
