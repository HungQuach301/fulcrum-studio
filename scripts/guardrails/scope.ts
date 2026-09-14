import { execFileSync } from "node:child_process";

export interface Change { path: string; status: string; }
export interface AddedLine { line: number; text: string; }
export interface Context { kind: "wp" | "cp" | "main"; code: string; wpPath: string; patterns: string[]; }
export function git(root: string, ...args: string[]): string {
  return execFileSync("git", ["-C", root, ...args], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
}
export function safePath(path: string): string {
  if (!path || path.startsWith("/") || path.includes("\\") || /[\x00-\x1f\x7f]/.test(path) || path.split("/").some(x => !x || x === "." || x === "..")) throw new Error("unsafe-path");
  return path;
}
export function at(root: string, sha: string, path: string): string { return git(root, "show", sha + ":" + safePath(path)); }
export function existsAt(root: string, sha: string, path: string): boolean {
  try { git(root, "cat-file", "-e", sha + ":" + safePath(path)); return true; } catch { return false; }
}
export function files(root: string, sha: string): string[] { return git(root, "ls-tree", "-r", "--name-only", "-z", sha).split("\0").filter(Boolean).map(safePath); }
export function changes(root: string, base: string, head: string): Change[] {
  const raw = git(root, "diff", "--no-ext-diff", "--no-renames", "--name-status", "-z", base, head).split("\0");
  if (raw.pop() !== "") throw new Error("diff-record-incomplete");
  if (raw.length % 2) throw new Error("diff-record-shape");
  const result: Change[] = [];
  for (let i = 0; i < raw.length; i += 2) result.push({ status: raw[i], path: safePath(raw[i + 1]) });
  return result;
}
export function added(root: string, base: string, head: string, path: string): AddedLine[] {
  let line = 0; const result: AddedLine[] = [];
  for (const value of git(root, "diff", "--no-ext-diff", "--no-renames", "--unified=0", base, head, "--", safePath(path)).split("\n")) {
    const match = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(value);
    if (match) line = Number(match[1]);
    else if (value.startsWith("+") && !value.startsWith("+++")) result.push({ line: line++, text: value.slice(1) });
    else if (value.startsWith(" ")) line++;
  }
  return result;
}
export function parseScope(text: string): string[] {
  const match = /^###?\s+4\.\s+Phạm vi cho phép\s*\r?\n([\s\S]*?)(?=^###?\s|$(?![\s\S]))/m.exec(text);
  if (!match) throw new Error("scope-section-missing");
  const values = Array.from(match[1].matchAll(/`([^`]+)`/g), x => x[1]);
  if (!values.length) throw new Error("scope-patterns-missing");
  for (const value of values) safePath(value);
  return values;
}
export function matches(path: string, pattern: string): boolean {
  safePath(path); safePath(pattern);
  if (pattern.endsWith("/**")) return path.startsWith(pattern.slice(0, -2));
  return !pattern.includes("*") && path === pattern;
}
export function context(root: string, base: string, branch: string, title: string, event: string): Context {
  if (branch === "main" && event === "push") return { kind: "main", code: "main", wpPath: "", patterns: [] };
  const m = /^(wp|cp)\/([0-9]{3}(?:[a-z])?)$/.exec(branch);
  if (!m) throw new Error("branch-context-invalid");
  const code = m[1].toUpperCase() + "-" + m[2];
  const titles = Array.from(title.matchAll(/\b(?:WP|CP)-[0-9]{3}[a-z]?\b/g), x => x[0]);
  if (titles.some(x => x !== code)) throw new Error("branch-title-conflict");
  const found = files(root, base).filter(path => path.startsWith("engine/ops/") && (path.split("/").pop() === code + ".md" || path.split("/").pop()?.startsWith(code + "-")) && path.endsWith(".md"));
  if (found.length !== 1) throw new Error("wp-path-missing-or-ambiguous");
  return { kind: m[1] as "wp" | "cp", code, wpPath: found[0], patterns: parseScope(at(root, base, found[0])) };
}
export function backlogOnly(before: string, after: string, code: string): boolean {
  const lines = before.split("\n"); let count = 0;
  const expected = lines.map(line => {
    if (line.startsWith("| " + code + " |") && /\| (todo|doing|blocked) \|$/.test(line)) { count++; return line.replace(/\| (todo|doing|blocked) \|$/, "| done |"); }
    return line;
  }).join("\n");
  return count === 1 && expected === after;
}
