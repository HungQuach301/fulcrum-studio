import type { ArtifactStore, WriteReceipt } from "./index";
import type { SchemaCheck } from "./repo-store";

export function logLine(value: unknown, check: SchemaCheck): string {
  check("run-log.schema.json", value);
  const encoded = JSON.stringify(value);
  if (encoded === undefined) throw new Error("InvalidLogRecord");
  // Check the serialized representation too (e.g. caller-supplied toJSON).
  check("run-log.schema.json", JSON.parse(encoded));
  return encoded + "\n";
}
/** Retry-with-rebase lives in SerializedRepositoryWriter, shared by all writes (D-15). */
export class RunLog {
  constructor(private readonly store: ArtifactStore, private readonly check: SchemaCheck) {}
  append(value: unknown, expectedSourceCommit: string, writeId: string): Promise<WriteReceipt> {
    return this.store.appendLine({ path: "pipeline/runs.jsonl", content: logLine(value, this.check),
      schemaId: "run-log.schema.json", expectedSourceCommit, writeId });
  }
}
