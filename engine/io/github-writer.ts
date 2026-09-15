import { closureLineage, FS24D } from "../../scripts/guardrails/index";
import { fetchMainReadOnly, gitEnvironment, redactGit } from "./github-git";

export interface DBatchInput extends Omit<BatchInput,"grant"> {
  grant:"FS24-D"; requestId:string; cancelAfterPush:boolean; origin:string; controllerRun:string; controlId:string;
  producerRun:string; producerCode:string; payloadDigest:string; ordinal:number; step:string;
}
export function validateDInput(input:DBatchInput,reindex:boolean):void {
  const {requestId,...body}=input;
  if(input.grant!=="FS24-D"||digest(JSON.stringify(body))!==requestId)throw new Error("D-request-digest");
  const keys=["grant","requestId","batch","code","producer","artifact","manifestHash","operation","cancelAfterPush","origin","controllerRun","controlId","producerRun","producerCode","payloadDigest","ordinal","step"];
  if(Object.keys(input).length!==keys.length||Object.keys(input).some(x=>!keys.includes(x)))throw new Error("D-input-extra");
  for(const value of [input.code,input.origin,input.producerCode])assertCommit(value);
  for(const value of [input.batch,input.controllerRun,input.producerRun])if(!/^[1-9][0-9]*$/.test(value))throw new Error("D-run-identity");
  if(!Number.isSafeInteger(input.ordinal)||input.ordinal<0||input.ordinal>6||typeof input.cancelAfterPush!=="boolean"||!/^[a-f0-9]{64}$/.test(input.payloadDigest)||!/^[a-f0-9]{64}$/.test(input.controlId))throw new Error("D-input-identity");
  if(input.cancelAfterPush!==(input.step==="side-effect"))throw new Error("D-CancelStep");
  if(!["initial-left","initial-right","update-one","update-two","duplicate-initial","pending","side-effect","replay-side-effect","invalid-state","logs-left","logs-right","reindex"].includes(input.step)||input.operation!==(input.step==="duplicate-initial"?"initial-left":input.step==="replay-side-effect"?"side-effect":input.step))throw new Error("D-step");
  if(reindex) {
    if(input.operation!=="reindex"||input.producer!=="left"||input.artifact!==0||input.manifestHash!=="none"||input.cancelAfterPush)throw new Error("D-reindex-input");
  } else validateBatchInput({...input,grant:"FS24-C"});
}
export async function receiptsD(root:string,head:string,api:GitHubTransport):Promise<void> {
  const state=closureLineage(root,head);
  const expected:ReceiptExpectation[]=[{number:12,merge:FS24R1.base,head:FS24R1.historicalHead,branch:"wp/002"},{number:13,merge:FS24C.base,head:FS24C.historicalCandidate,branch:"wp/002"},{number:14,merge:FS24D.base,head:"9af238d7772bba56d6b98d568fcd34d57a7d6473",branch:"wp/002"},...state.epochs.map(x=>({number:x.pr,merge:x.code,head:x.candidate,branch:"wp/002"}))];
  const results=await Promise.allSettled(expected.map(async x=>inspectMergeReceipt(await api.mergeReceipt(x.number,"merge-d-"+x.number),x)));
  emitFile("d-merge-outcomes.json",Buffer.from(JSON.stringify(results.map((x,i)=>x.status==="fulfilled"?{number:expected[i].number,status:x.status,observed:x.value}:{number:expected[i].number,status:x.status,error:redactGit(String(x.reason))}))+"\n"));
  if(results.some(x=>x.status!=="fulfilled"||!x.value.pass))throw new Error("D-MergeReceipt");
}
export async function admittedD(root:string,input:DBatchInput,api:GitHubTransport):Promise<void> {
  const state=closureLineage(root,input.code);
  if(state.unmerged.length||state.closure||state.code!==input.code||!state.epochs.some(x=>x.code===input.origin))throw new Error("D-CodeAdmission");
  const original=await api.json<Run>("/actions/runs/"+input.batch),controller=await api.json<Run>("/actions/runs/"+input.controllerRun);
  for(const run of [original,controller])if(run.run_attempt!==1||run.event!=="workflow_dispatch"||run.head_branch!=="main"||run.path!==".github/workflows/acceptance-wp002.yml")throw new Error("D-ControllerIdentity");
  if(original.head_sha!==input.origin||controller.display_title!=="FS24-D "+input.controlId||closureLineage(root,controller.head_sha).code!==input.code)throw new Error("D-ControllerBinding");
  await receiptsD(root,input.code,api);
}
export function dataChainD(root:string,code:string,head:string,batch:string,origin:string):string[] {
  const state=closureLineage(root,head);
  if(state.unmerged.length||state.code!==code||state.batch!==null&&state.batch!==batch||state.origin!==null&&state.origin!==origin)throw new Error("D-DataIdentity");
  for(const item of state.data) {
    const producer=item.operation.endsWith("right")?"right":"left",value=bundleD(root,origin,batch,producer);
    const message=git(root,"show","-s","--format=%B",item.commit);
    if(!message.split("\n").includes("Input-Payload: "+operationDigest(value,item.operation)))throw new Error("D-DataPayload");
    if(item.operation!=="reindex") {
      const op=value.manifest.operations.find(x=>x.name===item.operation)!;
      for(const entry of op.entries) {
        const before=contentAt(root,item.parent,entry.path)??"",after=contentAt(root,item.commit,entry.path);
        if(after!==(entry.mode==="append"?before:"")+value.files[entry.name])throw new Error("D-DataContent");
      }
    }
  }
  return state.data.map(x=>x.commit);
}
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { schemaChecker, validateCommand, stateRecord, isStatePath, assertCommit } from "./repo-store";
import { buildIndex } from "./reindex";
import { GitSource, Schemas, Validator } from "../../scripts/validate";
import { integrationPolicy, repairPolicy, FS24R1, successorPolicy, FS24C } from "../../scripts/guardrails/index";
import { GitHubTransport, Manifest, SOURCE, REPOSITORY, digest, emitFile, Run } from "./github-transport";
import { bundleC as bundle, bundleD, operationDigest, git, ledgerD } from "./wp002-integration";

