import { createHash } from "node:crypto";
import type { AnySchema } from "ajv";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import type { ArtifactRef, ArtifactStore, ArtifactWrite, WriteReceipt } from "./index";

export type SchemaCheck = (schemaId: string, value: unknown) => void;
export type WriteMode = "replace" | "append";
export interface WriteCommand extends ArtifactWrite { mode: WriteMode }
export interface RepositoryTransport {
  read(ref: ArtifactRef): Promise<string>;
  submit(command: WriteCommand): Promise<WriteReceipt>;
}

/** Schemas are supplied from the pinned repo; this never fetches a schema. */
export function schemaChecker(schemas: readonly AnySchema[]): SchemaCheck {
  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  for (const schema of schemas) ajv.addSchema(schema);
  return (schemaId, value) => {
    const validate = ajv.getSchema(schemaId);
    if (!validate) throw new Error("UnknownSchema:" + schemaId);
    if (!validate(value)) throw new Error("SchemaRejected:" + schemaId + ":" + ajv.errorsText(validate.errors));
  };
}

export function assertCommit(value: string): void {
  if (!/^[a-f0-9]{40}$/.test(value)) throw new Error("InvalidCommit");
}
export function assertPath(path: string): void {
  const parts = path.split("/");
  if (!path || parts.some(p => !p || p === "." || p === ".." || !/^[A-Za-z0-9_.-]+$/.test(p))) {
    throw new Error("InvalidPath");
  }
  const episode = parts.length >= 4 && parts[0] === "episodes" &&
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(parts[1]) &&
    /^\d{4}-(?:0[1-9]|1[0-2])-[a-z0-9]+(?:-[a-z0-9]+)*$/.test(parts[2]);
  if (!episode && path !== "pipeline/runs.jsonl") throw new Error("PathOutsideStore");
  if (parts.some(p => p.startsWith("."))) throw new Error("HiddenPath");
}
export function blobHash(content: string): string {
  const data = Buffer.from(content, "utf8");
  return createHash("sha1").update("blob " + data.length + "\0").update(data).digest("hex");
}
export function isStatePath(path: string): boolean {
  return path.split("/").length === 4 && path.endsWith("/state.json");
}
export function stateRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("InvalidState");
  return value as Record<string, unknown>;
}
export function assertStateIdentity(path: string, value: unknown): void {
  const state = stateRecord(value), parts = path.split("/");
  if (state.channel !== parts[1] || state.episodeId !== parts.slice(1, 3).join("/")) throw new Error("StatePathMismatch");
}
export function validateCommand(input: WriteCommand, check: SchemaCheck): WriteCommand {
  const command = { ...input }; // Detach from caller before the first await.
  assertPath(command.path); assertCommit(command.expectedSourceCommit);
  if (!/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/.test(command.writeId)) throw new Error("InvalidWriteId");
  if (command.mode !== "replace" && command.mode !== "append") throw new Error("InvalidWriteMode");
  if (command.mode === "append") {
    if (command.path !== "pipeline/runs.jsonl" || command.schemaId !== "run-log.schema.json") throw new Error("AppendRouteRejected");
    const line = command.content.endsWith("\n") ? command.content.slice(0, -1) : command.content;
    if (!line || /[\r\n]/.test(line)) throw new Error("ExpectedOneLogLine");
    check(command.schemaId, JSON.parse(line)); command.content = line + "\n";
  } else {
    if (command.path === "pipeline/runs.jsonl") throw new Error("LogReplaceRejected");
    const value: unknown = JSON.parse(command.content);
    if (isStatePath(command.path) && command.schemaId !== "episode-state.schema.json") throw new Error("StateSchemaMismatch");
    check(command.schemaId, value);
    if (isStatePath(command.path)) assertStateIdentity(command.path, value);
  }
  return Object.freeze(command);
}

