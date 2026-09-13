import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import ts from "typescript";
import { dryRun } from "./log-run";
import { GitSource, Schemas, Validator, VERSIONED, frozen, fullSha, git, list, numeric, object, repoPath, string,
  type Binding, type Document, type Issue, type ObjectValue, type SourceApproval, type ValidationSource } from "./validate";

export const BASELINE = "a7fecd4f8a614d10687b471f70f71a5d5e08685f";
export const BASELINE_TREE = "ddb16f67fbf246e669dc28fc50718de75a365f11";
const ORIGINAL_STATE_BLOB = "6f6eb4493fb6173b19bf2af126bf0b0cd68c5593";
const WP_PATH = "engine/ops/work-packages/WP-000-scaffold.md";
const BACKLOG_PATH = "engine/ops/backlog.md";
const SYNTHETIC_TIME = "2099-01-01T00:00:00.000Z";
function copy<T>(value: T): T { return structuredClone(value); }
function blob(text: string): string { return createHash("sha1").update(`blob ${Buffer.byteLength(text)}\0`).update(text).digest("hex"); }
function inside(root: string, path: string): string {
  const result = resolve(root, path), rel = relative(root, result);
  if (!rel || rel.startsWith("..") || isAbsolute(rel)) throw new Error("Temporary path escaped its root");
  return result;
}

class FixtureSource implements ValidationSource {
  readonly kind = "fixture" as const;
  readonly head: string;
  readonly historical = new Map<string, string>();
  readonly trees = new Map<string, string>();
  readonly deniedCommits = new Set<string>();
  readonly paths: string[];
  constructor(readonly base: GitSource, readonly root: string, files: Map<string, string>) {
    this.head = base.head;
    this.paths = [...base.files().filter(path => /^engine\/contracts\/[^/]+\.schema\.json$/.test(path)), ...files.keys()];
    for (const [path, content] of files) {
      const target = inside(root, repoPath(path));
      mkdirSync(dirname(target), { recursive: true }); writeFileSync(target, content);
    }
  }
  files(): string[] { return this.paths; }
  text(path: string): string {
    if (path.startsWith("engine/contracts/")) return this.base.text(path);
    return readFileSync(inside(this.root, repoPath(path)), "utf8");
  }
  textAt(commit: string, path: string): string {
    if (this.deniedCommits.has(commit)) throw new Error("Fixture: pinned source unavailable");
    return this.historical.get(`${commit}:${path}`) ?? this.base.textAt(commit, path);
  }
  treeAt(commit: string, path: string): string {
    if (this.deniedCommits.has(commit)) throw new Error("Fixture: pinned source unavailable");
    return this.trees.get(`${commit}:${path}`) ?? this.base.treeAt(commit, path);
  }
}

/** Schema-derived skeletons supply structural fields only. Domain limits and membership come from C. */
function minimumValue(schema: ObjectValue, root: ObjectValue = schema): unknown {
  if (schema.$ref !== undefined) {
    const ref = string(schema.$ref);
    if (!ref.startsWith("#/")) throw new Error(`Unsupported fixture ref: ${ref}`);
    let target: unknown = root;
    for (const part of ref.slice(2).split("/")) target = object(target)[part.replace(/~1/g, "/").replace(/~0/g, "~")];
    return minimumValue(object(target), root);
  }
  if (schema.const !== undefined) return copy(schema.const);
  if (Array.isArray(schema.enum)) return copy(schema.enum[0]);
  const type = Array.isArray(schema.type) ? schema.type[0] : schema.type;
  if (type === "object") {
    const value: ObjectValue = {}, properties = object(schema.properties ?? {});
    for (const name of list(schema.required ?? []).map(string)) value[name] = minimumValue(object(properties[name]), root);
    return value;
  }
  if (type === "array") return Array.from({ length: typeof schema.minItems === "number" ? schema.minItems : 0 },
    () => minimumValue(object(schema.items), root));
  if (type === "number" || type === "integer") {
    if (typeof schema.minimum === "number") return schema.minimum;
    if (typeof schema.exclusiveMinimum === "number") return schema.exclusiveMinimum + 1;
    return 0;
  }
  if (type === "boolean") return false;
  if (type === "null") return null;
  if (type === "string") {
    if (schema.format === "date-time") return SYNTHETIC_TIME;
    if (schema.format === "date") return SYNTHETIC_TIME.slice(0, 10);
    if (schema.format === "uri") return "https://example.invalid/wp000-fixture";
    if (schema.pattern === "^C-[0-9]{3}$") return "C-001";
    if (schema.pattern === "^[0-9]+\\.[0-9]+$") return "0.0";
    return "x".repeat(Math.max(1, typeof schema.minLength === "number" ? schema.minLength : 1));
  }
  throw new Error(`Fixture skeleton needs an explicit override for ${JSON.stringify(schema)}`);
}

