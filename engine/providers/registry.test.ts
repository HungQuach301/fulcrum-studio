import assert from "node:assert/strict";
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import type { Provider } from "./index";
import { ProviderRegistry } from "./registry";

async function main() {
  let calls = 0;
  const fake: Provider = { invoke: async request => {
    calls++; return { output: request.input, providerRequestId: "fixture", model: request.model, costUsd: 0, costKind: "actual" };
  } };
  const cases: Array<{ name: string; result: string; error?: string }> = [];
  async function test(name: string, body: () => void | Promise<void>) {
    try { await body(); cases.push({ name, result: "pass" }); }
    catch (error) { cases.push({ name, result: "fail", error: String(error) }); }
    console.log(JSON.stringify(cases[cases.length - 1]));
  }
  await test("configuration-resolve-without-invoke", () => {
    const registry = new ProviderRegistry().register("fixture-adapter", fake);
    assert.equal(registry.resolve({ providers: { fixture: "fixture-adapter" } }, "fixture"), fake); assert.equal(calls, 0);
  });
  await test("duplicate-registration-rejected", () => {
    const registry = new ProviderRegistry().register("fixture-adapter", fake);
    assert.throws(() => registry.register("fixture-adapter", fake), /DuplicateProvider/);
    assert.throws(() => registry.register("", fake), /InvalidProviderRegistration/);
  });
  await test("missing-and-invalid-mapping-rejected", () => {
    const registry = new ProviderRegistry().register("fixture-adapter", fake);
    for (const config of [null, [], {}, { providers: [] }, { providers: {} }, { providers: { fixture: 1 } }, { providers: { fixture: "absent" } }]) {
      assert.throws(() => registry.resolve(config, "fixture"));
    }
    assert.throws(() => registry.resolve({ providers: { fixture: "fixture-adapter" } }, "toString"), /MissingProviderRole/);
    assert.equal(calls, 0);
  });
  await test("channel-mapping-read-from-repo", () => {
    const paths = readdirSync("channels"); assert.ok(paths.length > 0);
    const config = JSON.parse(readFileSync(join("channels", paths[0], "channel.json"), "utf8")) as { providers: Record<string, string> };
    const registry = new ProviderRegistry();
    for (const name of new Set<string>(Object.values(config.providers))) registry.register(name, fake);
    for (const role of Object.keys(config.providers)) assert.equal(registry.resolve(config, role), fake);
    assert.equal(calls, 0);
  });
  await test("fake-interface-invocation-only", async () => {
    const provider = new ProviderRegistry().register("fixture-adapter", fake).resolve({ providers: { fixture: "fixture-adapter" } }, "fixture");
    const result = await provider.invoke({ operation: "fixture", model: "fixture", input: { value: "fixture" }, idempotencyKey: "fixture" });
    assert.equal(result.providerRequestId, "fixture"); assert.equal(calls, 1); assert.equal(result.costUsd, 0);
  });
  const report = { grant: "FS24-A", cases, passed: cases.filter(x => x.result === "pass").length,
    failed: cases.filter(x => x.result !== "pass").length, realProviderCalls: 0 };
  if (process.env.FS_EVIDENCE) writeFileSync(join(process.env.FS_EVIDENCE, "registry-tests.json"), JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify({ passed: report.passed, failed: report.failed }));
  if (report.failed) process.exitCode = 1;
}
main().catch(error => { console.error(error); process.exitCode = 1; });