export interface BatchInput { grant?:"FS24-C"; requestId?:string; batch: string; code: string; producer: "left" | "right"; artifact: number; manifestHash: string; operation: string; cancelAfterPush?: boolean; }
export interface Receipt { writeId: string; commit: string; parent: string; tree: string; duplicate: boolean; paths: Record<string,{blob:string;sha256:string;bytes:number}>; }
export const operationNames=["initial-left","initial-right","update-one","update-two","pending","side-effect","invalid-state","logs-left","logs-right"];
export function validateBatchInput(value:BatchInput):void {
  assertCommit(value.code);
  if(!/^\d+$/.test(value.batch)||!operationNames.includes(value.operation)||!["left","right"].includes(value.producer)||!Number.isSafeInteger(value.artifact)||value.artifact<=0||!/^[a-f0-9]{64}$/.test(value.manifestHash))throw new Error("BatchInputRejected");
  if(value.cancelAfterPush && value.operation!=="side-effect")throw new Error("CancelOperationMismatch");
  if((value.operation.endsWith("right")?"right":"left")!==value.producer)throw new Error("ProducerOperationMismatch");
}
export function applyEntries(old:Record<string,string|null>,entries: Array<{path:string;schema:string;mode:"replace"|"append";content:string}>,base:string,writeId:string,check:ReturnType<typeof schemaChecker>):Record<string,string> {
  const result:Record<string,string>={};let episode:string|undefined;
  for(const entry of entries) {
    if(Object.hasOwn(result,entry.path))throw new Error("DuplicateWritePath");
    if(entry.path!=="pipeline/runs.jsonl") {
      const id=entry.path.split("/").slice(1,3).join("/");
      if(episode&&episode!==id)throw new Error("MultipleEpisodes");episode=id;
    }
    if(entry.mode==="append") {
      if(!entry.content.endsWith("\n"))throw new Error("IncompleteLogBatch");
      const lines=entry.content.split("\n").slice(0,-1);if(!lines.length)throw new Error("EmptyLogBatch");
      for(const line of lines)validateCommand({path:entry.path,content:line,schemaId:entry.schema,mode:"append",expectedSourceCommit:base,writeId},check);
      const previous=old[entry.path]??"";
      if(previous&&!previous.endsWith("\n"))throw new Error("IncompleteExistingLog");
      for(const line of previous.split("\n").slice(0,-1))check(entry.schema,JSON.parse(line));
      result[entry.path]=previous+entry.content;
    } else {
      validateCommand({path:entry.path,content:entry.content,schemaId:entry.schema,mode:"replace",expectedSourceCommit:base,writeId},check);
      if(isStatePath(entry.path)&&old[entry.path]!==null) {
        const before=stateRecord(JSON.parse(old[entry.path]!)),after=stateRecord(JSON.parse(entry.content));
        check(entry.schema,before);
        if(typeof after.revision!=="number"||after.revision<=(typeof before.revision==="number"?before.revision:0))throw new Error("StaleRevision");
      }
      result[entry.path]=entry.content;
    }
  }
  return result;
}

