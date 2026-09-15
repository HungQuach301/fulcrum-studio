import assert from "node:assert/strict";
import { readFileSync,readdirSync,writeFileSync } from "node:fs";
import { join } from "node:path";
import { applyEntries, validateBatchInput } from "./github-writer";
import { GitHubTransport,digest,validateManifest } from "./github-transport";
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
