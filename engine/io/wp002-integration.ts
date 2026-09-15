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
if(require.main===module)mainC().catch(error=>{emitFile("integration-error.json",Buffer.from(JSON.stringify({error:String(error)})+"\n"));console.error(String(error));process.exitCode=1;});
