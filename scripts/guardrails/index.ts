import { writeFileSync } from "node:fs";
import { at, existsAt, git, changes, added, context, matches, backlogOnly, files } from "./scope";
import { tokens, scanContent, Finding } from "./content";
import { scanSecrets } from "./secrets";

export interface Bootstrap { base: string; policy: string; files: Record<string, string>; }
export const BOOTSTRAP: Bootstrap = {"base":"48bdbe2932ab012ae3edcaf4eabe54b7af21f223","policy":"754d90c4632c6771d8a81e3c6c5b78f7a5ed3812","files":{"AGENTS.md":"2933f22521c1c8789e93e79959e9fe16c1108956","engine/ops/guardrails.md":"e33413e64af7dab996b78b7c358416ea0248949c","engine/docs/02-decisions.md":"7c9fb2b11bc6560f7a9d45b5e012d1556b768700","engine/ops/definition-of-done.md":"f7a9d16655700594e1e1580932b416754a0b26c6","PROJECT.md":"31121b2db859cb01b52e55fec8bb91890a0a5fa5","engine/ops/work-packages/WP-001-ci-guardrails.md":"4fd0949a13f7fa36b75fed052984e2ac42145758"}};

export interface IntegrationPolicy { base: string; start: string; policy: string; files: Record<string,string>; paths: string[]; }
export const FS24B: IntegrationPolicy = {"base":"bd7f0eb5b225ed43d610af12b5febbe82a7dbec4","start":"d021d3d662d619ae802fa483e1e36c5a94feb38b","policy":"76aae91e0bd415176e102136a11449791e4ecc7e","files":{"engine/docs/02-decisions.md":"e4273586d427e4b127757b7b7d61d536fe317036","engine/ops/work-packages/WP-002-interfaces.md":"c48b8da739695e8ef6135532a94a18ddcd8e2afc"},"paths":["engine/docs/02-decisions.md","engine/ops/work-packages/WP-002-interfaces.md",".github/workflows/ci.yml","scripts/guardrails/index.ts","scripts/guardrails/scope.ts","scripts/guardrails/guardrails.test.ts",".github/workflows/acceptance-wp002.yml","engine/io/repo-store.ts","engine/io/repo-store.test.ts","engine/io/github-transport.ts","engine/io/github-writer.ts","engine/io/wp002-integration.ts","engine/io/wp002-integration.test.ts",".github/workflows/commit-artifacts.yml",".github/workflows/reindex.yml"]};
/** Validate frozen owner policy and the whole implementation chain, before granting scope. */
export function integrationPolicy(root: string, head: string, p: IntegrationPolicy = FS24B): string[] {
  git(root, "merge-base", "--is-ancestor", p.base, p.start);
  git(root, "merge-base", "--is-ancestor", p.policy, head);
  if (git(root,"rev-list","--parents","-n","1",p.policy).trim() !== p.policy+" "+p.start) throw new Error("B-policy-parent");
  const pd=changes(root,p.start,p.policy);
  if(pd.length!==Object.keys(p.files).length || pd.some(x=>!p.files[x.path])) throw new Error("B-policy-scope");
  const msg=git(root,"show","-s","--format=%B",p.policy);
  if(!msg.split("\n").includes("Fulcrum-Grant: FS24-B") || !msg.split("\n").includes("Fulcrum-Phase: policy")) throw new Error("B-policy-grant");
  for(const [path,blob] of Object.entries(p.files)) {
    if(git(root,"rev-parse",p.policy+":"+path).trim()!==blob || git(root,"rev-parse",head+":"+path).trim()!==blob || !at(root,p.policy,path).startsWith(at(root,p.start,path))) throw new Error("B-policy-freeze");
  }
  let parent=p.policy;
  const chain=git(root,"rev-list","--reverse",p.policy+".."+head).trim().split("\n").filter(Boolean);
  if(chain.length>5) throw new Error("B-commit-limit");
  for(const [i,sha] of chain.entries()) {
    if(git(root,"rev-list","--parents","-n","1",sha).trim()!==sha+" "+parent) throw new Error("B-parent");
    const text=git(root,"show","-s","--format=%B",sha);
    for(const [key,value] of [["Grant","FS24-B"],["Phase","implementation"],["Iteration",String(i+1)]]) {
      if(text.split("\n").filter(x=>x.startsWith("Fulcrum-"+key+": ")).join("\n")!=="Fulcrum-"+key+": "+value) throw new Error("B-trailer");
    }
    parent=sha;
  }
  if(changes(root,p.start,head).some(x=>!p.paths.includes(x.path))) throw new Error("B-outside-scope");
  for(const path of files(root,p.start)) if(!p.paths.includes(path) && git(root,"ls-tree",p.start,"--",path)!==git(root,"ls-tree",head,"--",path)) throw new Error("B-preservation");
  return p.paths;
}


