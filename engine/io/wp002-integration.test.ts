import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync,readdirSync,writeFileSync } from "node:fs";
import { join } from "node:path";
import { applyEntries, validateBatchInput, inspectMergeReceipt, repairIdentity, collectMergeReceipts, diagnoseMerge } from "./github-writer";
import { GitHubTransport,digest,validateManifest } from "./github-transport";
import { FS24R1, repairPolicy } from "../../scripts/guardrails/index";
import { bundle } from "./wp002-integration";
import { schemaChecker } from "./repo-store";

async function main(){
 const rows:Array<{name:string;result:string;error?:string}>=[];
 const test=async(name:string,f:()=>unknown)=>{try{await f();rows.push({name,result:"pass"});}catch(e){rows.push({name,result:"fail",error:String(e)});}};
 const root=process.env.GITHUB_WORKSPACE!,head=process.env.FS_HEAD!;
 const b=bundle(root,head,"123","left"),c=schemaChecker(readdirSync("engine/contracts").filter(x=>x.endsWith(".schema.json")).map(x=>JSON.parse(readFileSync(join("engine/contracts",x),"utf8"))));
 const initial=b.manifest.operations[0],entries=initial.entries.map(x=>({...x,content:b.files[x.name]}));
 const old=Object.fromEntries(entries.map(x=>[x.path,null]));
 await test("manifest-valid",()=>validateManifest(b.manifest,b.files));
 await test("manifest-extra-member",()=>assert.throws(()=>validateManifest(b.manifest,{...b.files,"unexpected.json":"{}"}),/UndeclaredMember/));
 await test("manifest-hash-mismatch",()=>assert.throws(()=>validateManifest(b.manifest,{...b.files,[entries[0].name]:"{}"}),/MemberByteHash/));
 await test("batch-initial-pair",()=>assert.equal(Object.keys(applyEntries(old,entries,head,"fixture",c)).length,2));
 await test("batch-duplicate-path",()=>assert.throws(()=>applyEntries(old,[entries[0],entries[0]],head,"fixture",c),/DuplicateWritePath/));
 await test("batch-invalid-before-apply",()=>{const bad=b.manifest.operations.find(x=>x.name==="invalid-state")!.entries[0];assert.throws(()=>applyEntries({[bad.path]:null},[{...bad,content:b.files[bad.name]}],head,"fixture",c),/SchemaRejected/);assert.deepEqual(old,Object.fromEntries(entries.map(x=>[x.path,null])));});
 await test("batch-log-prefix-and-25-lines",()=>{const item=b.manifest.operations.find(x=>x.name==="logs-left")!.entries[0];const lines=b.files[item.name],before=lines.split("\n")[0]+"\n";const out=applyEntries({[item.path]:before},[{...item,content:lines}],head,"fixture",c);assert.equal(out[item.path],before+lines);assert.equal(lines.trimEnd().split("\n").length,25);});
 await test("batch-log-partial-rejected",()=>{const item=b.manifest.operations.find(x=>x.name==="logs-left")!.entries[0];assert.throws(()=>applyEntries({[item.path]:"{}"},[{...item,content:b.files[item.name]}],head,"fixture",c),/IncompleteExistingLog/);});
 const input={batch:"123",code:head,producer:"left" as const,artifact:1,manifestHash:digest(b.files["manifest.json"]),operation:"initial-left"};
 await test("input-valid",()=>validateBatchInput(input));
 await test("input-wrong-producer",()=>assert.throws(()=>validateBatchInput({...input,producer:"right"}),/ProducerOperationMismatch/));
 await test("input-unlisted-operation",()=>assert.throws(()=>validateBatchInput({...input,operation:"production"}),/BatchInputRejected/));

 const expected={number:12,merge:FS24R1.base,head:FS24R1.historicalHead,branch:"wp/002"};
 const valid={number:12,merged:true,merge_commit_sha:expected.merge,head:{sha:expected.head,ref:"wp/002",repo:{full_name:"HungQuach301/fulcrum-studio"}},base:{ref:"main",repo:{full_name:"HungQuach301/fulcrum-studio"}}};
 await test("R1-receipt-valid",()=>assert.equal(inspectMergeReceipt(valid,expected).pass,true));
 for(const [name,value]of Object.entries({missing:{},null:null,array:[],boolean:{...valid,merged:"true"},merge:{...valid,merge_commit_sha:"0".repeat(40)},head:{...valid,head:{...valid.head,sha:"0".repeat(40)}},fork:{...valid,head:{...valid.head,repo:{full_name:"other/repo"}}},branch:{...valid,base:{...valid.base,ref:"other"}}}))await test("R1-receipt-reject-"+name,()=>assert.equal(inspectMergeReceipt(value,expected).pass,false));
 const marker="Fulcrum-Grant: FS24-B-R1\nFulcrum-Phase: diagnostic-bootstrap\nFulcrum-Repair-PR: 13\n";
 await test("R1-merge-identity",()=>assert.equal(repairIdentity([head,FS24R1.base,head],"tree","tree",marker).number,13));
 await test("R1-reject-old-PR",()=>assert.throws(()=>repairIdentity([head,FS24R1.base,head],"tree","tree",marker.replace("PR: 13","PR: 12")),/R1-PR-identity/));
 await test("R1-reject-wrong-base",()=>assert.throws(()=>repairIdentity([head,head,head],"tree","tree",marker),/R1-merge-checkpoint/));
 await test("R1-reject-tree",()=>assert.throws(()=>repairIdentity([head,FS24R1.base,head],"one","two",marker),/R1-merge-checkpoint/));
 await test("R1-reject-duplicate-marker",()=>assert.throws(()=>repairIdentity([head,FS24R1.base,head],"tree","tree",marker+"Fulcrum-Repair-PR: 13\n"),/R1-PR-marker/));
 await test("R1-real-candidate-policy",()=>assert.equal(repairPolicy(root,head).length,9));
 await test("R1-reject-unmodified-base",()=>assert.throws(()=>repairPolicy(root,FS24R1.base),/R1-commit-count/));
 const fetchBefore=globalThis.fetch,logBefore=console.log;let frames:string[]=[];
 try {
  console.log=(...args:unknown[])=>{frames.push(args.join(" "));};
  let seen=0;
  globalThis.fetch=async()=>{seen++;return new Response(JSON.stringify(valid),{status:200,headers:{"x-github-request-id":"fixture-request"}});};
  await test("R1-raw-receipt-before-parse",async()=>{assert.deepEqual(await new GitHubTransport("fixture-token").mergeReceipt(12,"merge-history"),valid);assert.equal(seen,1);const start=frames.findIndex(x=>x.startsWith("FS24B_FILE\t")&&x.includes("merge-history-response.raw.json"));assert.ok(start>=0);const meta=JSON.parse(frames[start].split("\t")[1]) as {bytes:number;sha256:string};let encoded="";for(const row of frames.slice(start+1)){if(row.startsWith("FS24B_END\t"))break;if(row.startsWith("FS24B_DATA\t"))encoded+=row.split("\t")[2];}const raw=Buffer.from(encoded,"base64");assert.deepEqual(raw,Buffer.from(JSON.stringify(valid)));assert.equal(raw.length,meta.bytes);assert.equal(digest(raw),meta.sha256);});
  frames=[];seen=0;globalThis.fetch=async()=>{seen++;return new Response("{broken",{status:200});};
  await test("R1-malformed-raw-retained",async()=>{await assert.rejects(()=>new GitHubTransport("fixture-token").mergeReceipt(12,"merge-history"),/MergeReceiptInvalidJSON/);assert.equal(seen,1);assert.ok(frames.some(x=>x.includes("merge-history-response.raw.json")));});
  frames=[];seen=0;globalThis.fetch=async()=>{seen++;return new Response("{\"message\":\"forbidden\"}",{status:403});};
  await test("R1-403-once-with-raw",async()=>{await assert.rejects(()=>new GitHubTransport("fixture-token").mergeReceipt(12,"merge-history"),/GitHubHTTP:403/);assert.equal(seen,1);assert.ok(frames.some(x=>x.includes("merge-history-response.raw.json")));});
  frames=[];seen=0;globalThis.fetch=async()=>{seen++;return new Response(new Uint8Array([255]),{status:200});};
  await test("R1-invalid-UTF8-retained",async()=>{await assert.rejects(()=>new GitHubTransport("fixture-token").mergeReceipt(12,"merge-history"),/MergeReceiptInvalidJSON/);assert.equal(seen,1);assert.ok(frames.some(x=>x.includes("merge-history-response.raw.json")));});
  frames=[];seen=0;globalThis.fetch=async()=>{seen++;return new Response("x".repeat(1024*1024+1),{status:200});};
  await test("R1-body-cap-no-second-request",async()=>{await assert.rejects(()=>new GitHubTransport("fixture-token").mergeReceipt(12,"merge-history"),/MergeReceiptByteCap/);assert.equal(seen,1);assert.ok(frames.some(x=>x.includes("merge-history-error.json")));});
 }finally{globalThis.fetch=fetchBefore;console.log=logBefore;}

 // Execute the exact workflow summary rule, not a second TypeScript implementation.
 const workflow=readFileSync(join(root,".github/workflows/acceptance-wp002.yml"),"utf8");
 const rule=workflow.split("# FS24R1_REQUIRED_BEGIN\n")[1]?.split("# FS24R1_REQUIRED_END")[0];
 const summarySteps=Object.fromEntries(["preflight","runtime","setup","install","check","diagnostic","preservation","cleanup"].map(x=>[x,{outcome:"success"}]));
 for(const outcome of ["success","failure","skipped","missing"])await test("R1-summary-diagnostic-"+outcome,()=>{
   assert.ok(rule);const steps=structuredClone(summarySteps);if(outcome==="missing")delete steps.diagnostic;else steps.diagnostic={outcome};
   const program="import json,sys,textwrap\nsteps=json.loads(sys.stdin.read())\nexec(textwrap.dedent("+JSON.stringify(rule)+"))\nprint(json.dumps({'ok':ok,'required':required}))\n";
   const result=spawnSync("python3",["-c",program],{input:JSON.stringify(steps),encoding:"utf8"});assert.equal(result.status,0,result.stderr);
   const value=JSON.parse(result.stdout) as {ok:boolean;required:string[]};assert.equal(value.ok,outcome==="success");assert.deepEqual(value.required,Object.keys(summarySteps));
 });
 await test("R1-summary-failure-after-complete-frames",()=>assert.match(workflow,/print\('FS24_COMPLETE\\t'\+str\(len\(files\)\)\)\n\s+raise SystemExit\(0 if ok else 1\)/));
 const fetchSaved=globalThis.fetch,logSaved=console.log;
 try {
   console.log=()=>{};
   const repairExpected={number:13,merge:head,head,branch:"wp/002"};
   const repairValid={...valid,number:13,merge_commit_sha:head,head:{...valid.head,sha:head}};
   for(const scenario of ["both-valid","history-mismatch","history-malformed","history-403","repair-mismatch"])await test("R1-independent-receipts-"+scenario,async()=>{
     const calls:string[]=[];globalThis.fetch=async url=>{const path=String(url);calls.push(path);const history=path.endsWith("/12");
       if(history&&scenario==="history-malformed")return new Response("{bad",{status:200});
       if(history&&scenario==="history-403")return new Response("{\"message\":\"forbidden\"}",{status:403});
       const value=history?{...valid,merged:scenario!=="history-mismatch"}:{...repairValid,merged:scenario!=="repair-mismatch"};return new Response(JSON.stringify(value),{status:200});};
     const result=await collectMergeReceipts(new GitHubTransport("fixture-token"),[expected,repairExpected]);
     assert.equal(calls.length,2);assert.equal(calls.filter(x=>x.endsWith("/12")).length,1);assert.equal(calls.filter(x=>x.endsWith("/13")).length,1);
     assert.equal(result.receipts.length,2);assert.equal(result.pass,scenario==="both-valid");assert.equal(result.receipts[1].pass,scenario!=="repair-mismatch");
   });
   await test("R1-invalid-repair-lineage-zero-GET",async()=>{let calls=0;globalThis.fetch=async()=>{calls++;throw new Error("UnexpectedNetwork");};await assert.rejects(()=>diagnoseMerge(root,FS24R1.base,new GitHubTransport("fixture-token"),true));assert.equal(calls,0);});
   await test("R1-invalid-receipt-scope-zero-GET",async()=>{let calls=0;globalThis.fetch=async()=>{calls++;throw new Error("UnexpectedNetwork");};await assert.rejects(()=>collectMergeReceipts(new GitHubTransport("fixture-token"),[{...expected,number:11}]),/DiagnosticReceiptScope/);assert.equal(calls,0);});
 }finally{globalThis.fetch=fetchSaved;console.log=logSaved;}
 const original=globalThis.fetch;let calls=0;
 try {
  globalThis.fetch=async()=>{calls++;return new Response(null,{status:403});};
  await test("HTTP403-no-retry",async()=>{await assert.rejects(()=>new GitHubTransport("fixture-token").json("/actions/runs/1"),/GitHubHTTP:403/);assert.equal(calls,1);});
  await test("api-outside-scope",()=>assert.rejects(()=>new GitHubTransport("fixture-token").json("/settings/x"),/ApiScope/));
  await test("dispatch-unlisted-workflow",()=>assert.rejects(()=>new GitHubTransport("fixture-token").dispatch("other.yml",{}),/DispatchScope/));
 }finally{globalThis.fetch=original;}
 const report={result:rows.every(x=>x.result==="pass")?"pass":"fail",tests:rows.length,rows,networkFixturesOnly:true};
 if(process.env.FS_EVIDENCE)writeFileSync(join(process.env.FS_EVIDENCE,"integration-tests.json"),JSON.stringify(report,null,2)+"\n");
 console.log(JSON.stringify(report,null,2));process.exitCode=report.result==="pass"?0:1;
}
main().catch(e=>{console.error(String(e));process.exitCode=1;});
