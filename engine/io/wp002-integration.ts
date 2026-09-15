import { gunzipSync } from "node:zlib";
import { closureLineage, FS24D, DLineage } from "../../scripts/guardrails/index";
import { fetchMainReadOnly, redactGit } from "./github-git";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { decode } from "../../scripts/ci-report";
import { GitSource, Schemas, frozen } from "../../scripts/validate";
import { GitHubTransport, Manifest, Operation, Entry, SOURCE, REPOSITORY, digest, emitFile, Run, Job } from "./github-transport";

export const git=(root:string,...args:string[])=>execFileSync("git",["-C",root,...args],{encoding:"utf8"}).trimEnd();
export function bundle(root:string,head:string,run:string,producer:string):{manifest:Manifest;files:Record<string,string>} {
  if(!["left","right","foundation"].includes(producer)) throw new Error("ProducerScope");
  const side=producer==="right"?"right":"left";
  const paths=git(root,"ls-tree","-r","--name-only",SOURCE,"--","channels").split("\n").filter(x=>x.endsWith("/channel.json"));
  if(paths.length!==1) throw new Error("SingleChannelSourceRequired");
  const slug=paths[0].split("/")[1],episodeId=slug+"/2026-09-fs24-"+side;
  const source=new GitSource(root,SOURCE),schemas=new Schemas(source),ctx=frozen(source,schemas,episodeId,SOURCE);
  const stamp=new Date(git(root,"show","-s","--format=%cI",head)).toISOString();
  const limits=ctx.format.limits as Record<string,unknown>;
  const brief={episodeId,channel:slug,topic:"FS24 synthetic integration fixture",thesis:"FS24 synthetic test fixture; no production claim or publication approval is represented.",
    thesisId:String(ctx.channel.genre)+"/TB-001",thesisArchetype:(ctx.format.thesisArchetypes as string[])[0],pillar:(ctx.channel.pillars as string[])[0],audience:{ageRange:"fixture",decisionContext:"Synthetic test context only",priorBelief:"Synthetic test assumption only"},targetDurationMin:(limits.targetDurationMin as number[])[0],proposedBy:"machine",approvedBy:"human",workingTitle:"FS24 synthetic fixture",noveltyCheck:{videosChecked:limits.noveltyVideosCheckedMin,contradictingVideos:0,verdict:"novel",checkedBy:"machine"},versions:ctx.versions};
  const state={episodeId,channel:slug,currentStage:"integration-fixture",stageStatus:"pending",updatedAt:stamp,spendUsd:0,versions:ctx.versions,revision:1};
  const files:Record<string,string>={},operations:Operation[]=[];
  const entry=(name:string,path:string,value:unknown,schema:string):Entry=>{
    const content=JSON.stringify(value)+"\n";files[name+".json"]=content;
    return {name:name+".json",path,schema,mode:"replace",bytes:Buffer.byteLength(content),sha256:digest(content)};
  };
  const prefix="episodes/"+episodeId+"/";
  operations.push({name:"initial-"+side,episodeId,entries:[entry("initial-brief",prefix+"00-brief.json",brief,"brief.schema.json"),entry("initial-state",prefix+"state.json",state,"episode-state.schema.json")]});
  if(side==="left") {
    operations.push({name:"update-one",episodeId,entries:[entry("update-one",prefix+"state.json",{...state,revision:2},"episode-state.schema.json")]});
    operations.push({name:"update-two",episodeId,entries:[entry("update-two",prefix+"state.json",{...state,revision:3},"episode-state.schema.json")]});
    operations.push({name:"pending",episodeId,entries:[entry("pending",prefix+"state.json",{...state,revision:4,pendingSideEffects:[{kind:"fixture",writeId:"FS24-B:"+run+":side-effect",startedAt:stamp}]},"episode-state.schema.json")]});
    operations.push({name:"side-effect",episodeId,entries:[entry("side-effect",prefix+"00-brief.json",{...brief,workingTitle:"FS24 synthetic side-effect fixture"},"brief.schema.json")]});
    operations.push({name:"invalid-state",episodeId,entries:[entry("invalid-state",prefix+"state.json",{...state,revision:5,stageStatus:"invalid"},"episode-state.schema.json")]});
  }
  const runSchema=JSON.parse(source.text("engine/contracts/run-log.schema.json")) as {properties:{durationMs:{minimum:number}}};
  const records=Array.from({length:25},(_,i)=>JSON.stringify({ts:stamp,runId:"FS24-B:"+run+":"+side+":"+i,episodeId,stage:"integration-fixture",attempt:1,verdict:"pass",durationMs:runSchema.properties.durationMs.minimum,costUsd:0})).join("\n")+"\n";
  files["log.jsonl"]=records;operations.push({name:"logs-"+side,episodeId,entries:[{name:"log.jsonl",path:"pipeline/runs.jsonl",schema:"run-log.schema.json",mode:"append",bytes:Buffer.byteLength(records),sha256:digest(records)}]});
  const manifest:Manifest={grant:"FS24-B",repository:REPOSITORY,run,attempt:"1",head,tree:git(root,"rev-parse",head+"^{tree}"),producer,artifactName:"FS24-B-"+run+"-"+producer+"-"+head,operations};
  files["manifest.json"]=JSON.stringify(manifest)+"\n";
  return {manifest,files};
}

export function bundleC(root:string,head:string,run:string,producer:string):{manifest:Manifest;files:Record<string,string>} {
  const original=bundle(root,head,run,producer);
  const files=Object.fromEntries(Object.entries(original.files).map(([name,value])=>[name,value.replaceAll("FS24-B","FS24-C")]));
  const manifest=JSON.parse(files["manifest.json"]) as Manifest;
  for(const operation of manifest.operations)for(const entry of operation.entries){entry.bytes=Buffer.byteLength(files[entry.name]);entry.sha256=digest(files[entry.name]);}
  files["manifest.json"]=JSON.stringify(manifest)+"\n";
  return {manifest,files};
}
export function bundleD(root:string,origin:string,batch:string,producer:string,producerRun=batch,producerCode=origin):{manifest:Manifest;files:Record<string,string>} {
  const value=bundle(root,origin,batch,producer);
  for(const name of Object.keys(value.files))value.files[name]=value.files[name].replaceAll("FS24-B","FS24-D");
  const manifest=JSON.parse(value.files["manifest.json"]) as Manifest;
  manifest.grant="FS24-D";manifest.batch=batch;manifest.origin=origin;manifest.run=producerRun;manifest.head=producerCode;manifest.tree=git(root,"rev-parse",producerCode+"^{tree}");manifest.artifactName="FS24-D-"+producerRun+"-"+producer+"-"+producerCode;
  for(const operation of manifest.operations)for(const entry of operation.entries){entry.bytes=Buffer.byteLength(value.files[entry.name]);entry.sha256=digest(value.files[entry.name]);}
  value.files["manifest.json"]=JSON.stringify(manifest)+"\n";return {manifest,files:value.files};
}
export function operationDigest(value:{manifest:Manifest},operation:string):string {
  if(operation==="reindex")return digest("FS24-D:reindex");
  const item=value.manifest.operations.find(x=>x.name===operation);if(!item)throw new Error("OperationMissing");return digest(JSON.stringify(item));
}
const BASELINE_RUN_IDS = new Set([34734791059, 34745712444, 34749424709, 34749424828, 34759038401, 34759038403, 34790828977, 34790828987, 34795793642, 34795793655, 34798068618, 34798068682, 34808858643, 34808858709, 34863629511, 34863629601, 34864087242, 34864087333, 34865172614, 34865172653, 34870077092, 34870085137, 34870085388, 34870085788, 34870940791, 34870944912, 34870945056, 34870945083, 34909664874, 34909667551, 34909667555, 34909667630, 34910005926, 34912383147, 34912383152, 34912433593, 34912433645, 34912820884, 34912820933, 34912823869, 34912823888, 34912823895, 34912823984, 34914967307, 34914967331, 34914970395, 34914970402, 34914970410, 34914970412, 34915303539, 34915303620, 34915305780, 34915305795, 34915305817, 34915305857, 34915744253, 34915744275, 34915746751, 34915746761, 34915746782, 34915746797, 34916588767, 34916588850, 34916590974, 34916590992, 34916591007, 34916591042, 34917008266, 34917114566, 34935147662, 34935147664, 34935527327, 34935527465, 34935591875, 34935591900, 34936135089, 34936135252, 34936138841, 34936138853, 34936138877, 34936138932, 34949189116, 34949189178, 34949192768, 34949192808, 34949192835, 34949192872, 34949738566, 34949898351]);

export function producerOverlap(jobs:Job[]):boolean {
  const pair=["producer-left","producer-right"].map(name=>jobs.filter(x=>x.name===name));
  if(pair.some(x=>x.length!==1||x[0].conclusion!=="success"))return false;
  const intervals=pair.map(([x])=>[Date.parse(x.started_at??""),Date.parse(x.completed_at??"")]);
  return intervals.every(x=>x.every(Number.isFinite)&&x[0]<x[1])&&Math.max(...intervals.map(x=>x[0]))<Math.min(...intervals.map(x=>x[1]));
}
export function assertFinalJobEvidence(job:Job,text:string,files:Record<string,Buffer>):void {
  if(!text.includes("FS23_FINAL_REPORT_CLEANUP=pass;job="+job.name)||!job.steps?.some(x=>x.name==="Remove final report data"&&x.conclusion==="success"))throw new Error("FinalCICleanup");
  for(const name of ["preflight.json","runtime.json","preservation.json","cleanup.json","job-summary.json","commands.json"])if(!files[name])throw new Error("FinalCIEvidenceMissing:"+name);
  const commands=JSON.parse(files["commands.json"].toString());
  if(JSON.parse(files["job-summary.json"].toString()).result!=="success"||!Array.isArray(commands)||!commands.length||commands.some((x:{status:number})=>x.status!==0))throw new Error("FinalCICommandEvidence");
  if(JSON.parse(files["preflight.json"].toString()).result!=="pass"||JSON.parse(files["preservation.json"].toString()).result!=="pass"||JSON.parse(files["cleanup.json"].toString()).executionDataRemoved!==true||JSON.parse(files["runtime.json"].toString()).archiveChecksum!=="pass")throw new Error("FinalCIStaticEvidence");
}

