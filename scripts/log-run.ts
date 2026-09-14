import { randomUUID } from "node:crypto";
import type { ArtifactStore, WriteReceipt } from "../engine/io";
import { GitSource, Schemas, git } from "./validate";

export interface RunLine {
  ts: string;
  runId: string;
  episodeId: string;
  stage: string;
  attempt: number;
  verdict: "pass" | "fail" | "blocked" | "skipped" | "cancelled" | "timeout";
  durationMs: number;
  costUsd: number;
  subjectType?: "episode" | "channel" | "workpackage" | "infrastructure";
  subjectId?: string;
  costKind?: "estimated" | "actual";
}

export function encodeRun(line: RunLine, schemas: Schemas): string {
  const errors = schemas.check("run-log.schema.json", line, "pipeline/runs.jsonl:<candidate-line>");
  if (errors.length) throw new Error(JSON.stringify(errors));
  return `${JSON.stringify(line)}\n`;
}

/** WP-002 owns persistence/retries. No direct repository write and no stage cost-stop policy here. */
export async function appendRun(line: RunLine, schemas: Schemas, store: ArtifactStore,
  expectedSourceCommit: string, writeId: string): Promise<WriteReceipt> {
  const content = encodeRun(line, schemas);
  return store.appendLine({ path: "pipeline/runs.jsonl", content, schemaId: "run-log.schema.json",
    expectedSourceCommit, writeId });
}

export function dryRun(schemas: Schemas, now = new Date().toISOString()): string {
  // Synthetic fixture only. Zero cost below is not evidence about Actions billing or provider charges.
  return encodeRun({ ts: now, runId: `dry-run-${randomUUID()}`, episodeId: "", stage: "wp000-log-fixture",
    subjectType: "workpackage", subjectId: "WP-000", attempt: 1, verdict: "skipped",
    durationMs: 0, costUsd: 0, costKind: "estimated" }, schemas);
}

if (require.main === module) {
  try {
    if (process.argv.slice(2).join(" ") !== "--dry-run") throw new Error("Only --dry-run is available; persistent store is NotImplemented");
    const root = process.cwd(), source = new GitSource(root, git(root, "rev-parse", "HEAD").trim());
    process.stdout.write(dryRun(new Schemas(source)));
  } catch (error) { process.stderr.write(`${String(error)}\n`); process.exitCode = 1; }
}
