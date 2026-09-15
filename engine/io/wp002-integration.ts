import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
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
async function main() {
  const mode=process.argv[2],root=process.env.GITHUB_WORKSPACE!,head=process.env.FS_HEAD!,run=process.env.GITHUB_RUN_ID!,dir=process.env.TASK_ROOT!;
  if(process.env.GITHUB_REPOSITORY!==REPOSITORY||process.env.GITHUB_RUN_ATTEMPT!=="1") throw new Error("RuntimeIdentity");
  if(mode==="diagnose-history"||mode==="diagnose-repair") {
    const api=new GitHubTransport(process.env.GH_TOKEN!);
    if(mode==="diagnose-repair") {
      const event=JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH!,"utf8")) as {workflow_run:Run};
      const cause=event.workflow_run;
      if(process.env.GITHUB_EVENT_NAME!=="workflow_run"||cause.event!=="push"||cause.head_branch!=="main"||cause.head_sha!==head||cause.conclusion!=="success"||cause.run_attempt!==1||cause.path!==".github/workflows/ci.yml")throw new Error("DiagnosticTriggerIdentity");
      const current=await api.json<Run>("/actions/runs/"+run);
      if(current.head_sha!==head||current.event!=="workflow_run"||current.head_branch!=="main"||current.run_attempt!==1||current.path!==".github/workflows/acceptance-wp002.yml")throw new Error("DiagnosticRunIdentity");
      const jobs=await api.json<{jobs:Job[]}>("/actions/runs/"+cause.id+"/jobs?per_page=100");
      if(jobs.jobs.length!==4||jobs.jobs.some(x=>x.conclusion!=="success")||["validate","typecheck","guardrails","report"].some(name=>!jobs.jobs.some(x=>x.name===name)))throw new Error("DiagnosticMainCI");
      emitFile("r1-trigger.json",Buffer.from(JSON.stringify({cause,current,jobs})+"\n"));
    }
    const {diagnoseMerge}=await import("./github-writer");
    await diagnoseMerge(root,head,api,mode==="diagnose-repair");return;
  }
  const producer=process.env.FS_PRODUCER??"foundation";
  const value=bundle(root,head,run,producer);
  const api=new GitHubTransport(process.env.GH_TOKEN!);
  if(mode==="admit") {
    const {admittedCode}=await import("./github-writer");await admittedCode(root,head,run,api);
    const ref=await api.json<{object:{sha:string}}>("/git/ref/heads/main");if(ref.object.sha!==head)throw new Error("InitialMainCheckpoint");
    const ledger=await api.json<{total_count:number;workflow_runs:Run[]}>("/actions/runs?per_page=100");
    const same=ledger.workflow_runs.filter(x=>x.head_sha===head&&x.event==="workflow_run"&&x.path===".github/workflows/acceptance-wp002.yml");
    if(same.length!==1||same[0].id!==Number(run))throw new Error("OneBatchOnly");
    writeFileSync(process.env.GITHUB_OUTPUT!,"code="+head+"\nbatch="+run+"\n",{flag:"a"});
    emitFile("admission.json",Buffer.from(JSON.stringify({head,run,ledgerTotal:ledger.total_count,controller:same[0]})+"\n"));return;
  }
  if(mode==="prepare") {
    const dest=join(dir,"handoff");mkdirSync(dest,{recursive:true});
    for(const [name,content]of Object.entries(value.files))writeFileSync(join(dest,name),content);
    writeFileSync(process.env.GITHUB_OUTPUT!,"artifact_name="+value.manifest.artifactName+"\nmanifest_hash="+digest(value.files["manifest.json"])+"\n",{flag:"a"});
    emitFile("producer-manifest.json",Buffer.from(value.files["manifest.json"]));
  } else if(mode==="receive") {
    const {operations,...expected}=value.manifest;
    const got=await api.artifact(Number(process.env.FS_ARTIFACT_ID),expected,digest(value.files["manifest.json"]),join(dir,"artifact-received"));
    for(const [name,content]of Object.entries(value.files))if(got.files[name]!==content)throw new Error("ProducerReceiverMismatch");
    writeFileSync(join(process.env.FS_EVIDENCE!,"artifact-prequalification.json"),JSON.stringify({result:"pass",artifactId:got.metadata.id,head,run,manifestHash:digest(value.files["manifest.json"]),payloadHashAgreement:true,originalZipRetainedInFrames:true})+"\n");
  } else if(mode==="producer-dispatch") {
    const input={batch:run,code:head,producer,artifact:Number(process.env.FS_ARTIFACT_ID),manifestHash:digest(value.files["manifest.json"]),operation:"initial-"+producer};
    const id=await api.dispatch("commit-artifacts.yml",{request:JSON.stringify(input)});
    writeFileSync(process.env.GITHUB_OUTPUT!,"writer_run="+id+"\nartifact="+input.artifact+"\nmanifest_hash="+input.manifestHash+"\n",{flag:"a"});
  } else if(mode==="controller") {
    const {admittedCode}=await import("./github-writer");await admittedCode(root,head,run,api);
    const results:Array<{name:string;run:Run;receipt:unknown}>=[];let dispatches=2;
    const complete=async(name:string,id:number,expected="success")=>{
      const finished=await api.wait(id);if(finished.conclusion!==expected)throw new Error("UnexpectedConclusion:"+name+":"+finished.conclusion);
      const jobs=await api.json<{jobs:Job[]}>("/actions/runs/"+id+"/jobs?per_page=100");const active=jobs.jobs.filter(x=>x.conclusion!=="skipped");if(active.length!==1||jobs.jobs.length>2)throw new Error("WriterJobCount");
      const log=(await api.bytes("/actions/jobs/"+active[0].id+"/logs",16*1024*1024)).toString("utf8");
      const line=log.split("\n").find(x=>x.includes("FS24B_RECEIPT\t{"));
      const receipt=line?JSON.parse(line.slice(line.indexOf("FS24B_RECEIPT\t")+"FS24B_RECEIPT\t".length)):null;
      if(expected!=="failure"&&!receipt)throw new Error("MissingWriteReceipt");
      if(expected==="failure"&&(!log.includes("FS24B_WRITE_ERROR\tError: SchemaRejected")||receipt))throw new Error("WrongNegativeFailure");
      results.push({name,run:finished,receipt});return receipt;
    };
    const input=(operation:string,side="left")=>({batch:run,code:head,producer:side,artifact:Number(process.env[side==="left"?"FS_LEFT_ARTIFACT":"FS_RIGHT_ARTIFACT"]),manifestHash:process.env[side==="left"?"FS_LEFT_HASH":"FS_RIGHT_HASH"]!,operation});
    const dispatch=async(operation:string,side="left",expected="success")=>{
      if(++dispatches>13)throw new Error("DispatchCap");
      const id=await api.dispatch("commit-artifacts.yml",{request:JSON.stringify({...input(operation,side),cancelAfterPush:expected==="cancelled"})});return complete(operation,id,expected);
    };
    await Promise.all([complete("initial-left",Number(process.env.FS_LEFT_RUN)),complete("initial-right",Number(process.env.FS_RIGHT_RUN))]);
    await dispatch("update-one");await dispatch("update-two");
    const duplicate=await dispatch("initial-left");if(!duplicate.duplicate)throw new Error("DuplicateCreatedCommit");
    await dispatch("pending");await dispatch("side-effect","left","cancelled");
    const replay=await dispatch("side-effect");if(!replay.duplicate)throw new Error("ReplayCreatedCommit");
    await dispatch("invalid-state","left","failure");
    await Promise.all([dispatch("logs-left"),dispatch("logs-right","right")]);
    const reindex=await api.dispatch("reindex.yml",{request:JSON.stringify({...input("reindex"),artifact:0,manifestHash:"none"})});dispatches++;
    const indexReceipt=await complete("reindex",reindex);
    const final=indexReceipt.commit as string;
    const ci=await api.dispatch("ci.yml",{expected_head:final,code:head,batch:run});dispatches++;
    if(dispatches!==13)throw new Error("DispatchAccounting");
    const finished=await api.wait(ci);if(finished.conclusion!=="success")throw new Error("FinalCIFailed:"+ci);
    const jobs=await api.json<{jobs:Job[]}>("/actions/runs/"+ci+"/jobs?per_page=100");
    if(jobs.jobs.length!==4||jobs.jobs.some(x=>x.conclusion!=="success"))throw new Error("FinalCIJobs");
    const ref=await api.json<{object:{sha:string}}>("/git/ref/heads/main");if(ref.object.sha!==final)throw new Error("FinalMainChanged");
    // Read the final immutable state through GitHub blob objects, independently of writer memory.
    execFileSync("git",["-C",root,"fetch","origin","main"],{stdio:["ignore","pipe","pipe"]});
    const chain=git(root,"rev-list",head+".."+final).split("\n");if(chain.length!==9)throw new Error("ExpectedNineDataCommits");
    const expectedLogs=[...bundle(root,head,run,"left").files["log.jsonl"].trimEnd().split("\n"),...bundle(root,head,run,"right").files["log.jsonl"].trimEnd().split("\n")];
    const log=git(root,"show",final+":pipeline/runs.jsonl").split("\n");
    const actual=log.filter(x=>{try{return String(JSON.parse(x).runId).startsWith("FS24-B:"+run+":");}catch{return false;}});
    if(actual.length!==50||new Set(actual).size!==50||actual.some(x=>!expectedLogs.includes(x)))throw new Error("LogCoverage");
    const left=bundle(root,head,run,"left").manifest.operations[0].episodeId;
    const state=JSON.parse(git(root,"show",final+":episodes/"+left+"/state.json"));
    if(!state.pendingSideEffects?.length||state.revision!==4)throw new Error("IncompleteStateLost");
    const report={result:"pass",head,final,dispatches,dataCommits:chain.length,logs:actual.length,results,finalCI:finished,finalJobs:jobs.jobs,providerCalls:0,billedCostUsd:null};
    emitFile("integration-result.json",Buffer.from(JSON.stringify(report,null,2)+"\n"));
    writeFileSync(process.env.GITHUB_OUTPUT!,"final="+final+"\nci="+ci+"\n",{flag:"a"});
  } else throw new Error("ModeNotEnabled");
}
if(require.main===module)main().catch(error=>{console.error(String(error));process.exitCode=1;});
