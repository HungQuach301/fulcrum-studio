import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { assertCommit, assertPath } from "./repo-store";
import { gitEnvironment, redactGit } from "./github-git";

/** Git operations used by the two authorized writer workflows. */
export class GitHubTransport {
  constructor(private readonly root: string) {}

  git(...args: string[]): string {
    return execFileSync("git", ["-C", this.root, ...args], {
      encoding: "utf8", env: gitEnvironment(this.root), maxBuffer: 16 * 1024 * 1024
    }).trimEnd();
  }

  fetchMain(): string {
    this.git("fetch", "--no-tags", "origin", "main");
    const head = this.git("rev-parse", "FETCH_HEAD");
    assertCommit(head);
    return head;
  }

  hasWrite(head: string, writeId: string): boolean {
    assertCommit(head);
    return this.git("log", "--format=%B%x00", head).split("\0").some(message =>
      message.split("\n").includes("Write-Id: " + writeId));
  }

  read(head: string, path: string): string | null {
    assertCommit(head); assertPath(path);
    const found = spawnSync("git", ["-C", this.root, "cat-file", "-e", head + ":" + path], {
      env: gitEnvironment(this.root), encoding: "utf8"
    });
    if (found.status !== 0) return null;
    return execFileSync("git", ["-C", this.root, "show", head + ":" + path], {
      env: gitEnvironment(this.root), encoding: "utf8", maxBuffer: 16 * 1024 * 1024
    });
  }

  /** A rejected non-fast-forward push is retried by the calling writer. */
  commit(head: string, updates: ReadonlyMap<string, string>, message: string): boolean {
    assertCommit(head);
    this.git("checkout", "--force", "--detach", head);
    for (const [path, content] of updates) {
      if (path !== "pipeline/state.json" || process.env.GITHUB_WORKFLOW !== "WP-002 Reindex") assertPath(path);
      const target = join(this.root, path);
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, content);
      this.git("add", "--", path);
      if (readFileSync(target, "utf8") !== content) throw new Error("WriteReadbackMismatch");
    }
    this.git("-c", "user.name=github-actions[bot]", "-c", "user.email=41898282+github-actions[bot]@users.noreply.github.com",
      "commit", "--allow-empty", "-m", message);
    const result = spawnSync("git", ["-C", this.root, "push", "origin", "HEAD:refs/heads/main"], {
      encoding: "utf8", env: gitEnvironment(this.root, true), maxBuffer: 16 * 1024 * 1024
    });
    if (result.status === 0) return true;
    const latest = this.fetchMain();
    if (latest === head) throw new Error("GitPushRejected:" + redactGit(result.stderr ?? ""));
    return false;
  }
}
