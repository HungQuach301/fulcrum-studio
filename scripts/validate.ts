import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import Ajv, { type ErrorObject, type ValidateFunction } from "ajv";
import addFormats from "ajv-formats";
import matter from "gray-matter";

export type ObjectValue = Record<string, unknown>;
export function object(value: unknown): ObjectValue {
  if (value === null || typeof value !== "object" || Array.isArray(value)) throw new Error("Expected object");
  return value as ObjectValue;
}
export function list(value: unknown): unknown[] {
  if (!Array.isArray(value)) throw new Error("Expected array");
  return value;
}
export function numeric(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) throw new Error("Expected finite number");
  return value;
}
export function string(value: unknown): string {
  if (typeof value !== "string") throw new Error("Expected string");
  return value;
}
export function git(root: string, ...args: string[]): string {
  return execFileSync("git", ["-C", root, ...args], { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
}
export function fullSha(value: string): string {
  if (!/^[a-f0-9]{40}$/.test(value)) throw new Error("Expected full lowercase Git SHA");
  return value;
}
export function repoPath(value: string): string {
  if (!value || value.startsWith("/") || value.includes("\\") || /[\0\r\n:]/.test(value) ||
      value.split("/").some(part => !part || part === "." || part === "..")) throw new Error("Unsafe repository path");
  return value;
}

/** Read-only infrastructure input, not a production stage/store implementation. No network fetch. */
export interface ValidationSource {
  readonly kind: "git" | "fixture";
  readonly head: string;
  files(): string[];
  text(path: string): string;
  textAt(commit: string, path: string): string;
  treeAt(commit: string, path: string): string;
}
export class GitSource implements ValidationSource {
  readonly kind = "git" as const;
  readonly head: string;
  readonly root: string;
  constructor(root: string, head: string) {
    this.root = resolve(root);
    this.head = fullSha(head);
    if (git(this.root, "cat-file", "-t", this.head).trim() !== "commit") throw new Error("Source is not a commit");
  }
  files(): string[] { return git(this.root, "ls-tree", "-r", "--name-only", "-z", this.head).split("\0").filter(Boolean); }
  text(path: string): string { return this.textAt(this.head, path); }
  textAt(commit: string, path: string): string {
    const sha = fullSha(commit);
    if (git(this.root, "cat-file", "-t", sha).trim() !== "commit") throw new Error("Pinned commit unavailable");
    const ref = `${sha}:${repoPath(path)}`;
    if (git(this.root, "cat-file", "-t", ref).trim() !== "blob") throw new Error("Expected source blob");
    return git(this.root, "show", ref);
  }
  treeAt(commit: string, path: string): string {
    const ref = `${fullSha(commit)}:${repoPath(path)}`;
    if (git(this.root, "cat-file", "-t", ref).trim() !== "tree") throw new Error("Pinned pack tree unavailable");
    return fullSha(git(this.root, "rev-parse", ref).trim());
  }
}

export interface Issue {
  file: string;
  tier: "inventory" | "schema" | "domain" | "tooling";
  field: string;
  rule: string;
  actual: unknown;
  expected: unknown;
  sources: string[];
}
function issue(file: string, tier: Issue["tier"], field: string, rule: string, actual: unknown,
  expected: unknown, sources: string[] = []): Issue {
  return { file, tier, field, rule, actual: actual === undefined ? "<missing>" : actual, expected, sources };
}
export class Schemas {
  readonly definitions = new Map<string, ObjectValue>();
  private readonly validators = new Map<string, ValidateFunction<unknown>>();
  constructor(source: ValidationSource) {
    const ajv = new Ajv({ allErrors: true, validateFormats: true, strictSchema: true,
      strictTypes: true, strictTuples: true, strictNumbers: true, strictRequired: false,
      allowUnionTypes: true, coerceTypes: false, useDefaults: false, removeAdditional: false });
    addFormats(ajv, { mode: "full" });
    const paths = source.files().filter(path => /^engine\/contracts\/[^/]+\.schema\.json$/.test(path)).sort();
    if (!paths.length) throw new Error("No contract schemas available");
    for (const path of paths) {
      try {
        const schema = object(JSON.parse(source.text(path)));
        const id = path.slice("engine/contracts/".length);
        if (schema.$schema !== "http://json-schema.org/draft-07/schema#" || schema.$id !== id ||
            this.definitions.has(id)) throw new Error("Wrong draft, duplicate or mismatched $id");
        if (!ajv.validateSchema(schema)) throw new Error(JSON.stringify(ajv.errors));
        this.definitions.set(id, schema);
        ajv.addSchema(schema, id);
      } catch (error) { throw new Error(`${path}: ${String(error)}`); }
    }
    for (const id of this.definitions.keys()) {
      try {
        const compiled = ajv.getSchema<unknown>(id);
        if (!compiled) throw new Error("Schema did not compile");
        this.validators.set(id, compiled);
      } catch (error) { throw new Error(`engine/contracts/${id}: ${String(error)}`); }
    }
  }
  check(id: string, value: unknown, file: string): Issue[] {
    const validator = this.validators.get(id);
    if (!validator) return [issue(file, "inventory", "", "schema-mapping", id, "A compiled contract")];
    if (validator(value)) return [];
    return (validator.errors ?? []).map((error: ErrorObject) => {
      const extra = error.keyword === "required" ? String(error.params.missingProperty) :
        error.keyword === "additionalProperties" ? String(error.params.additionalProperty) : "";
      return issue(file, "schema", `${error.instancePath}${extra ? `/${extra}` : ""}`, error.keyword,
        error.message, error.params, [`engine/contracts/${id}`]);
    });
  }
}

const EPISODE_NAMES: Record<string, string> = {
  "00-brief.json": "brief", "01-sources.json": "sources", "02-factcheck.json": "factcheck",
  "03-sensitivity.json": "sensitivity", "04-outline.json": "outline", "05-script.md": "script",
  "06-canvas-map.json": "canvas-map", "07-storyboard.json": "storyboard", "08-preflight.json": "preflight",
  "09-timing.json": "timing", "11-proof.json": "proof", "12-render-manifest.json": "render-manifest",
  "13-qa.json": "qa-report", "14-package.json": "package", "15-publication.json": "publication",
  "16-metrics.json": "metrics", "state.json": "episode-state"
};
export const VERSIONED = ["sources", "factcheck", "sensitivity", "outline", "script", "canvas-map",
  "storyboard", "preflight", "timing", "proof", "render-manifest", "qa-report", "package",
  "publication", "metrics", "analyst-note", "license-ledger"] as const;
const VERSION_KEYS = ["engine", "genre", "channel"] as const;
/** README describes these logical artifacts without a canonical filename. Require an explicit binding;
 * do not guess a filename or accept arbitrary JSON based on its shape. Bindings are recorded in reports. */
const LOGICAL_SCHEMAS = new Set(["analyst-note", "license-ledger", "corpus", "novelty-check", "variation-index", "thesis"]);
export interface Binding { path: string; schema: string; }
export interface SourceApproval { episodeId: string; commit: string; }
export interface Document { path: string; schema: string; value: ObjectValue; valid: boolean; }
type Group = "schema" | "tooling" | "config" | "artifact" | "frontMatter" | "jsonl";
interface Mapping { group: Group; schema?: string; }

export function classify(path: string, bindings: readonly Binding[] = []): Mapping {
  const matches: Mapping[] = [];
  if (/^engine\/contracts\/[^/]+\.schema\.json$/.test(path)) matches.push({ group: "schema" });
  if (["package.json", "package-lock.json", "tsconfig.json"].includes(path)) matches.push({ group: "tooling" });
  const fixed: Record<string, string> = { "pipeline/state.json": "pipeline-state",
    "pipeline/automation-tiers.json": "automation-tiers", "config/publish-allowlist.json": "publish-allowlist" };
  if (fixed[path]) matches.push({ group: "config", schema: fixed[path] });
  const config = path.match(/^(genres|channels)\/([a-z0-9-]+)\/([^/]+)\.json$/);
  if (config && ((config[1] === "genres" && ["format-spec", "layouts", "asset-policy"].includes(config[3])) ||
      (config[1] === "channels" && ["channel", "visual-tokens", "data-series"].includes(config[3])))) {
    matches.push({ group: "config", schema: config[3] });
  }
  const episode = path.match(/^episodes\/[a-z0-9-]+\/[0-9]{4}-[0-9]{2}-[a-z0-9-]+\/([^/]+)$/);
  if (episode && EPISODE_NAMES[episode[1]]) matches.push({
    group: episode[1] === "05-script.md" ? "frontMatter" : "artifact", schema: EPISODE_NAMES[episode[1]] });
  if (/^pipeline\/[a-z0-9-]+\/signals\.json$/.test(path)) matches.push({ group: "artifact", schema: "signals" });
  if (/^pipeline\/[a-z0-9-]+\/topics\.ranked\.json$/.test(path)) matches.push({ group: "artifact", schema: "topics" });
  if (/^data\/snapshots\/.+\/[^/]+\.json$/.test(path)) matches.push({ group: "artifact", schema: "snapshot" });
  if (/^models\/[a-z0-9-]+\/M-[0-9]{3}\.json$/.test(path)) matches.push({ group: "artifact", schema: "model" });
  if (path === "pipeline/runs.jsonl") matches.push({ group: "jsonl", schema: "run-log" });
  if (path === "pipeline/orchestrator-log.jsonl") matches.push({ group: "jsonl", schema: "orchestrator-log" });
  for (const binding of bindings.filter(item => item.path === path)) {
    if (!LOGICAL_SCHEMAS.has(binding.schema) || !path.endsWith(".json")) throw new Error("Unsupported explicit binding");
    matches.push({ group: "artifact", schema: binding.schema });
  }
  if (matches.length !== 1) throw new Error(`Expected one classification, got ${matches.length}: ${path}`);
  return matches[0];
}

export interface FrozenContext {
  episodeId: string; commit: string; channelPath: string; formatPath: string; layoutsPath: string;
  channel: ObjectValue; format: ObjectValue; layouts: ObjectValue; versions: Record<string, string>;
}
export function frozen(source: ValidationSource, schemas: Schemas, episodeId: string, commit: string): FrozenContext {
  if (!/^[a-z0-9-]+\/[0-9]{4}-[0-9]{2}-[a-z0-9-]+$/.test(episodeId)) throw new Error("Invalid episodeId");
  fullSha(commit);
  const slug = episodeId.split("/")[0];
  const channelPath = `channels/${slug}/channel.json`;
  const read = (path: string, schema: string): ObjectValue => {
    const value = object(JSON.parse(source.textAt(commit, path)));
    const errors = schemas.check(`${schema}.schema.json`, value, `${commit}:${path}`);
    if (errors.length) throw new Error(JSON.stringify(errors));
    return value;
  };
  const channel = read(channelPath, "channel");
  if (channel.slug !== slug || typeof channel.genre !== "string" || !/^[a-z0-9-]+$/.test(channel.genre)) {
    throw new Error(`Channel identity/genre mismatch: ${commit}:${channelPath}`);
  }
  const genre = channel.genre;
  const formatPath = `genres/${genre}/format-spec.json`;
  const layoutsPath = `genres/${genre}/layouts.json`;
  const format = read(formatPath, "format-spec");
  const layouts = read(layoutsPath, "layouts");
  if (format.genre !== genre || layouts.genre !== genre) throw new Error(`Genre identity mismatch: ${formatPath}, ${layoutsPath}`);
  const engineLabel = string(channel.engineVersion), genreLabel = string(format.version);
  if (!engineLabel.trim() || !genreLabel.trim()) throw new Error(`Empty source version label: ${channelPath}, ${formatPath}`);
  const genreTree = fullSha(source.treeAt(commit, `genres/${genre}`));
  const channelTree = fullSha(source.treeAt(commit, `channels/${slug}`));
  return { episodeId, commit, channelPath, formatPath, layoutsPath, channel, format, layouts,
    versions: { engine: `${engineLabel}@git-commit:${commit}`, genre: `${genreLabel}@git-tree:${genreTree}`,
      channel: `git-tree:${channelTree}` } };
}

// Exact decimal comparisons avoid adding an unapproved epsilon to beat shares or duration limits.
type Fraction = { n: bigint; d: bigint };
function fraction(value: number): Fraction {
  numeric(value);
  const [mantissa, exponentText = "0"] = value.toString().toLowerCase().split("e");
  const exponent = Number(exponentText);
  const parts = mantissa.split(".");
  const decimals = (parts[1] ?? "").length;
  let n = BigInt(parts.join("")), d = 10n ** BigInt(decimals);
  if (exponent >= 0) n *= 10n ** BigInt(exponent); else d *= 10n ** BigInt(-exponent);
  return { n, d };
}
function compare(a: Fraction, b: Fraction): number { const delta = a.n * b.d - b.n * a.d; return delta < 0n ? -1 : delta > 0n ? 1 : 0; }
function subtract(a: Fraction, b: Fraction): Fraction { return { n: a.n * b.d - b.n * a.d, d: a.d * b.d }; }

export class Validator {
  readonly documents: Document[] = [];
  readonly issues: Issue[] = [];
  readonly coverage = { schemas: 0, domainConfigs: 0, artifactJson: 0, frontMatter: 0,
    jsonlLines: 0, toolingJson: 0, fixtures: 0, tier2Eligible: 0, tier2Checked: 0, tier2BlockedByTier1: 0 };
  constructor(readonly source: ValidationSource, readonly schemas: Schemas,
    readonly approvals: readonly SourceApproval[] = [], readonly bindings: readonly Binding[] = []) {}

  collect(): void {
    const files = this.source.files();
    if (new Set(files).size !== files.length) this.issues.push(issue("<inventory>", "inventory", "files", "duplicate", files, "Unique paths"));
    for (const binding of this.bindings) {
      if (!files.includes(binding.path)) this.issues.push(issue(binding.path, "inventory", "binding", "missing-file", binding, "A listed source file"));
    }
    for (const path of files) {
      if (!path.endsWith(".json") && !path.endsWith(".jsonl") && !path.endsWith("/05-script.md")) continue;
      let tier2Mapped = false;
      try {
        repoPath(path);
        const mapping = classify(path, this.bindings);
        tier2Mapped = mapping.schema === "brief" || mapping.schema === "episode-state" ||
          (VERSIONED as readonly string[]).includes(mapping.schema ?? "");
        const raw = this.source.text(path); // Includes schema/tooling; an unreadable source never disappears.
        if (mapping.group === "schema") { JSON.parse(raw); this.coverage.schemas++; continue; }
        if (mapping.group === "tooling") {
          this.coverage.toolingJson++;
          this.checkTooling(path, object(JSON.parse(raw)));
          continue;
        }
        if (!mapping.schema) throw new Error("Missing contract mapping");
        const schema = mapping.schema;
        if (mapping.group === "jsonl") {
          const lines = raw === "" ? [] : raw.replace(/\n$/, "").split("\n");
          for (let index = 0; index < lines.length; index++) {
            const linePath = `${path}:${index + 1}`;
            this.coverage.jsonlLines++;
            try { this.issues.push(...this.schemas.check(`${schema}.schema.json`, JSON.parse(lines[index]), linePath)); }
            catch (error) { this.issues.push(issue(linePath, "schema", "", "json-parse", String(error), "One JSON value per line")); }
          }
          continue;
        }
        let parsed: unknown;
        if (mapping.group === "frontMatter") {
          this.coverage.frontMatter++;
          // Never allow gray-matter's JavaScript engine or a user-selected language to execute source text.
          if (!raw.startsWith("---\n") && !raw.startsWith("---\r\n")) throw new Error("Plain YAML front-matter delimiter required");
          const result = matter(raw, { language: "yaml" });
          if (!result.matter.trim()) throw new Error("Empty front-matter");
          parsed = result.data;
        } else {
          if (mapping.group === "config") this.coverage.domainConfigs++; else this.coverage.artifactJson++;
          parsed = JSON.parse(raw);
        }
        const errors = this.schemas.check(`${schema}.schema.json`, parsed, path);
        this.issues.push(...errors);
        const value = parsed !== null && typeof parsed === "object" && !Array.isArray(parsed) ? object(parsed) : {};
        this.documents.push({ path, schema, value, valid: errors.length === 0 });
        if (this.source.kind === "fixture") this.coverage.fixtures++;
      } catch (error) {
        this.issues.push(issue(path, "inventory", "", "read-or-classify", String(error), "Readable, uniquely classified source"));
        if (tier2Mapped) { this.coverage.tier2Eligible++; this.coverage.tier2BlockedByTier1++; }
      }
    }
    if (this.source.kind === "git") {
      for (const path of ["package.json", "package-lock.json", "tsconfig.json"]) {
        if (!files.includes(path)) this.issues.push(issue(path, "tooling", "", "missing-tooling", "absent", "Committed tooling input before acceptance"));
      }
    }
  }

  private checkTooling(path: string, value: ObjectValue): void {
    const expect = (field: string, actual: unknown, expected: unknown): void => {
      if (JSON.stringify(actual) !== JSON.stringify(expected)) this.issues.push(issue(path, "tooling", field, "configuration", actual, expected));
    };
    if (path === "package.json") {
      expect("private", value.private, true); expect("type", value.type, "commonjs");
      expect("engines.node", object(value.engines).node, ">=20 <21"); expect("packageManager", value.packageManager, "npm@10.8.2");
      const actual = { ...object(value.dependencies), ...object(value.devDependencies) };
      const expected: ObjectValue = { typescript: "5.4.5", "@types/node": "20.12.7", ajv: "8.12.0",
        "ajv-formats": "2.1.1", tsx: "4.7.1", "gray-matter": "4.0.3" };
      expect("dependencyNames", Object.keys(actual).sort(), Object.keys(expected).sort());
      expect("directDependencyCount", Object.keys(object(value.dependencies)).length + Object.keys(object(value.devDependencies)).length,
        Object.keys(expected).length);
      for (const [name, version] of Object.entries(expected)) expect(`dependencies.${name}`, actual[name], version);
      for (const key of ["optionalDependencies", "peerDependencies", "overrides"]) {
        if (value[key] !== undefined) expect(key, value[key], undefined);
      }
      expect("scripts", value.scripts, { typecheck: "tsc --noEmit", validate: "tsx scripts/validate.ts",
        "acceptance:wp000": "tsx scripts/acceptance-wp000.ts", "log-run": "tsx scripts/log-run.ts" });
    } else if (path === "tsconfig.json") {
      const options = object(value.compilerOptions);
      for (const [key, expected] of Object.entries({ target: "ES2022", module: "CommonJS", moduleResolution: "Node",
        strict: true, noEmit: true, esModuleInterop: true, forceConsistentCasingInFileNames: true, skipLibCheck: false, types: ["node"] })) {
        expect(`compilerOptions.${key}`, options[key], expected);
      }
      expect("include", value.include, ["scripts/**/*.ts", "engine/io/**/*.ts", "engine/providers/**/*.ts"]);
      expect("exclude", value.exclude, ["node_modules"]);
    } else {
      expect("lockfileVersion", value.lockfileVersion, 3);
      const root = object(object(value.packages)[""]);
      const manifest = object(JSON.parse(this.source.text("package.json")));
      expect("packages.root.dependencies", root.dependencies, manifest.dependencies);
      expect("packages.root.devDependencies", root.devDependencies, manifest.devDependencies);
      // npm ci is the owning tool's check; this structural comparison does not substitute for it.
    }
  }

  private context(doc: Document): FrozenContext {
    const episodeId = string(doc.value.episodeId);
    const approvals = this.approvals.filter(item => item.episodeId === episodeId);
    if (approvals.length !== 1) throw new Error(`Expected exactly one owner-approved source mapping for ${episodeId}; got ${approvals.length}`);
    const context = frozen(this.source, this.schemas, episodeId, approvals[0].commit);
    if (!doc.path.startsWith(`episodes/${episodeId}/`) || doc.path.slice(`episodes/${episodeId}/`.length).includes("/")) {
      throw new Error(`Path and episodeId disagree: ${doc.path}, ${episodeId}`);
    }
    for (const [kind, name] of [["brief", "00-brief.json"], ["episode-state", "state.json"]]) {
      const linked = this.documents.filter(item => item.schema === kind && item.value.episodeId === episodeId);
      if (linked.length !== 1 || linked[0].path !== `episodes/${episodeId}/${name}` || !linked[0].valid) {
        throw new Error(`Missing, duplicate, wrong-path or schema-invalid ${kind} for ${episodeId}`);
      }
      const value = linked[0].value;
      if (value.channel !== episodeId.split("/")[0]) throw new Error(`Channel mismatch: ${linked[0].path}`);
      this.requireVersions(value.versions, context.versions, linked[0].path);
    }
    if (doc.schema === "brief" || doc.schema === "episode-state" || doc.value.versions !== undefined) {
      this.requireVersions(doc.value.versions, context.versions, doc.path);
    }
    return context;
  }
  private requireVersions(value: unknown, expected: Record<string, string>, path: string): void {
    const versions = object(value);
    if (Object.keys(versions).sort().join(",") !== [...VERSION_KEYS].sort().join(",") ||
        VERSION_KEYS.some(key => typeof versions[key] !== "string" || versions[key] !== expected[key])) {
      throw new Error(`Versions mismatch at ${path}: actual=${JSON.stringify(value)} expected=${JSON.stringify(expected)}`);
    }
  }

  /** Exposed for D-19 direct relation fixtures; normal source flow only calls after tier 1 passed. */
  domain(doc: Document): Issue[] {
    const errors: Issue[] = [];
    let context: FrozenContext;
    try { context = this.context(doc); }
    catch (error) {
      const id = typeof doc.value.episodeId === "string" ? doc.value.episodeId : "<missing>";
      const channelPath = `channels/${id.split("/")[0]}/channel.json`;
      const approval = this.approvals.filter(item => item.episodeId === id);
      let formatPath = "genres/{genre-from-channel-at-C}/format-spec.json";
      if (approval.length === 1) {
        try {
          const channel = object(JSON.parse(this.source.textAt(approval[0].commit, channelPath)));
          if (typeof channel.genre === "string" && /^[a-z0-9-]+$/.test(channel.genre)) formatPath = `genres/${channel.genre}/format-spec.json`;
        } catch { /* Missing source is the reported error; no fallback source is selected. */ }
      }
      return [issue(doc.path, "domain", "versions", "frozen-source", String(error),
        "Unique brief/state and approved C; full matching engine/genre/channel strings and both pack trees",
        [channelPath, formatPath, `episodes/${id}/00-brief.json`, `episodes/${id}/state.json`])];
    }
    const sources = [`${context.commit}:${context.formatPath}`, `${context.commit}:${context.channelPath}`];
    const fail = (field: string, actual: unknown, expected: unknown, rule = "domain", extra: string[] = []): void => {
      errors.push(issue(doc.path, "domain", field, rule, actual, expected, [...sources, ...extra]));
    };
    const checked = (field: string, fn: () => void): void => {
      try { fn(); } catch (error) { fail(field, String(error), "Required source field with declared type", "missing-source-field"); }
    };
    const limits = (): ObjectValue => object(context.format.limits);
    const range = (field: string, value: unknown, key: string): void => checked(field, () => {
      const bounds = list(limits()[key]).map(numeric);
      if (bounds.length !== 2 || bounds[0] > bounds[1]) throw new Error(`Invalid limits.${key}`);
      const n = numeric(value);
      if (n < bounds[0] || n > bounds[1]) fail(field, value, bounds);
    });
    const minimum = (field: string, value: unknown, key: string): void => checked(field, () => {
      const bound = numeric(limits()[key]);
      if (numeric(value) < bound) fail(field, value, { minimum: bound });
    });
    const member = (field: string, value: unknown, allowed: unknown, extra: string[] = []): void => checked(field, () => {
      const values = list(allowed);
      if (!values.includes(value)) fail(field, value, values, "membership", extra);
    });
    const v = doc.value;
    if (doc.schema === "brief") {
      range("targetDurationMin", v.targetDurationMin, "targetDurationMin");
      member("thesisArchetype", v.thesisArchetype, context.format.thesisArchetypes);
      member("pillar", v.pillar, context.channel.pillars);
    }
    if (doc.schema === "outline") checked("beats", () => {
      const beats = list(v.beats).map(object), template = list(context.format.beats).map(object);
      range("beats.length", beats.length, "beatCount");
      const indices = beats.map(beat => numeric(beat.index)), expected = template.map(beat => numeric(beat.index));
      if (new Set(indices).size !== indices.length || new Set(expected).size !== expected.length ||
          [...indices].sort().join(",") !== [...expected].sort().join(",")) {
        fail("beats.index", indices, expected, "unique-index-join"); return;
      }
      const total = beats.reduce((sum, beat) => sum + numeric(beat.estimatedMs), 0);
      if (!Number.isSafeInteger(total) || total <= 0) { fail("beats.estimatedMs.total", total, "Positive safe integer total"); return; }
      const bounds = list(limits().targetDurationMin).map(numeric);
      if (bounds.length !== 2) throw new Error("Missing limits.targetDurationMin range");
      const duration = { n: BigInt(total), d: 60000n };
      if (compare(duration, fraction(bounds[0])) < 0 || compare(duration, fraction(bounds[1])) > 0) {
        fail("beats.totalDurationMin", total / 60000, bounds);
      }
      const tolerance = fraction(numeric(limits().beatShareTolerance));
      for (const beat of beats) {
        const sourceBeat = template.find(item => item.index === beat.index);
        if (!sourceBeat) throw new Error("Beat index has no unique template match");
        const share = numeric(sourceBeat.shareOfDuration);
        const difference = subtract({ n: BigInt(numeric(beat.estimatedMs)), d: BigInt(total) }, fraction(share));
        const absolute = { n: difference.n < 0n ? -difference.n : difference.n, d: difference.d };
        if (compare(absolute, tolerance) > 0) fail(`beats[index=${beat.index}].shareOfDuration`, numeric(beat.estimatedMs) / total,
          { shareOfDuration: share, tolerance: numeric(limits().beatShareTolerance) }, "beat-share");
      }
    });
    if (doc.schema === "script") checked("script", () => {
      range("wordCount", v.wordCount, "scriptWordCount");
      minimum("devicesUsed.length", list(v.devicesUsed).length, "devicesMin");
      minimum("lexiconUsed.length", list(v.lexiconUsed).length, "lexiconMin");
    });
    if (doc.schema === "canvas-map") checked("regions", () => range("regions.length", list(v.regions).length, "canvasRegionCount"));
    if (doc.schema === "storyboard") checked("scenes", () => {
      const scenes = list(v.scenes).map(object);
      range("scenes.length", scenes.length, "sceneCount");
      member("fps", v.fps, limits().fpsAllowed);
      const orientation = string(v.orientation);
      if (orientation !== "landscape" && orientation !== "vertical") throw new Error("Unknown orientation");
      const allowed = list(context.layouts[`${orientation}Layouts`]).map(item => object(item).id);
      for (let index = 0; index < scenes.length; index++) {
        minimum(`scenes[${index}].durationMs`, scenes[index].durationMs, "sceneMinDurationMs");
        member(`scenes[${index}].layout`, scenes[index].layout, allowed, [`${context.commit}:${context.layoutsPath}`]);
      }
      // propsSchema/canvas/fps design choices and visual quality await their own WPs; do not invent layout props.
    });
    if (doc.schema === "proof") checked("stills", () => {
      const stills = list(v.stills).map(object);
      minimum("stills.length", stills.length, "proofStillsMin");
      for (let index = 0; index < stills.length; index++) member(`stills[${index}].sampledFrom`, stills[index].sampledFrom, context.format.sampledFromKinds);
      // D-20: clip.durationSec has only the positive-number schema constraint, no new content threshold.
    });
    if (doc.schema === "sources") checked("claims", () => {
      minimum("counterClaims.length", list(v.counterClaims).length, "counterClaimsMin");
      list(v.claims).map(object).forEach((claim, index) => {
        const origin = object(claim.origin), kind = origin.kind;
        const fields: Record<string, string[]> = { snapshot: ["snapshotKey"], model: ["modelId", "modelVersion", "inputSetId", "outputKey"], url: ["url"] };
        if (typeof kind !== "string" || !fields[kind]) { fail(`claims[${index}].origin.kind`, kind, Object.keys(fields)); return; }
        for (const field of fields[kind]) {
          if (typeof origin[field] !== "string") fail(`claims[${index}].origin.${field}`, origin[field], "string required by origin.kind", "origin-relation");
        }
        if (kind === "model" && typeof origin.modelId === "string") {
          const modelPath = `models/${origin.modelId}.json`;
          try {
            if (!/^[a-z0-9-]+\/M-[0-9]{3}$/.test(origin.modelId)) throw new Error("Invalid model ID");
            const model = object(JSON.parse(this.source.text(modelPath)));
            const schemaErrors = this.schemas.check("model.schema.json", model, modelPath);
            if (schemaErrors.length || model.modelId !== origin.modelId || model.version !== origin.modelVersion ||
                object(model.verification).status === "partial") throw new Error("Missing/invalid model, version mismatch or partial verification");
          } catch (error) { fail(`claims[${index}].origin.modelVersion`, String(error), origin.modelVersion, "model-relation", [modelPath]); }
        }
      });
    });
    if (doc.schema === "publication" && v.visibility === "public" && typeof v.publishedAt !== "string") {
      fail("publishedAt", v.publishedAt, "date-time string when visibility=public", "publication-relation");
    }
    if (doc.schema === "metrics") checked("aggregate.nullReason", () => {
      const aggregate = object(v.aggregate);
      for (const key of ["views", "impressions", "ctr", "avgViewDurationSec"]) {
        if (aggregate[key] === null) {
          const reasons = aggregate.nullReason !== undefined ? object(aggregate.nullReason) : {};
          if (typeof reasons[key] !== "string") fail(`aggregate.nullReason.${key}`, reasons[key], "string for this null metric", "null-reason");
        }
      }
    });
    return errors;
  }

  run(): ReturnType<Validator["report"]> {
    this.collect();
    for (const doc of this.documents) {
      const eligible = doc.schema === "brief" || doc.schema === "episode-state" || (VERSIONED as readonly string[]).includes(doc.schema);
      if (!eligible) continue;
      this.coverage.tier2Eligible++;
      if (!doc.valid) { this.coverage.tier2BlockedByTier1++; continue; }
      this.coverage.tier2Checked++;
      this.issues.push(...this.domain(doc));
    }
    return this.report();
  }
  report() {
    return { sourceKind: this.source.kind, sourceCommit: this.source.head, bindings: this.bindings,
      sourceApprovals: this.approvals, coverage: this.coverage, issues: this.issues,
      realDataAllValid: this.source.kind === "git" ? this.issues.length === 0 : null,
      sourceValidation: this.issues.length ? "fail" : "pass",
      owningTools: { npmCi: "not-run-by-validator", typecheck: "not-run-by-validator" },
      wp000Acceptance: "not-established-by-validator",
      notAssessed: ["layout.propsSchema", "production-quality", "five-brief-prompt-regression", "provider-and-publication-rights"] };
  }
}

if (require.main === module) {
  try {
    const args = process.argv.slice(2), approvals: SourceApproval[] = [], bindings: Binding[] = [];
    let root = process.cwd(), head: string | undefined;
    for (let index = 0; index < args.length; index++) {
      const key = args[index], value = args[++index];
      if (!value) throw new Error(`Missing value for ${key}`);
      if (key === "--root") root = value;
      else if (key === "--commit") head = fullSha(value);
      else if (key === "--source") {
        const split = value.lastIndexOf("=");
        if (split < 1) throw new Error("--source expects episodeId=approvedCommit");
        approvals.push({ episodeId: value.slice(0, split), commit: fullSha(value.slice(split + 1)) });
      } else if (key === "--bind") {
        const split = value.indexOf("=");
        if (split < 1) throw new Error("--bind expects logicalSchema=path");
        bindings.push({ schema: value.slice(0, split), path: repoPath(value.slice(split + 1)) });
      } else throw new Error(`Unknown argument ${key}`);
    }
    const source = new GitSource(root, head ?? git(root, "rev-parse", "HEAD").trim());
    const report = new Validator(source, new Schemas(source), approvals, bindings).run();
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    process.exitCode = report.issues.length ? 1 : 0;
  } catch (error) {
    process.stdout.write(`${JSON.stringify({ sourceValidation: "fail", wp000Acceptance: "blocked", error: String(error) })}\n`);
    process.exitCode = 1;
  }
}
