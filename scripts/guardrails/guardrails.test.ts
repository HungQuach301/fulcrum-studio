import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { inspect, Bootstrap } from "./index";
import { at, git, parseScope, matches, safePath } from "./scope";
import { render, frame, decode, Identity, Need, Verdict } from "../ci-report";
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
    const workflow=readFileSync(".github/workflows/ci.yml","utf8");
    const blocks=Array.from(workflow.matchAll(/          # FS23_WP_CHANGE_RULE_BEGIN\n([\s\S]*?)          # FS23_WP_CHANGE_RULE_END/g),x=>x[1].split("\n").map(line=>line.startsWith("          ")?line.slice(10):line).join("\n"));
    assert.equal(blocks.length,4);assert.ok(blocks.every(x=>x===blocks[0]));
    assert.equal(workflow.split("if wp_change_exception(path,wp[0],diff,messages):continue").length-1,4);
    const cases=[{path:wp,wp,paths:[wp],message:"fixture [wp-change]",expected:true},{path:wp,wp,paths:[wp,"scripts/ci-report.ts"],message:"fixture [wp-change]",expected:false},{path:wp,wp,paths:[wp],message:"fixture",expected:false},{path:"outside.md",wp,paths:[wp,"outside.md"],message:"fixture [wp-change]",expected:false}];
    const program=blocks[0]+"\nimport json,sys\ncases=json.load(sys.stdin)\nfor c in cases:\n assert wp_change_exception(c['path'],c['wp'],c['paths'],c['message'])==c['expected']\nprint('4 workflow preflight cases pass')\n";
    const r=spawnSync("python3",["-c",program],{input:JSON.stringify(cases),encoding:"utf8"});assert.equal(r.status,0,r.stderr);return {cases:4,stdout:r.stdout,source:"four actual ci.yml preflight blocks"};
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
} finally {
  rmSync(work,{recursive:true,force:true});
  test("temporary-fixture-cleanup",()=>assert.equal(existsSync(work),false));
  const report={result:failures?"fail":"pass",tests:rows.length,failures,fixturesAreSynthetic:true,realNegativeWebhookRuns:false,rows};
  if(process.env.FS_EVIDENCE)writeFileSync(join(process.env.FS_EVIDENCE,"guardrails-tests.json"),JSON.stringify(report,null,2)+"\n");
  process.stdout.write(JSON.stringify(report,null,2)+"\n");process.exitCode=failures?1:0;
}