export function inspectMergeReceipt(value:unknown,expected:{number:number;merge:string;head:string;branch:string}) {
  const object=(v:unknown):Record<string,unknown>=>v!==null&&typeof v==="object"&&!Array.isArray(v)?v as Record<string,unknown>:{};
  const pr=object(value),h=object(pr.head),base=object(pr.base),hr=object(h.repo),br=object(base.repo);
  const matches={merged:pr.merged===true,number:pr.number===expected.number,merge:pr.merge_commit_sha===expected.merge,head:h.sha===expected.head,branch:h.ref===expected.branch,headRepository:hr.full_name===REPOSITORY,baseRepository:br.full_name===REPOSITORY,baseBranch:base.ref==="main"};
  return {expected,actual:{merged:pr.merged??null,number:pr.number??null,merge:pr.merge_commit_sha??null,head:h.sha??null,branch:h.ref??null,headRepository:hr.full_name??null,baseRepository:br.full_name??null,baseBranch:base.ref??null},matches,pass:Object.values(matches).every(Boolean)};
}
export function repairIdentity(parents:string[],tree:string,candidateTree:string,message:string) {
  if(parents.length!==3||parents[1]!==FS24R1.base||tree!==candidateTree)throw new Error("R1-merge-checkpoint");
  for(const [key,value]of [["Grant","FS24-B-R1"],["Phase","diagnostic-bootstrap"]])if(message.split("\n").filter(x=>x.startsWith("Fulcrum-"+key+": ")).join("\n")!=="Fulcrum-"+key+": "+value)throw new Error("R1-merge-trailer");
  const rows=message.split("\n").filter(x=>x.startsWith("Fulcrum-Repair-PR: "));
  if(rows.length!==1||!/^Fulcrum-Repair-PR: [1-9][0-9]*$/.test(rows[0]))throw new Error("R1-PR-marker");
  const number=Number(rows[0].slice("Fulcrum-Repair-PR: ".length));
  if(!Number.isSafeInteger(number)||number<=12)throw new Error("R1-PR-identity");
  return {number,merge:parents[0],head:parents[2],branch:"wp/002"};
}
export interface ReceiptExpectation {number:number;merge:string;head:string;branch:string;}
/** Admission is checked by diagnoseMerge before this one-request-per-receipt collector. */
export async function collectMergeReceipts(api:GitHubTransport,expected:ReceiptExpectation[]) {
  if(expected.length<1||expected.length>2||expected[0].number!==12||expected.some((x,i)=>!Number.isSafeInteger(x.number)||(i>0&&x.number<=12)||x.branch!=="wp/002"||![x.merge,x.head].every(s=>/^[a-f0-9]{40}$/.test(s))))throw new Error("DiagnosticReceiptScope");
  const outcomes=await Promise.allSettled(expected.map(async(identity,i)=>{
    const label=i===0?"merge-history":"merge-repair";
    const observed=inspectMergeReceipt(await api.mergeReceipt(identity.number,label),identity);
    emitFile(label+"-observed.json",Buffer.from(JSON.stringify(observed)+"\n"));
    return observed;
  }));
  const rows=outcomes.map((outcome,i)=>outcome.status==="fulfilled"
    ?{label:i===0?"merge-history":"merge-repair",expected:expected[i],pass:outcome.value.pass,observed:outcome.value,error:null}
    :{label:i===0?"merge-history":"merge-repair",expected:expected[i],pass:false,observed:null,error:String(outcome.reason)});
  const report={pass:rows.every(x=>x.pass),receipts:rows};
  emitFile("merge-receipts-outcomes.json",Buffer.from(JSON.stringify(report)+"\n"));
  return report;
}
export async function diagnoseMerge(root:string,code:string,api:GitHubTransport,repair:boolean):Promise<void> {
  assertCommit(code);
  const historyParents=git(root,"rev-list","--parents","-n","1",FS24R1.base).split(" ");
  if(historyParents.join(" ")!==[FS24R1.base,SOURCE,FS24R1.historicalHead].join(" ")||git(root,"rev-parse",FS24R1.base+"^{tree}")!==FS24R1.tree)throw new Error("HistoricalMergeCheckpoint");
  const expected:ReceiptExpectation[]=[{number:12,merge:FS24R1.base,head:FS24R1.historicalHead,branch:"wp/002"}];
  if(repair) {
    const parents=git(root,"rev-list","--parents","-n","1",code).split(" ");
    const identity=repairIdentity(parents,git(root,"rev-parse",code+"^{tree}"),git(root,"rev-parse",code+"^2^{tree}"),git(root,"show","-s","--format=%B",code));
    repairPolicy(root,identity.head);
    expected.push(identity);
  } else repairPolicy(root,code);
  const observed=await collectMergeReceipts(api,expected);
  const ref=await api.json<{object:{sha:string}}>("/git/ref/heads/main");
  emitFile("r1-main-readback.json",Buffer.from(JSON.stringify({expected:repair?code:FS24R1.base,actual:ref})+"\n"));
  if(ref.object.sha!==(repair?code:FS24R1.base))throw new Error("DiagnosticMainChanged");
  if(!observed.pass)throw new Error("MergeReceipt:"+observed.receipts.filter(x=>!x.pass).map(x=>x.label).join(","));
  emitFile("r1-diagnostic.json",Buffer.from(JSON.stringify({result:"pass",code,historicalMerge:FS24R1.base,source:SOURCE,repair,activation:false,dataCommits:0,dispatches:0})+"\n"));
}