export const FS24R1 = {"base":"83786225fdaff2fcbc82cd2b99212a905dd19ceb","tree":"dc59bf4b8e470fa23a042acd4bf19f909dca5e0c","historicalHead":"19bb30568885ef6cb2c7c4b3c8cb9053f9b1fe21","files":{"engine/docs/02-decisions.md":"b15222c348c84af3dbc2f2fccb3eecd4ce89141e","engine/ops/work-packages/WP-002-interfaces.md":"6d716a54271dd00e5eaa219acf7ee94712c48ee7"},"paths":["engine/docs/02-decisions.md","engine/ops/work-packages/WP-002-interfaces.md",".github/workflows/ci.yml","scripts/guardrails/index.ts",".github/workflows/acceptance-wp002.yml","engine/io/github-transport.ts","engine/io/github-writer.ts","engine/io/wp002-integration.test.ts","engine/io/wp002-integration.ts"]};
/** Resolve P1 from the pinned S ancestry, then verify its immutable content pins. */
export function repairPolicy(root:string,head:string):string[] {
  const p=FS24R1;
  if(git(root,"rev-parse",p.base+"^{tree}").trim()!==p.tree)throw new Error("R1-base-tree");
  git(root,"merge-base","--is-ancestor",p.base,head);
  const chain=git(root,"rev-list","--reverse",p.base+".."+head).trim().split("\n").filter(Boolean);
  if(chain.length<2||chain.length>4)throw new Error("R1-commit-count");
  let parent:string=p.base;
  for(const [i,sha]of chain.entries()) {
    if(git(root,"rev-list","--parents","-n","1",sha).trim()!==sha+" "+parent)throw new Error("R1-parent");
    const msg=git(root,"show","-s","--format=%B",sha);
    for(const [key,value]of [["Grant","FS24-B-R1"],["Phase",i===0?"policy":"implementation"],...(i===0?[]:[["Iteration",String(i)]])]) {
      if(msg.split("\n").filter(x=>x.startsWith("Fulcrum-"+key+": ")).join("\n")!=="Fulcrum-"+key+": "+value)throw new Error("R1-trailer");
    }
    const changed=changes(root,parent,sha).map(x=>x.path);
    if(i===0&&(changed.length!==2||changed.some(x=>!Object.hasOwn(p.files,x))))throw new Error("R1-policy-scope");
    if(i>0&&changed.some(x=>!p.paths.slice(2).includes(x)))throw new Error("R1-implementation-scope");
    parent=sha;
  }
  for(const [path,pin]of Object.entries(p.files)) {
    if(git(root,"rev-parse",chain[0]+":"+path).trim()!==pin||git(root,"rev-parse",head+":"+path).trim()!==pin||!at(root,chain[0],path).startsWith(at(root,p.base,path)))throw new Error("R1-policy-freeze");
  }
  if(changes(root,p.base,head).some(x=>!p.paths.includes(x.path)))throw new Error("R1-scope");
  for(const path of files(root,p.base))if(!p.paths.includes(path)&&git(root,"ls-tree",p.base,"--",path)!==git(root,"ls-tree",head,"--",path))throw new Error("R1-preservation");
  return p.paths;
}

