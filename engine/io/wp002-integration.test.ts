import { assertDataParent, assertReceiptCollision, assertRemoteBlob } from "./github-writer";
import { assertFinalJobEvidence } from "./wp002-integration";
import assert from "node:assert/strict";
import { spawnSync, execFileSync } from "node:child_process";
import { readFileSync,readdirSync,writeFileSync } from "node:fs";
import { join } from "node:path";
import { applyEntries, validateBatchInput, inspectMergeReceipt, repairIdentity, collectMergeReceipts, diagnoseMerge, validateSuccessorInput } from "./github-writer";
import { GitHubTransport,digest,validateManifest,validateDispatchedRun } from "./github-transport";
import { FS24R1, repairPolicy, FS24C, successorPolicy } from "../../scripts/guardrails/index";
import { bundle, bundleC, producerOverlap } from "./wp002-integration";
import { schemaChecker } from "./repo-store";

async function main(){
 const rows:Array<{name:string;result:string;error?:string}>=[];
 let complete=false,current="initialization";
 // Lifecycle evidence, not a timeout: an unresolved promise must not look like pass.
 process.once("beforeExit",()=>{if(!complete){const report={result:"fail",tests:rows.length,rows,incomplete:current,networkFixturesOnly:true};if(process.env.FS_EVIDENCE)writeFileSync(join(process.env.FS_EVIDENCE,"integration-tests.json"),JSON.stringify(report,null,2)+"\n");process.stderr.write("IncompleteIntegrationSuite:"+current+"\n");process.exitCode=1;}});
 const test=async(name:string,f:()=>unknown)=>{current=name;try{await f();rows.push({name,result:"pass"});}catch(e){rows.push({name,result:"fail",error:String(e)});}};
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
 await test("R1-real-candidate-policy",()=>assert.equal(repairPolicy(root,FS24C.historicalCandidate).length,9));
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

 // Version assertions use literal contract values and decoded metadata, not the implementation constant.
 const versionFetch=globalThis.fetch,versionLog=console.log;
 try {
   for(const [number,label] of [[12,"merge-history"],[13,"merge-repair"]] as const)await test("R1-"+label+"-version-and-metadata",async()=>{
     const captured:string[]=[];let calls=0;
     const payload={...valid,number};
     console.log=(...args:unknown[])=>{captured.push(args.join(" "));};
     globalThis.fetch=async(url,init)=>{
       calls++;assert.equal(String(url),"https://api.github.com/repos/HungQuach301/fulcrum-studio/pulls/"+number);
       assert.equal(init?.method,"GET");assert.equal(init?.redirect,"manual");
       assert.equal(new Headers(init?.headers).get("X-GitHub-Api-Version"),"2022-11-28");
       return new Response(JSON.stringify(payload),{status:200,headers:{"x-github-api-version-selected":"2022-11-28","x-github-request-id":"fixture-version-"+number}});
     };
     assert.deepEqual(await new GitHubTransport("fixture-token").mergeReceipt(number,label),payload);assert.equal(calls,1);
     const start=captured.findIndex(x=>x.startsWith("FS24B_FILE\t")&&JSON.parse(x.split("\t")[1]).name===label+"-response-metadata.json");assert.ok(start>=0);
     const file=JSON.parse(captured[start].split("\t")[1]) as {bytes:number;sha256:string};let encoded="";
     for(const row of captured.slice(start+1)){if(row.startsWith("FS24B_END\t"))break;if(row.startsWith("FS24B_DATA\t"))encoded+=row.split("\t")[2];}
     const bytes=Buffer.from(encoded,"base64");assert.equal(bytes.length,file.bytes);assert.equal(digest(bytes),file.sha256);
     const metadata=JSON.parse(bytes.toString("utf8")) as {path:string;status:number;requestedApiVersion:string;selectedApiVersion:string;requestId:string;bytes:number;sha256:string};
     assert.equal(metadata.path,"/pulls/"+number);assert.equal(metadata.status,200);
     assert.equal(metadata.requestedApiVersion,"2022-11-28");assert.equal(metadata.selectedApiVersion,"2022-11-28");
     assert.equal(metadata.requestId,"fixture-version-"+number);assert.equal(metadata.bytes,Buffer.byteLength(JSON.stringify(payload)));assert.equal(metadata.sha256,digest(JSON.stringify(payload)));
   });
   await test("R1-nonreceipt-version-preserved",async()=>{
     const calls:string[]=[];globalThis.fetch=async(url,init)=>{calls.push(String(url));assert.equal(new Headers(init?.headers).get("X-GitHub-Api-Version"),"2026-03-10");return new Response("{}",{status:200});};
     const api=new GitHubTransport("fixture-token");await api.json("/git/ref/heads/main");await api.json("/pulls/12");assert.equal(calls.length,2);
   });
 }finally{globalThis.fetch=versionFetch;console.log=versionLog;}

 // Execute the exact workflow summary rule, not a second TypeScript implementation.
 const workflow=execFileSync("git",["-C",root,"show",FS24C.historicalCandidate+":.github/workflows/acceptance-wp002.yml"],{encoding:"utf8"});
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
 const successor=bundleC(root,head,"123","left");
 await test("C-manifest-and-namespace",()=>{validateManifest(successor.manifest,successor.files);assert.equal(successor.manifest.grant,"FS24-C");assert.equal(successor.manifest.head,head);assert.ok(successor.files["log.jsonl"].includes("FS24-C:123:"));});
 await test("C-policy-candidate",()=>assert.equal(successorPolicy(root,head).length,12));
 const body={grant:"FS24-C" as const,batch:"123",code:head,producer:"left" as const,artifact:1,manifestHash:digest(successor.files["manifest.json"]),operation:"initial-left",cancelAfterPush:false};
 const request={...body,requestId:digest(JSON.stringify(body))};
 await test("C-input-valid",()=>validateSuccessorInput(request,false));
 for(const [name,patch]of Object.entries({grant:{grant:"FS24-B"},digest:{requestId:"0".repeat(64)},code:{code:"bad"},producer:{producer:"right"},cancel:{cancelAfterPush:true},extra:{unexpected:true}}))await test("C-input-reject-"+name,()=>{const {requestId,...changed}={...request,...patch};assert.throws(()=>validateSuccessorInput({...changed,requestId:name==="digest"?requestId:digest(JSON.stringify(changed))} as typeof request,false));});
 const indexBody={...body,operation:"reindex",artifact:0,manifestHash:"none"};
 await test("C-reindex-input-valid",()=>validateSuccessorInput({...indexBody,requestId:digest(JSON.stringify(indexBody))},true));
 await test("C-reindex-reject-artifact",()=>{const wrong={...indexBody,artifact:1};assert.throws(()=>validateSuccessorInput({...wrong,requestId:digest(JSON.stringify(wrong))},true));});
 const pair=["left","right"].map((side,i)=>({id:i+1,name:"producer-"+side,status:"completed",conclusion:"success",started_at:"2026-09-15T00:00:00Z",completed_at:"2026-09-15T00:00:02Z"}));
 await test("C-overlap-real-interval-rule",()=>assert.equal(producerOverlap(pair),true));
 await test("C-serial-not-parallel",()=>assert.equal(producerOverlap([pair[0],{...pair[1],started_at:"2026-09-15T00:00:03Z",completed_at:"2026-09-15T00:00:05Z"}]),false));
 await test("C-missing-producer",()=>assert.equal(producerOverlap(pair.slice(0,1)),false));
 const rid="1".repeat(64),runValue={id:4,head_sha:head,event:"workflow_dispatch",head_branch:"main",path:".github/workflows/ci.yml",status:"completed",conclusion:"success",run_attempt:1,display_title:"FS24-C "+rid,repository:{full_name:"HungQuach301/fulcrum-studio"},head_repository:{full_name:"HungQuach301/fulcrum-studio"}};
 await test("C-dispatch-binding",()=>validateDispatchedRun(runValue,4,"ci.yml",rid));
 for(const [name,patch]of Object.entries({event:{event:"push"},attempt:{run_attempt:2},title:{display_title:"other"},branch:{head_branch:"wp/002"},repo:{repository:{full_name:"outside"}},path:{path:".github/workflows/other.yml"}}))await test("C-dispatch-reject-"+name,()=>assert.throws(()=>validateDispatchedRun({...runValue,...patch},4,"ci.yml",rid)));
 const savedFetch=globalThis.fetch,savedLog=console.log;
 try {
   console.log=()=>{};
   await test("C-pagination-over-100",async()=>{let count=0;globalThis.fetch=async()=>{count++;return new Response(JSON.stringify({total_count:101,workflow_runs:Array.from({length:count===1?100:1},(_,i)=>({id:count===1?i+1:101}))}),{status:200});};assert.equal((await new GitHubTransport("fixture-token").page("/actions/runs","workflow_runs")).length,101);assert.equal(count,2);});
   await test("C-pagination-duplicate",async()=>{globalThis.fetch=async()=>new Response(JSON.stringify({total_count:2,workflow_runs:[{id:1}]}),{status:200});await assert.rejects(()=>new GitHubTransport("fixture-token").page("/actions/runs","workflow_runs"),/PaginationDuplicate/);});
   await test("C-pagination-incomplete",async()=>{globalThis.fetch=async()=>new Response(JSON.stringify({total_count:2,workflow_runs:[]}),{status:200});await assert.rejects(()=>new GitHubTransport("fixture-token").page("/actions/runs","workflow_runs"),/PaginationIncomplete/);});
   await test("C-dispatch-200-run-id",async()=>{let count=0;globalThis.fetch=async()=>{count++;return new Response(JSON.stringify(count===1?{workflow_run_id:4,run_url:"https://api.github.com/repos/HungQuach301/fulcrum-studio/actions/runs/4",html_url:"https://github.com/HungQuach301/fulcrum-studio/actions/runs/4"}:runValue),{status:200});};assert.equal(await new GitHubTransport("fixture-token").dispatchC("ci.yml",{},rid),4);assert.equal(count,2);});
   await test("C-dispatch-missing-ack-no-retry",async()=>{let count=0;globalThis.fetch=async()=>{count++;return new Response("",{status:200});};await assert.rejects(()=>new GitHubTransport("fixture-token").dispatchC("ci.yml",{},rid));assert.equal(count,1);});
   await test("C-dispatch-403-once",async()=>{let count=0;globalThis.fetch=async()=>{count++;return new Response("{}",{status:403});};await assert.rejects(()=>new GitHubTransport("fixture-token").dispatchC("ci.yml",{},rid),/GitHubHTTP:403/);assert.equal(count,1);});
 }finally{globalThis.fetch=savedFetch;console.log=savedLog;}
 await test("C-data-foreign-parent",()=>assert.throws(()=>assertDataParent("next foreign","next","prior"),/C-data-parent/));
 await test("C-data-multiple-parents",()=>assert.throws(()=>assertDataParent("next prior extra","next","prior"),/C-data-parent/));
 await test("C-replay-manifest-collision",()=>assert.throws(()=>assertReceiptCollision("Input-Manifest: wrong\nArtifact-Id: 1",digest("expected"),1),/WriteIdCollision/));
 await test("C-remote-content-mismatch",()=>assert.throws(()=>assertRemoteBlob({sha:head,encoding:"base64",size:3,content:Buffer.from("bad").toString("base64")},head,"good"),/RemoteContentReadbackMismatch/));
 const evidenceFiles=Object.fromEntries(Object.entries({"preflight.json":{result:"pass"},"runtime.json":{archiveChecksum:"pass"},"preservation.json":{result:"pass"},"cleanup.json":{executionDataRemoved:true},"job-summary.json":{result:"success"},"commands.json":[{status:0}]}).map(([k,v])=>[k,Buffer.from(JSON.stringify(v))]));
 const evidenceJob={id:1,name:"validate",status:"completed",conclusion:"success",steps:[{name:"Remove final report data",conclusion:"success"}]};
 await test("C-required-cleanup-step-missing",()=>assert.throws(()=>assertFinalJobEvidence({...evidenceJob,steps:[]},"FS23_FINAL_REPORT_CLEANUP=pass;job=validate",evidenceFiles),/FinalCICleanup/));
 await test("C-final-incomplete-json",()=>assert.throws(()=>assertFinalJobEvidence(evidenceJob,"FS23_FINAL_REPORT_CLEANUP=pass;job=validate",{...evidenceFiles,"commands.json":Buffer.from("[")})));
 if(rows.length!==83||new Set(rows.map(x=>x.name)).size!==83)rows.push({name:"C-case-manifest-incomplete",result:"fail"});
 const report={result:rows.every(x=>x.result==="pass")?"pass":"fail",tests:rows.length,rows,networkFixturesOnly:true};
 if(process.env.FS_EVIDENCE)writeFileSync(join(process.env.FS_EVIDENCE,"integration-tests.json"),JSON.stringify(report,null,2)+"\n");
 console.log(JSON.stringify(report,null,2));process.exitCode=report.result==="pass"?0:1;complete=true;
}
main().catch(e=>{console.error(String(e));process.exitCode=1;});