export async function admittedCode(root:string,code:string,batch:string,api:GitHubTransport):Promise<void> {
  assertCommit(code);
  const run=await api.json<Run>("/actions/runs/"+batch);
  if(run.head_sha!==code||run.event!=="workflow_run"||run.head_branch!=="main"||run.run_attempt!==1||run.path!==".github/workflows/acceptance-wp002.yml")throw new Error("ControllerRunIdentity");
  const parents=git(root,"rev-list","--parents","-n","1",code).split(" ");
  if(parents.length!==3||parents[1]!==SOURCE||git(root,"rev-parse",code+"^{tree}")!==git(root,"rev-parse",parents[2]+"^{tree}"))throw new Error("MergeCheckpoint");
  const observed=inspectMergeReceipt(await api.mergeReceipt(12,"merge-history"),{number:12,merge:code,head:parents[2],branch:"wp/002"});
  emitFile("merge-history-observed.json",Buffer.from(JSON.stringify(observed)+"\n"));
  if(!observed.pass)throw new Error("MergeReceipt:"+Object.entries(observed.matches).filter(([,ok])=>!ok).map(([key])=>key).join(","));
  integrationPolicy(root,parents[2]);
  const msg=git(root,"show","-s","--format=%B",code);
  if(!msg.split("\n").includes("Fulcrum-Grant: FS24-B")||!msg.split("\n").includes("Fulcrum-Phase: integration-bootstrap"))throw new Error("MergeGrant");
}
export function activationIdentity(root:string,code:string) {
  assertCommit(code);
  const parts=git(root,"rev-list","--parents","-n","1",code).split(" ");
  if(parts.length!==3||parts[1]!==FS24C.base||git(root,"rev-parse",code+"^{tree}")!==git(root,"rev-parse",parts[2]+"^{tree}"))throw new Error("C-merge");
  successorPolicy(root,parts[2]);
  const message=git(root,"show","-s","--format=%B",code);
  for(const [key,value]of [["Grant","FS24-C"],["Phase","integration-bootstrap"]])if(message.split("\n").filter(x=>x.startsWith("Fulcrum-"+key+": ")).join("\n")!=="Fulcrum-"+key+": "+value)throw new Error("C-merge-trailer");
  const rows=message.split("\n").filter(x=>x.startsWith("Fulcrum-Integration-PR: "));
  if(rows.length!==1||!/^Fulcrum-Integration-PR: [1-9][0-9]*$/.test(rows[0]))throw new Error("C-merge-PR");
  const number=Number(rows[0].split(": ")[1]);if(!Number.isSafeInteger(number)||number<=13)throw new Error("C-old-PR");
  return {number,merge:code,head:parts[2],branch:"wp/002"};
}
export async function successorReceipts(root:string,code:string,api:GitHubTransport,merged:boolean) {
  const expected:ReceiptExpectation[]=[{number:12,merge:FS24R1.base,head:FS24R1.historicalHead,branch:"wp/002"},{number:13,merge:FS24C.base,head:FS24C.historicalCandidate,branch:"wp/002"}];
  if(git(root,"rev-list","--parents","-n","1",FS24R1.base)!==[FS24R1.base,SOURCE,FS24R1.historicalHead].join(" ")||git(root,"rev-list","--parents","-n","1",FS24C.base)!==[FS24C.base,FS24R1.base,FS24C.historicalCandidate].join(" "))throw new Error("C-history");
  if(merged)expected.push(activationIdentity(root,code));else successorPolicy(root,code);
  const labels=["merge-history","merge-repair","merge-activation"];
  const results=await Promise.allSettled(expected.map(async (x,i)=>inspectMergeReceipt(await api.mergeReceipt(x.number,labels[i]),x)));
  emitFile("c-merge-outcomes.json",Buffer.from(JSON.stringify(results)+"\n"));
  if(results.some(x=>x.status!=="fulfilled"||!x.value.pass))throw new Error("C-MergeReceipt");
}
export async function admittedSuccessor(root:string,code:string,batch:string,api:GitHubTransport):Promise<void> {
  activationIdentity(root,code);
  if(!/^[1-9][0-9]*$/.test(batch))throw new Error("C-batch");
  const run=await api.json<Run>("/actions/runs/"+batch);
  if(run.head_sha!==code||run.event!=="workflow_run"||run.head_branch!=="main"||run.run_attempt!==1||run.path!==".github/workflows/acceptance-wp002.yml")throw new Error("C-controller");
  await successorReceipts(root,code,api,true);
}
export function validateSuccessorInput(input:BatchInput,reindex:boolean):void {
  if(input.grant!=="FS24-C"||typeof input.requestId!=="string")throw new Error("C-input-grant");
  const {requestId,...body}=input;
  if(digest(JSON.stringify(body))!==requestId)throw new Error("C-request-digest");
  if(Object.keys(input).some(x=>!["grant","requestId","batch","code","producer","artifact","manifestHash","operation","cancelAfterPush"].includes(x)))throw new Error("C-input-extra");
  if(typeof input.cancelAfterPush!=="boolean")throw new Error("C-cancel-type");
  if(!reindex){validateBatchInput(input);return;}
  assertCommit(input.code);
  if(!/^[1-9][0-9]*$/.test(input.batch)||input.operation!=="reindex"||input.producer!=="left"||input.artifact!==0||input.manifestHash!=="none"||input.cancelAfterPush)throw new Error("C-reindex-input");
}
export function assertDataParent(actual:string,sha:string,previous:string):void {
  if(actual!==sha+" "+previous)throw new Error("C-data-parent");
}
export function assertReceiptCollision(message:string,hash:string,artifact:number):void {
  if(!message.split("\n").includes("Input-Manifest: "+hash)||!message.split("\n").includes("Artifact-Id: "+artifact))throw new Error("WriteIdCollision");
}
export function assertRemoteBlob(blob:{sha:string;encoding:string;size:number;content:string},expectedSha:string,content:string):void {
  const bytes=Buffer.from(blob.content.replace(/\s/g,""),"base64");
  if(blob.sha!==expectedSha||blob.encoding!=="base64"||blob.size!==bytes.length||!bytes.equals(Buffer.from(content)))throw new Error("RemoteContentReadbackMismatch");
}
export function successorChain(root:string,code:string,head:string,batch:string):string[] {
  git(root,"merge-base","--is-ancestor",code,head);
  const chain=git(root,"rev-list","--reverse",code+".."+head).split("\n").filter(Boolean);
  if(chain.length>9)throw new Error("C-data-cap");
  const seen=new Set<string>();let previous=code;
  for(const sha of chain) {
    assertDataParent(git(root,"rev-list","--parents","-n","1",sha),sha,previous);
    const lines=git(root,"show","-s","--format=%B",sha).split("\n");
    const field=(name:string)=>{const rows=lines.filter(x=>x.startsWith(name+": "));if(rows.length!==1)throw new Error("C-data-trailer");return rows[0].slice(name.length+2);};
    if(field("Fulcrum-Grant")!=="FS24-C"||field("FS24-C-Batch")!==batch)throw new Error("ExternalMainChange");
    const writeId=field("Write-Id"),op=writeId.slice(("FS24-C:"+batch+":").length);
    if(!writeId.startsWith("FS24-C:"+batch+":")||seen.has(writeId)||![...operationNames.filter(x=>x!=="invalid-state"),"reindex"].includes(op))throw new Error("C-data-write-id");seen.add(writeId);
    const producer=op.endsWith("right")?"right":"left",value=bundle(root,code,batch,producer);
    const operation=value.manifest.operations.find(x=>x.name===op);
    const paths=op==="reindex"?["pipeline/state.json"]:operation!.entries.map(x=>x.path);
    const actual=git(root,"diff","--name-only",previous,sha).split("\n").filter(Boolean);
    if(JSON.stringify([...actual].sort())!==JSON.stringify([...paths].sort())||JSON.stringify(JSON.parse(field("Write-Paths")))!==JSON.stringify(paths))throw new Error("C-data-paths");
    for(const path of paths)if(git(root,"ls-tree",sha,"--",path).split(" ")[0]!=="100644")throw new Error("C-data-mode");
    if(op!=="reindex") {
      if(field("Input-Manifest")!==digest(value.files["manifest.json"])||!/^\d+$/.test(field("Artifact-Id")))throw new Error("C-data-manifest");
      for(const entry of operation!.entries) {
        const before=contentAt(root,previous,entry.path)??"",after=contentAt(root,sha,entry.path);
        if(after!==(entry.mode==="append"?before:"")+value.files[entry.name])throw new Error("C-data-content");
      }
    } else if(sha!==head)throw new Error("C-index-not-final");
    previous=sha;
  }
  return chain;
}
function authEnv():NodeJS.ProcessEnv {
  const token=process.env.GH_TOKEN;if(!token)throw new Error("MissingGitToken");
  return {...process.env,GIT_TERMINAL_PROMPT:"0",GIT_CONFIG_COUNT:"1",GIT_CONFIG_KEY_0:"http.https://github.com/.extraheader",GIT_CONFIG_VALUE_0:"AUTHORIZATION: basic "+Buffer.from("x-access-token:"+token).toString("base64"),GIT_AUTHOR_NAME:"github-actions[bot]",GIT_AUTHOR_EMAIL:"41898282+github-actions[bot]@users.noreply.github.com",GIT_COMMITTER_NAME:"github-actions[bot]",GIT_COMMITTER_EMAIL:"41898282+github-actions[bot]@users.noreply.github.com"};
}
function contentAt(root:string,commit:string,path:string):string|null {
  const exists=spawnSync("git",["-C",root,"cat-file","-e",commit+":"+path],{encoding:"utf8"});
  if(exists.status!==0)return null;
  return execFileSync("git",["-C",root,"show",commit+":"+path],{encoding:"utf8"});
}
function receipt(root:string,commit:string,writeId:string,duplicate:boolean):Receipt {
  const text=git(root,"show","-s","--format=%B",commit),paths=JSON.parse(/^Write-Paths: (.+)$/m.exec(text)![1]) as string[];
  return {writeId,commit,parent:git(root,"rev-parse",commit+"^1"),tree:git(root,"rev-parse",commit+"^{tree}"),duplicate,paths:Object.fromEntries(paths.map(path=>{
    const content=contentAt(root,commit,path);if(content===null)throw new Error("ReceiptMissingPath");
    return [path,{blob:git(root,"rev-parse",commit+":"+path),sha256:digest(content),bytes:Buffer.byteLength(content)}];
  }))};
}
export async function writeBatch(root:string,input:BatchInput,api:GitHubTransport,reindex=false):Promise<Receipt> {
  validateSuccessorInput(input,reindex);
  if(!reindex)validateBatchInput(input);
  else if(input.operation!=="reindex"||process.env.GITHUB_WORKFLOW!=="WP-002 Reindex")throw new Error("OnlyReindexMayWriteIndex");
  await admittedSuccessor(root,input.code,input.batch,api);
  const writeId="FS24-C:"+input.batch+":"+input.operation;
  const generated=bundle(root,input.code,input.batch,input.producer);
  const {operations,...expected}=generated.manifest;
  if(!reindex&&digest(generated.files["manifest.json"])!==input.manifestHash)throw new Error("ApprovedProducerManifestMismatch");
  const check=schemaChecker(readdirSync(join(root,"engine/contracts")).filter(x=>x.endsWith(".schema.json")).map(x=>JSON.parse(readFileSync(join(root,"engine/contracts",x),"utf8"))));
  const ids=[bundle(root,input.code,input.batch,"left").manifest.operations[0].episodeId,bundle(root,input.code,input.batch,"right").manifest.operations[0].episodeId];
  const allowed=ids.flatMap(id=>["episodes/"+id+"/state.json","episodes/"+id+"/00-brief.json"]).concat(["pipeline/runs.jsonl","pipeline/state.json"]);
  let received:Awaited<ReturnType<GitHubTransport["artifact"]>>|undefined;
  for(let attempt=1;attempt<=5;attempt++) {
    execFileSync("git",["-C",root,"fetch","--no-tags","origin","main"],{env:authEnv(),stdio:["ignore","pipe","pipe"]});
    const head=git(root,"rev-parse","FETCH_HEAD");git(root,"merge-base","--is-ancestor",input.code,head);
    const chain=successorChain(root,input.code,head,input.batch);
    if(chain.length>9)throw new Error("DataCommitCap");
    for(const sha of chain) {
      const text=git(root,"show","-s","--format=%B",sha);
      if(!text.split("\n").includes("FS24-C-Batch: "+input.batch))throw new Error("ExternalMainChange");
      if(git(root,"diff-tree","--no-commit-id","--name-only","-r",sha).split("\n").some(p=>!allowed.includes(p)))throw new Error("DataScopeHistory");
      if(text.split("\n").includes("Write-Id: "+writeId)) {
        if(!reindex)assertReceiptCollision(text,input.manifestHash,input.artifact);
        const existing=receipt(root,sha,writeId,true);
        emitFile("write-receipt.json",Buffer.from(JSON.stringify({input,result:existing})+"\n"));return existing;
      }
    }
    if(chain.length>=9)throw new Error("DataCommitCap");
    let updates:Record<string,string>;
    if(reindex) {
      const states=ids.map(id=>JSON.parse(contentAt(root,head,"episodes/"+id+"/state.json")!));
      updates={"pipeline/state.json":JSON.stringify(buildIndex(states,head,new Date().toISOString(),check),null,2)+"\n"};
    } else {
      if(!received)received=await api.artifact(input.artifact,expected,input.manifestHash,join(process.env.TASK_ROOT!,"writer-artifact"));
      const op=received.manifest.operations.find(x=>x.name===input.operation);if(!op)throw new Error("OperationMissing");
      const entries=op.entries.map(x=>({path:x.path,schema:x.schema,mode:x.mode,content:received!.files[x.name]}));
      if(entries.some(x=>!allowed.includes(x.path)||x.path==="pipeline/state.json"))throw new Error("WriteScope");
      updates=applyEntries(Object.fromEntries(entries.map(x=>[x.path,contentAt(root,head,x.path)])),entries,input.code,writeId,check);
    }
    const directory=mkdtempSync(join(tmpdir(),"fs24b-index-"));
    try {
      const env={...authEnv(),GIT_INDEX_FILE:join(directory,"index")};
      const run=(args:string[],data?:string)=>execFileSync("git",["-C",root,...args],{env,input:data,encoding:"utf8"}).trimEnd();
      run(["read-tree",head]);
      for(const [path,content]of Object.entries(updates)){const blob=run(["hash-object","-w","--stdin"],content);run(["update-index","--add","--cacheinfo","100644,"+blob+","+path]);}
      const tree=run(["write-tree"]);
      const message="FS24-C synthetic integration write\n\nFulcrum-Grant: FS24-C\nFS24-C-Batch: "+input.batch+"\nWrite-Id: "+writeId+"\nInput-Manifest: "+input.manifestHash+"\nArtifact-Id: "+input.artifact+"\nWrite-Paths: "+JSON.stringify(Object.keys(updates))+"\n";
      const commit=run(["commit-tree",tree,"-p",head],message);
      // Validate the complete candidate tree, with owner-approved frozen mappings, before push.
      const source=new GitSource(root,commit),v=new Validator(source,new Schemas(source),ids.map(episodeId=>({episodeId,commit:SOURCE}))).run();
      if(v.sourceValidation!=="pass")throw new Error("CandidateValidation:"+JSON.stringify(v.issues));
      const push=spawnSync("git",["-C",root,"push","origin",commit+":refs/heads/main"],{env,encoding:"utf8"});
      if(push.status!==0) {
        if(/403|forbidden|authentication|permission denied/i.test(push.stderr))throw new Error("PushAuthorizationRejectedNoRetry");
        if(!/non-fast-forward|fetch first|failed to update ref/i.test(push.stderr))throw new Error("PushFailedNoRetry");
        if(attempt===5)throw new Error("CASExhausted");
        await new Promise(resolve=>setTimeout(resolve,attempt*1000));continue;
      }
      const remote=await api.json<{sha:string;tree:{sha:string};parents:{sha:string}[]}>("/git/commits/"+commit);
      if(remote.sha!==commit||remote.tree.sha!==tree||remote.parents.length!==1||remote.parents[0].sha!==head)throw new Error("CommitReceiptMismatch");
      const ref=await api.json<{object:{sha:string}}>("/git/ref/heads/main");
      if(ref.object.sha!==commit)throw new Error("MainReadbackMismatch");
      const result=receipt(root,commit,writeId,false);
      for(const [path,content]of Object.entries(updates)) {
        const blob=await api.json<{sha:string;encoding:string;size:number;content:string}>("/git/blobs/"+result.paths[path].blob);
        assertRemoteBlob(blob,result.paths[path].blob,content);
        emitFile("remote-"+blob.sha+".json",Buffer.from(content));
      }
      emitFile("write-receipt.json",Buffer.from(JSON.stringify({input,result,validation:v})+"\n"));
      return result;
    } finally {rmSync(directory,{recursive:true,force:true});}
  }
  throw new Error("CASExhausted");
}
export async function writeBatchD(root:string,input:DBatchInput,api:GitHubTransport,reindex=false):Promise<Receipt> {
  validateDInput(input,reindex);
  if(!reindex)validateBatchInput({...input,grant:"FS24-C"});
  else if(input.operation!=="reindex"||process.env.GITHUB_WORKFLOW!=="WP-002 Reindex")throw new Error("OnlyReindexMayWriteIndex");
  await admittedD(root,input,api);
  await ledgerD(root,api,"writer-before-effects",6,30);
  const writeId="FS24-D:"+input.batch+":"+input.operation;
  const generated=bundleD(root,input.origin,input.batch,input.producer,input.producerRun,input.producerCode);
  const {operations,...expected}=generated.manifest;
  if(!reindex&&digest(generated.files["manifest.json"])!==input.manifestHash)throw new Error("ApprovedProducerManifestMismatch");
  if(operationDigest(generated,input.operation)!==input.payloadDigest)throw new Error("D-PayloadDigest");
  const check=schemaChecker(readdirSync(join(root,"engine/contracts")).filter(x=>x.endsWith(".schema.json")).map(x=>JSON.parse(readFileSync(join(root,"engine/contracts",x),"utf8"))));
  const ids=[bundleD(root,input.origin,input.batch,"left").manifest.operations[0].episodeId,bundleD(root,input.origin,input.batch,"right").manifest.operations[0].episodeId];
  const allowed=ids.flatMap(id=>["episodes/"+id+"/state.json","episodes/"+id+"/00-brief.json"]).concat(["pipeline/runs.jsonl","pipeline/state.json"]);
  let received:Awaited<ReturnType<GitHubTransport["artifact"]>>|undefined;
  for(let attempt=1;attempt<=5;attempt++) {
    fetchMainReadOnly(root);
    const head=git(root,"rev-parse","FETCH_HEAD");git(root,"merge-base","--is-ancestor",input.code,head);
    const chain=dataChainD(root,input.code,head,input.batch,input.origin);
    if(chain.length>9)throw new Error("DataCommitCap");
    for(const sha of chain) {
      const text=git(root,"show","-s","--format=%B",sha);
      if(!text.split("\n").includes("FS24-D-Batch: "+input.batch))throw new Error("ExternalMainChange");
      if(git(root,"diff-tree","--no-commit-id","--name-only","-r",sha).split("\n").some(p=>!allowed.includes(p)))throw new Error("DataScopeHistory");
      if(text.split("\n").includes("Write-Id: "+writeId)) {
        if(!text.split("\n").includes("Input-Payload: "+input.payloadDigest))throw new Error("WriteIdCollision");
        const existing=receipt(root,sha,writeId,true);
        emitFile("write-receipt.json",Buffer.from(JSON.stringify({input,result:existing})+"\n"));return existing;
      }
    }
    if(chain.length>=9)throw new Error("DataCommitCap");
    let updates:Record<string,string>;
    if(reindex) {
      const statePaths=git(root,"ls-tree","-r","--name-only",head,"--","episodes").split("\n").filter(x=>x.endsWith("/state.json"));
      if(statePaths.length!==2||statePaths.some(x=>!ids.some(id=>x==="episodes/"+id+"/state.json")))throw new Error("IndexStateInventory");
      const states=statePaths.map(path=>JSON.parse(contentAt(root,head,path)!));
      updates={"pipeline/state.json":JSON.stringify(buildIndex(states,head,new Date().toISOString(),check),null,2)+"\n"};
    } else {
      if(!received)received=await api.artifact(input.artifact,expected,input.manifestHash,join(process.env.TASK_ROOT!,"writer-artifact"));
      const op=received.manifest.operations.find(x=>x.name===input.operation);if(!op)throw new Error("OperationMissing");
      const entries=op.entries.map(x=>({path:x.path,schema:x.schema,mode:x.mode,content:received!.files[x.name]}));
      if(entries.some(x=>!allowed.includes(x.path)||x.path==="pipeline/state.json"))throw new Error("WriteScope");
      emitFile("read-before-"+input.operation+".json",Buffer.from(JSON.stringify({head,operation:input.operation,values:Object.fromEntries(entries.map(x=>[x.path,contentAt(root,head,x.path)]))})+"\n"));
      updates=applyEntries(Object.fromEntries(entries.map(x=>[x.path,contentAt(root,head,x.path)])),entries,input.code,writeId,check);
    }
    const directory=mkdtempSync(join(tmpdir(),"fs24b-index-"));
    try {
      const env={...gitEnvironment(root,true),GIT_INDEX_FILE:join(directory,"index")};
      const run=(args:string[],data?:string)=>execFileSync("git",["-C",root,...args],{env,input:data,encoding:"utf8"}).trimEnd();
      run(["read-tree",head]);
      for(const [path,content]of Object.entries(updates)){const blob=run(["hash-object","-w","--stdin"],content);run(["update-index","--add","--cacheinfo","100644,"+blob+","+path]);}
      const tree=run(["write-tree"]);
      const message="FS24-D synthetic integration write\n\nFulcrum-Grant: FS24-D\nFulcrum-Phase: data\nFS24-D-Batch: "+input.batch+"\nWrite-Id: "+writeId+"\nPayload-Origin: "+input.origin+"\nInput-Payload: "+input.payloadDigest+"\nInput-Manifest: "+input.manifestHash+"\nArtifact-Id: "+input.artifact+"\nWrite-Paths: "+JSON.stringify(Object.keys(updates).sort())+"\n";
      const commit=run(["commit-tree",tree,"-p",head],message);
      // Validate the complete candidate tree, with owner-approved frozen mappings, before push.
      const source=new GitSource(root,commit),v=new Validator(source,new Schemas(source),ids.map(episodeId=>({episodeId,commit:SOURCE}))).run();
      if(v.sourceValidation!=="pass")throw new Error("CandidateValidation:"+JSON.stringify(v.issues));
      emitFile("push-"+attempt+"-intent.json",Buffer.from(JSON.stringify({commit,parent:head,tree,writeId,requestId:input.requestId})+"\n"));
      const push=spawnSync("git",["-C",root,"push","origin",commit+":refs/heads/main"],{env,encoding:"utf8"});
      emitFile("push-"+attempt+"-result.json",Buffer.from(JSON.stringify({commit,status:push.status,stdout:redactGit(push.stdout??""),stderr:redactGit(push.stderr??"")})+"\n"));
      if(push.status!==0) {
        if(/403|forbidden|authentication|permission denied/i.test(push.stderr))throw new Error("PushAuthorizationRejectedNoRetry");
        if(!/non-fast-forward|fetch first|failed to update ref/i.test(push.stderr))throw new Error("PushFailedNoRetry");
        if(attempt===5)throw new Error("CASExhausted");
        await new Promise(resolve=>setTimeout(resolve,attempt*1000));continue;
      }
      const remote=await api.json<{sha:string;tree:{sha:string};parents:{sha:string}[]}>("/git/commits/"+commit);
      if(remote.sha!==commit||remote.tree.sha!==tree||remote.parents.length!==1||remote.parents[0].sha!==head)throw new Error("CommitReceiptMismatch");
      const ref=await api.json<{object:{sha:string}}>("/git/ref/heads/main");
      if(ref.object.sha!==commit)throw new Error("MainReadbackMismatch");
      const result=receipt(root,commit,writeId,false);
      for(const [path,content]of Object.entries(updates)) {
        const blob=await api.json<{sha:string;encoding:string;size:number;content:string}>("/git/blobs/"+result.paths[path].blob);
        assertRemoteBlob(blob,result.paths[path].blob,content);
        emitFile("remote-"+blob.sha+".json",Buffer.from(content));
      }
      emitFile("write-receipt.json",Buffer.from(JSON.stringify({input,result,validation:v})+"\n"));
      return result;
    } finally {rmSync(directory,{recursive:true,force:true});}
  }
  throw new Error("CASExhausted");
}

