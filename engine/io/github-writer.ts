import { readFileSync, readdirSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import type { AnySchema } from "ajv";
import { schemaChecker, assertPath, isStatePath, stateRecord, validateCommand } from "./repo-store";
import { buildIndex } from "./reindex";
import { GitHubTransport } from "./github-transport";

interface FileInput { path: string; file: string; mode: "replace" | "append"; schemaId?: string }

const root = process.env.GITHUB_WORKSPACE ?? process.cwd();
const check = schemaChecker(readdirSync(join(root, "engine/contracts"))
  .filter(name => name.endsWith(".schema.json"))
  .map(name => JSON.parse(readFileSync(join(root, "engine/contracts", name), "utf8")) as AnySchema));
const git = new GitHubTransport(root);
const pause = (attempt: number): Promise<void> => new Promise(resolve => setTimeout(resolve, attempt * 1000));

function artifactFiles(episodeId: string, writeId: string): Array<{ path: string; mode: "replace" | "append"; schemaId?: string; content: string }> {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*\/\d{4}-(?:0[1-9]|1[0-2])-[a-z0-9]+(?:-[a-z0-9]+)*$/.test(episodeId)) throw new Error("InvalidEpisodeId");
  if (!/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/.test(writeId)) throw new Error("InvalidWriteId");
  const directory = resolve(process.env.ARTIFACT_PATH ?? "");
  if (!process.env.ARTIFACT_PATH || directory === resolve(root) || directory.startsWith(resolve(root) + sep)) throw new Error("ArtifactOutsideCheckoutRequired");
  const entries: unknown = JSON.parse(process.env.WRITE_FILES ?? "null");
  if (!Array.isArray(entries) || !entries.length) throw new Error("EmptyFiles");
  const paths = new Set<string>();
  return entries.map((entry: FileInput) => {
    if (!entry || typeof entry.path !== "string" || typeof entry.file !== "string" || !["replace", "append"].includes(entry.mode)) throw new Error("InvalidFileInput");
    assertPath(entry.path);
    if (paths.has(entry.path)) throw new Error("DuplicatePath");
    paths.add(entry.path);
    if (entry.path !== "pipeline/runs.jsonl" && !entry.path.startsWith("episodes/" + episodeId + "/")) throw new Error("EpisodeOwnership");
    const source = resolve(directory, entry.file);
    if (relative(directory, source).startsWith("..") || !source.startsWith(directory + sep)) throw new Error("ArtifactPathTraversal");
    const content = readFileSync(source, "utf8");
    if (entry.path === "pipeline/runs.jsonl") {
      if (entry.mode !== "append" || entry.schemaId !== "run-log.schema.json") throw new Error("LogAppendRoute");
    } else if (entry.mode !== "replace") throw new Error("EpisodeReplaceRoute");
    if (entry.path.endsWith(".json") && !entry.schemaId) throw new Error("MissingSchema");
    if (entry.schemaId && !entry.schemaId.endsWith(".schema.json")) throw new Error("InvalidSchemaId");
    return { path: entry.path, mode: entry.mode, schemaId: entry.schemaId, content };
  });
}

async function write(): Promise<void> {
  if (process.env.GITHUB_WORKFLOW !== "WP-002 Serialized Writer") throw new Error("OnlyWriterWorkflow");
  const episodeId = process.env.EPISODE_ID ?? "", writeId = process.env.WRITE_ID ?? "";
  const entries = artifactFiles(episodeId, writeId);
  for (let attempt = 1; attempt <= 5; attempt++) {
    const head = git.fetchMain();
    if (git.hasWrite(head, writeId)) { console.log("Already applied: " + writeId); return; }
    const updates = new Map<string, string>();
    for (const entry of entries) {
      let content = entry.content;
      const previous = git.read(head, entry.path);
      if (entry.path === "pipeline/runs.jsonl") {
        if (!content.endsWith("\n")) throw new Error("IncompleteLog");
        for (const line of content.trimEnd().split("\n")) validateCommand({ path: entry.path, content: line, schemaId: entry.schemaId!, mode: "append", expectedSourceCommit: head, writeId }, check);
        if (previous && !previous.endsWith("\n")) throw new Error("IncompleteLog");
        content = (previous ?? "") + content;
      } else if (entry.schemaId) {
        validateCommand({ path: entry.path, content, schemaId: entry.schemaId, mode: "replace", expectedSourceCommit: head, writeId }, check);
        if (isStatePath(entry.path) && previous !== null) {
          const old = stateRecord(JSON.parse(previous)), next = stateRecord(JSON.parse(content));
          check(entry.schemaId, old);
          if (typeof next.revision !== "number" || next.revision <= (typeof old.revision === "number" ? old.revision : 0)) throw new Error("StaleRevision");
        }
      }
      updates.set(entry.path, content);
    }
    if (git.commit(head, updates, "Apply episode artifacts\n\nWrite-Id: " + writeId)) {
      console.log("Committed " + writeId); return;
    }
    if (attempt < 5) await pause(attempt);
  }
  throw new Error("WriterConflictAfterFiveAttempts");
}

async function reindex(): Promise<void> {
  if (process.env.GITHUB_WORKFLOW !== "WP-002 Reindex") throw new Error("OnlyReindexWorkflow");
  for (let attempt = 1; attempt <= 5; attempt++) {
    const head = git.fetchMain();
    const paths = git.git("ls-tree", "-r", "--name-only", head, "--", "episodes").split("\n")
      .filter(path => /^episodes\/[^/]+\/[^/]+\/state\.json$/.test(path));
    const states = paths.map(path => JSON.parse(git.read(head, path)!));
    const projection = buildIndex(states, head, new Date().toISOString(), check);
    if (git.commit(head, new Map([["pipeline/state.json", JSON.stringify(projection, null, 2) + "\n"]]), "Reindex episode states")) {
      console.log("Reindexed " + states.length + " episodes from " + head); return;
    }
    if (attempt < 5) await pause(attempt);
  }
  throw new Error("ReindexConflictAfterFiveAttempts");
}

if (require.main === module) {
  (process.argv[2] === "write" ? write() : process.argv[2] === "reindex" ? reindex() : Promise.reject(new Error("ExpectedWriteOrReindex")))
    .catch(error => { console.error(String(error)); process.exitCode = 1; });
}
