import { createHash } from "node:crypto";
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
export interface Manifest { grant: "FS24-B"; repository: string; run: string; attempt: string; head: string; tree: string; producer: string; artifactName: string; operations: Operation[]; }
export interface ArtifactMeta { id: number; name: string; expired: boolean; digest?: string; workflow_run: { id: number; head_sha: string }; }
export interface Run { id: number; head_sha: string; event: string; head_branch: string; path: string; status: string; conclusion: string | null; run_attempt: number; }
export interface Job { id: number; name: string; status: string; conclusion: string | null; }

/** Authenticated calls are confined to this repository. Redirect destinations never receive the token. */
export class GitHubTransport {
  constructor(private readonly token: string) { if (!token) throw new Error("MissingActionsToken"); }
  async request(path: string, method = "GET", body?: unknown, observe?: (response:Response)=>Promise<void>): Promise<Response> {
    if (!/^\/(actions|git|commits|compare|pulls)\//.test(path) || path.includes("..") || path.includes("#")) throw new Error("ApiScope");
    const apiVersion = observe && method === "GET" && /^\/pulls\/[1-9][0-9]*$/.test(path) ? MERGE_RECEIPT_API_VERSION : "2026-03-10";
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
  async json<T>(path: string): Promise<T> { return await (await this.request(path)).json() as T; }

  async mergeReceipt(number:number,label:string):Promise<unknown> {
    if(!Number.isSafeInteger(number)||number<1||!/^merge-(history|repair)$/.test(label))throw new Error("MergeReceiptScope");
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
    });
    if(!raw)throw new Error("MergeReceiptMissingBody");
    try{return JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(raw)) as unknown;}
    catch{throw new Error("MergeReceiptInvalidJSON");}
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
    const bytes=await this.bytes("/actions/artifacts/"+id+"/zip",2*1024*1024);
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
    for(const name of ["original.zip","receipt.json"]) emitFile("artifact-"+id+"-"+name,readFileSync(join(directory,name)));
    return {manifest,files:entries,metadata:meta};
  }
}
export function validateManifest(manifest: Manifest, files: Record<string,string>): void {
  assertCommit(manifest.head);assertCommit(manifest.tree);
  if(manifest.grant!=="FS24-B"||manifest.repository!==REPOSITORY||manifest.attempt!=="1"||!/^\d+$/.test(manifest.run)) throw new Error("ManifestGrant");
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
export function emitFile(name: string, bytes: Buffer): void {
  if(!/^[A-Za-z0-9_.-]+$/.test(name)) throw new Error("EvidenceName");
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
