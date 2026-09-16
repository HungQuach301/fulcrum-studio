import { gzipSync } from "node:zlib";
import { randomUUID, createHash } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { assertCommit, assertPath, stateRecord } from "./repo-store";

// Explicit receipt contract; other REST calls keep the 2026-03-10 default.
const MERGE_RECEIPT_API_VERSION = "2022-11-28";
export const REPOSITORY = "HungQuach301/fulcrum-studio";
export const SOURCE = "bd7f0eb5b225ed43d610af12b5febbe82a7dbec4";
export const POLICY = "76aae91e0bd415176e102136a11449791e4ecc7e";
export const digest = (bytes: string | Buffer) => createHash("sha256").update(bytes).digest("hex");
export interface Entry { name: string; path: string; schema: string; mode: "replace" | "append"; bytes: number; sha256: string; }
export interface Operation { name: string; episodeId: string; entries: Entry[]; }
export interface Manifest { grant: "FS24-B" | "FS24-C" | "FS24-D"; batch?:string; origin?:string; repository: string; run: string; attempt: string; head: string; tree: string; producer: string; artifactName: string; operations: Operation[]; }
export interface ArtifactMeta { id: number; name: string; expired: boolean; digest?: string; workflow_run: { id: number; head_sha: string }; }
export interface Run { display_title?: string; repository?: {full_name:string}; head_repository?: {full_name:string}; id: number; head_sha: string; event: string; head_branch: string; path: string; status: string; conclusion: string | null; run_attempt: number; }
export interface Job { steps?:Array<{name:string;conclusion:string|null}>; started_at?:string; completed_at?:string; run_id?:number; run_attempt?:number; id: number; name: string; status: string; conclusion: string | null; }

/** Authenticated calls are confined to this repository. Redirect destinations never receive the token. */
export class GitHubTransport {
  constructor(private readonly token: string) { if (!token) throw new Error("MissingActionsToken"); }
  async request(path: string, method = "GET", body?: unknown, observe?: (response:Response)=>Promise<void>, receiptVersion = false): Promise<Response> {
    if (!/^\/(actions|git|commits|compare|pulls)\//.test(path) || path.includes("..") || path.includes("#")) throw new Error("ApiScope");
    if(receiptVersion && (!observe || method !== "GET" || !/^\/pulls\/[1-9][0-9]*$/.test(path))) throw new Error("MergeReceiptVersionScope");
    const apiVersion = receiptVersion ? MERGE_RECEIPT_API_VERSION : "2026-03-10";
    const response = await fetch("https://api.github.com/repos/" + REPOSITORY + path, { method, redirect: "manual", headers: {
      Authorization: "Bearer " + this.token, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": apiVersion, "Content-Type": "application/json"
    }, body: body === undefined ? undefined : JSON.stringify(body) });
    // The receipt observer owns the body. A cloned tee can leave iterator cancellation
    // pending on its unread sibling when a capped response is rejected.
    if(observe) await observe(response);
    // No automatic HTTP retry, including 403 and ambiguous POST responses.
    if (!response.ok && response.status !== 302) throw new Error("GitHubHTTP:" + response.status + ":" + method + ":" + path.split("?")[0]);
    return response;
  }
  private readSequence = 0;
  async json<T>(path: string): Promise<T> {
    if(process.env.FS_GRANT!=="FS24-D")return await (await this.request(path)).json() as T;
    const response=await this.control(path,"GET",undefined,"get-"+(++this.readSequence));
    return JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(response.raw)) as T;
  }