export interface DControl {grant:"FS24-D";code:string;expectedMain:string;batch:string;origin:string;resumeOf:string;recoveryOrdinal:number;journalHash:string;requestId:string;}
export const D_STEPS=["initial-left","initial-right","update-one","update-two","duplicate-initial","pending","side-effect","replay-side-effect","invalid-state","logs-left","logs-right","reindex"] as const;
export function validateDControl(input:DControl):void {
  const {requestId,...body}=input;
  if(Object.keys(input).sort().join(",")!==["grant","code","expectedMain","batch","origin","resumeOf","recoveryOrdinal","journalHash","requestId"].sort().join(",")||input.grant!=="FS24-D"||digest(JSON.stringify(body))!==requestId)throw new Error("D-ControlDigest");
  for(const sha of [input.code,input.expectedMain,input.origin])if(!/^[a-f0-9]{40}$/.test(sha))throw new Error("D-ControlCommit");
  if(!Number.isSafeInteger(input.recoveryOrdinal)||input.recoveryOrdinal<0||input.recoveryOrdinal>2)throw new Error("D-ControlOrdinal");
  if(input.recoveryOrdinal===0){if(input.batch!=="new"||input.resumeOf!=="0"||input.journalHash!=="none"||input.origin!==input.code)throw new Error("D-NewBatch");}
  else if(!/^[1-9][0-9]*$/.test(input.batch)||!/^[1-9][0-9]*$/.test(input.resumeOf)||!/^[a-f0-9]{64}$/.test(input.journalHash))throw new Error("D-ResumeIdentity");
}
export interface DFrame {name:string;bytes:Buffer;sha256:string;}
export function decodeDFrames(log:string,id:{run:string;head:string;job:string},allowCutTail=false):DFrame[] {
  const result:DFrame[]=[];let current:{name:string;bytes:number;sha256:string}|undefined,encoded="",sequence=0;
  for(const raw of log.split("\n")) {
    const line=raw.replace(/^\uFEFF/,"").replace(/^\d{4}-\d\d-\d\dT[^ ]+ /,"").replace(/\r$/,"");
    if(line.startsWith("FS24B_FILE\t")) {
      if(current)throw new Error("D-FrameNested");const value=JSON.parse(line.slice(11));
      if(value.grant!=="FS24-D"||value.run!==id.run||value.attempt!=="1"||value.head!==id.head||value.job!==id.job||!/^[A-Za-z0-9_.-]+$/.test(value.name)||!Number.isSafeInteger(value.bytes)||value.bytes<0||value.bytes>64*1024*1024||!/^[a-f0-9]{64}$/.test(value.sha256))throw new Error("D-FrameIdentity");
      current=value;encoded="";sequence=0;
    } else if(line.startsWith("FS24B_DATA\t")) {
      const parts=line.split("\t");if(!current||parts.length!==3||Number(parts[1])!==++sequence||!/^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(parts[2]))throw new Error("D-FrameChunk");encoded+=parts[2];
      if(encoded.length>Math.ceil(current.bytes/3)*4)throw new Error("D-FrameSize");
    } else if(line.startsWith("FS24B_END\t")) {
      if(!current||line.slice(10)!==current.name)throw new Error("D-FrameEnd");const bytes=Buffer.from(encoded,"base64");
      if(bytes.length!==current.bytes||digest(bytes)!==current.sha256)throw new Error("D-FrameHash");result.push({name:current.name,bytes,sha256:current.sha256});current=undefined;
    }
  }
  if(current&&!allowCutTail)throw new Error("D-FrameIncomplete");return result;
}
function oneDFrame(frames:DFrame[],name:string):Buffer {const found=frames.filter(x=>x.name===name);if(found.length!==1)throw new Error("D-EvidenceExactlyOne:"+name);return found[0].bytes;}
export function dRawReceipt(frames:DFrame[],label:string):{metadata:Record<string,unknown>;raw:Buffer} {
  const metadata=JSON.parse(oneDFrame(frames,label+"-metadata.json").toString()) as Record<string,unknown>;
  const raw=metadata.rawEncoding==="gzip"?gunzipSync(oneDFrame(frames,label+"-raw.json.gz"),{maxOutputLength:1024*1024}):oneDFrame(frames,label+"-raw.json");
  if(metadata.capped!==false||metadata.bytes!==raw.length||metadata.sha256!==digest(raw))throw new Error("D-RawMetadata");return {metadata,raw};
}
export interface DRunRecord {run:Run;jobs:Job[];}
export function countDRuns(records:DRunRecord[],reserveRuns=0,reserveJobs=0) {
  let active=0,jobCount=0,skipped=0;
  for(const {run,jobs} of records) {
    if(run.run_attempt!==1)throw new Error("D-RunAttempt");
    if(run.conclusion==="skipped"){skipped++;continue;}
    active++;const graph:Record<string,number>={".github/workflows/ci.yml":4,".github/workflows/acceptance-wp002.yml":6,".github/workflows/commit-artifacts.yml":2,".github/workflows/reindex.yml":1};
    const declared=graph[run.path];if(!declared)throw new Error("D-ActiveWorkflow");jobCount+=run.status==="completed"?jobs.length:Math.max(jobs.length,declared);
  }
  if(active+reserveRuns>72||jobCount+reserveJobs>288||skipped>36)throw new Error("D-GrantCapacity");return {active,jobCount,skipped,reserveRuns,reserveJobs};
}
export async function ledgerD(root:string,api:GitHubTransport,label:string,reserveRuns=0,reserveJobs=0):Promise<DRunRecord[]> {
  const all=await api.page<Run>("/actions/runs","workflow_runs"),byId=new Map(all.map(x=>[String(x.id),x]));
  for(const [id,expected] of Object.entries(D_BASELINE)){const actual=byId.get(id);if(!actual||Object.entries(expected).some(([k,v])=>(actual as unknown as Record<string,unknown>)[k]!==v))throw new Error("D-BaselineLedger:"+id);}
  const current=all.filter(x=>!Object.hasOwn(D_BASELINE,String(x.id))),records:DRunRecord[]=[];
  for(const run of current) {
    if(!["wp/002","main"].includes(run.head_branch)||!run.repository||run.repository.full_name!==REPOSITORY||run.head_repository?.full_name!==REPOSITORY)throw new Error("D-RunRepository");
    const lineage=closureLineage(root,run.head_sha);
    if(run.head_branch==="main"&&lineage.unmerged.length)throw new Error("D-RunProvenance");
    records.push({run,jobs:await api.page<Job>("/actions/runs/"+run.id+"/jobs","jobs")});
  }
  const counters=countDRuns(records,reserveRuns,reserveJobs);
  emitFile("d-ledger-"+label+".json",Buffer.from(JSON.stringify({baselineCount:97,all,records,counters})+"\n"));return records;
}

