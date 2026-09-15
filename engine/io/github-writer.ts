import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { schemaChecker, validateCommand, stateRecord, isStatePath, assertCommit } from "./repo-store";
import { buildIndex } from "./reindex";
import { GitSource, Schemas, Validator } from "../../scripts/validate";
import { integrationPolicy, repairPolicy, FS24R1 } from "../../scripts/guardrails/index";
import { GitHubTransport, Manifest, SOURCE, REPOSITORY, digest, emitFile, Run } from "./github-transport";
import { bundle, git } from "./wp002-integration";

export interface BatchInput { batch: string; code: string; producer: "left" | "right"; artifact: number; manifestHash: string; operation: string; cancelAfterPush?: boolean; }
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
  if(!reindex)validateBatchInput(input);
  else if(input.operation!=="reindex"||process.env.GITHUB_WORKFLOW!=="WP-002 Reindex")throw new Error("OnlyReindexMayWriteIndex");
  await admittedCode(root,input.code,input.batch,api);
  const writeId="FS24-B:"+input.batch+":"+input.operation;
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
    const chain=git(root,"rev-list","--reverse",input.code+".."+head).split("\n").filter(Boolean);
    if(chain.length>9)throw new Error("DataCommitCap");
    for(const sha of chain) {
      const text=git(root,"show","-s","--format=%B",sha);
      if(!text.split("\n").includes("FS24-B-Batch: "+input.batch))throw new Error("ExternalMainChange");
      if(git(root,"diff-tree","--no-commit-id","--name-only","-r",sha).split("\n").some(p=>!allowed.includes(p)))throw new Error("DataScopeHistory");
      if(text.split("\n").includes("Write-Id: "+writeId)) {
        if(!reindex&&(!text.split("\n").includes("Input-Manifest: "+input.manifestHash)||!text.split("\n").includes("Artifact-Id: "+input.artifact)))throw new Error("WriteIdCollision");
        return receipt(root,sha,writeId,true);
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
      const message="FS24-B synthetic integration write\n\nFulcrum-Grant: FS24-B\nFS24-B-Batch: "+input.batch+"\nWrite-Id: "+writeId+"\nInput-Manifest: "+input.manifestHash+"\nArtifact-Id: "+input.artifact+"\nWrite-Paths: "+JSON.stringify(Object.keys(updates))+"\n";
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
      for(const [path,content]of Object.entries(updates))if(result.paths[path].sha256!==digest(content))throw new Error("ContentReadbackMismatch");
      emitFile("write-receipt.json",Buffer.from(JSON.stringify({input,result,validation:v})+"\n"));
      return result;
    } finally {rmSync(directory,{recursive:true,force:true});}
  }
  throw new Error("CASExhausted");
}
async function main(){
  if(process.env.GITHUB_REPOSITORY!==REPOSITORY||process.env.GITHUB_RUN_ATTEMPT!=="1")throw new Error("RuntimeIdentity");
  const input=JSON.parse(process.env.FS24_INPUT!) as BatchInput,api=new GitHubTransport(process.env.GH_TOKEN!);
  const result=await writeBatch(process.env.GITHUB_WORKSPACE!,input,api,process.argv[2]==="reindex");
  console.log("FS24B_RECEIPT\t"+JSON.stringify(result));
  if(input.operation==="side-effect"&&input.cancelAfterPush&&!result.duplicate){await api.cancelOwnRun(process.env.GITHUB_RUN_ID!);setInterval(()=>console.log("FS24B_CANCEL_AWAIT_PLATFORM"),10000);}
}
if(require.main===module)main().catch(error=>{console.error("FS24B_WRITE_ERROR\t"+String(error));process.exitCode=1;});