export const FS24C = {"base":"6d0c5abeb493699ef649f49860b370ab76c55869","tree":"7fa21a329e5df9284a43142f6c38d32b72a5a351","historicalCandidate":"c9dd48113b2a5a93dca6f92a151c8391bfb6af8d","files":{"engine/docs/02-decisions.md":"d365edd010c1228cf3f51c7ace01d6facdc9cbcc","engine/ops/work-packages/WP-002-interfaces.md":"84483fd2b029881467ebc8fb04422b14344f9358"},"paths":["engine/docs/02-decisions.md","engine/ops/work-packages/WP-002-interfaces.md",".github/workflows/ci.yml","scripts/guardrails/index.ts","scripts/guardrails/guardrails.test.ts",".github/workflows/acceptance-wp002.yml","engine/io/github-transport.ts","engine/io/github-writer.ts","engine/io/wp002-integration.ts","engine/io/wp002-integration.test.ts",".github/workflows/commit-artifacts.yml",".github/workflows/reindex.yml"]};
/** New policy never replaces the historical B/R1 validators or pins. */
export function successorPolicy(root:string,head:string,p:typeof FS24C=FS24C):string[] {
  if(git(root,"rev-parse",p.base+"^{tree}").trim()!==p.tree||git(root,"rev-parse",p.base+"^2").trim()!==p.historicalCandidate)throw new Error("C-base");
  repairPolicy(root,p.historicalCandidate);
  git(root,"merge-base","--is-ancestor",p.base,head);
  const chain=git(root,"rev-list","--reverse",p.base+".."+head).trim().split("\n").filter(Boolean);
  if(chain.length<2||chain.length>4)throw new Error("C-count");
  let previous=p.base;
  for(const [i,sha] of chain.entries()) {
    if(git(root,"rev-list","--parents","-n","1",sha).trim()!==sha+" "+previous)throw new Error("C-parent");
    const message=git(root,"show","-s","--format=%B",sha);
    for(const [key,value] of [["Grant","FS24-C"],["Phase",i===0?"policy":"implementation"],...(i===0?[]:[["Iteration",String(i)]])])
      if(message.split("\n").filter(x=>x.startsWith("Fulcrum-"+key+": ")).join("\n")!=="Fulcrum-"+key+": "+value)throw new Error("C-trailer");
    const changed=changes(root,previous,sha).map(x=>x.path);
    if(i===0?(changed.length!==2||changed.some(x=>!Object.hasOwn(p.files,x))):changed.some(x=>!p.paths.slice(2).includes(x)))throw new Error("C-scope");
    previous=sha;
  }
  for(const [path,pin]of Object.entries(p.files)) {
    if(git(root,"rev-parse",chain[0]+":"+path).trim()!==pin||git(root,"rev-parse",head+":"+path).trim()!==pin||!at(root,chain[0],path).startsWith(at(root,p.base,path)))throw new Error("C-policy-freeze");
  }
  if(changes(root,p.base,head).some(x=>!p.paths.includes(x.path)))throw new Error("C-scope");
  for(const path of files(root,p.base))if(!p.paths.includes(path)&&git(root,"ls-tree",p.base,"--",path)!==git(root,"ls-tree",head,"--",path))throw new Error("C-preservation");
  return p.paths;
}


export const FS24D = {base:"78a4b28b4134fb09b4a003b90099c13460a8112d", tree:"ac9be3c9f327ba15cf6c0a9871d05d444a58c290", policy:"2cde1d18a989ac085a47b7ada0565b29b42577b6"};
export interface DLineage { evidenceRepair?: {rounds:string[];merges:Array<{head:string;base:string;candidate:string;pr:number}>;approval:string;paths:string[]}; evidenceVolume?: {rounds:string[];merges:Array<{head:string;base:string;candidate:string;pr:number}>;approval:string;paths:string[];activations:string[];continuations:Array<{head:string;round:number;sourceRun:number;volumes:number[]}>}; evidenceAdmission?: {commit:string;parent:string;approval:string;paths:string[]}; head:string; code:string; candidateBase:string; batch:string|null; origin:string|null; closure:boolean; closureBase?:string; unmerged:string[]; paths:string[]; dataPaths:string[]; epochs:Array<{code:string;base:string;candidate:string;pr:number}>; data:Array<{commit:string;parent:string;operation:string;code:string}>; }
const dLineageCache = new Map<string,DLineage>();
export function closureLineage(root:string,head:string):DLineage {
  if(!/^[a-f0-9]{40}$/.test(head))throw new Error("D-head-format");
  const key=root+":"+head,cached=dLineageCache.get(key);if(cached)return structuredClone(cached);
  const helper = require("node:path").join(__dirname,"..","wp002-preflight.py") as string;
  const output = require("node:child_process").execFileSync("python3",[helper,"inspect","--root",root,"--head",head],{encoding:"utf8",maxBuffer:16*1024*1024}) as string;
  const result=JSON.parse(output) as DLineage;dLineageCache.set(key,result);return structuredClone(result);
}