interface DAttempt {input:import("./github-writer").DBatchInput;run:Run;receipt:import("./github-writer").Receipt|null;frames:DFrame[];expected:boolean;safeNoCommit:boolean;}
interface DIntent {requestId:string;input:import("./github-writer").DBatchInput|null;workflow:string;runId:number;frames:DFrame[];}
export function recoverDIntents(frames:DFrame[]):DIntent[] {
  return frames.filter(x=>/^dispatch-[a-f0-9]{64}-intent.json$/.test(x.name)).map(frame=>{
    const requestId=frame.name.slice(9,-12),intent=JSON.parse(frame.bytes.toString());
    const {metadata,raw}=dRawReceipt(frames,"dispatch-"+requestId),response=JSON.parse(raw.toString());
    if(intent.method!=="POST"||metadata.method!=="POST"||metadata.status!==200||intent.requestDigest!==digest(JSON.stringify(intent.body))||metadata.requestDigest!==intent.requestDigest||metadata.path!==intent.path||intent.body.ref!=="main")throw new Error("D-DispatchIntentReceipt");
    const workflow=String(intent.path).split("/")[3];if(!["commit-artifacts.yml","reindex.yml","ci.yml"].includes(workflow))throw new Error("D-DispatchWorkflow");
    const runId=response.workflow_run_id;
    if(!Number.isSafeInteger(runId)||runId<1||response.run_url!=="https://api.github.com/repos/"+REPOSITORY+"/actions/runs/"+runId||response.html_url!=="https://github.com/"+REPOSITORY+"/actions/runs/"+runId)throw new Error("D-DispatchAck");
    const input=workflow==="ci.yml"?null:JSON.parse(intent.body.inputs.request);
    if(input?input.requestId!==requestId:intent.body.inputs.request_id!==requestId)throw new Error("D-DispatchRequestBinding");
    return {requestId,input,workflow,runId,frames};
  });
}
export function chooseDStep(step:string,attempts:Array<{input:{step:string;ordinal:number;cancelAfterPush:boolean};expected:boolean;safeNoCommit:boolean;receipt:{duplicate:boolean}|null;run:{status:string}}>,committed:boolean):"reuse"|"first"|"recover" {
  const matching=attempts.filter(x=>x.input.step===step);
  if(matching.some(x=>x.run.status!=="completed"))throw new Error("D-PreviousRunActive");
  if(matching.some(x=>x.expected))return "reuse";
  if(!matching.length){if(committed&&!['duplicate-initial','replay-side-effect'].includes(step))throw new Error("D-CommittedWithoutAcceptance");return "first";}
  if(committed||matching.some(x=>x.receipt||!x.safeNoCommit))throw new Error("D-EffectNeedsEvidenceRepair");
  return "recover";
}
async function inspectDAttempt(root:string,api:GitHubTransport,intent:DIntent):Promise<DAttempt> {
  if(!intent.input)throw new Error("D-WriterInputMissing");const input=intent.input;
  const {validateDInput}=await import("./github-writer"),{validateDRun}=await import("./github-transport");validateDInput(input,intent.workflow==="reindex.yml");
  const run=await api.json<Run>("/actions/runs/"+intent.runId);validateDRun(run,intent.runId,intent.workflow,intent.requestId);
  if(run.status!=="completed")throw new Error("D-PreviousRunActive");const lineage=closureLineage(root,run.head_sha);if(lineage.code!==input.code)throw new Error("D-WriterCodeEpoch");
  const jobs=await api.page<Job>("/actions/runs/"+run.id+"/jobs","jobs"),executed=jobs.filter(x=>x.conclusion!=="skipped");
  if(jobs.length!==(intent.workflow==="reindex.yml"?1:2)||executed.length!==1)throw new Error("D-WriterJobCount");
  const job=executed[0],raw=await api.bytes("/actions/jobs/"+job.id+"/logs",64*1024*1024);emitFile("writer-"+run.id+".log",raw);
  const frames=decodeDFrames(raw.toString(),{run:String(run.id),head:input.code,job:job.name},run.conclusion==="cancelled");
  const receipts=frames.filter(x=>x.name==="write-receipt.json");if(receipts.length>1)throw new Error("D-MultipleWriteReceipts");
  const result=receipts.length?JSON.parse(receipts[0].bytes.toString()):null,receipt=result?.result??null;
  if(result&&JSON.stringify(result.input)!==JSON.stringify(input))throw new Error("D-ReceiptInput");
  if(receipt) {
    const c=await api.json<{sha:string;tree:{sha:string};parents:{sha:string}[];message:string}>("/git/commits/"+receipt.commit);
    if(receipt.writeId!=="FS24-D:"+input.batch+":"+input.operation||c.sha!==receipt.commit||c.tree.sha!==receipt.tree||c.parents.length!==1||c.parents[0].sha!==receipt.parent||!c.message.split("\n").includes("Write-Id: "+receipt.writeId)||!c.message.split("\n").includes("Input-Payload: "+input.payloadDigest))throw new Error("D-ReceiptCommit");
    const declared=JSON.parse(/^Write-Paths: (.+)$/m.exec(c.message)?.[1]??"null");
    if(JSON.stringify(Object.keys(receipt.paths).sort())!==JSON.stringify(declared))throw new Error("D-ReceiptPaths");
    for(const item of Object.values(receipt.paths) as Array<{blob:string;bytes:number;sha256:string}>) {
      const blob=await api.json<{sha:string;encoding:string;size:number;content:string}>("/git/blobs/"+item.blob),bytes=Buffer.from(blob.content.replace(/\s/g,""),"base64");
      if(blob.sha!==item.blob||blob.encoding!=="base64"||blob.size!==item.bytes||bytes.length!==item.bytes||digest(bytes)!==item.sha256)throw new Error("D-ReceiptBlob");
    }
  }
  let expected=false;
  if(input.step==="invalid-state") {
    const errors=frames.filter(x=>x.name==="write-error.json");
    if(errors.length===1){const error=JSON.parse(errors[0].bytes.toString());expected=run.conclusion==="failure"&&!receipt&&JSON.stringify(error.input)===JSON.stringify(input)&&/^Error: SchemaRejected/.test(error.error);}
  } else if(input.step==="side-effect") {
    if(run.conclusion==="cancelled"&&receipt&&!receipt.duplicate){const cancel=dRawReceipt(frames,"cancel-"+run.id);expected=cancel.metadata.status===202&&cancel.metadata.method==="POST"&&cancel.metadata.path==="/actions/runs/"+run.id+"/cancel";}
  } else expected=run.conclusion==="success"&&Boolean(receipt)&&receipt.duplicate===["duplicate-initial","replay-side-effect"].includes(input.step);
  const errors=frames.filter(x=>x.name==="write-error.json"),pushIntents=frames.filter(x=>/^push-[1-5]-intent.json$/.test(x.name)),pushResults=frames.filter(x=>/^push-[1-5]-result.json$/.test(x.name));
  const error=errors.length===1?JSON.parse(errors[0].bytes.toString()):null;
  const rejectedPushes=pushResults.map(x=>JSON.parse(x.bytes.toString()));
  const safeNoCommit=run.conclusion==="failure"&&!receipt&&error&&JSON.stringify(error.input)===JSON.stringify(input)&&!/403|Authorization|forbidden|authentication|permission denied/i.test(error.error)&&(!pushIntents.length||error.error==="Error: CASExhausted"&&pushIntents.length===pushResults.length&&rejectedPushes.every(x=>x.status!==0&&/non-fast-forward|fetch first|failed to update ref/i.test(x.stderr)&&!/403|forbidden|authentication|permission denied/i.test(x.stderr)));
  return {input,run,receipt,frames,expected,safeNoCommit:Boolean(safeNoCommit)};
}
async function mainD() {
  const mode=process.argv[2],root=process.env.GITHUB_WORKSPACE!,head=process.env.FS_HEAD!,run=process.env.GITHUB_RUN_ID!,dir=process.env.TASK_ROOT!;
  if(process.env.GITHUB_REPOSITORY!==REPOSITORY||process.env.GITHUB_RUN_ATTEMPT!=="1"||process.env.FS_GRANT!=="FS24-D")throw new Error("D-RuntimeIdentity");
  const api=new GitHubTransport(process.env.GH_TOKEN!),writer=await import("./github-writer");
  const mainRef=async()=> (await api.json<{object:{sha:string}}>("/git/ref/heads/main")).object.sha;
  const fetchMain=()=>{const receipt=fetchMainReadOnly(root);emitFile("d-git-fetch-"+mode+".json",Buffer.from(JSON.stringify(receipt)+"\n"));return receipt.head;};
  const lineage=closureLineage(root,head),control=process.env.FS24_CONTROL?JSON.parse(process.env.FS24_CONTROL) as DControl:null;
  if(control){validateDControl(control);emitFile("d-control-input.json",Buffer.from(JSON.stringify(control)+"\n"));}
  const batch=control?.batch==="new"?run:control?.batch??run,origin=control?.origin??head;
  const jobsFor=(id:number)=>api.page<Job>("/actions/runs/"+id+"/jobs","jobs");
  if(mode==="diagnose-candidate") {
    if(!lineage.unmerged.length)throw new Error("D-CandidateRequired");await writer.receiptsD(root,head,api);
    const main=await mainRef();if(fetchMain()!==main||main!==lineage.candidateBase)throw new Error("D-CandidateMain");
    // Exercise both role configurations without issuing any write operation.
    const {gitEnvironment}=await import("./github-git");const previous=process.env.FS_JOB;
    const roleReads:Array<{role:string;read:ReturnType<typeof fetchMainReadOnly>}>=[];try {for(const role of ["writer","writer-cancel","reindex"]){process.env.FS_JOB=role;gitEnvironment(root,true);const read=fetchMainReadOnly(root);if(read.head!==main)throw new Error("D-RoleReadMain");roleReads.push({role,read});}}finally{process.env.FS_JOB=previous;}
    emitFile("d-role-read-prequalification.json",Buffer.from(JSON.stringify(roleReads)+"\n"));
    await ledgerD(root,api,"candidate",22,73);
    emitFile("d-candidate-diagnosis.json",Buffer.from(JSON.stringify({result:"pass",head,main,readOnlyFetch:true,roleEnvironmentChecks:["writer","writer-cancel","reindex"],writes:0,dispatch:0})+"\n"));return;
  }
  if(mode==="admit") {
    await writer.receiptsD(root,head,api);const main=await mainRef();if(fetchMain()!==main||main!==head&&(!control||main!==control.expectedMain))throw new Error("D-AdmissionMain");
    const records=await ledgerD(root,api,"admit",control?19:0,control?57:0);
    if(!control) {
      const cause=JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH!,"utf8")).workflow_run as Run;
      if(process.env.GITHUB_EVENT_NAME!=="workflow_run"||cause.event!=="push"||cause.head_sha!==head||cause.path!==".github/workflows/ci.yml"||cause.head_branch!=="main"||cause.run_attempt!==1||cause.conclusion!=="success")throw new Error("D-ReadOnlyCause");
      const jobs=await jobsFor(cause.id);assertDFourJobs(jobs);
      emitFile("d-postmerge.json",Buffer.from(JSON.stringify({result:"pass",head,cause,jobs,activation:false})+"\n"));return;
    }
    const current=await api.json<Run>("/actions/runs/"+run);
    const {validateDRun}=await import("./github-transport");validateDRun(current,Number(run),"acceptance-wp002.yml",control.requestId);
    if(current.head_sha!==control.expectedMain||closureLineage(root,main).code!==control.code||control.code!==head||lineage.unmerged.length||lineage.closure)throw new Error("D-ControlMain");
    const controllers=records.filter(x=>x.run.event==="workflow_dispatch"&&x.run.path===".github/workflows/acceptance-wp002.yml");
    if(controllers.length!==control.recoveryOrdinal+1||controllers.length>3||controllers.some(x=>String(x.run.id)!==run&&x.run.status!=="completed"))throw new Error("D-ControlCount");
    // Require the completed main CI and completed read-only listener for this code epoch.
    const cis=records.filter(x=>x.run.head_sha===head&&x.run.event==="push"&&x.run.path===".github/workflows/ci.yml"&&x.run.conclusion==="success");
    const listeners=records.filter(x=>x.run.head_sha===head&&x.run.event==="workflow_run"&&x.run.path===".github/workflows/acceptance-wp002.yml"&&x.run.conclusion==="success");
    if(cis.length!==1||listeners.length!==1)throw new Error("D-PostMergeGates");assertDFourJobs(cis[0].jobs);
    const admit=listeners[0].jobs.find(x=>x.name==="admit"&&x.conclusion==="success");if(!admit)throw new Error("D-PostMergeAdmitJob");
    const raw=await api.bytes("/actions/jobs/"+admit.id+"/logs",64*1024*1024);emitFile("d-readonly-listener.log",raw);
    const proof=JSON.parse(oneDFrame(decodeDFrames(raw.toString(),{run:String(listeners[0].run.id),head,job:"admit"}),"d-postmerge.json").toString());
    if(proof.result!=="pass"||proof.head!==head||proof.activation!==false)throw new Error("D-PostMergeProof");
    if(control.recoveryOrdinal===0&&closureLineage(root,main).data.length)throw new Error("D-ExistingData");
    if(control.recoveryOrdinal>0)await journalD(root,api,records,control,run);
    emitFile("d-admission.json",Buffer.from(JSON.stringify({result:"pass",head,main,batch,origin,activation:true,control})+"\n"));return;
  }
  const producer=process.env.FS_PRODUCER??"foundation",value=bundleD(root,origin,batch,producer,run,head);
  if(mode==="prepare") {
    const records=await ledgerD(root,api,"prepare");let reservedObjects=0;const artifactRecords=[];
    for(const record of records.filter(x=>x.run.path===".github/workflows/acceptance-wp002.yml")) {
      const objects=await api.page<{id:number}>("/actions/runs/"+record.run.id+"/artifacts","artifacts");
      const state=closureLineage(root,record.run.head_sha);
      const prospective=record.run.status==="completed"||state.closure?0:record.run.event==="workflow_dispatch"?2:["push","pull_request"].includes(record.run.event)?1:0;
      reservedObjects+=Math.max(objects.length,prospective);artifactRecords.push({run:record.run.id,objects,prospective});
    }
    emitFile("d-artifact-reservation.json",Buffer.from(JSON.stringify({reservedObjects,artifactRecords})+"\n"));
    if(reservedObjects>16)throw new Error("D-ArtifactObjectCap");
    const dest=join(dir,"handoff");mkdirSync(dest,{recursive:true});for(const [name,content]of Object.entries(value.files))writeFileSync(join(dest,name),content);
    writeFileSync(process.env.GITHUB_OUTPUT!,"artifact_name="+value.manifest.artifactName+"\nmanifest_hash="+digest(value.files["manifest.json"])+"\n",{flag:"a"});emitFile("producer-manifest.json",Buffer.from(value.files["manifest.json"]));return;
  }
  if(mode==="receive") {
    const {operations,...expected}=value.manifest,received=await api.artifact(Number(process.env.FS_ARTIFACT_ID),expected,digest(value.files["manifest.json"]),join(dir,"received"));
    for(const [name,content]of Object.entries(value.files))if(received.files[name]!==content)throw new Error("D-ProducerReceiverMismatch");
    emitFile("prequalification.json",Buffer.from(JSON.stringify({result:"pass",run,head,batch,origin,producer,artifact:received.metadata,manifestHash:digest(value.files["manifest.json"])})+"\n"));return;
  }
  if(mode!=="controller"||!control)throw new Error("D-Mode");
  await writer.receiptsD(root,head,api);fetchMain();
  let ledgerSequence=0;const ledger=async(r=0,j=0)=>ledgerD(root,api,"controller-"+(++ledgerSequence),r,j);
  const records=await ledger(19,57),journal=await journalD(root,api,records,control,run);
  const producerJobs=await jobsFor(Number(run));if(!producerOverlap(producerJobs))throw new Error("D-ProducerParallelEvidence");
  emitFile("producer-jobs.json",Buffer.from(JSON.stringify(producerJobs)+"\n"));
  const attempts=journal.attempts;let dispatched=journal.intents.length+1+control.recoveryOrdinal;
  let recoveries=journal.attempts.filter(x=>x.input.ordinal>0).length;
  const dispatch=async(step:string):Promise<DAttempt>=>{
    const operation=step==="duplicate-initial"?"initial-left":step==="replay-side-effect"?"side-effect":step;
    fetchMainReadOnly(root);const observed=await mainRef();const state=closureLineage(root,observed);writer.dataChainD(root,head,observed,batch,origin);
    const choice=chooseDStep(step,attempts,state.data.some(x=>x.operation===operation));
    if(choice==="reuse")return attempts.find(x=>x.input.step===step&&x.expected)!;
    if(choice==="recover"&&++recoveries>6)throw new Error("D-RecoveryDispatchCap");
    const side=operation.endsWith("right")?"right":"left",generated=bundleD(root,origin,batch,side,run,head);
    const body={grant:"FS24-D" as const,batch,code:head,producer:side as "left"|"right",artifact:operation==="reindex"?0:Number(process.env[side==="left"?"FS_LEFT_ARTIFACT":"FS_RIGHT_ARTIFACT"]),manifestHash:operation==="reindex"?"none":digest(generated.files["manifest.json"]),operation,cancelAfterPush:step==="side-effect",origin,controllerRun:run,controlId:control.requestId,producerRun:run,producerCode:head,payloadDigest:operationDigest(generated,operation),ordinal:choice==="recover"?Math.max(...attempts.filter(x=>x.input.step===step).map(x=>x.input.ordinal))+1:0,step};
    const input={...body,requestId:digest(JSON.stringify(body))},workflow=operation==="reindex"?"reindex.yml":"commit-artifacts.yml";
    if(++dispatched>24)throw new Error("D-DispatchCap");writer.validateDInput(input,operation==="reindex");
    const id=await api.dispatchD(workflow,{request:JSON.stringify(input)},input.requestId);await api.wait(id);fetchMainReadOnly(root);
    const result=await inspectDAttempt(root,api,{requestId:input.requestId,input,workflow,runId:id,frames:[]});attempts.push(result);
    emitFile("d-step-"+step+"-"+input.ordinal+".json",Buffer.from(JSON.stringify({input,run:result.run,receipt:result.receipt,expected:result.expected})+"\n"));
    if(!result.expected)throw new Error("D-UnexpectedConclusion:"+step+":"+result.run.conclusion);return result;
  };
  await Promise.all([dispatch("initial-left"),dispatch("initial-right")]);await ledger(17,53);
  const launch=async(step:string)=>{const remaining=D_STEPS.filter(x=>!attempts.some(a=>a.input.step===x&&a.expected));await ledger(remaining.length+7,remaining.reduce((sum,x)=>sum+(x==="reindex"?1:2),0)+34);return dispatch(step);};
  await launch("update-one");const update=await launch("update-two");
  const beforeUpdate=JSON.parse(oneDFrame(update.frames,"read-before-update-two.json").toString());
  if(Object.values(beforeUpdate.values).some(x=>JSON.parse(String(x)).revision!==2))throw new Error("D-RevisionBarrier");
  await launch("duplicate-initial");await launch("pending");await launch("side-effect");await launch("replay-side-effect");
  const negativeBefore=await mainRef();await launch("invalid-state");if(await mainRef()!==negativeBefore)throw new Error("D-NegativeChangedMain");
  await ledger(10,39);await Promise.all([dispatch("logs-left"),dispatch("logs-right")]);await launch("reindex");
  fetchMainReadOnly(root);const final=await mainRef();writer.dataChainD(root,head,final,batch,origin);const data=verifyDFinal(root,head,final,batch,origin);
  const oldFinal=journal.intents.filter(x=>x.workflow==="ci.yml");
  const finalBody={expected_head:final,code:head,batch,origin,ordinal:String(oldFinal.length)},requestId=digest(JSON.stringify(finalBody));
  await ledger(7,34);if(oldFinal.length>=3)throw new Error("D-FinalCICap");
  if(++dispatched>24)throw new Error("D-DispatchCap");const ci=await api.dispatchD("ci.yml",{...finalBody,request_id:requestId},requestId),finished=await api.wait(ci),jobs=await jobsFor(ci);
  const {validateDRun}=await import("./github-transport");validateDRun(finished,ci,"ci.yml",requestId);
  if(finished.head_sha!==final||finished.conclusion!=="success")throw new Error("D-FinalCI");assertDFourJobs(jobs);
  for(const job of jobs) {
    const raw=await api.bytes("/actions/jobs/"+job.id+"/logs",64*1024*1024);emitFile("final-ci-job-"+job.id+".log",raw);const text=raw.toString();
    const framed=text.split("\n").flatMap(line=>{const match=/FS23_(?:BEGIN|FILE|DATA|END|COMPLETE)\t/.exec(line);return match?[line.slice(match.index).replace(/\r$/,"")]:[];}).join("\n")+"\n";
    const files=decode(framed,{grant:"FS23-WP001",run:String(ci),attempt:"1",head:final,job:job.name,event:"workflow_dispatch",base:head});assertFinalJobEvidence(job,text,files);
    if(job.name==="report"){const report=files["ci-report.txt"]?.toString();if(!report||!["commit="+final,"baseline="+head,"technicalResult=pass"].every(x=>report.split("\n").includes(x)))throw new Error("D-FinalCIReport");emitFile("final-ci-report.txt",files["ci-report.txt"]);}
  }
  if(await mainRef()!==final)throw new Error("D-FinalCheckpoint");await ledger(6,30);
  emitFile("integration-result.json",Buffer.from(JSON.stringify({result:"pass",code:head,origin,batch,final,data,attempts:attempts.map(({frames,...x})=>x),dispatched,producerJobs,finalCI:finished,finalJobs:jobs,providerCalls:0,billingActualUsd:null,ownerAcceptance:"pending",WP002:"todo"})+"\n"));
}
function assertDFourJobs(jobs:Job[]):void {if(jobs.length!==4||jobs.some(x=>x.conclusion!=="success")||["validate","typecheck","guardrails","report"].some(name=>jobs.filter(x=>x.name===name).length!==1))throw new Error("D-FourJobCI");}
export function verifyDFinal(root:string,code:string,final:string,batch:string,origin:string) {
  const state=closureLineage(root,final);if(state.data.length!==9||state.code!==code||state.batch!==batch||state.origin!==origin)throw new Error("D-FinalLineage");
  const indexCommit=state.data.find(x=>x.operation==="reindex")!;
  const expectedLogs=["left","right"].flatMap(side=>bundleD(root,origin,batch,side).files["log.jsonl"].trimEnd().split("\n"));
  const prefix=execFileSync("git",["-C",root,"show",FS24D.base+":pipeline/runs.jsonl"],{encoding:"utf8"}),actual=execFileSync("git",["-C",root,"show",final+":pipeline/runs.jsonl"],{encoding:"utf8"});
  const added=actual.slice(prefix.length).trimEnd().split("\n");if(!actual.startsWith(prefix)||added.length!==50||new Set(added).size!==50||added.some(x=>!expectedLogs.includes(x)))throw new Error("D-FinalLogs");
  const ids=["left","right"].map(side=>bundleD(root,origin,batch,side).manifest.operations[0].episodeId),states=ids.map(id=>JSON.parse(git(root,"show",indexCommit.parent+":episodes/"+id+"/state.json")));
  if(states[0].revision!==4||states[0].pendingSideEffects?.[0]?.writeId!=="FS24-D:"+batch+":side-effect")throw new Error("D-FinalPending");
  const {schemaChecker}=require("./repo-store") as typeof import("./repo-store"),{buildIndex}=require("./reindex") as typeof import("./reindex");
  const check=schemaChecker(readdirSync(join(root,"engine/contracts")).filter(x=>x.endsWith(".schema.json")).map(x=>JSON.parse(readFileSync(join(root,"engine/contracts",x),"utf8"))));
  const index=JSON.parse(git(root,"show",final+":pipeline/state.json"));if(JSON.stringify(index)!==JSON.stringify(buildIndex(states,indexCommit.parent,index.rebuiltAt,check)))throw new Error("D-FinalProjection");
  return {F_dataindex:indexCommit.commit,F_dataSource:indexCommit.parent,F_current:final,commits:state.data,logsAdded:50};
}
async function journalD(root:string,api:GitHubTransport,records:DRunRecord[],control:DControl,currentRun:string) {
  const controllers=records.filter(x=>x.run.path===".github/workflows/acceptance-wp002.yml"&&x.run.event==="workflow_dispatch"&&String(x.run.id)!==currentRun).sort((a,b)=>a.run.id-b.run.id);
  const intents:DIntent[]=[],proofs:Array<{run:number;job:number;sha256:string}>=[];
  for(const record of controllers) {
    if(record.run.status!=="completed")throw new Error("D-PriorControllerActive");const epoch=closureLineage(root,record.run.head_sha).code;
    for(const job of record.jobs.filter(x=>x.conclusion!=="skipped"&&["admit","controller"].includes(x.name))) {
      const raw=await api.bytes("/actions/jobs/"+job.id+"/logs",64*1024*1024);emitFile("prior-controller-"+record.run.id+"-"+job.id+".log",raw);proofs.push({run:record.run.id,job:job.id,sha256:digest(raw)});
      const frames=decodeDFrames(raw.toString(),{run:String(record.run.id),head:epoch,job:job.name},record.run.conclusion==="cancelled");
      const previous=JSON.parse(oneDFrame(frames,"d-control-input.json").toString()) as DControl;validateDControl(previous);
      if(previous.origin!==control.origin||previous.batch!=="new"&&previous.batch!==control.batch||previous.requestId!==record.run.display_title?.slice(7))throw new Error("D-PriorControlIdentity");
      if(job.name==="controller")intents.push(...recoverDIntents(frames));
    }
  }
  if(new Set(intents.map(x=>x.requestId)).size!==intents.length||new Set(intents.map(x=>x.runId)).size!==intents.length)throw new Error("D-DuplicateIntent");
  const journalHash=digest(JSON.stringify(proofs));emitFile("d-journal.json",Buffer.from(JSON.stringify({proofs,journalHash,intents:intents.map(({frames,...x})=>x)})+"\n"));
  if(control.recoveryOrdinal===0&&controllers.length||control.recoveryOrdinal>0&&(controllers.length!==control.recoveryOrdinal||String(controllers.at(-1)?.run.id)!==control.resumeOf||String(controllers[0]?.run.id)!==control.batch||journalHash!==control.journalHash))throw new Error("D-JournalBinding");
  if(controllers.some(x=>closureLineage(root,x.run.head_sha).code!==control.code)) {
    // A change to payload/data semantics invalidates reuse; auth/transport-only fixes may resume.
    for(const path of ["engine/io/repo-store.ts","engine/io/episode-state.ts","engine/io/run-log.ts","engine/io/reindex.ts","scripts/validate.ts"])
      if(git(root,"show",control.origin+":"+path)!==git(root,"show",control.code+":"+path))throw new Error("D-AcceptanceSemanticsChanged:"+path);
    for(const [path,start,end] of [["engine/io/github-writer.ts","export function applyEntries","export function inspectMergeReceipt"],["engine/io/wp002-integration.ts","export function bundle(","const BASELINE_RUN_IDS"]]) {
      const slice=(code:string)=>{const text=git(root,"show",code+":"+path);return text.slice(text.indexOf(start),text.indexOf(end));};
      if(slice(control.origin)!==slice(control.code))throw new Error("D-AcceptanceSemanticsChanged:"+path);
    }
  }
  const attempts:DAttempt[]=[];for(const intent of intents)if(intent.input)attempts.push(await inspectDAttempt(root,api,intent));
  const observedDispatch=records.filter(x=>x.run.event==="workflow_dispatch");
  if(observedDispatch.length!==intents.length+controllers.length+1||observedDispatch.length>24)throw new Error("D-UnjournaledDispatch");
  return {intents,attempts,journalHash};
}
async function mainC() {
  const mode=process.argv[2],root=process.env.GITHUB_WORKSPACE!,head=process.env.FS_HEAD!,run=process.env.GITHUB_RUN_ID!,dir=process.env.TASK_ROOT!;
  if(process.env.GITHUB_REPOSITORY!==REPOSITORY||process.env.GITHUB_RUN_ATTEMPT!=="1"||process.env.FS_GRANT!=="FS24-C")throw new Error("RuntimeIdentity");
  const api=new GitHubTransport(process.env.GH_TOKEN!);
  const {admittedSuccessor,successorReceipts,successorChain}=await import("./github-writer");
  const mainRef=async()=> (await api.json<{object:{sha:string}}>("/git/ref/heads/main")).object.sha;
  const jobsFor=(id:number)=>api.page<Job>("/actions/runs/"+id+"/jobs","jobs");
  const fetchMain=()=>execFileSync("git",["-C",root,"fetch","origin","main"],{stdio:["ignore","pipe","pipe"]});
  let ledgerSequence=0;
  const ledger=async(reserveRuns=0,reserveJobs=0)=>{
    const all=await api.page<Run>("/actions/runs","workflow_runs"),current=all.filter(x=>!BASELINE_RUN_IDS.has(x.id));
    if(![...BASELINE_RUN_IDS].every(id=>all.some(x=>x.id===id)))throw new Error("BaselineLedgerMissing");
    let active=0,jobCount=0,skipped=0;const records=[];
    for(const r of current) {
      if(r.run_attempt!==1)throw new Error("UnexpectedRunAttempt");
      if(!["main","wp/002"].includes(r.head_branch))throw new Error("ExternalRunBranch");
      {
        fetchMain();
        if(r.head_branch==="wp/002")git(root,"merge-base","--is-ancestor",r.head_sha,head);
        else successorChain(root,head,r.head_sha,run);
      }
      const jobs=await jobsFor(r.id);records.push({run:r,jobs});
      if(r.conclusion==="skipped"){skipped++;continue;}
      active++;
      const declared=r.path===".github/workflows/ci.yml"?4:r.path===".github/workflows/acceptance-wp002.yml"?(r.head_sha===head||r.head_sha!=="6d0c5abeb493699ef649f49860b370ab76c55869"?6:3):r.path===".github/workflows/commit-artifacts.yml"?2:r.path===".github/workflows/reindex.yml"?1:0;
      if(!declared)throw new Error("UnexpectedActiveWorkflow");
      jobCount+=r.status==="completed"?jobs.length:Math.max(jobs.length,declared);
    }
    emitFile("ledger-"+mode+"-"+(++ledgerSequence)+".json",Buffer.from(JSON.stringify({all,records,active,jobCount,skipped,reserveRuns,reserveJobs})+"\n"));
    if(active+reserveRuns>34||jobCount+reserveJobs>120||skipped>12)throw new Error("GrantCapacity");
    return current;
  };
  if(mode==="diagnose-candidate"){await successorReceipts(root,head,api,false);return;}
  if(mode==="admit") {
    const event=JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH!,"utf8")) as {workflow_run:Run};const cause=event.workflow_run;
    if(process.env.GITHUB_EVENT_NAME!=="workflow_run"||cause.event!=="push"||cause.head_branch!=="main"||cause.head_sha!==head||cause.conclusion!=="success"||cause.run_attempt!==1||cause.path!==".github/workflows/ci.yml")throw new Error("C-trigger");
    const jobs=await jobsFor(cause.id);
    if(jobs.length!==4||jobs.some(x=>x.conclusion!=="success")||["validate","typecheck","guardrails","report"].some(name=>!jobs.some(x=>x.name===name)))throw new Error("C-main-CI");
    await admittedSuccessor(root,head,run,api);
    if(await mainRef()!==head)throw new Error("InitialMainCheckpoint");
    const records=await ledger(13,27);
    if(records.filter(x=>x.event==="workflow_run"&&x.head_sha===head&&x.path===".github/workflows/acceptance-wp002.yml").length!==1)throw new Error("OneBatchOnly");
    if(git(root,"ls-tree","-r","--name-only",head,"--","episodes").split("\n").some(x=>x.endsWith("/state.json")))throw new Error("UnexpectedExistingState");
    emitFile("c-admission.json",Buffer.from(JSON.stringify({result:"pass",head,run,cause,jobs,activation:true})+"\n"));return;
  }
  const producer=process.env.FS_PRODUCER??"foundation",value=bundleC(root,head,run,producer);
  if(mode==="prepare") {
    const dest=join(dir,"handoff");mkdirSync(dest,{recursive:true});for(const [name,content]of Object.entries(value.files))writeFileSync(join(dest,name),content);
    writeFileSync(process.env.GITHUB_OUTPUT!,"artifact_name="+value.manifest.artifactName+"\nmanifest_hash="+digest(value.files["manifest.json"])+"\n",{flag:"a"});
    emitFile("producer-manifest.json",Buffer.from(value.files["manifest.json"]));return;
  }
  if(mode==="receive") {
    const {operations,...expected}=value.manifest;
    const received=await api.artifact(Number(process.env.FS_ARTIFACT_ID),expected,digest(value.files["manifest.json"]),join(dir,"received"));
    for(const [name,content]of Object.entries(value.files))if(received.files[name]!==content)throw new Error("ProducerReceiverMismatch");
    emitFile("prequalification.json",Buffer.from(JSON.stringify({result:"pass",run,head,producer,artifact:received.metadata,manifestHash:digest(value.files["manifest.json"])})+"\n"));return;
  }
  if(mode!=="controller")throw new Error("ModeNotEnabled");
  await admittedSuccessor(root,head,run,api);
  const producerJobs=await jobsFor(Number(run));
  if(!producerOverlap(producerJobs)||await mainRef()!==head)throw new Error("ProducerParallelEvidence");
  emitFile("producer-jobs.json",Buffer.from(JSON.stringify(producerJobs)+"\n"));
  await ledger(13,27);
  const results:Array<{name:string;run:Run;receipt:import("./github-writer").Receipt|null}>=[];let dispatches=0;
  const makeInput=(operation:string,side="left",cancelAfterPush=false)=>{
    const body={grant:"FS24-C",batch:run,code:head,producer:side,artifact:operation==="reindex"?0:Number(process.env[side==="left"?"FS_LEFT_ARTIFACT":"FS_RIGHT_ARTIFACT"]),manifestHash:operation==="reindex"?"none":process.env[side==="left"?"FS_LEFT_HASH":"FS_RIGHT_HASH"]!,operation,cancelAfterPush};
    return {...body,requestId:digest(JSON.stringify(body))};
  };
  const complete=async(name:string,id:number,requestId:string,workflow:string,expected:string)=>{
    const result=await api.wait(id);const {validateDispatchedRun}=await import("./github-transport");validateDispatchedRun(result,id,workflow,requestId);
    if(result.conclusion!==expected)throw new Error("UnexpectedConclusion:"+name+":"+result.conclusion);
    fetchMain();successorChain(root,head,result.head_sha,run);
    const jobs=await jobsFor(id),active=jobs.filter(x=>x.conclusion!=="skipped");
    if(active.length!==1||jobs.length!==(workflow==="reindex.yml"?1:2))throw new Error("WriterJobCount");
    const raw=await api.bytes("/actions/jobs/"+active[0].id+"/logs",16*1024*1024);emitFile("writer-"+id+".log",raw);const log=raw.toString("utf8");
    const lines=log.split("\n").filter(x=>x.includes("FS24B_RECEIPT\t{"));
    const receipt=lines.length===1?JSON.parse(lines[0].slice(lines[0].indexOf("FS24B_RECEIPT\t")+"FS24B_RECEIPT\t".length)) as import("./github-writer").Receipt:null;
    if(expected==="failure") {if(receipt||!log.includes("FS24B_WRITE_ERROR\tError: SchemaRejected"))throw new Error("WrongNegativeFailure");}
    else {
      if(!receipt||receipt.writeId!=="FS24-C:"+run+":"+name)throw new Error("MissingWriteReceipt");
      const commit=await api.json<{sha:string;message:string;tree:{sha:string};parents:{sha:string}[]}>("/git/commits/"+receipt.commit);
      if(commit.sha!==receipt.commit||commit.tree.sha!==receipt.tree||commit.parents.length!==1||commit.parents[0].sha!==receipt.parent)throw new Error("ReceiptParentTree");
      if(commit.message.split("\n").filter(x=>x.startsWith("Write-Id: ")).join("\n")!=="Write-Id: "+receipt.writeId||!commit.message.split("\n").includes("FS24-C-Batch: "+run))throw new Error("ReceiptWriteIdentity");
      const declared=/^Write-Paths: (.+)$/m.exec(commit.message);
      if(!declared||JSON.stringify(Object.keys(receipt.paths).sort())!==JSON.stringify((JSON.parse(declared[1]) as string[]).sort()))throw new Error("ReceiptPaths");
      for(const item of Object.values(receipt.paths)) {
        const blob=await api.json<{content:string;size:number;encoding:string}>("/git/blobs/"+item.blob);const bytes=Buffer.from(blob.content.replace(/\s/g,""),"base64");
        if(blob.encoding!=="base64"||bytes.length!==item.bytes||blob.size!==item.bytes||digest(bytes)!==item.sha256)throw new Error("ReceiptBlob");
      }
    }
    results.push({name,run:result,receipt});return receipt;
  };
  const dispatch=async(operation:string,side="left",expected="success")=>{
    await ledger();
    if(++dispatches>13)throw new Error("DispatchCap");
    const workflow=operation==="reindex"?"reindex.yml":"commit-artifacts.yml",input=makeInput(operation,side,expected==="cancelled");
    const id=await api.dispatchC(workflow,{request:JSON.stringify(input)},input.requestId);
    return complete(operation,id,input.requestId,workflow,expected);
  };
  await Promise.all([dispatch("initial-left"),dispatch("initial-right","right")]);await ledger(11,23);
  await dispatch("update-one");await dispatch("update-two");
  const duplicate=await dispatch("initial-left");if(!duplicate?.duplicate||duplicate.commit!==results[0].receipt?.commit&&duplicate.commit!==results[1].receipt?.commit)throw new Error("DuplicateCreatedCommit");
  await dispatch("pending");const sideEffect=await dispatch("side-effect","left","cancelled");
  const replay=await dispatch("side-effect");if(!replay?.duplicate||replay.commit!==sideEffect?.commit)throw new Error("ReplayCreatedCommit");
  const beforeNegative=await mainRef();await dispatch("invalid-state","left","failure");if(await mainRef()!==beforeNegative)throw new Error("NegativeChangedMain");
  await Promise.all([dispatch("logs-left"),dispatch("logs-right","right")]);
  const indexReceipt=await dispatch("reindex");if(!indexReceipt)throw new Error("IndexReceipt");
  const final=indexReceipt.commit;fetchMain();const chain=successorChain(root,head,final,run);if(chain.length!==9)throw new Error("ExpectedNineDataCommits");
  const expectedLogs=["left","right"].flatMap(side=>bundleC(root,head,run,side).files["log.jsonl"].trimEnd().split("\n"));
  const prefix=execFileSync("git",["-C",root,"show",head+":pipeline/runs.jsonl"],{encoding:"utf8"});
  const actual=execFileSync("git",["-C",root,"show",final+":pipeline/runs.jsonl"],{encoding:"utf8"});
  if(!actual.startsWith(prefix))throw new Error("LogPrefix");const added=actual.slice(prefix.length).trimEnd().split("\n");
  if(added.length!==50||new Set(added).size!==50||added.some(x=>!expectedLogs.includes(x)))throw new Error("LogCoverage");
  const ids=["left","right"].map(side=>bundleC(root,head,run,side).manifest.operations[0].episodeId);
  const states=ids.map(id=>JSON.parse(git(root,"show",indexReceipt.parent+":episodes/"+id+"/state.json")));
  const {inspectEpisode}=await import("./episode-state"),{schemaChecker}=await import("./repo-store"),{buildIndex}=await import("./reindex");
  const check=schemaChecker(readdirSync(join(root,"engine/contracts")).filter(x=>x.endsWith(".schema.json")).map(x=>JSON.parse(readFileSync(join(root,"engine/contracts",x),"utf8"))));
  if(inspectEpisode(states[0],check).complete||states[0].revision!==4||states[0].pendingSideEffects[0].writeId!=="FS24-C:"+run+":side-effect")throw new Error("IncompleteStateLost");
  const index=JSON.parse(git(root,"show",final+":pipeline/state.json"));
  if(JSON.stringify(index)!==JSON.stringify(buildIndex(states,indexReceipt.parent,index.rebuiltAt,check)))throw new Error("IndexProjection");
  const finalBody={expected_head:final,code:head,batch:run};const requestId=digest(JSON.stringify(finalBody));
  await ledger(1,4);
  const ci=await api.dispatchC("ci.yml",{...finalBody,request_id:requestId},requestId);dispatches++;
  const finished=await api.wait(ci),jobs=await jobsFor(ci);
  if(finished.head_sha!==final||finished.conclusion!=="success"||jobs.length!==4||jobs.some(x=>x.conclusion!=="success")||["validate","typecheck","guardrails","report"].some(name=>!jobs.some(x=>x.name===name)))throw new Error("FinalCI");
  const {validateDispatchedRun}=await import("./github-transport");validateDispatchedRun(finished,ci,"ci.yml",requestId);
  for(const job of jobs) {
    const raw=await api.bytes("/actions/jobs/"+job.id+"/logs",16*1024*1024);emitFile("final-ci-job-"+job.id+".log",raw);
    const text=raw.toString("utf8");
    const framed=text.split("\n").flatMap(line=>{const match=/FS23_(?:BEGIN|FILE|DATA|END|COMPLETE)\t/.exec(line);return match?[line.slice(match.index).replace(/\r$/,"")]:[];}).join("\n")+"\n";
    const files=decode(framed,{grant:"FS23-WP001",run:String(ci),attempt:"1",head:final,job:job.name,event:"workflow_dispatch",base:head});
    assertFinalJobEvidence(job,text,files);
    if(job.name==="report") {
      const report=files["ci-report.txt"]?.toString();
      if(!report||!report.split("\n").includes("commit="+final)||!report.split("\n").includes("baseline="+head)||!report.split("\n").includes("technicalResult=pass"))throw new Error("FinalCIReport");
      emitFile("final-ci-report.txt",files["ci-report.txt"]);
    }
  }
  if(dispatches!==13||await mainRef()!==final)throw new Error("FinalCheckpoint");await ledger();
  emitFile("integration-result.json",Buffer.from(JSON.stringify({result:"pass",head,final,dispatches,dataCommits:chain.length,results,producerJobs,finalCI:finished,finalJobs:jobs,providerCalls:0,billingActualUsd:null,ownerAcceptance:"pending",WP002:"todo"})+"\n"));
}

