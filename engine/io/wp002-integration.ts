import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { GitSource, Schemas, frozen } from "../../scripts/validate";
import { GitHubTransport, Manifest, Operation, Entry, SOURCE, REPOSITORY, digest, emitFile } from "./github-transport";

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
  const producer=process.env.FS_PRODUCER??"foundation";
  const value=bundle(root,head,run,producer);
  if(mode==="prepare") {
    const dest=join(dir,"handoff");mkdirSync(dest,{recursive:true});
    for(const [name,content]of Object.entries(value.files))writeFileSync(join(dest,name),content);
    writeFileSync(process.env.GITHUB_OUTPUT!,"artifact_name="+value.manifest.artifactName+"\nmanifest_hash="+digest(value.files["manifest.json"])+"\n",{flag:"a"});
    emitFile("producer-manifest.json",Buffer.from(value.files["manifest.json"]));
  } else if(mode==="receive") {
    const {operations,...expected}=value.manifest;
    const api=new GitHubTransport(process.env.GH_TOKEN!);
    const got=await api.artifact(Number(process.env.FS_ARTIFACT_ID),expected,digest(value.files["manifest.json"]),join(dir,"artifact-received"));
    for(const [name,content]of Object.entries(value.files))if(got.files[name]!==content)throw new Error("ProducerReceiverMismatch");
    writeFileSync(join(process.env.FS_EVIDENCE!,"artifact-prequalification.json"),JSON.stringify({result:"pass",artifactId:got.metadata.id,head,run,manifestHash:digest(value.files["manifest.json"]),payloadHashAgreement:true,originalZipRetainedInFrames:true})+"\n");
  } else throw new Error("ModeNotEnabled");
}
if(require.main===module)main().catch(error=>{console.error(String(error));process.exitCode=1;});
