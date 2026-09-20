import { execFileSync } from "node:child_process";
import { extname } from "node:path";

interface Change {
  status: string;
  path: string;
  previousPath?: string;
}

const allowedExtensions = new Set([".ts", ".json", ".jsonl", ".md", ".yml"]);
const workflowLimitBytes = 12 * 1024;

function argument(name: string): string {
  const index = process.argv.indexOf(name);
  if (index < 0 || !process.argv[index + 1]) throw new Error(`missing ${name}`);
  return process.argv[index + 1];
}

function git(...args: string[]): string {
  return execFileSync("git", args, { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
}

function changes(base: string, head: string): Change[] {
  const fields = git("diff", "--name-status", "-z", "--find-renames", `${base}...${head}`)
    .split("\0").filter(Boolean);
  const result: Change[] = [];
  for (let index = 0; index < fields.length;) {
    const status = fields[index++];
    if (status.startsWith("R") || status.startsWith("C")) {
      const previousPath = fields[index++];
      const path = fields[index++];
      if (!previousPath || !path) throw new Error("invalid rename record");
      result.push({ status, path, previousPath });
    } else {
      const path = fields[index++];
      if (!path) throw new Error("invalid change record");
      result.push({ status, path });
    }
  }
  return result;
}

function blobBytes(ref: string, path: string): number {
  return Number(git("cat-file", "-s", `${ref}:${path}`).trim());
}

function allowed(path: string): boolean {
  return path.endsWith("/.gitkeep") || path === ".gitkeep" || allowedExtensions.has(extname(path));
}

const base = argument("--base");
const head = argument("--head");
git("rev-parse", "--verify", `${base}^{commit}`);
git("rev-parse", "--verify", `${head}^{commit}`);

const diff = changes(base, head);
const baseDirectories = new Set(git("ls-tree", "-d", "--name-only", base).split("\n").filter(Boolean));
const errors: string[] = [];
let newFiles = 0;
let addedBytes = 0;

for (const change of diff) {
  const deleted = change.status.startsWith("D");
  if (!deleted && !allowed(change.path)) errors.push(`extension-not-allowed: ${change.path}`);
  if (!deleted && change.path.includes("/")) {
    const topDirectory = change.path.split("/", 1)[0];
    if (!baseDirectories.has(topDirectory)) errors.push(`new-top-level-directory: ${topDirectory}`);
  }
  if (deleted) continue;

  const headBytes = blobBytes(head, change.path);
  if (change.path.startsWith(".github/workflows/") && headBytes > workflowLimitBytes) {
    errors.push(`workflow-too-large: ${change.path} (${headBytes} > ${workflowLimitBytes} bytes)`);
  }

  const added = change.status.startsWith("A") || change.status.startsWith("C");
  if (added) newFiles += 1;
  const baseBytes = added ? 0 : blobBytes(base, change.previousPath ?? change.path);
  addedBytes += Math.max(0, headBytes - baseBytes);
}

process.stdout.write(`pr-budget: newFiles=${newFiles} addedBytes=${addedBytes}\n`);
if (errors.length) {
  for (const error of errors) process.stderr.write(`${error}\n`);
  process.exitCode = 1;
}
