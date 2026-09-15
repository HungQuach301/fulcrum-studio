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

export interface Options { root: string; base: string; head: string; branch: string; title: string; event: string; bootstrap?: Bootstrap; }
export interface ScanReport { result: "pass" | "fail"; base: string; head: string; branch: string; wpPath: string; checkedPaths: string[]; errors: Finding[]; }
export function inspect(o: Options): ScanReport {
  const report: ScanReport = { result: "fail", base: o.base, head: o.head, branch: o.branch, wpPath: "", checkedPaths: [], errors: [] };
  try {
    if (!/^[a-f0-9]{40}$/.test(o.base) || !/^[a-f0-9]{40}$/.test(o.head)) throw new Error("commit-format");
    git(o.root, "merge-base", "--is-ancestor", o.base, o.head);
    const ctx = context(o.root, o.base, o.branch, o.title, o.event); report.wpPath = ctx.wpPath;
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
    const domain = tokens(o.root, o.base);
    for (const change of diff) {
      const path = change.path;
      const error = (rule: string): void => { report.errors.push({ path, line: 0, rule }); };
      const policyException = !!boot?.files[path] || b24.includes(path);
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

