import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const repository = "HungQuach301/fulcrum-studio";
export function redactGit(value: string, token = process.env.GH_TOKEN ?? ""): string {
  if (!token) return value;
  return value.replaceAll(token, "[redacted]").replaceAll(Buffer.from("x-access-token:" + token).toString("base64"), "[redacted]");
}
export function gitAuthEnvironment(origin: string, token: string, inherited: NodeJS.ProcessEnv = process.env): NodeJS.ProcessEnv {
  if (!["https://github.com/" + repository, "https://github.com/" + repository + ".git"].includes(origin)) throw new Error("GitOrigin");
  if (!token || /[\r\n]/.test(token)) throw new Error("MissingGitToken");
  const environment = { ...inherited };
  for (const key of Object.keys(environment)) if (/^GIT_CONFIG_(?:COUNT|KEY_\d+|VALUE_\d+|PARAMETERS)$/.test(key)) delete environment[key];
  return { ...environment, GIT_TERMINAL_PROMPT: "0", GIT_CONFIG_COUNT: "3",
    GIT_CONFIG_KEY_0: "http." + origin + ".extraheader", GIT_CONFIG_VALUE_0: "AUTHORIZATION: basic " + Buffer.from("x-access-token:" + token).toString("base64"),
    GIT_CONFIG_KEY_1: "http.followRedirects", GIT_CONFIG_VALUE_1: "false", GIT_CONFIG_KEY_2: "credential.helper", GIT_CONFIG_VALUE_2: "" };
}
export function gitEnvironment(root: string, write = false): NodeJS.ProcessEnv {
  const origin = execFileSync("git", ["-C", root, "remote", "get-url", "origin"], { encoding: "utf8" }).trim();
  const env = gitAuthEnvironment(origin, process.env.GH_TOKEN ?? "");
  if (write && !["writer", "writer-cancel", "reindex"].includes(process.env.FS_JOB ?? "")) throw new Error("GitWriteRole");
  return write ? { ...env, GIT_AUTHOR_NAME: "github-actions[bot]", GIT_AUTHOR_EMAIL: "41898282+github-actions[bot]@users.noreply.github.com", GIT_COMMITTER_NAME: "github-actions[bot]", GIT_COMMITTER_EMAIL: "41898282+github-actions[bot]@users.noreply.github.com" } : env;
}
export function fetchMainReadOnly(root: string): { head: string; status: number; stdout: string; stderr: string; configUnchanged: boolean } {
  const directory = execFileSync("git", ["-C", root, "rev-parse", "--absolute-git-dir"], { encoding: "utf8" }).trim();
  const config = join(directory, "config"), before = readFileSync(config);
  const result = spawnSync("git", ["-C", root, "fetch", "--no-tags", "origin", "main"], { env: gitEnvironment(root), encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
  const stdout = redactGit(result.stdout ?? ""), stderr = redactGit(result.stderr ?? "");
  if (!before.equals(readFileSync(config))) throw new Error("GitConfigChanged");
  if (result.status !== 0) throw new Error("GitFetchReadOnly:" + String(result.status) + ":" + stderr);
  return { head: execFileSync("git", ["-C", root, "rev-parse", "FETCH_HEAD"], { encoding: "utf8" }).trim(), status: 0, stdout, stderr, configUnchanged: true };
}