async function main(){
  if(process.env.GITHUB_REPOSITORY!==REPOSITORY||process.env.GITHUB_RUN_ATTEMPT!=="1"||!["FS24-C","FS24-D"].includes(process.env.FS_GRANT??""))throw new Error("RuntimeIdentity");
  const input=JSON.parse(process.env.FS24_INPUT!) as BatchInput,api=new GitHubTransport(process.env.GH_TOKEN!);
  const result=process.env.FS_GRANT==="FS24-D"?await writeBatchD(process.env.GITHUB_WORKSPACE!,input as unknown as DBatchInput,api,process.argv[2]==="reindex"):await writeBatch(process.env.GITHUB_WORKSPACE!,input,api,process.argv[2]==="reindex");
  console.log("FS24B_RECEIPT\t"+JSON.stringify(result));
  if(input.operation==="side-effect"&&input.cancelAfterPush&&!result.duplicate){await (process.env.FS_GRANT==="FS24-D"?api.cancelD(process.env.GITHUB_RUN_ID!):api.cancelC(process.env.GITHUB_RUN_ID!));setInterval(()=>console.log("FS24B_CANCEL_AWAIT_PLATFORM"),10000);}
}
if(require.main===module)main().catch(async error=>{
  emitFile("write-error.json",Buffer.from(JSON.stringify({input:JSON.parse(process.env.FS24_INPUT??"{}"),error:redactGit(String(error))})+"\n"));
  console.error("FS24B_WRITE_ERROR\t"+redactGit(String(error)));process.exitCode=1;
});