  async mergeReceipt(number:number,label:string):Promise<unknown> {
    if(!Number.isSafeInteger(number)||number<1||!/^merge-(history|repair|activation|d-[1-9][0-9]*)$/.test(label))throw new Error("MergeReceiptScope");
    let raw:Buffer|undefined;
    await this.request("/pulls/"+number,"GET",undefined,async response=>{
      const chunks:Buffer[]=[];let size=0;
      if(response.body)for await(const part of response.body as unknown as AsyncIterable<Uint8Array>) {
        size+=part.length;if(size>1024*1024){emitFile(label+"-error.json",Buffer.from(JSON.stringify({error:"ResponseByteCap",status:response.status,cap:1024*1024})));throw new Error("MergeReceiptByteCap");}
        chunks.push(Buffer.from(part));
      }
      raw=Buffer.concat(chunks);
      const metadata={path:"/pulls/"+number,status:response.status,requestedApiVersion:MERGE_RECEIPT_API_VERSION,selectedApiVersion:response.headers.get("x-github-api-version-selected"),requestId:response.headers.get("x-github-request-id"),receivedAt:new Date().toISOString(),bytes:raw.length,sha256:digest(raw)};
      emitFile(label+"-response.raw.json",raw);
      emitFile(label+"-response-metadata.json",Buffer.from(JSON.stringify(metadata)+"\n"));
    },true);
    if(!raw)throw new Error("MergeReceiptMissingBody");
    try{return JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(raw)) as unknown;}
    catch{throw new Error("MergeReceiptInvalidJSON");}
  }

  async control(path:string,method:string,body:unknown,label:string):Promise<{status:number;raw:Buffer}> {
    if(method!=="GET")emitFile(label+"-intent.json",Buffer.from(JSON.stringify({path,method,body,requestDigest:digest(JSON.stringify(body)??""),sentAt:new Date().toISOString()})+"\n"));
    let raw=Buffer.alloc(0),status=0;
    await this.request(path,method,body,async response=>{
      status=response.status;const chunks:Buffer[]=[];let size=0;
      let capped=false;
      if(response.body)for await(const chunk of response.body as unknown as AsyncIterable<Uint8Array>){size+=chunk.length;if(size>1024*1024){chunks.push(Buffer.from(chunk).subarray(0,Math.max(0,1024*1024-(size-chunk.length))));capped=true;break;}chunks.push(Buffer.from(chunk));}
      raw=Buffer.concat(chunks);
      const compressed=process.env.FS_GRANT==="FS24-D"&&method==="GET"&&raw.length>32768;
      emitFile(label+(compressed?"-raw.json.gz":"-raw.json"),compressed?gzipSync(raw):raw);
      emitFile(label+"-metadata.json",Buffer.from(JSON.stringify({method,path,status,rawEncoding:compressed?"gzip":"identity",request:body,requestDigest:digest(JSON.stringify(body)??""),capped,requestedApiVersion:"2026-03-10",selectedApiVersion:response.headers.get("x-github-api-version-selected"),requestId:response.headers.get("x-github-request-id"),bytes:raw.length,sha256:digest(raw)})+"\n"));
      if(capped)throw new Error("ControlResponseCap");
    });
    return {status,raw};
  }
  async dispatchC(workflow:string,inputs:Record<string,string>,requestId:string):Promise<number> {
    if(!["commit-artifacts.yml","reindex.yml","ci.yml"].includes(workflow)||!/^[a-f0-9]{64}$/.test(requestId))throw new Error("DispatchScope");
    const response=await this.control("/actions/workflows/"+workflow+"/dispatches","POST",{ref:"main",inputs},"dispatch-"+requestId);
    if(response.status!==200)throw new Error("DispatchStatusDoNotRetry");
    const body=JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(response.raw)) as {workflow_run_id:number;run_url:string;html_url:string};
    if(!Number.isSafeInteger(body.workflow_run_id)||body.workflow_run_id<1||body.run_url!=="https://api.github.com/repos/"+REPOSITORY+"/actions/runs/"+body.workflow_run_id||body.html_url!=="https://github.com/"+REPOSITORY+"/actions/runs/"+body.workflow_run_id)throw new Error("DispatchReceiptMissingDoNotRetry");
    const run=await this.json<Run>("/actions/runs/"+body.workflow_run_id);
    validateDispatchedRun(run,body.workflow_run_id,workflow,requestId);
    emitFile("dispatch-"+requestId+"-bound.json",Buffer.from(JSON.stringify(run)+"\n"));return body.workflow_run_id;
  }
  async page<T extends {id:number}>(path:string,key:string):Promise<T[]> {
    const rows:T[]=[];const ids=new Set<number>();let total:number|undefined;
    for(let page=1;;page++) {
      const pageSize=process.env.FS_GRANT==="FS24-D"?50:100;
      const body=await this.json<Record<string,unknown>>(path+(path.includes("?")?"&":"?")+"per_page="+pageSize+"&page="+page);
      if(!Number.isSafeInteger(body.total_count)||Number(body.total_count)<0||!Array.isArray(body[key]))throw new Error("PaginationShape");
      if(total===undefined)total=Number(body.total_count);else if(total!==body.total_count)throw new Error("PaginationChanged");
      const batch=body[key] as T[];
      for(const row of batch){if(!Number.isSafeInteger(row.id)||ids.has(row.id))throw new Error("PaginationDuplicate");ids.add(row.id);rows.push(row);}
      if(rows.length===total)return rows;
      if(!batch.length||rows.length>total)throw new Error("PaginationIncomplete");
    }
  }
  async cancelC(run:string):Promise<void> {
    if(run!==process.env.GITHUB_RUN_ID||process.env.FS24_OPERATION!=="side-effect"||process.env.FS_GRANT!=="FS24-C")throw new Error("CancelScope");
    const response=await this.control("/actions/runs/"+run+"/cancel","POST",undefined,"cancel-"+run);
    if(response.status!==202)throw new Error("CancelStatusDoNotRetry");
  }
  protected async pauseDObservation():Promise<void> {
    await new Promise(resolve=>setTimeout(resolve,10000));
  }
  async dispatchD(workflow:string,inputs:Record<string,string>,requestId:string,checkHead:(head:string)=>void):Promise<number> {
    if(!["commit-artifacts.yml","reindex.yml","ci.yml"].includes(workflow)||!/^[a-f0-9]{64}$/.test(requestId)||process.env.FS_JOB!=="controller")throw new Error("D-DispatchScope");
    const response=await this.control("/actions/workflows/"+workflow+"/dispatches","POST",{ref:"main",inputs},"dispatch-"+requestId);
    if(response.status!==200)throw new Error("DispatchStatusDoNotRetry");
    const body=JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(response.raw)) as {workflow_run_id:number;run_url:string;html_url:string};
    if(!Number.isSafeInteger(body.workflow_run_id)||body.workflow_run_id<1||body.run_url!=="https://api.github.com/repos/"+REPOSITORY+"/actions/runs/"+body.workflow_run_id||body.html_url!=="https://github.com/"+REPOSITORY+"/actions/runs/"+body.workflow_run_id)throw new Error("DispatchReceiptMissingDoNotRetry");
    // The ack fixes the only run we may observe. A queued run can still carry its
    // workflow name before GitHub evaluates run-name (runs 35037890030/35037891456).
    const placeholder:Record<string,string>={"commit-artifacts.yml":"WP-002 Serialized Writer","reindex.yml":"WP-002 Reindex","ci.yml":"Fulcrum CI"};
    let observation=0;const checkedHeads=new Set<string>();
    for(;;) {
      const run=await this.json<Run>("/actions/runs/"+body.workflow_run_id);
      validateDRunIdentity(run,body.workflow_run_id,workflow);
      if(!/^[a-f0-9]{40}$/.test(run.head_sha))throw new Error("D-DispatchHead");
      if(!checkedHeads.has(run.head_sha)){checkHead(run.head_sha);checkedHeads.add(run.head_sha);}
      if(run.display_title==="FS24-D "+requestId) {
        validateDRun(run,body.workflow_run_id,workflow,requestId);
        emitFile("dispatch-"+requestId+"-bound.json",Buffer.from(JSON.stringify(run)+"\n"));return body.workflow_run_id;
      }
      if(run.display_title!==placeholder[workflow]||run.conclusion!==null||!["queued","waiting","pending","requested","in_progress"].includes(run.status))throw new Error("D-DispatchRunBinding");
      emitFile("dispatch-"+requestId+"-observing-"+(++observation)+".json",Buffer.from(JSON.stringify({id:run.id,head:run.head_sha,status:run.status,display_title:run.display_title,requestId})+"\n"));
      // Observation of one acknowledged run is not a retry of its POST or an HTTP error.
      await this.pauseDObservation();
    }
  }
  async cancelD(run:string):Promise<void> {
    if(run!==process.env.GITHUB_RUN_ID||process.env.FS_JOB!=="writer-cancel"||process.env.FS24_OPERATION!=="side-effect"||process.env.FS_GRANT!=="FS24-D")throw new Error("CancelScope");
    const response=await this.control("/actions/runs/"+run+"/cancel","POST",undefined,"cancel-"+run);
    if(response.status!==202)throw new Error("CancelStatusDoNotRetry");
  }
  async dispatch(workflow: string, inputs: Record<string,string>): Promise<number> {
    if (!["commit-artifacts.yml","reindex.yml","ci.yml"].includes(workflow)) throw new Error("DispatchScope");
    const response=await this.request("/actions/workflows/"+workflow+"/dispatches","POST",{ref:"main",inputs});
    const body=await response.json() as {workflow_run_id?:number};
    if(!Number.isSafeInteger(body.workflow_run_id)) throw new Error("DispatchReceiptMissingDoNotRetry");
    console.log("FS24B_DISPATCH\t"+JSON.stringify({workflow,run:body.workflow_run_id,inputs}));
    return body.workflow_run_id!;
  }
  async cancelOwnRun(run: string): Promise<void> {
    if(run!==process.env.GITHUB_RUN_ID || process.env.FS24_OPERATION!=="side-effect") throw new Error("CancelScope");
    await this.request("/actions/runs/"+run+"/cancel","POST");
    console.log("FS24B_CANCEL_REQUESTED\t"+run);
  }
  async wait(run: number): Promise<Run> {
    for (;;) {
      const value=await this.json<Run>("/actions/runs/"+run);
      if(value.run_attempt!==1) throw new Error("UnexpectedRunAttempt");
      if(value.status==="completed") return value;
      console.log("FS24B_WAIT\t"+JSON.stringify({run,status:value.status}));
      await new Promise(resolve=>setTimeout(resolve,10000));
    }
  }
  async bytes(path: string, cap: number): Promise<Buffer> {
    let response=await this.request(path);
    if(response.status===302) {
      const location=response.headers.get("location");
      if(!location || new URL(location).protocol!=="https:" || new URL(location).username) throw new Error("DownloadLocation");
      // A signed URL is obtained only from the authenticated GitHub resource above. Never log it.
      response=await fetch(location,{redirect:"error"});
      if(!response.ok) throw new Error("DownloadHTTP:"+response.status);
    }
    const chunks:Buffer[]=[];let size=0;
    if(!response.body) throw new Error("MissingDownloadBody");
    for await(const chunk of response.body as unknown as AsyncIterable<Uint8Array>) {
      size+=chunk.length;if(size>cap) throw new Error("DownloadByteCap");chunks.push(Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }
  async artifact(id: number, expected: Omit<Manifest,"operations">, expectedManifestHash: string, directory: string): Promise<{manifest:Manifest; files:Record<string,string>; metadata:ArtifactMeta}> {
    if(!Number.isSafeInteger(id)||id<=0||!/^[a-f0-9]{64}$/.test(expectedManifestHash)) throw new Error("ArtifactIdentity");
    const meta=await this.json<ArtifactMeta>("/actions/artifacts/"+id);
    if(meta.id!==id||meta.expired||meta.name!==expected.artifactName||meta.workflow_run.id!==Number(expected.run)||meta.workflow_run.head_sha!==expected.head) throw new Error("ArtifactMetadataMismatch");
    if(expected.grant==="FS24-C"||expected.grant==="FS24-D") {
      const run=await this.json<Run>("/actions/runs/"+expected.run);
      const jobs=await this.page<Job>("/actions/runs/"+expected.run+"/jobs","jobs");
      const name=expected.producer==="foundation"?"foundation":"producer-"+expected.producer;
      const producer=jobs.filter(x=>x.name===name);
      if(run.run_attempt!==1||run.head_sha!==expected.head||run.path!==".github/workflows/acceptance-wp002.yml"||producer.length!==1||!["in_progress","completed"].includes(producer[0].status)||producer[0].status==="completed"&&producer[0].conclusion!=="success")throw new Error("ArtifactProducerJob");
      if(expected.producer==="foundation"?!["push","pull_request"].includes(run.event)||run.head_branch!=="wp/002":run.event!==(expected.grant==="FS24-D"?"workflow_dispatch":"workflow_run")||run.head_branch!=="main")throw new Error("ArtifactProducerEvent");
      emitFile("artifact-"+id+"-producer.json",Buffer.from(JSON.stringify({run,job:producer[0],expected})+"\n"));
    }
    const bytes=await this.bytes("/actions/artifacts/"+id+"/zip",2*1024*1024);
    emitFile("artifact-"+id+"-original.zip",bytes);
    emitFile("artifact-"+id+"-metadata.json",Buffer.from(JSON.stringify(meta)+"\n"));
    if(meta.digest && meta.digest!=="sha256:"+digest(bytes)) throw new Error("ArtifactZipDigestMismatch");
    mkdirSync(directory,{recursive:true});const zip=join(directory,"original.zip");writeFileSync(zip,bytes,{flag:"wx"});
    const result=spawnSync("python3",["-c",ZIP_READER,zip],{encoding:"utf8",maxBuffer:4*1024*1024});
    if(result.status!==0) throw new Error("ArtifactZipRejected:"+result.stderr);
    const entries=JSON.parse(result.stdout) as Record<string,string>;
    if(typeof entries["manifest.json"]!=="string"||digest(entries["manifest.json"])!==expectedManifestHash) throw new Error("ManifestHashMismatch");
    const manifest=JSON.parse(entries["manifest.json"]) as Manifest;
    for(const key of Object.keys(expected) as Array<keyof typeof expected>) if(manifest[key]!==expected[key]) throw new Error("ManifestIdentity:"+key);
    validateManifest(manifest,entries);
    writeFileSync(join(directory,"receipt.json"),JSON.stringify({metadata:meta,zipBytes:bytes.length,zipSha256:digest(bytes),upstreamZipDigest:meta.digest??null,manifestSha256:expectedManifestHash,expected,crc:"pass",members:Object.keys(entries)},null,2)+"\n");
    for(const name of ["receipt.json"]) emitFile("artifact-"+id+"-"+name,readFileSync(join(directory,name)));
    return {manifest,files:entries,metadata:meta};
  }
}
export function validateManifest(manifest: Manifest, files: Record<string,string>): void {
  assertCommit(manifest.head);assertCommit(manifest.tree);
  if(!["FS24-B","FS24-C","FS24-D"].includes(manifest.grant)||manifest.repository!==REPOSITORY||manifest.attempt!=="1"||!/^\d+$/.test(manifest.run)) throw new Error("ManifestGrant");
  const declared=new Set(["manifest.json"]), operations=new Set<string>();
  for(const operation of manifest.operations) {
    if(!/^[a-z][a-z0-9-]+$/.test(operation.name)||operations.has(operation.name)||!operation.entries.length) throw new Error("ManifestOperation");operations.add(operation.name);
    for(const entry of operation.entries) {
      assertPath(entry.path);
      if(!/^[A-Za-z0-9_-]+\.(json|jsonl)$/.test(entry.name)||declared.has(entry.name)) throw new Error("ManifestMember");declared.add(entry.name);
      if(entry.path!=="pipeline/runs.jsonl"&&!entry.path.startsWith("episodes/"+operation.episodeId+"/")) throw new Error("ManifestEpisode");
      const content=files[entry.name];if(typeof content!=="string"||Buffer.byteLength(content)!==entry.bytes||digest(content)!==entry.sha256) throw new Error("MemberByteHash");
    }
  }
  if(Object.keys(files).some(x=>!declared.has(x))||declared.size!==Object.keys(files).length) throw new Error("UndeclaredMember");
}
const evidenceProcess=randomUUID();
let evidenceSequence=0;
export function emitFile(name: string, bytes: Buffer): void {
  if(!/^[A-Za-z0-9_.-]+$/.test(name)) throw new Error("EvidenceName");
  // Preserve every observation, including repeated logical names, without nesting base64.
  if(process.env.FS_EVIDENCE_MODE==="bundle-v1") {
    if(!process.env.FS_EVIDENCE)throw new Error("EvidenceDirectoryRequired");
    const observation=randomUUID();
    const stored="observation-"+observation+".bin";
    writeFileSync(join(process.env.FS_EVIDENCE,stored),bytes,{flag:"wx"});
    writeFileSync(join(process.env.FS_EVIDENCE,"observation-"+observation+".json"),JSON.stringify({
      version:"FS24E/1",observer:evidenceProcess,sequence:++evidenceSequence,observedAt:new Date().toISOString(),name,stored,bytes:bytes.length,sha256:digest(bytes),
      run:process.env.GITHUB_RUN_ID,attempt:process.env.GITHUB_RUN_ATTEMPT,
      head:process.env.FS_HEAD,job:process.env.FS_JOB
    })+"\n",{flag:"wx"});
    return;
  }
  const id={grant:process.env.FS_GRANT??"FS24-B",run:process.env.GITHUB_RUN_ID,attempt:process.env.GITHUB_RUN_ATTEMPT,head:process.env.FS_HEAD,job:process.env.FS_JOB};
  console.log("FS24B_FILE\t"+JSON.stringify({...id,name,bytes:bytes.length,sha256:digest(bytes)}));
  const value=bytes.toString("base64");for(let i=0;i<value.length;i+=2048)console.log("FS24B_DATA\t"+(i/2048+1)+"\t"+value.slice(i,i+2048));
  console.log("FS24B_END\t"+name);
}
const ZIP_READER=String.raw`
import sys,zipfile,json,stat
out={};total=0
with zipfile.ZipFile(sys.argv[1]) as z:
 for x in z.infolist():
  assert not x.is_dir() and x.filename not in out
  assert '/' not in x.filename and '\\' not in x.filename and not x.filename.startswith('.')
  assert not stat.S_ISLNK(x.external_attr>>16) and not x.flag_bits&1
  total+=x.file_size;assert total<=1024*1024
  out[x.filename]=z.read(x).decode('utf-8')
print(json.dumps(out))
`;

export function validateDispatchedRun(run:Run,id:number,workflow:string,requestId:string):void {
  if(run.id!==id||run.run_attempt!==1||run.event!=="workflow_dispatch"||run.head_branch!=="main"||run.path!==".github/workflows/"+workflow||run.display_title!=="FS24-C "+requestId||run.repository?.full_name!==REPOSITORY||run.head_repository?.full_name!==REPOSITORY)throw new Error("DispatchRunBinding");
}

function validateDRunIdentity(run:Run,id:number,workflow:string):void {
  if(run.id!==id||run.run_attempt!==1||run.event!=="workflow_dispatch"||run.head_branch!=="main"||run.path!==".github/workflows/"+workflow||run.repository?.full_name!==REPOSITORY||run.head_repository?.full_name!==REPOSITORY)throw new Error("D-DispatchRunBinding");
}
export function validateDRun(run:Run,id:number,workflow:string,requestId:string):void {
  validateDRunIdentity(run,id,workflow);
  if(run.display_title!=="FS24-D "+requestId)throw new Error("D-DispatchRunBinding");
}

export interface ReceivedEvidenceBundle { files:Record<string,Buffer>; observations:Array<{name:string;bytes:Buffer;sha256:string}>; }
export async function receiveEvidenceBundle(api:GitHubTransport, log:string, expected:{run:string;head:string;job:string;runHead?:string}):Promise<ReceivedEvidenceBundle|null> {
  const lines=log.split("\n").map(x=>x.replace(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d+Z\s+/,""));
  const references=lines.filter(x=>x.startsWith("FS24E_REF\t"));
  if(!references.length)return null;
  if(references.length!==1||!/^\d+$/.test(expected.run)||!/^[a-f0-9]{40}$/.test(expected.head)||!/^[a-z][a-z0-9-]+$/.test(expected.job))throw new Error("E-BundleReferenceCount");
  const ref=JSON.parse(references[0].slice("FS24E_REF\t".length)) as import("../../scripts/ci-report").EvidenceBundleRef;
  const run=await api.json<Run>("/actions/runs/"+expected.run);
  if(run.id!==Number(expected.run)||run.run_attempt!==1||run.head_sha!==(expected.runHead??expected.head)||run.repository?.full_name!==REPOSITORY||run.head_repository?.full_name!==REPOSITORY)throw new Error("E-BundleRunBinding");
  const {assertEvidenceBundleRef}=await import("../../scripts/ci-report");
  assertEvidenceBundleRef(ref,{repository:REPOSITORY,run:expected.run,head:expected.head,job:expected.job,attempt:"1",event:run.event});
  const artifacts=await api.page<ArtifactMeta>("/actions/runs/"+expected.run+"/artifacts","artifacts");
  const selected=artifacts.filter(x=>x.name==="fs24e-"+expected.run+"-1-"+expected.job);
  if(selected.length!==1||selected[0].expired||selected[0].workflow_run.id!==Number(expected.run)||selected[0].workflow_run.head_sha!==run.head_sha||!/^sha256:[a-f0-9]{64}$/.test(selected[0].digest??""))throw new Error("E-BundleArtifact");
  const artifact=selected[0],raw=await api.bytes("/actions/artifacts/"+artifact.id+"/zip",65*1024*1024);
  if("sha256:"+digest(raw)!==artifact.digest)throw new Error("E-ArtifactDigest");
  const directory=join(process.env.TASK_ROOT!,"e-receive-"+expected.run+"-"+expected.job);
  mkdirSync(directory);writeFileSync(join(directory,"original-artifact.zip"),raw,{flag:"wx"});
  writeFileSync(join(directory,"source.json"),JSON.stringify(ref.source),{flag:"wx"});
  const helper=join(process.env.GITHUB_WORKSPACE!,"engine/io/evidence-transfer.py");
  const read=spawnSync("python3",[helper,"unpack-artifact","--directory",join(directory,"members"),"--file",join(directory,"original-artifact.zip"),"--binding",join(directory,"source.json"),"--index-hash",ref.bundle.sha256],{encoding:"utf8",maxBuffer:1024*1024});
  if(read.status!==0)throw new Error("E-BundleDecode");
  const manifest=JSON.parse(readFileSync(join(directory,"members","bundle-manifest.json"),"utf8")) as {members:Array<{name:string;bytes:number;sha256:string}>};
  const files:Record<string,Buffer>={},observations:Array<{name:string;bytes:Buffer;sha256:string;observer:string;sequence:number}>=[];
  for(const row of manifest.members) {
    const bytes=readFileSync(join(directory,"members",row.name));
    if(bytes.length!==row.bytes||digest(bytes)!==row.sha256)throw new Error("E-ConsumerByteHash");files[row.name]=bytes;
  }
  for(const [name,bytes] of Object.entries(files))if(/^observation-[a-f0-9-]+\.json$/.test(name)) {
    const meta=JSON.parse(bytes.toString()) as {version:string;name:string;stored:string;run:string;attempt:string;head:string;job:string;bytes:number;sha256:string;observer:string;sequence:number};
    const value=files[meta.stored];
    if(meta.version!=="FS24E/1"||!value||meta.run!==expected.run||meta.attempt!=="1"||meta.head!==expected.head||meta.job!==expected.job||value.length!==meta.bytes||digest(value)!==meta.sha256||!Number.isSafeInteger(meta.sequence)||meta.sequence<1)throw new Error("E-ObservationBinding");
    observations.push({name:meta.name,bytes:value,sha256:meta.sha256,observer:meta.observer,sequence:meta.sequence});
  }
  const observers=new Map<string,number>();
  observations.sort((a,b)=>a.observer.localeCompare(b.observer)||a.sequence-b.sequence);
  for(const row of observations){const n=(observers.get(row.observer)??0)+1;if(row.sequence!==n)throw new Error("E-ObservationSequence");observers.set(row.observer,n);}
  return {files,observations};
}