/** FS24-A has no production transport. Caller must explicitly supply an adapter. */
export class RepoStore implements ArtifactStore {
  constructor(private readonly check: SchemaCheck, private readonly transport?: RepositoryTransport) {}
  async read(input: ArtifactRef): Promise<string> {
    const ref = { ...input }; assertPath(ref.path); assertCommit(ref.sourceCommit);
    if (!this.transport) throw new Error("TransportUnavailable");
    return this.transport.read(ref);
  }
  write(request: ArtifactWrite): Promise<WriteReceipt> { return this.send({ ...request, mode: "replace" }); }
  appendLine(request: ArtifactWrite): Promise<WriteReceipt> { return this.send({ ...request, mode: "append" }); }
  private async send(input: WriteCommand): Promise<WriteReceipt> {
    const command = validateCommand(input, this.check);
    if (!this.transport) throw new Error("TransportUnavailable");
    const receipt = { ...await this.transport.submit(command) };
    if (receipt.writeId !== command.writeId) throw new Error("ReceiptWriteIdMismatch");
    assertCommit(receipt.commit); assertCommit(receipt.blob);
    const actual = await this.transport.read({ path: command.path, sourceCommit: receipt.commit });
    if (blobHash(actual) !== receipt.blob) throw new Error("ReceiptBlobMismatch");
    if (command.mode === "replace" ? actual !== command.content : !actual.endsWith(command.content)) {
      throw new Error("ReceiptContentMismatch");
    }
    return Object.freeze(receipt);
  }
}

export class RepositoryConflict extends Error {}
export interface StoredWrite { digest: string; receipt: WriteReceipt }
/** Backend atomicCommit must compare-and-swap expected head, not overwrite a ref.
 * findWrite/readAt must search reachable history and immutable commits respectively.
 * FS24-A only implements this backend inside the temporary Git acceptance fixture.
 */
export interface RepositoryBackend {
  snapshot(path: string): Promise<{ head: string; content: string | null }>;
  readAt(ref: ArtifactRef): Promise<string>;
  isAncestor(ancestor: string, descendant: string): Promise<boolean>;
  findWrite(writeId: string): Promise<StoredWrite | null>;
  atomicCommit(head: string, command: WriteCommand, content: string, digest: string): Promise<WriteReceipt>;
}

/** Serialized writer algorithm, with explicit injectable backend; no network or production entrypoint. */
export class SerializedRepositoryWriter implements RepositoryTransport {
  private tail: Promise<unknown> = Promise.resolve();
  constructor(private readonly backend: RepositoryBackend, private readonly check: SchemaCheck,
    private readonly pause: (attempt: number) => Promise<void> = n => new Promise(resolve => setTimeout(resolve, n * 10))) {}
  read(ref: ArtifactRef): Promise<string> {
    assertPath(ref.path); assertCommit(ref.sourceCommit); return this.backend.readAt({ ...ref });
  }
  submit(input: WriteCommand): Promise<WriteReceipt> {
    const command = validateCommand(input, this.check);
    const work = this.tail.then(() => this.apply(command));
    this.tail = work.catch(() => undefined); return work;
  }
  private async apply(command: WriteCommand): Promise<WriteReceipt> {
    // The expected base is intentionally excluded: same logical write after a rebase is a duplicate.
    const digest = createHash("sha256").update(JSON.stringify([
      command.path, command.content, command.schemaId, command.mode, command.writeId
    ])).digest("hex");
    const duplicate = async (): Promise<WriteReceipt | null> => {
      const prior = await this.backend.findWrite(command.writeId);
      if (!prior) return null;
      if (prior.digest !== digest) throw new Error("WriteIdCollision");
      return prior.receipt;
    };
    for (let attempt = 1; attempt <= 5; attempt++) {
      const prior = await duplicate(); if (prior) return prior;
      const snapshot = await this.backend.snapshot(command.path); assertCommit(snapshot.head);
      if (!await this.backend.isAncestor(command.expectedSourceCommit, snapshot.head)) throw new Error("UnrelatedBase");
      // A competing writer can commit after the history read and before snapshot.
      const raced = await duplicate(); if (raced) return raced;
      let content = command.content;
      if (command.mode === "append") {
        const old = snapshot.content ?? "";
        if (old && !old.endsWith("\n")) throw new Error("IncompleteLog");
        for (const line of old.split("\n").slice(0, -1)) this.check(command.schemaId, JSON.parse(line));
        content = old + content;
      } else if (isStatePath(command.path)) {
        const next = stateRecord(JSON.parse(content));
        if (snapshot.content !== null) {
          const old = stateRecord(JSON.parse(snapshot.content)); this.check(command.schemaId, old);
          assertStateIdentity(command.path, old);
          // Missing revisions remain readable for historical states, but updates must advance.
          const previous = typeof old.revision === "number" ? old.revision : 0;
          if (typeof next.revision !== "number" || next.revision <= previous) throw new Error("StaleRevision");
        }
      }
      try { return await this.backend.atomicCommit(snapshot.head, command, content, digest); }
      catch (error) {
        if (!(error instanceof RepositoryConflict) || attempt === 5) throw error;
        await this.pause(attempt);
      }
    }
    throw new Error("UnreachableWriterState");
  }
}