const D_BASELINE:Record<string,Partial<Run>> = {"34977975525":{"head_sha":"78a4b28b4134fb09b4a003b90099c13460a8112d","event":"workflow_run","path":".github/workflows/acceptance-wp002.yml","run_attempt":1,"status":"completed","conclusion":"failure"},"34977766910":{"head_sha":"78a4b28b4134fb09b4a003b90099c13460a8112d","event":"push","path":".github/workflows/ci.yml","run_attempt":1,"status":"completed","conclusion":"success"},"34977186010":{"head_sha":"9af238d7772bba56d6b98d568fcd34d57a7d6473","event":"pull_request","path":".github/workflows/ci.yml","run_attempt":1,"status":"completed","conclusion":"success"},"34977185994":{"head_sha":"9af238d7772bba56d6b98d568fcd34d57a7d6473","event":"pull_request","path":".github/workflows/acceptance-wp002.yml","run_attempt":1,"status":"completed","conclusion":"success"},"34977094477":{"head_sha":"9af238d7772bba56d6b98d568fcd34d57a7d6473","event":"push","path":".github/workflows/ci.yml","run_attempt":1,"status":"completed","conclusion":"success"},"34977094447":{"head_sha":"9af238d7772bba56d6b98d568fcd34d57a7d6473","event":"push","path":".github/workflows/acceptance-wp002.yml","run_attempt":1,"status":"completed","conclusion":"success"},"34976914696":{"head_sha":"6e07ac29bfa9cc4c3f82802a3f32ea007d713152","event":"push","path":".github/workflows/ci.yml","run_attempt":1,"status":"completed","conclusion":"failure"},"34976914649":{"head_sha":"6e07ac29bfa9cc4c3f82802a3f32ea007d713152","event":"push","path":".github/workflows/acceptance-wp002.yml","run_attempt":1,"status":"completed","conclusion":"failure"},"34949898351":{"head_sha":"6d0c5abeb493699ef649f49860b370ab76c55869","event":"workflow_run","path":".github/workflows/acceptance-wp002.yml","run_attempt":1,"status":"completed","conclusion":"success"},"34949738566":{"head_sha":"6d0c5abeb493699ef649f49860b370ab76c55869","event":"push","path":".github/workflows/ci.yml","run_attempt":1,"status":"completed","conclusion":"success"},"34949192872":{"head_sha":"c9dd48113b2a5a93dca6f92a151c8391bfb6af8d","event":"pull_request","path":".github/workflows/review-wp000-spec.yml","run_attempt":1,"status":"completed","conclusion":"skipped"},"34949192835":{"head_sha":"c9dd48113b2a5a93dca6f92a151c8391bfb6af8d","event":"pull_request","path":".github/workflows/acceptance-wp000.yml","run_attempt":1,"status":"completed","conclusion":"skipped"},"34949192808":{"head_sha":"c9dd48113b2a5a93dca6f92a151c8391bfb6af8d","event":"pull_request","path":".github/workflows/acceptance-wp002.yml","run_attempt":1,"status":"completed","conclusion":"success"},"34949192768":{"head_sha":"c9dd48113b2a5a93dca6f92a151c8391bfb6af8d","event":"pull_request","path":".github/workflows/ci.yml","run_attempt":1,"status":"completed","conclusion":"success"},"34949189178":{"head_sha":"c9dd48113b2a5a93dca6f92a151c8391bfb6af8d","event":"push","path":".github/workflows/acceptance-wp002.yml","run_attempt":1,"status":"completed","conclusion":"success"},"34949189116":{"head_sha":"c9dd48113b2a5a93dca6f92a151c8391bfb6af8d","event":"push","path":".github/workflows/ci.yml","run_attempt":1,"status":"completed","conclusion":"success"},"34936138932":{"head_sha":"ee4731336305e0ce99e1a248446d06e878602ce3","event":"pull_request","path":".github/workflows/ci.yml","run_attempt":1,"status":"completed","conclusion":"success"},"34936138877":{"head_sha":"ee4731336305e0ce99e1a248446d06e878602ce3","event":"pull_request","path":".github/workflows/acceptance-wp000.yml","run_attempt":1,"status":"completed","conclusion":"skipped"},"34936138853":{"head_sha":"ee4731336305e0ce99e1a248446d06e878602ce3","event":"pull_request","path":".github/workflows/review-wp000-spec.yml","run_attempt":1,"status":"completed","conclusion":"skipped"},"34936138841":{"head_sha":"ee4731336305e0ce99e1a248446d06e878602ce3","event":"pull_request","path":".github/workflows/acceptance-wp002.yml","run_attempt":1,"status":"completed","conclusion":"failure"},"34936135252":{"head_sha":"ee4731336305e0ce99e1a248446d06e878602ce3","event":"push","path":".github/workflows/acceptance-wp002.yml","run_attempt":1,"status":"completed","conclusion":"failure"},"34936135089":{"head_sha":"ee4731336305e0ce99e1a248446d06e878602ce3","event":"push","path":".github/workflows/ci.yml","run_attempt":1,"status":"completed","conclusion":"success"},"34935591900":{"head_sha":"03347d56f6e91c8548ce89c35492767e467cb9d1","event":"pull_request","path":".github/workflows/acceptance-wp002.yml","run_attempt":1,"status":"completed","conclusion":"failure"},"34935591875":{"head_sha":"03347d56f6e91c8548ce89c35492767e467cb9d1","event":"pull_request","path":".github/workflows/ci.yml","run_attempt":1,"status":"completed","conclusion":"success"},"34935527465":{"head_sha":"03347d56f6e91c8548ce89c35492767e467cb9d1","event":"push","path":".github/workflows/acceptance-wp002.yml","run_attempt":1,"status":"completed","conclusion":"failure"},"34935527327":{"head_sha":"03347d56f6e91c8548ce89c35492767e467cb9d1","event":"push","path":".github/workflows/ci.yml","run_attempt":1,"status":"completed","conclusion":"success"},"34935147664":{"head_sha":"2f540471a0ba90fd2d2edc76045ba3c61411d882","event":"push","path":".github/workflows/ci.yml","run_attempt":1,"status":"completed","conclusion":"failure"},"34935147662":{"head_sha":"2f540471a0ba90fd2d2edc76045ba3c61411d882","event":"push","path":".github/workflows/acceptance-wp002.yml","run_attempt":1,"status":"completed","conclusion":"failure"},"34917114566":{"head_sha":"83786225fdaff2fcbc82cd2b99212a905dd19ceb","event":"workflow_run","path":".github/workflows/acceptance-wp002.yml","run_attempt":1,"status":"completed","conclusion":"failure"},"34917008266":{"head_sha":"83786225fdaff2fcbc82cd2b99212a905dd19ceb","event":"push","path":".github/workflows/ci.yml","run_attempt":1,"status":"completed","conclusion":"success"},"34916591042":{"head_sha":"19bb30568885ef6cb2c7c4b3c8cb9053f9b1fe21","event":"pull_request","path":".github/workflows/acceptance-wp002.yml","run_attempt":1,"status":"completed","conclusion":"success"},"34916591007":{"head_sha":"19bb30568885ef6cb2c7c4b3c8cb9053f9b1fe21","event":"pull_request","path":".github/workflows/review-wp000-spec.yml","run_attempt":1,"status":"completed","conclusion":"skipped"},"34916590992":{"head_sha":"19bb30568885ef6cb2c7c4b3c8cb9053f9b1fe21","event":"pull_request","path":".github/workflows/acceptance-wp000.yml","run_attempt":1,"status":"completed","conclusion":"skipped"},"34916590974":{"head_sha":"19bb30568885ef6cb2c7c4b3c8cb9053f9b1fe21","event":"pull_request","path":".github/workflows/ci.yml","run_attempt":1,"status":"completed","conclusion":"success"},"34916588850":{"head_sha":"19bb30568885ef6cb2c7c4b3c8cb9053f9b1fe21","event":"push","path":".github/workflows/ci.yml","run_attempt":1,"status":"completed","conclusion":"success"},"34916588767":{"head_sha":"19bb30568885ef6cb2c7c4b3c8cb9053f9b1fe21","event":"push","path":".github/workflows/acceptance-wp002.yml","run_attempt":1,"status":"completed","conclusion":"success"},"34915746797":{"head_sha":"321fad3e60852ab87e8ac4fc49c854ff9710b54a","event":"pull_request","path":".github/workflows/ci.yml","run_attempt":1,"status":"completed","conclusion":"success"},"34915746782":{"head_sha":"321fad3e60852ab87e8ac4fc49c854ff9710b54a","event":"pull_request","path":".github/workflows/acceptance-wp002.yml","run_attempt":1,"status":"completed","conclusion":"success"},"34915746761":{"head_sha":"321fad3e60852ab87e8ac4fc49c854ff9710b54a","event":"pull_request","path":".github/workflows/acceptance-wp000.yml","run_attempt":1,"status":"completed","conclusion":"skipped"},"34915746751":{"head_sha":"321fad3e60852ab87e8ac4fc49c854ff9710b54a","event":"pull_request","path":".github/workflows/review-wp000-spec.yml","run_attempt":1,"status":"completed","conclusion":"skipped"},"34915744275":{"head_sha":"321fad3e60852ab87e8ac4fc49c854ff9710b54a","event":"push","path":".github/workflows/acceptance-wp002.yml","run_attempt":1,"status":"completed","conclusion":"success"},"34915744253":{"head_sha":"321fad3e60852ab87e8ac4fc49c854ff9710b54a","event":"push","path":".github/workflows/ci.yml","run_attempt":1,"status":"completed","conclusion":"success"},"34915305857":{"head_sha":"eebd499a26ecd1ab6d12ca761570f26c0ec0c2be","event":"pull_request","path":".github/workflows/review-wp000-spec.yml","run_attempt":1,"status":"completed","conclusion":"skipped"},"34915305817":{"head_sha":"eebd499a26ecd1ab6d12ca761570f26c0ec0c2be","event":"pull_request","path":".github/workflows/ci.yml","run_attempt":1,"status":"completed","conclusion":"success"},"34915305795":{"head_sha":"eebd499a26ecd1ab6d12ca761570f26c0ec0c2be","event":"pull_request","path":".github/workflows/acceptance-wp002.yml","run_attempt":1,"status":"completed","conclusion":"success"},"34915305780":{"head_sha":"eebd499a26ecd1ab6d12ca761570f26c0ec0c2be","event":"pull_request","path":".github/workflows/acceptance-wp000.yml","run_attempt":1,"status":"completed","conclusion":"skipped"},"34915303620":{"head_sha":"eebd499a26ecd1ab6d12ca761570f26c0ec0c2be","event":"push","path":".github/workflows/acceptance-wp002.yml","run_attempt":1,"status":"completed","conclusion":"success"},"34915303539":{"head_sha":"eebd499a26ecd1ab6d12ca761570f26c0ec0c2be","event":"push","path":".github/workflows/ci.yml","run_attempt":1,"status":"completed","conclusion":"success"},"34914970412":{"head_sha":"76aae91e0bd415176e102136a11449791e4ecc7e","event":"pull_request","path":".github/workflows/acceptance-wp000.yml","run_attempt":1,"status":"completed","conclusion":"skipped"},"34914970410":{"head_sha":"76aae91e0bd415176e102136a11449791e4ecc7e","event":"pull_request","path":".github/workflows/review-wp000-spec.yml","run_attempt":1,"status":"completed","conclusion":"skipped"},"34914970402":{"head_sha":"76aae91e0bd415176e102136a11449791e4ecc7e","event":"pull_request","path":".github/workflows/acceptance-wp002.yml","run_attempt":1,"status":"completed","conclusion":"failure"},"34914970395":{"head_sha":"76aae91e0bd415176e102136a11449791e4ecc7e","event":"pull_request","path":".github/workflows/ci.yml","run_attempt":1,"status":"completed","conclusion":"failure"},"34914967331":{"head_sha":"76aae91e0bd415176e102136a11449791e4ecc7e","event":"push","path":".github/workflows/ci.yml","run_attempt":1,"status":"completed","conclusion":"failure"},"34914967307":{"head_sha":"76aae91e0bd415176e102136a11449791e4ecc7e","event":"push","path":".github/workflows/acceptance-wp002.yml","run_attempt":1,"status":"completed","conclusion":"failure"},"34912823984":{"head_sha":"d021d3d662d619ae802fa483e1e36c5a94feb38b","event":"pull_request","path":".github/workflows/ci.yml","run_attempt":1,"status":"completed","conclusion":"success"},"34912823895":{"head_sha":"d021d3d662d619ae802fa483e1e36c5a94feb38b","event":"pull_request","path":".github/workflows/acceptance-wp002.yml","run_attempt":1,"status":"completed","conclusion":"success"},"34912823888":{"head_sha":"d021d3d662d619ae802fa483e1e36c5a94feb38b","event":"pull_request","path":".github/workflows/review-wp000-spec.yml","run_attempt":1,"status":"completed","conclusion":"skipped"},"34912823869":{"head_sha":"d021d3d662d619ae802fa483e1e36c5a94feb38b","event":"pull_request","path":".github/workflows/acceptance-wp000.yml","run_attempt":1,"status":"completed","conclusion":"skipped"},"34912820933":{"head_sha":"d021d3d662d619ae802fa483e1e36c5a94feb38b","event":"push","path":".github/workflows/ci.yml","run_attempt":1,"status":"completed","conclusion":"success"},"34912820884":{"head_sha":"d021d3d662d619ae802fa483e1e36c5a94feb38b","event":"push","path":".github/workflows/acceptance-wp002.yml","run_attempt":1,"status":"completed","conclusion":"success"},"34912433645":{"head_sha":"3c0f556063f51ce0b33bdf77d3774814ef703dd3","event":"pull_request","path":".github/workflows/acceptance-wp002.yml","run_attempt":1,"status":"completed","conclusion":"failure"},"34912433593":{"head_sha":"3c0f556063f51ce0b33bdf77d3774814ef703dd3","event":"pull_request","path":".github/workflows/ci.yml","run_attempt":1,"status":"completed","conclusion":"failure"},"34912383152":{"head_sha":"3c0f556063f51ce0b33bdf77d3774814ef703dd3","event":"push","path":".github/workflows/ci.yml","run_attempt":1,"status":"completed","conclusion":"failure"},"34912383147":{"head_sha":"3c0f556063f51ce0b33bdf77d3774814ef703dd3","event":"push","path":".github/workflows/acceptance-wp002.yml","run_attempt":1,"status":"completed","conclusion":"failure"},"34910005926":{"head_sha":"bd7f0eb5b225ed43d610af12b5febbe82a7dbec4","event":"push","path":".github/workflows/ci.yml","run_attempt":1,"status":"completed","conclusion":"success"},"34909667630":{"head_sha":"5b012a146be8b203f931e343493a832cdcc47988","event":"pull_request","path":".github/workflows/ci.yml","run_attempt":1,"status":"completed","conclusion":"success"},"34909667555":{"head_sha":"5b012a146be8b203f931e343493a832cdcc47988","event":"pull_request","path":".github/workflows/acceptance-wp000.yml","run_attempt":1,"status":"completed","conclusion":"skipped"},"34909667551":{"head_sha":"5b012a146be8b203f931e343493a832cdcc47988","event":"pull_request","path":".github/workflows/review-wp000-spec.yml","run_attempt":1,"status":"completed","conclusion":"skipped"},"34909664874":{"head_sha":"5b012a146be8b203f931e343493a832cdcc47988","event":"push","path":".github/workflows/ci.yml","run_attempt":1,"status":"completed","conclusion":"success"},"34870945083":{"head_sha":"03e135584ddeb36979d011890c6ac492588bfb67","event":"pull_request","path":".github/workflows/review-wp000-spec.yml","run_attempt":1,"status":"completed","conclusion":"skipped"},"34870945056":{"head_sha":"03e135584ddeb36979d011890c6ac492588bfb67","event":"pull_request","path":".github/workflows/acceptance-wp000.yml","run_attempt":1,"status":"completed","conclusion":"skipped"},"34870944912":{"head_sha":"03e135584ddeb36979d011890c6ac492588bfb67","event":"pull_request","path":".github/workflows/ci.yml","run_attempt":1,"status":"completed","conclusion":"success"},"34870940791":{"head_sha":"03e135584ddeb36979d011890c6ac492588bfb67","event":"push","path":".github/workflows/ci.yml","run_attempt":1,"status":"completed","conclusion":"success"},"34870085788":{"head_sha":"b7cbb59934616347ed7d923fefd83587e210877b","event":"pull_request","path":".github/workflows/ci.yml","run_attempt":1,"status":"completed","conclusion":"success"},"34870085388":{"head_sha":"b7cbb59934616347ed7d923fefd83587e210877b","event":"pull_request","path":".github/workflows/review-wp000-spec.yml","run_attempt":1,"status":"completed","conclusion":"skipped"},"34870085137":{"head_sha":"b7cbb59934616347ed7d923fefd83587e210877b","event":"pull_request","path":".github/workflows/acceptance-wp000.yml","run_attempt":1,"status":"completed","conclusion":"skipped"},"34870077092":{"head_sha":"b7cbb59934616347ed7d923fefd83587e210877b","event":"push","path":".github/workflows/ci.yml","run_attempt":1,"status":"completed","conclusion":"success"},"34865172653":{"head_sha":"33f64ff4835d2a84b4ea9b6960ab39c9ac130d09","event":"pull_request","path":".github/workflows/acceptance-wp000.yml","run_attempt":1,"status":"completed","conclusion":"success"},"34865172614":{"head_sha":"33f64ff4835d2a84b4ea9b6960ab39c9ac130d09","event":"pull_request","path":".github/workflows/review-wp000-spec.yml","run_attempt":1,"status":"completed","conclusion":"skipped"},"34864087333":{"head_sha":"093b3128753089b991554d5964fc2747d9703da5","event":"pull_request","path":".github/workflows/acceptance-wp000.yml","run_attempt":1,"status":"completed","conclusion":"failure"},"34864087242":{"head_sha":"093b3128753089b991554d5964fc2747d9703da5","event":"pull_request","path":".github/workflows/review-wp000-spec.yml","run_attempt":1,"status":"completed","conclusion":"skipped"},"34863629601":{"head_sha":"03e4a405362ef8893d0193a45a6ff40c07c7f902","event":"pull_request","path":".github/workflows/acceptance-wp000.yml","run_attempt":1,"status":"completed","conclusion":"skipped"},"34863629511":{"head_sha":"03e4a405362ef8893d0193a45a6ff40c07c7f902","event":"pull_request","path":".github/workflows/review-wp000-spec.yml","run_attempt":1,"status":"completed","conclusion":"success"},"34808858709":{"head_sha":"900833d041486643540ea794bbe0bbad80f557bb","event":"pull_request","path":".github/workflows/acceptance-wp000.yml","run_attempt":1,"status":"completed","conclusion":"failure"},"34808858643":{"head_sha":"900833d041486643540ea794bbe0bbad80f557bb","event":"pull_request","path":".github/workflows/review-wp000-spec.yml","run_attempt":1,"status":"completed","conclusion":"skipped"},"34798068682":{"head_sha":"932a10f9fddc5535c950bd335e4a23e32e6c9b6c","event":"pull_request","path":".github/workflows/review-wp000-spec.yml","run_attempt":1,"status":"completed","conclusion":"skipped"},"34798068618":{"head_sha":"932a10f9fddc5535c950bd335e4a23e32e6c9b6c","event":"pull_request","path":".github/workflows/acceptance-wp000.yml","run_attempt":1,"status":"completed","conclusion":"skipped"},"34795793655":{"head_sha":"f7e959f95de470e2d6bef461e17b42c3218ec74f","event":"pull_request","path":".github/workflows/review-wp000-spec.yml","run_attempt":1,"status":"completed","conclusion":"skipped"},"34795793642":{"head_sha":"f7e959f95de470e2d6bef461e17b42c3218ec74f","event":"pull_request","path":".github/workflows/acceptance-wp000.yml","run_attempt":1,"status":"completed","conclusion":"success"},"34790828987":{"head_sha":"7135c4d8279bb3d48ad20b4bb30b1e91a59eb630","event":"pull_request","path":".github/workflows/review-wp000-spec.yml","run_attempt":1,"status":"completed","conclusion":"skipped"},"34790828977":{"head_sha":"7135c4d8279bb3d48ad20b4bb30b1e91a59eb630","event":"pull_request","path":".github/workflows/acceptance-wp000.yml","run_attempt":1,"status":"completed","conclusion":"success"},"34759038403":{"head_sha":"d149efe64b0ed33b73d57a6e806c61d2fa24b340","event":"pull_request","path":".github/workflows/acceptance-wp000.yml","run_attempt":1,"status":"completed","conclusion":"skipped"},"34759038401":{"head_sha":"d149efe64b0ed33b73d57a6e806c61d2fa24b340","event":"pull_request","path":".github/workflows/review-wp000-spec.yml","run_attempt":1,"status":"completed","conclusion":"skipped"},"34749424828":{"head_sha":"21016357f0454b15dfd9e135b6db1501ddfc2386","event":"pull_request","path":".github/workflows/review-wp000-spec.yml","run_attempt":1,"status":"completed","conclusion":"skipped"},"34749424709":{"head_sha":"21016357f0454b15dfd9e135b6db1501ddfc2386","event":"pull_request","path":".github/workflows/acceptance-wp000.yml","run_attempt":1,"status":"completed","conclusion":"success"},"34745712444":{"head_sha":"a33014ceb48f57e596feebc3d7207db1ae580f4e","event":"pull_request","path":".github/workflows/acceptance-wp000.yml","run_attempt":1,"status":"completed","conclusion":"failure"},"34734791059":{"head_sha":"69e1ea78c51370d221edc9179dfd573340b63d5b","event":"pull_request","path":".github/workflows/review-wp000-spec.yml","run_attempt":1,"status":"completed","conclusion":"success"}};
if(require.main===module)(process.env.FS_GRANT==="FS24-D"?mainD():mainC()).catch(error=>{emitFile("integration-error.json",Buffer.from(JSON.stringify({error:redactGit(String(error))})+"\n"));console.error(redactGit(String(error)));process.exitCode=1;});
