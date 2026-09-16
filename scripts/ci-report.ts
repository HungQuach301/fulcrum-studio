import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { secretLine } from "./guardrails/secrets";

export type Verdict = "success" | "failure" | "skipped" | "cancelled";
export interface Summary { head: string; base: string; job: string; result: Verdict; errors: string[]; }
export interface Need { result: Verdict; outputs?: { summary?: string }; }
export function render(head: string, base: string, needs: Record<string, Need>): { text: string; pass: boolean } {
  if (!/^[a-f0-9]{40}$/.test(head) || !/^[a-f0-9]{40}$/.test(base)) throw new Error("report-identity");
  const rows = ["commit=" + head, "baseline=" + base, "reportOwnFinalStatus=requires-job-log-and-API-readback"];
  let pass = true;
  for (const job of ["validate", "typecheck", "guardrails"]) {
    const need = needs[job];
    if (!need || !["success", "failure", "skipped", "cancelled"].includes(need.result)) throw new Error("report-verdict-missing:" + job);
    rows.push("job=" + job + ";verdict=" + need.result);
    if (need.result !== "success") pass = false;
    let summary: Summary;
    try { summary = JSON.parse(need.outputs?.summary ?? "") as Summary; }
    catch { rows.push("evidence=missing-summary"); pass = false; continue; }
    if (summary.head !== head || summary.base !== base || summary.job !== job || !Array.isArray(summary.errors)) throw new Error("report-summary-identity:" + job);
    if (summary.result !== need.result) { rows.push("evidence=summary-final-status-differs;read-job-finalizers"); pass = false; }
    for (const line of summary.errors.slice(0, 20)) rows.push(secretLine(String(line)) ? "error=[redacted]" : "error=" + String(line).replace(/[\r\n]/g, " ").slice(0, 400));
  }
  rows.push("technicalResult=" + (pass ? "pass" : "fail"), "ownerAcceptance=pending", "billingActualUsd=unknown", "branchProtection=unproven-by-this-report");
  if (rows.length >= 100) throw new Error("report-line-limit");
  return { text: rows.join("\n") + "\n", pass };
}
export interface Identity { grant: string; run: string; attempt: string; head: string; job: string; event: string; base: string; }
export function frame(id: Identity, entries: Record<string, Buffer>): string {
  const lines = ["FS23_BEGIN\t" + [id.grant, id.run, id.attempt, id.head, id.job, id.event, id.base].join("\t")];
  for (const [name, bytes] of Object.entries(entries)) {
    if (!/^[A-Za-z0-9_.-]+$/.test(name)) throw new Error("frame-name");
    const encoded = Buffer.from(name).toString("base64");
    lines.push(["FS23_FILE", encoded, bytes.length, createHash("sha256").update(bytes).digest("hex")].join("\t"));
    const value = bytes.toString("base64"); let sequence = 1;
    for (let i = 0; i < value.length; i += 2048) lines.push("FS23_DATA\t" + sequence++ + "\t" + value.slice(i, i + 2048));
    lines.push("FS23_END\t" + encoded);
  }
  lines.push("FS23_COMPLETE\t" + Object.keys(entries).length); return lines.join("\n") + "\n";
}
export function decode(text: string, id: Identity): Record<string, Buffer> {
  const expected = "FS23_BEGIN\t" + [id.grant, id.run, id.attempt, id.head, id.job, id.event, id.base].join("\t");
  let began = false, complete = false, current: { name: string; encoded: string; bytes: number; sha: string; chunks: string[] } | undefined;
  const result: Record<string, Buffer> = Object.create(null) as Record<string, Buffer>;
  for (const line of text.trimEnd().split("\n")) {
    const fields = line.split("\t");
    if (complete) throw new Error("frame-after-complete");
    if (!began) { if (line !== expected) throw new Error("frame-identity"); began = true; continue; }
    if (fields[0] === "FS23_FILE") {
      if (current || fields.length !== 4 || !/^\d+$/.test(fields[2]) || !/^[a-f0-9]{64}$/.test(fields[3])) throw new Error("frame-file");
      const name = Buffer.from(fields[1], "base64").toString("utf8");
      if (!/^[A-Za-z0-9_.-]+$/.test(name) || Buffer.from(name).toString("base64") !== fields[1] || Object.hasOwn(result, name)) throw new Error("frame-name");
      current = { name, encoded: fields[1], bytes: Number(fields[2]), sha: fields[3], chunks: [] };
    } else if (fields[0] === "FS23_DATA") {
      if (!current || fields.length !== 3 || fields[1] !== String(current.chunks.length + 1) || !/^[A-Za-z0-9+/]+={0,2}$/.test(fields[2])) throw new Error("frame-chunk");
      current.chunks.push(fields[2]);
    } else if (fields[0] === "FS23_END") {
      if (!current || fields.length !== 2 || fields[1] !== current.encoded) throw new Error("frame-end");
      const value = current.chunks.join(""); const bytes = Buffer.from(value, "base64");
      if (bytes.toString("base64") !== value || bytes.length !== current.bytes || createHash("sha256").update(bytes).digest("hex") !== current.sha) throw new Error("frame-byte-hash");
      result[current.name] = bytes; current = undefined;
    } else if (fields[0] === "FS23_COMPLETE") {
      if (current || fields.length !== 2 || fields[1] !== String(Object.keys(result).length)) throw new Error("frame-complete"); complete = true;
    } else throw new Error("frame-unrecognized");
  }
  if (!began || !complete || current) throw new Error("frame-incomplete"); return result;
}
if (require.main === module) {
  const needs = JSON.parse(process.env.FS_NEEDS ?? "{}") as Record<string, Need>;
  const value = render(process.env.FS_HEAD ?? "", process.env.FS_BASE ?? "", needs);
  writeFileSync((process.env.FS_EVIDENCE ?? ".") + "/ci-report.txt", value.text);
  // Retain raw needs separately from the bounded human-readable report.
  writeFileSync((process.env.FS_EVIDENCE ?? ".") + "/needs.json", JSON.stringify(needs, null, 2) + "\n");
  process.stdout.write(value.text); process.exitCode = value.pass ? 0 : 1;
}


export interface EvidenceBundleRef {
  source: {repository:string;run:string;attempt:string;head:string;job:string;event:string};
  bundle: {bytes:number;sha256:string};
}
export function assertEvidenceBundleRef(value:EvidenceBundleRef, expected:EvidenceBundleRef["source"]):void {
  if(!value||!value.source||!value.bundle||Object.keys(expected).some(key=>value.source[key as keyof typeof expected]!==expected[key as keyof typeof expected])||value.source.repository!=="HungQuach301/fulcrum-studio"||value.source.attempt!=="1"||!Number.isSafeInteger(value.bundle.bytes)||value.bundle.bytes<=0||value.bundle.bytes>64*1024*1024||!(/^[a-f0-9]{64}$/).test(value.bundle.sha256))throw new Error("E-BundleReference");
  // A valid reference is metadata only; bytes/CRC/member/API finalizers must be checked separately.
}