interface CaseResult { name: string; outcome: "pass" | "fail"; error?: string; }
interface Change { path: string; before?: string; after?: string; mode?: string; }
interface BootstrapPolicy { allowBacklogDone: boolean; stateAfterBlob?: string; }
function baselineScope(wp: string): Set<string> {
  const output = wp.split("### 3. Output\n")[1]?.split("### 3b.")[0];
  if (!output) throw new Error("Pinned main WP has no exact Output section");
  const scope = new Set([...output.matchAll(/`([^`]+)`/g)].map(match => match[1]).filter(path =>
    path.includes("/") || ["package.json", "package-lock.json", "tsconfig.json", ".gitignore"].includes(path)));
  for (const path of [...scope]) if (path.endsWith("/")) scope.add(`${path}.gitkeep`);
  // Only concrete Output paths. No scripts/** wildcard and no scope text read from candidate HEAD.
  return scope;
}
function contentLiterals(source: ValidationSource): Set<string> {
  const result = new Set<string>();
  for (const path of source.files().filter(path => /^(genres|channels)\/[^/]+\/(format-spec|layouts|channel|visual-tokens)\.json$/.test(path))) {
    const value = object(JSON.parse(source.text(path)));
    const add = (item: unknown): void => { if (typeof item === "string" && item.length) result.add(item); };
    for (const key of ["pillars", "thesisArchetypes", "sampledFromKinds", "coldOpenKinds"]) {
      if (Array.isArray(value[key])) list(value[key]).forEach(add);
    }
    for (const key of ["landscapeLayouts", "verticalLayouts"]) {
      if (Array.isArray(value[key])) list(value[key]).forEach(item => add(object(item).id));
    }
    if (value.providers !== undefined) Object.values(object(value.providers)).forEach(add);
    add(value.ttsVoiceId);
    const colors = (item: unknown): void => {
      if (typeof item === "string" && /^#[a-fA-F0-9]{3,8}$/.test(item)) add(item);
      else if (Array.isArray(item)) item.forEach(colors);
      else if (item !== null && typeof item === "object") Object.values(object(item)).forEach(colors);
    };
    colors(value);
  }
  return result;
}

export function checkChanges(changes: readonly Change[], wpOnMain: string, literals: Set<string>, policy: BootstrapPolicy): string[] {
  const errors: string[] = [], scope = baselineScope(wpOnMain);
  for (const change of changes) {
    const { path, before, after } = change;
    if (!scope.has(path)) errors.push(`scope:${path}`);
    if (change.mode !== undefined && change.mode !== "100644") errors.push(`mode:${path}`);
    if (path.startsWith("engine/contracts/")) errors.push(`contracts:${path}`);
    if (after === undefined) { errors.push(`deletion:${path}`); continue; }
    if (path === "pipeline/state.json" && (blob(before ?? "") !== ORIGINAL_STATE_BLOB ||
        !policy.stateAfterBlob || blob(after) !== policy.stateAfterBlob)) errors.push(`state-authorization:${path}`);
    if (path === BACKLOG_PATH) {
      const oldLines = (before ?? "").split("\n"), newLines = after.split("\n");
      const indices = oldLines.map((line, index) => line !== newLines[index] ? index : -1).filter(index => index >= 0);
      const index = indices[0];
      if (!policy.allowBacklogDone || oldLines.length !== newLines.length || indices.length !== 1 || index === undefined ||
          !/^\| WP-000 \|/.test(oldLines[index]) || newLines[index] !== oldLines[index].replace(/\| todo \|$/, "| done |")) errors.push("backlog:single-WP000-line");
    } else if (before !== undefined && path !== "pipeline/state.json") {
      // This first candidate adds files only. Later code changes remain within baseline Output scope.
      if (!scope.has(path)) errors.push(`preservation:${path}`);
    }
    if (path.endsWith("/.gitkeep") && after !== "") errors.push(`placeholder:${path}`);
    if (path === "pipeline/runs.jsonl" && after !== (before ?? "")) errors.push(`real-run-log:${path}`);
    const addedLines = after.split("\n").filter(line => !(before ?? "").split("\n").includes(line)).join("\n");
    const secret = /(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|sk-[A-Za-z0-9_-]{20,}|AKIA[A-Z0-9]{16}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----)/;
    if (secret.test(addedLines) || /(?:api[_-]?key|secret|token|password)\s*[:=]\s*["'][A-Za-z0-9_\/+.-]{20,}["']/i.test(addedLines)) errors.push(`secret:${path}`);
    if (/^(engine|scripts)\/.+\.ts$/.test(path)) {
      const source = ts.createSourceFile(path, addedLines, ts.ScriptTarget.ES2022, true);
      const visit = (node: ts.Node): void => {
        if ((ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) && literals.has(node.text)) errors.push(`content-literal:${path}`);
        ts.forEachChild(node, visit);
      };
      visit(source);
      if (/(?:targetDurationMin|beatCount|scriptWordCount|canvasRegionCount|sceneCount|sceneMinDurationMs|devicesMin|lexiconMin|proofStillsMin|counterClaimsMin)\s*:\s*(?:\[\s*\d|\d)/.test(addedLines)) errors.push(`content-range:${path}`);
    }
  }
  return [...new Set(errors)];
}

function actualChanges(source: GitSource): Change[] {
  const names = git(source.root, "diff", "--no-renames", "--name-only", "-z", BASELINE, source.head).split("\0").filter(Boolean);
  const baseNames = new Set(git(source.root, "ls-tree", "-r", "--name-only", "-z", BASELINE).split("\0"));
  const headNames = new Set(source.files());
  return names.map(path => ({ path, before: baseNames.has(path) ? source.textAt(BASELINE, path) : undefined,
    after: headNames.has(path) ? source.text(path) : undefined,
    mode: headNames.has(path) ? git(source.root, "ls-tree", source.head, "--", path).split(" ")[0] : undefined }));
}

/** Pure preparation helper only. No CLI route or workflow invokes it in this candidate. */
export function makeStateCandidate(source: GitSource, approvedCommit: string, approvedTree: string, generatedAt: string): string {
  if (source.head !== fullSha(approvedCommit) || git(source.root, "rev-parse", `${source.head}^{tree}`).trim() !== fullSha(approvedTree)) throw new Error("State source checkpoint differs");
  const raw = source.text("pipeline/state.json"), original = object(JSON.parse(raw));
  if (blob(raw) !== ORIGINAL_STATE_BLOB || source.files().some(path => /^episodes\/[^/]+\/[^/]+\/state\.json$/.test(path))) throw new Error("State bootstrap source changed or episode state exists");
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(generatedAt) || !Number.isFinite(Date.parse(generatedAt))) throw new Error("Real UTC creation time required");
  assert.deepEqual(original.episodes, []);
  return `${JSON.stringify({ note: original.note, rebuiltAt: generatedAt, sourceCommit: source.head, episodes: [] }, null, 2)}\n`;
}

export function fixtureSuite(source: GitSource, schemas: Schemas, tempRoot: string): CaseResult[] {
  const results: CaseResult[] = [];
  const run = (name: string, operation: () => void): void => {
    try { operation(); results.push({ name, outcome: "pass" }); }
    catch (error) { results.push({ name, outcome: "fail", error: String(error).slice(0, 2048) }); }
  };
  const channels = source.files().filter(path => /^channels\/[^/]+\/channel\.json$/.test(path)).sort();
  assert.ok(channels.length, "A fixture channel must be available from pinned source");
  const channel = object(JSON.parse(source.textAt(BASELINE, channels[0]))), slug = string(channel.slug);
  const episodeId = `${slug}/2099-01-wp000-fixture`;
  const pinned = frozen(source, schemas, episodeId, BASELINE), limits = object(pinned.format.limits);
  const bounds = (key: string): number[] => list(limits[key]).map(numeric);
  const names: Record<string, string> = { brief: "00-brief.json", "episode-state": "state.json", sources: "01-sources.json",
    factcheck: "02-factcheck.json", sensitivity: "03-sensitivity.json", outline: "04-outline.json", script: "05-script.md",
    "canvas-map": "06-canvas-map.json", storyboard: "07-storyboard.json", preflight: "08-preflight.json", timing: "09-timing.json",
    proof: "11-proof.json", "render-manifest": "12-render-manifest.json", "qa-report": "13-qa.json", package: "14-package.json",
    publication: "15-publication.json", metrics: "16-metrics.json", "analyst-note": "fixture-analyst-note.json", "license-ledger": "fixture-license-ledger.json" };
  const pathFor = (kind: string): string => `episodes/${episodeId}/${names[kind]}`;
  const schema = (kind: string): ObjectValue => {
    const value = schemas.definitions.get(`${kind}.schema.json`);
    if (!value) throw new Error(`Missing fixture schema ${kind}`);
    return value;
  };
  const skeleton = (kind: string): ObjectValue => object(minimumValue(schema(kind)));
  const item = (kind: string, key: string): ObjectValue => object(minimumValue(object(object(schema(kind).properties)[key]).items as ObjectValue, schema(kind)));
  const resize = (values: unknown[], count: number): unknown[] => Array.from({ length: count }, (_, index) => copy(values[index % values.length]));
  const valid = new Map<string, ObjectValue>();
  for (const kind of ["brief", "episode-state", ...VERSIONED]) {
    const value = skeleton(kind); value.episodeId = episodeId;
    if (kind === "brief" || kind === "episode-state") { value.channel = slug; value.versions = copy(pinned.versions); }
    valid.set(kind, value);
  }
  const value = (kind: string): ObjectValue => copy(valid.get(kind) ?? (() => { throw new Error(`Unknown fixture kind ${kind}`); })());
  const brief = valid.get("brief")!;
  brief.thesisId = `${slug}/TB-001`; brief.targetDurationMin = bounds("targetDurationMin")[0];
  brief.thesisArchetype = list(pinned.format.thesisArchetypes)[0]; brief.pillar = list(pinned.channel.pillars)[0];
  const sources = valid.get("sources")!;
  sources.claims = [{ claimId: "C-001", statement: "Synthetic evidence", origin: { kind: "snapshot", snapshotKey: "fixture/series/date" } }];
  sources.counterClaims = Array.from({ length: numeric(limits.counterClaimsMin) }, (_, index) => ({ claimId: `C-${String(index + 2).padStart(3, "0")}`, statement: "Synthetic counterclaim" }));
  valid.get("sensitivity")!.modelId = `${string(channel.genre)}/M-001`;
  const outline = valid.get("outline")!;
  const makeBeats = (durationMin: number): ObjectValue[] => list(pinned.format.beats).map(entry => {
    const beat = object(entry), result = item("outline", "beats");
    result.index = beat.index; result.name = beat.name; result.purpose = beat.purpose;
    result.estimatedMs = Math.round(durationMin * 60000 * numeric(beat.shareOfDuration)); return result;
  });
  outline.beats = makeBeats(bounds("targetDurationMin")[0]);
  const script = valid.get("script")!;
  script.wordCount = bounds("scriptWordCount")[0];
  script.devicesUsed = Array.from({ length: numeric(limits.devicesMin) }, (_, index) => `fixture-device-${index}`);
  script.lexiconUsed = Array.from({ length: numeric(limits.lexiconMin) }, (_, index) => `fixture-lexicon-${index}`);
  valid.get("canvas-map")!.regions = resize(list(valid.get("canvas-map")!.regions), bounds("canvasRegionCount")[0]);
  const storyboard = valid.get("storyboard")!, scene = item("storyboard", "scenes");
  scene.durationMs = numeric(limits.sceneMinDurationMs); scene.layout = object(list(pinned.layouts.landscapeLayouts)[0]).id;
  storyboard.fps = list(limits.fpsAllowed)[0]; storyboard.scenes = Array.from({ length: bounds("sceneCount")[0] }, () => copy(scene));
  const proof = valid.get("proof")!;
  proof.stills = Array.from({ length: numeric(limits.proofStillsMin) }, () => ({ ...item("proof", "stills"), sampledFrom: list(pinned.format.sampledFromKinds)[0] }));
  const model = skeleton("model"), modelId = `${string(channel.genre)}/M-001`;
  model.modelId = modelId; model.version = "0.0";
  object(model.verification).status = "verified"; // Synthetic schema fixture, never a change to a real model.

  interface Trial {
    kind: string; data?: ObjectValue; direct?: boolean; approvals?: SourceApproval[];
    alterFiles?: (files: Map<string, string>) => void; alterSource?: (fixture: FixtureSource) => void;
  }
  const exercise = (trial: Trial): Issue[] => {
    const root = mkdtempSync(inside(tempRoot, "case-"));
    try {
      const docs = new Map<string, ObjectValue>([["brief", value("brief")], ["episode-state", value("episode-state")]]);
      docs.set(trial.kind, trial.data ?? value(trial.kind));
      const files = new Map<string, string>();
      for (const [kind, data] of docs) files.set(pathFor(kind), kind === "script" ? `---\n${JSON.stringify(data)}\n---\nFixture body.\n` : JSON.stringify(data));
      files.set(`models/${modelId}.json`, JSON.stringify(model));
      trial.alterFiles?.(files);
      const fixture = new FixtureSource(source, root, files); trial.alterSource?.(fixture);
      const bindings: Binding[] = ["analyst-note", "license-ledger"].filter(kind => docs.has(kind)).map(kind => ({ path: pathFor(kind), schema: kind }));
      const validator = new Validator(fixture, schemas, trial.approvals ?? [{ episodeId, commit: BASELINE }], bindings);
      if (!trial.direct) return validator.run().issues;
      validator.collect();
      const target: Document = { path: pathFor(trial.kind), schema: trial.kind, value: trial.data ?? value(trial.kind), valid: true };
      return validator.domain(target);
    } finally { rmSync(root, { recursive: true, force: true }); }
  };
  const good = (name: string, trial: Trial): void => run(name, () => assert.deepEqual(exercise(trial), []));
  const bad = (name: string, trial: Trial, tier: Issue["tier"], field: string, rule?: string): void => run(name, () => {
    const issues = exercise(trial);
    assert.ok(issues.some(error => error.tier === tier && error.field.includes(field) && (!rule || error.rule === rule)), JSON.stringify(issues));
  });
  const modify = (kind: string, change: (data: ObjectValue) => void): ObjectValue => { const data = value(kind); change(data); return data; };

  for (const kind of ["brief", "episode-state", ...VERSIONED]) good(`positive:${kind}`, { kind });
  bad("DoD3:brief-missing-topic", { kind: "brief", data: modify("brief", data => { delete data.topic; }) }, "schema", "/topic", "required");
  // The value 5 is the exact mandatory DoD4 negative fixture, not a content limit in implementation.
  run("DoD4:brief-duration-five", () => {
    const issues = exercise({ kind: "brief", data: modify("brief", data => { data.targetDurationMin = 5; }) });
    const failure = issues.find(error => error.tier === "domain" && error.field === "targetDurationMin");
    assert.ok(failure); assert.deepEqual(failure.expected, bounds("targetDurationMin"));
    assert.ok(failure.sources.includes(`${BASELINE}:${pinned.formatPath}`));
  });
  bad("DoD5:unknown-pillar", { kind: "brief", data: modify("brief", data => { data.pillar = "__fixture_unknown_pillar__"; }) }, "domain", "pillar");
  bad("brief:unknown-archetype", { kind: "brief", data: modify("brief", data => { data.thesisArchetype = "__fixture_unknown_archetype__"; }) }, "domain", "thesisArchetype");

  for (const [kind, field, key] of [["brief", "targetDurationMin", "targetDurationMin"], ["script", "wordCount", "scriptWordCount"]]) {
    const [low, high] = bounds(key);
    for (const boundary of [low, high]) good(`${field}:boundary:${boundary}`, { kind, data: modify(kind, data => { data[field] = boundary; }) });
    for (const outside of [low - 1, high + 1]) bad(`${field}:outside:${outside}`, { kind, data: modify(kind, data => { data[field] = outside; }) }, "domain", field);
  }
  for (const [kind, field, key] of [["outline", "beats", "beatCount"], ["canvas-map", "regions", "canvasRegionCount"], ["storyboard", "scenes", "sceneCount"]]) {
    const [low, high] = bounds(key);
    for (const boundary of [low, high]) good(`${field}:count-boundary:${boundary}`, { kind, data: modify(kind, data => { data[field] = resize(list(data[field]), boundary); }) });
    for (const outside of [low - 1, high + 1]) bad(`${field}:count-outside:${outside}`, { kind, data: modify(kind, data => { data[field] = resize(list(data[field]), outside); }) }, "domain", `${field}.length`);
  }
  for (const [kind, field, key] of [["script", "devicesUsed", "devicesMin"], ["script", "lexiconUsed", "lexiconMin"],
    ["proof", "stills", "proofStillsMin"], ["sources", "counterClaims", "counterClaimsMin"]]) {
    const minimum = numeric(limits[key]);
    for (const count of [minimum, minimum + 1]) good(`${field}:minimum-or-above:${count}`, { kind, data: modify(kind, data => { data[field] = resize(list(data[field]), count); }) });
    bad(`${field}:below-minimum`, { kind, data: modify(kind, data => { data[field] = resize(list(data[field]), minimum - 1); }) }, "domain", `${field}.length`);
  }
  for (const fps of list(limits.fpsAllowed)) good(`fps:allowed:${fps}`, { kind: "storyboard", data: modify("storyboard", data => { data.fps = fps; }) });
  bad("fps:outside", { kind: "storyboard", data: modify("storyboard", data => { data.fps = Math.max(...list(limits.fpsAllowed).map(numeric)) + 1; }) }, "domain", "fps");
  for (const duration of [numeric(limits.sceneMinDurationMs), numeric(limits.sceneMinDurationMs) + 1]) good(`scene:duration:${duration}`, {
    kind: "storyboard", data: modify("storyboard", data => { object(list(data.scenes)[0]).durationMs = duration; }) });
  bad("scene:duration-below", { kind: "storyboard", data: modify("storyboard", data => { object(list(data.scenes)[0]).durationMs = numeric(limits.sceneMinDurationMs) - 1; }) }, "domain", "durationMs");
  for (const orientation of ["landscape", "vertical"]) {
    const layouts = list(pinned.layouts[`${orientation}Layouts`]).map(entry => object(entry).id);
    for (const layout of layouts) good(`layout:${orientation}:${layout}`, { kind: "storyboard", data: modify("storyboard", data => {
      data.orientation = orientation; list(data.scenes).forEach(entry => { object(entry).layout = layout; }); }) });
    const opposite = list(pinned.layouts[orientation === "landscape" ? "verticalLayouts" : "landscapeLayouts"]).map(entry => object(entry).id).find(id => !layouts.includes(id));
    assert.ok(opposite, "Need a distinct orientation layout fixture");
    bad(`layout:wrong-orientation:${orientation}`, { kind: "storyboard", data: modify("storyboard", data => {
      data.orientation = orientation; object(list(data.scenes)[0]).layout = opposite; }) }, "domain", "layout");
  }
  for (const sampledFrom of list(pinned.format.sampledFromKinds)) good(`proof:sample-kind:${sampledFrom}`, {
    kind: "proof", data: modify("proof", data => { object(list(data.stills)[0]).sampledFrom = sampledFrom; }) });
  bad("proof:unknown-sample", { kind: "proof", data: modify("proof", data => { object(list(data.stills)[0]).sampledFrom = "__fixture_unknown_sample__"; }) }, "domain", "sampledFrom");
  for (const kind of ["brief", "proof"]) {
    const field = kind === "brief" ? "targetDurationMin" : "clip.durationSec";
    const set = (data: ObjectValue, n: number): void => { if (kind === "brief") data.targetDurationMin = n; else object(data.clip).durationSec = n; };
    for (const n of [0, -1]) bad(`D20:${field}:nonpositive:${n}`, { kind, data: modify(kind, data => set(data, n)) }, "schema", field.replace(".", "/"));
    run(`D20:${field}:positive-subunit-schema`, () => {
      const data = modify(kind, data => set(data, 0.5));
      assert.deepEqual(schemas.check(`${kind}.schema.json`, data, pathFor(kind)), []);
    });
  }
  good("D20:proof-subunit-no-new-domain-floor", { kind: "proof", data: modify("proof", data => { object(data.clip).durationSec = 0.5; }) });
  bad("D20:brief-subunit-still-domain-fails", { kind: "brief", data: modify("brief", data => { data.targetDurationMin = 0.5; }) }, "domain", "targetDurationMin");
  for (const n of [0, -1, 0.5]) bad(`D20:outline-positive-integer:${n}`, { kind: "outline", data: modify("outline", data => { object(list(data.beats)[0]).estimatedMs = n; }) }, "schema", "estimatedMs");
  run("D20:outline-subsecond-integer-schema", () => {
    assert.deepEqual(schemas.check("outline.schema.json", modify("outline", data => { object(list(data.beats)[0]).estimatedMs = 1; }), pathFor("outline")), []);
  });
  for (const duration of bounds("targetDurationMin")) good(`outline:total-boundary:${duration}`, { kind: "outline", data: modify("outline", data => { data.beats = makeBeats(duration); }) });
  for (const duration of [bounds("targetDurationMin")[0] - 1, bounds("targetDurationMin")[1] + 1]) bad(`outline:total-outside:${duration}`, {
    kind: "outline", data: modify("outline", data => { data.beats = makeBeats(duration); }) }, "domain", "totalDurationMin");
  good("outline:index-join-independent-of-order", { kind: "outline", data: modify("outline", data => { list(data.beats).reverse(); }) });
  bad("outline:duplicate-index", { kind: "outline", data: modify("outline", data => { object(list(data.beats)[1]).index = object(list(data.beats)[0]).index; }) }, "domain", "beats.index");
  bad("outline:missing-template-index", { kind: "outline", data: modify("outline", data => { object(list(data.beats)[0]).index = Math.max(...list(data.beats).map(entry => numeric(object(entry).index))) + 1; }) }, "domain", "beats.index");
  for (const direction of [-1, 1]) {
    const total = list(outline.beats).reduce<number>((sum, entry) => sum + numeric(object(entry).estimatedMs), 0);
    const delta = total * numeric(limits.beatShareTolerance);
    assert.ok(Number.isInteger(delta), "Pinned fixture boundary must be representable in integer milliseconds");
    const adjusted = (extra: number): ObjectValue => modify("outline", data => {
      const beats = list(data.beats).map(object);
      beats[0].estimatedMs = numeric(beats[0].estimatedMs) + direction * (delta + extra);
      beats[1].estimatedMs = numeric(beats[1].estimatedMs) - direction * (delta + extra);
    });
    good(`outline:share-exact-boundary:${direction}`, { kind: "outline", data: adjusted(0) });
    bad(`outline:share-outside:${direction}`, { kind: "outline", data: adjusted(1) }, "domain", "shareOfDuration", "beat-share");
  }
  for (const key of ["targetDurationMin", "beatCount", "beatShareTolerance", "scriptWordCount", "devicesMin", "lexiconMin",
    "canvasRegionCount", "sceneCount", "sceneMinDurationMs", "fpsAllowed", "proofStillsMin", "counterClaimsMin"]) {
    const kinds: Record<string, string> = { targetDurationMin: "brief", beatCount: "outline", beatShareTolerance: "outline",
      scriptWordCount: "script", devicesMin: "script", lexiconMin: "script", canvasRegionCount: "canvas-map",
      sceneCount: "storyboard", sceneMinDurationMs: "storyboard", fpsAllowed: "storyboard", proofStillsMin: "proof", counterClaimsMin: "sources" };
    bad(`source:missing-limit:${key}`, { kind: kinds[key], alterSource: fixture => {
      const format = copy(pinned.format); delete object(format.limits)[key];
      fixture.historical.set(`${BASELINE}:${pinned.formatPath}`, JSON.stringify(format)); } }, "domain", "");
  }

  const origins: Record<string, ObjectValue> = { snapshot: { kind: "snapshot", snapshotKey: "fixture/series/date" },
    model: { kind: "model", modelId, modelVersion: model.version, inputSetId: "fixture-input", outputKey: "fixture-output" },
    url: { kind: "url", url: "https://example.invalid/fixture-source" } };
  for (const [kind, origin] of Object.entries(origins)) {
    const withOrigin = (candidate: ObjectValue): ObjectValue => modify("sources", data => { object(list(data.claims)[0]).origin = candidate; });
    good(`D19:origin:${kind}`, { kind: "sources", data: withOrigin(copy(origin)) });
    for (const key of Object.keys(origin).filter(key => key !== "kind")) {
      for (const wrong of ["missing", "wrong-type"]) {
        const candidate = copy(origin); if (wrong === "missing") delete candidate[key]; else candidate[key] = 1;
        bad(`D19:origin:${kind}:${key}:${wrong}:schema`, { kind: "sources", data: withOrigin(candidate) }, "schema", key);
        bad(`D19:origin:${kind}:${key}:${wrong}:relation`, { kind: "sources", data: withOrigin(candidate), direct: true }, "domain", key, "origin-relation");
      }
    }
  }
  for (const alteration of ["partial", "missing", "version"]) bad(`D19:model:${alteration}`, {
    kind: "sources", data: modify("sources", data => { object(list(data.claims)[0]).origin = copy(origins.model); }),
    alterFiles: files => {
      if (alteration === "missing") files.delete(`models/${modelId}.json`);
      else { const changed = copy(model); if (alteration === "partial") object(changed.verification).status = "partial"; else changed.version = "0.1";
        files.set(`models/${modelId}.json`, JSON.stringify(changed)); }
    } }, "domain", "modelVersion", "model-relation");
  bad("D19:url-format", { kind: "sources", data: modify("sources", data => { object(list(data.claims)[0]).origin = { kind: "url", url: "not a URI" }; }) }, "schema", "/url", "format");
  for (const visibility of ["private", "unlisted", "public"]) {
    const data = modify("publication", entry => { entry.visibility = visibility; if (visibility === "public") entry.publishedAt = SYNTHETIC_TIME; });
    good(`D19:publication:${visibility}`, { kind: "publication", data });
  }
  for (const wrong of ["missing", "wrong-type"]) {
    const data = modify("publication", entry => { entry.visibility = "public"; if (wrong === "wrong-type") entry.publishedAt = 1; });
    bad(`D19:public:${wrong}:schema`, { kind: "publication", data }, "schema", "publishedAt");
    bad(`D19:public:${wrong}:relation`, { kind: "publication", data, direct: true }, "domain", "publishedAt", "publication-relation");
  }
  bad("D19:public-invalid-date", { kind: "publication", data: modify("publication", data => { data.visibility = "public"; data.publishedAt = "not a timestamp"; }) }, "schema", "publishedAt", "format");
  const metricKeys = ["views", "impressions", "ctr", "avgViewDurationSec"];
  for (const key of metricKeys) {
    good(`D19:null:${key}:reason`, { kind: "metrics", data: modify("metrics", data => { const aggregate = object(data.aggregate); aggregate[key] = null; aggregate.nullReason = { [key]: "Synthetic unavailable metric" }; }) });
    for (const wrong of ["missing", "wrong-key", "wrong-type"]) {
      const data = modify("metrics", data => { const aggregate = object(data.aggregate); aggregate[key] = null;
        aggregate.nullReason = wrong === "missing" ? {} : wrong === "wrong-key" ? { [metricKeys.find(other => other !== key)!]: "Different metric" } : { [key]: 1 }; });
      bad(`D19:null:${key}:${wrong}:relation`, { kind: "metrics", data, direct: true }, "domain", `nullReason.${key}`, "null-reason");
      if (wrong === "wrong-type") bad(`D19:null:${key}:wrong-type:schema`, { kind: "metrics", data }, "schema", `/nullReason/${key}`, "type");
      else bad(`D19:null:${key}:${wrong}:real-flow`, { kind: "metrics", data }, "domain", `nullReason.${key}`, "null-reason");
    }
  }
  for (const kind of VERSIONED) {
    good(`D19-D20:versions:${kind}:inherited`, { kind });
    good(`D19-D20:versions:${kind}:declared`, { kind, data: modify(kind, data => { data.versions = copy(pinned.versions); }) });
    bad(`D19-D20:versions:${kind}:missing-source`, { kind, approvals: [] }, "domain", "versions");
    bad(`D19-D20:versions:${kind}:mismatch`, { kind, data: modify(kind, data => { data.versions = { ...pinned.versions, engine: "fixture-mismatch" }; }) }, "domain", "versions");
    for (const key of ["engine", "genre", "channel"]) bad(`D19-D20:versions:${kind}:partial:${key}`, { kind, data: modify(kind, data => {
      const versions: ObjectValue = { ...pinned.versions }; delete versions[key]; data.versions = versions; }) }, "schema", `/versions/${key}`, "required");
    for (const key of ["engine", "genre", "channel"]) bad(`D19-D20:versions:${kind}:type:${key}`, { kind, data: modify(kind, data => {
      data.versions = { ...pinned.versions, [key]: 1 }; }) }, "schema", `/versions/${key}`, "type");
  }
  for (const kind of ["brief", "episode-state"]) {
    for (const key of ["engine", "genre", "channel"]) bad(`versions:${kind}:required-triple:${key}`, { kind,
      data: modify(kind, data => { delete object(data.versions)[key]; }) }, kind === "brief" ? "schema" : "domain", "versions");
    bad(`versions:${kind}:wrong-channel`, { kind, data: modify(kind, data => { data.channel = "fixture-other-channel"; }) }, "domain", "versions");
    bad(`versions:${kind}:wrong-episode`, { kind, data: modify(kind, data => { data.episodeId = `${slug}/2099-02-other-fixture`; }) }, "domain", "versions");
  }
  bad("versions:duplicate-approval", { kind: "brief", approvals: [{ episodeId, commit: BASELINE }, { episodeId, commit: BASELINE }] }, "domain", "versions");
  bad("versions:wrong-approved-C", { kind: "brief", approvals: [{ episodeId, commit: source.head }] }, "domain", "versions");
  bad("versions:unavailable-C", { kind: "brief", alterSource: fixture => { fixture.deniedCommits.add(BASELINE); } }, "domain", "versions");
  bad("versions:source-channel-identity", { kind: "brief", alterSource: fixture => {
    fixture.historical.set(`${BASELINE}:${pinned.channelPath}`, JSON.stringify({ ...pinned.channel, slug: "fixture-other-channel" }));
  } }, "domain", "versions");
  bad("versions:source-genre-identity", { kind: "brief", alterSource: fixture => {
    fixture.historical.set(`${BASELINE}:${pinned.formatPath}`, JSON.stringify({ ...pinned.format, genre: "fixture-other-genre" }));
  } }, "domain", "versions");
  for (const label of ["empty", "different"]) for (const pack of ["channel", "genre"]) bad(`versions:label:${pack}:${label}`, {
    kind: "brief", alterSource: fixture => {
      const data = copy(pack === "channel" ? pinned.channel : pinned.format);
      data[pack === "channel" ? "engineVersion" : "version"] = label === "empty" ? "" : "fixture-other-version";
      fixture.historical.set(`${BASELINE}:${pack === "channel" ? pinned.channelPath : pinned.formatPath}`, JSON.stringify(data)); } }, "domain", "versions");
  for (const pack of [`channels/${slug}`, `genres/${string(channel.genre)}`]) {
    bad(`versions:wrong-pack-tree:${pack}`, { kind: "brief", alterSource: fixture => { fixture.trees.set(`${BASELINE}:${pack}`, "0".repeat(40)); } }, "domain", "versions");
    bad(`versions:missing-pack:${pack}`, { kind: "brief", alterSource: fixture => { fixture.trees.set(`${BASELINE}:${pack}`, "missing"); } }, "domain", "versions");
  }
  for (const kind of ["brief", "episode-state"]) bad(`versions:missing-artifact:${kind}`, { kind: "sources", alterFiles: files => { files.delete(pathFor(kind)); } }, "domain", "versions");
  bad("versions:duplicate-episode-mapping", { kind: "sources", alterFiles: files => { files.set(`episodes/${slug}/2099-02-duplicate/00-brief.json`, JSON.stringify(value("brief"))); } }, "domain", "versions");
  run("versions:pinned-C-differs-from-HEAD", () => { assert.notEqual(source.head, BASELINE); assert.deepEqual(exercise({ kind: "brief" }), []); });

  const allowlistPath = "config/publish-allowlist.json", allowlist = object(JSON.parse(source.text(allowlistPath)));
  const allowlistProperties = object(schema("publish-allowlist").properties);
  const allowTest = (name: string, data: ObjectValue, field?: string, keyword?: string): void => run(name, () => {
    const issues = schemas.check("publish-allowlist.schema.json", data, "fixture:publish-allowlist.json");
    if (!field) assert.deepEqual(issues, []);
    else assert.ok(issues.some(error => error.field === `/${field}` && error.rule === keyword), JSON.stringify(issues));
  });
  allowTest("allowlist:valid", copy(allowlist));
  const noNote = copy(allowlist); delete noNote.note; allowTest("allowlist:optional-note-absent", noNote);
  for (const key of list(schema("publish-allowlist").required).map(string)) { const data = copy(allowlist); delete data[key]; allowTest(`allowlist:missing:${key}`, data, key, "required"); }
  for (const [key, prop] of Object.entries(allowlistProperties)) {
    const data = copy(allowlist), type = object(prop).type;
    data[key] = type === "boolean" ? "true" : type === "array" ? {} : 1;
    allowTest(`allowlist:type:${key}`, data, key, "type");
    if (type === "array") { const changed = copy(allowlist); changed[key] = [1]; allowTest(`allowlist:item:${key}`, changed, `${key}/0`, "type"); }
  }
  allowTest("allowlist:extra", { ...allowlist, fixtureExtra: true }, "fixtureExtra", "additionalProperties");
  run("state:original-four-errors-not-real-data-pass", () => {
    const raw = source.textAt(BASELINE, "pipeline/state.json"); assert.equal(blob(raw), ORIGINAL_STATE_BLOB);
    const errors = schemas.check("pipeline-state.schema.json", JSON.parse(raw), "fixture:original-state");
    assert.deepEqual(errors.map(error => `${error.rule}:${error.field}`).sort(), ["required:/sourceCommit", "type:/rebuiltAt", "additionalProperties:/engineVersion", "additionalProperties:/aggregates"].sort());
  });
  bad("inventory:unknown-json", { kind: "brief", alterFiles: files => { files.set("fixture-unmapped.json", "{}"); } }, "inventory", "", "read-or-classify");
  run("inventory:ambiguous-binding", () => {
    const root = mkdtempSync(inside(tempRoot, "ambiguous-"));
    try {
      const path = pathFor("analyst-note"), fixture = new FixtureSource(source, root, new Map([[path, JSON.stringify(value("analyst-note"))]]));
      const result = new Validator(fixture, schemas, [], [{ path, schema: "analyst-note" }, { path, schema: "license-ledger" }]).run();
      assert.ok(result.issues.some(error => error.tier === "inventory"));
    } finally { rmSync(root, { recursive: true, force: true }); }
  });
  run("inventory:unreadable-source", () => {
    const root = mkdtempSync(inside(tempRoot, "unreadable-"));
    try { const fixture = new FixtureSource(source, root, new Map()); fixture.paths.push("pipeline/state.json");
      assert.ok(new Validator(fixture, schemas).run().issues.some(error => error.file === "pipeline/state.json" && error.tier === "inventory"));
    } finally { rmSync(root, { recursive: true, force: true }); }
  });
  for (const text of ["", dryRun(schemas, SYNTHETIC_TIME), "{}\n", "not-json\n", "\n"]) run(`jsonl:${text === "" ? "empty" : text.startsWith("{") ? text.length : "invalid"}`, () => {
    const root = mkdtempSync(inside(tempRoot, "jsonl-"));
    try {
      const result = new Validator(new FixtureSource(source, root, new Map([["pipeline/runs.jsonl", text]])), schemas).run();
      if (text === "" || text.includes("costUsd")) assert.deepEqual(result.issues, []); else assert.ok(result.issues.length);
      assert.equal(result.coverage.jsonlLines, text === "" ? 0 : 1);
    } finally { rmSync(root, { recursive: true, force: true }); }
  });
  bad("front-matter:missing-field", { kind: "script", data: modify("script", data => { delete data.wordCount; }) }, "schema", "/wordCount", "required");
  bad("front-matter:reject-language-engine", { kind: "script", alterFiles: files => { files.set(pathFor("script"), "---javascript\n({})\n---\n"); } }, "inventory", "", "read-or-classify");
  run("DoD6:log-run-dry-run-schema-and-cost", () => {
    const line = dryRun(schemas, SYNTHETIC_TIME); assert.equal(line.trim().split("\n").length, 1);
    const parsed = object(JSON.parse(line)); assert.equal(typeof parsed.costUsd, "number");
    assert.deepEqual(schemas.check("run-log.schema.json", parsed, "fixture:dry-run"), []);
  });
  const wp = source.textAt(BASELINE, WP_PATH), baselineSource = new GitSource(source.root, BASELINE), literals = contentLiterals(baselineSource);
  const policy: BootstrapPolicy = { allowBacklogDone: false };
  run("guardrails:valid-control", () => assert.deepEqual(checkChanges([{ path: "engine/io/index.ts", after: "export interface Reader { read(): Promise<string>; }\n", mode: "100644" }], wp, literals, policy), []));
  const guardBad = (name: string, change: Change, prefix: string): void => run(`guardrails:${name}`, () => assert.ok(checkChanges([change], wp, literals, policy).some(error => error.startsWith(prefix))));
  guardBad("outside-scope", { path: "engine/other.ts", after: "export {};" }, "scope:");
  guardBad("contracts", { path: "engine/contracts/brief.schema.json", before: "{}", after: "{\"type\":\"object\"}" }, "contracts:");
  guardBad("unauthorized-state", { path: "pipeline/state.json", before: source.textAt(BASELINE, "pipeline/state.json"), after: "{}" }, "state-authorization:");
  const oldBacklog = source.textAt(BASELINE, BACKLOG_PATH);
  guardBad("other-backlog-row", { path: BACKLOG_PATH, before: oldBacklog, after: oldBacklog.replace(/\| WP-001 \|([^\n]+)\| todo \|/, "| WP-001 |$1| done |") }, "backlog:");
  const doneBacklog = oldBacklog.replace(/(\| WP-000 \|[^\n]+)\| todo \|/, "$1| done |");
  guardBad("unapproved-backlog-close", { path: BACKLOG_PATH, before: oldBacklog, after: doneBacklog }, "backlog:");
  run("guardrails:approved-single-backlog-control", () => assert.deepEqual(checkChanges([{ path: BACKLOG_PATH, before: oldBacklog, after: doneBacklog }], wp, literals, { allowBacklogDone: true }), []));
  guardBad("synthetic-secret", { path: "scripts/log-run.ts", after: `const credential = "${["gh", "p_"].join("")}${"X".repeat(36)}";` }, "secret:");
  const literal = [...literals][0]; assert.ok(literal);
  guardBad("content-literal", { path: "engine/io/index.ts", after: `export const content = ${JSON.stringify(literal)};` }, "content-literal:");
  guardBad("content-range", { path: "scripts/validate.ts", after: `const limits = { beatCount: ${JSON.stringify(bounds("beatCount"))} };` }, "content-range:");
  guardBad("persistent-run-log", { path: "pipeline/runs.jsonl", before: "", after: dryRun(schemas, SYNTHETIC_TIME) }, "real-run-log:");
  guardBad("symlink", { path: "scripts/validate.ts", after: "fixture-target", mode: "120000" }, "mode:");
  return results;
}

if (require.main === module) {
  let temp: string | undefined;
  let source: GitSource | undefined;
  let statusBefore: string | undefined;
  const report: ObjectValue = { purpose: "wp000-acceptance-candidate", wp000Acceptance: "blocked",
    realData: "not-run", fixtures: "not-run", guardrails: "not-run", typecheck: "not-run", npmCi: "not-run-by-harness",
    logDryRun: "not-run",
    statePreparation: "not-activated", billingReconciled: false, billedCostUsd: null,
    notAssessed: ["production", "five-brief-prompt-regression", "state-normalization", "layout.propsSchema"] };
  let reportPath: string | undefined;
  try {
    if (process.env.GITHUB_ACTIONS !== "true") throw new Error("Actions-only harness; no Codex/local execution authorization");
    if (process.argv.slice(2).join(" ") !== "--acceptance") throw new Error("Only separately authorized --acceptance is implemented; state route is not activated");
    if (process.version !== "v20.20.2") throw new Error("Pinned helper Node differs");
    const expected = fullSha(process.env.WP000_ACCEPTANCE_COMMIT ?? "");
    const root = process.cwd(); source = new GitSource(root, git(root, "rev-parse", "HEAD").trim());
    if (source.head !== expected || git(root, "rev-parse", `${BASELINE}^{tree}`).trim() !== BASELINE_TREE) throw new Error("Acceptance checkpoint differs");
    const runnerTemp = resolve(process.env.RUNNER_TEMP ?? (() => { throw new Error("RUNNER_TEMP absent"); })());
    if (runnerTemp === root || !relative(root, runnerTemp).startsWith("..")) throw new Error("Temporary root must be outside source tree");
    temp = mkdtempSync(inside(runnerTemp, "wp000-acceptance-"));
    reportPath = inside(runnerTemp, "wp000-ci-report.txt");
    statusBefore = git(root, "status", "--porcelain=v1", "--untracked-files=all");
    if (statusBefore) throw new Error("Source checkout is not clean before checks");
    report.sourceCommit = source.head; report.sourceTree = git(root, "rev-parse", "HEAD^{tree}").trim();
    report.eventSha = process.env.GITHUB_SHA; report.runId = process.env.GITHUB_RUN_ID;
    report.runAttempt = process.env.GITHUB_RUN_ATTEMPT; report.helperNode = process.version;
    report.npm = execFileSync("npm", ["--version"], { encoding: "utf8" }).trim();
    if (report.npm !== "10.8.2") throw new Error("Pinned npm differs");
    const schemas = new Schemas(source);
    // Real source and fixtures are independent. The known invalid state is never replaced by a fixture.
    report.realData = new Validator(source, schemas).run();
    report.fixtures = fixtureSuite(source, schemas, temp);
    const wp = source.textAt(BASELINE, WP_PATH), baselineSource = new GitSource(root, BASELINE);
    report.guardrails = checkChanges(actualChanges(source), wp, contentLiterals(baselineSource), { allowBacklogDone: false });
    report.guardrailsMethod = "Baseline Output diff, token patterns, TypeScript literals and content-range patterns; manual diff review still required";
    try {
      report.typecheckLog = execFileSync(process.execPath, [resolve(root, "node_modules/typescript/bin/tsc"), "--noEmit"], { cwd: root, encoding: "utf8" });
      report.typecheck = "pass";
    } catch (error) { report.typecheck = "fail"; report.typecheckLog = String(error); }
    try {
      const line = execFileSync(process.execPath, [resolve(root, "node_modules/tsx/dist/cli.mjs"), "scripts/log-run.ts", "--dry-run"], { cwd: root, encoding: "utf8" });
      assert.equal(line.trim().split("\n").length, 1);
      const parsed = object(JSON.parse(line)); assert.equal(typeof parsed.costUsd, "number");
      assert.deepEqual(schemas.check("run-log.schema.json", parsed, "dry-run:stdout"), []);
      report.logDryRun = "pass"; report.logDryRunLine = parsed;
    } catch (error) { report.logDryRun = "fail"; report.logDryRunError = String(error); }
    const real = object(report.realData), fixtureCases = report.fixtures as CaseResult[], guardrailErrors = report.guardrails as string[];
    report.harnessResult = list(real.issues).length === 0 && fixtureCases.every(entry => entry.outcome === "pass") &&
      guardrailErrors.length === 0 && report.typecheck === "pass" && report.logDryRun === "pass" ? "pass" : "fail";
    // npm ci / source receipt / run authorization belong to a future acceptance workflow. No WP pass inference here.
    report.wp000Acceptance = report.harnessResult === "pass" ? "requires-owning-workflow-and-owner-review" : "blocked";
    process.exitCode = report.harnessResult === "pass" ? 0 : 1;
  } catch (error) { report.error = String(error); report.harnessResult = "fail"; process.exitCode = 1; }
  finally {
    if (temp) rmSync(temp, { recursive: true, force: true });
    if (source && statusBefore !== undefined) {
      try {
        const unchanged = git(source.root, "status", "--porcelain=v1", "--untracked-files=all") === statusBefore &&
          git(source.root, "rev-parse", "HEAD").trim() === source.head;
        report.sourceUnchanged = unchanged;
        if (!unchanged) { report.harnessResult = "fail"; process.exitCode = 1; }
      } catch (error) { report.sourceUnchanged = false; report.cleanupError = String(error); process.exitCode = 1; }
    }
    const output = `${JSON.stringify(report, null, 2)}\n`;
    if (reportPath) writeFileSync(reportPath, output);
    process.stdout.write(output);
  }
}