export interface Options { root: string; base: string; head: string; branch: string; title: string; event: string; bootstrap?: Bootstrap; }
export interface ScanReport { result: "pass" | "fail"; base: string; head: string; branch: string; wpPath: string; checkedPaths: string[]; errors: Finding[]; }
export function inspect(o: Options): ScanReport {
  const report: ScanReport = { result: "fail", base: o.base, head: o.head, branch: o.branch, wpPath: "", checkedPaths: [], errors: [] };
  try {
    if (!/^[a-f0-9]{40}$/.test(o.base) || !/^[a-f0-9]{40}$/.test(o.head)) throw new Error("commit-format");
    const messageHead=git(o.root,"show","-s","--format=%B",o.head);
    const lineage=messageHead.split("\n").includes("Fulcrum-Grant: FS24-D")?closureLineage(o.root,o.head):undefined;
    // The first F candidate grows from wp/002, the second parent of the
    // canonical checkpoint merge.  A fully validated F lineage binds that
    // topic head back to candidateBase, so direct ancestry is neither true
    // nor required for this one bounded case.
    if(!(lineage?.evidenceVolume&&lineage.candidateBase===o.base))
      git(o.root, "merge-base", "--is-ancestor", o.base, o.head);
    // The E companion is evidence documentation, not a replacement WP authority.
    // Verified E lineage freezes the original WP blob at F, including after merge.
    const contextBase=lineage?.evidenceVolume?"2efe60ea7c74d301a1e2fc0ba52e1adc686f40dd":lineage?.evidenceRepair?"c4a4445e619175c015469cd33ebd427ecdd687a1":o.base;
    const ctx = context(o.root, contextBase, o.branch, o.title, o.event); report.wpPath = ctx.wpPath;
    const diff = changes(o.root, o.base, o.head); report.checkedPaths = diff.map(x => x.path);
    const messages = git(o.root, "log", "--format=%B", o.base + ".." + o.head);
    const decisions = "engine/docs/02-decisions.md";
    const beforeDecision = existsAt(o.root, o.base, decisions) ? at(o.root, o.base, decisions) : "";
    const afterDecision = existsAt(o.root, o.head, decisions) ? at(o.root, o.head, decisions) : "";
    const newDecision = afterDecision.startsWith(beforeDecision) && /^## D-\d+\b/m.test(afterDecision.slice(beforeDecision.length));
    const docOnly = diff.every(x => x.path.endsWith(".md"));
    const boot = o.bootstrap;
    if (boot) {
      if (o.base !== boot.base || o.branch !== "wp/001") throw new Error("bootstrap-context");
      git(o.root, "merge-base", "--is-ancestor", boot.policy, o.head);
      if (git(o.root, "rev-list", "--parents", "-n", "1", boot.policy).trim() !== boot.policy + " " + boot.base) throw new Error("policy-parent");
      const policyMessage = git(o.root, "show", "-s", "--format=%B", boot.policy);
      if (!policyMessage.includes("Fulcrum-Grant: FS23-WP001") || !policyMessage.includes("Fulcrum-Phase: policy")) throw new Error("policy-grant");
      const pd = changes(o.root, boot.base, boot.policy);
      if (pd.length !== Object.keys(boot.files).length || pd.some(x => !boot.files[x.path])) throw new Error("policy-scope");
      for (const [path, blob] of Object.entries(boot.files)) {
        if (git(o.root, "rev-parse", boot.policy + ":" + path).trim() !== blob || git(o.root, "rev-parse", o.head + ":" + path).trim() !== blob || !at(o.root, boot.policy, path).startsWith(at(o.root, boot.base, path))) throw new Error("policy-freeze:" + path);
      }
    }
    const b24 = o.branch === "wp/002" && o.base === FS24B.base ? integrationPolicy(o.root, o.head) : [];
    const r1 = o.base === FS24R1.base && ["wp/002","main"].includes(o.branch) ? repairPolicy(o.root,o.branch === "main" ? git(o.root,"rev-parse",o.head+"^2").trim() : o.head) : [];
    const c = o.base === FS24C.base && ["wp/002","main"].includes(o.branch) ? successorPolicy(o.root,o.branch === "main" ? git(o.root,"rev-parse",o.head+"^2").trim() : o.head) : [];
    let d:string[]=[];
    if(lineage) {
      if(!["wp/002","main"].includes(o.branch))throw new Error("D-branch");
      if(lineage.unmerged.length ? o.base!==lineage.candidateBase : ![FS24D.base,lineage.code,...lineage.epochs.map(x=>x.base),...(lineage.closureBase?[lineage.closureBase]:[]),...(lineage.evidenceRepair?.merges.flatMap(x=>[x.base,x.head])??[]),...(lineage.evidenceVolume?.merges.flatMap(x=>[x.base,x.head])??[])].includes(o.base))throw new Error("D-scan-base");
      d=[...lineage.paths,...lineage.dataPaths,...(lineage.closure?["engine/ops/backlog.md"]:[])];
      if(diff.some(x=>!d.includes(x.path)))throw new Error("D-scan-scope");
    }
    const domain = tokens(o.root, o.base);
    for (const change of diff) {
      const path = change.path;
      const error = (rule: string): void => { report.errors.push({ path, line: 0, rule }); };
      const policyException = !!boot?.files[path] || b24.includes(path) || r1.includes(path) || c.includes(path) || d.includes(path);
      const backlog = path === "engine/ops/backlog.md" && ctx.kind !== "main" && existsAt(o.root, o.base, path) && existsAt(o.root, o.head, path) && backlogOnly(at(o.root, o.base, path), at(o.root, o.head, path), ctx.code);
      const wpException = path === ctx.wpPath && docOnly && messages.includes("[wp-change]");
      if (ctx.kind !== "main" && !policyException && !backlog && !wpException && !ctx.patterns.some(p => matches(path, p))) error("outside-scope:" + ctx.wpPath);
      if (path === ctx.wpPath && !policyException && !wpException) error("candidate-wp-rule-change");
      if (path.startsWith("engine/contracts/") && (!messages.includes("[contract-change]") || !newDecision)) error("contract-locked");
      if (change.status !== "D") {
        const mode = git(o.root, "ls-tree", o.head, "--", path).split(" ")[0];
        if (mode !== "100644" && mode !== "100755") error("unsupported-file-mode");
        const rows = added(o.root, o.base, o.head, path);
        report.errors.push(...scanSecrets(path, rows), ...scanContent(path, at(o.root, o.head, path), rows, domain));
      }
    }
    report.result = report.errors.length ? "fail" : "pass";
  } catch (error) { report.errors.push({ path: report.wpPath, line: 0, rule: String(error).split("\n")[0] }); }
  return report;
}
if (require.main === module) {
  const args = process.argv.slice(2); const arg = (key: string): string => { const i = args.indexOf(key); if (i < 0 || !args[i + 1]) throw new Error("missing " + key); return args[i + 1]; };
  const options: Options = { root: arg("--root"), base: arg("--base"), head: arg("--head"), branch: arg("--branch"), title: process.env.FS_TITLE ?? "", event: arg("--event") };
  if (options.base === BOOTSTRAP.base && options.branch === "wp/001") options.bootstrap = BOOTSTRAP;
  const result = inspect(options); const output = JSON.stringify(result, null, 2) + "\n";
  if (process.env.FS_SCAN_REPORT) writeFileSync(process.env.FS_SCAN_REPORT, output);
  process.stdout.write(output); process.exitCode = result.result === "pass" ? 0 : 1;
}
