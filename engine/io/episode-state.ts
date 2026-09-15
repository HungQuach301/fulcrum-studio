import type { ArtifactRef, ArtifactStore, ArtifactWrite, WriteReceipt } from "./index";
import { assertPath, assertStateIdentity, isStatePath, SchemaCheck, stateRecord } from "./repo-store";

export interface EpisodeInspection {
  state: Record<string, unknown>;
  complete: boolean;
  pendingWriteIds: string[];
}
export function inspectEpisode(value: unknown, check: SchemaCheck): EpisodeInspection {
  check("episode-state.schema.json", value);
  const state = stateRecord(value);
  const pending = (state.pendingSideEffects ?? []) as Array<{ writeId: string }>;
  return { state, complete: state.stageStatus === "done" && pending.length === 0,
    pendingWriteIds: pending.map(item => item.writeId) };
}
export class EpisodeStates {
  constructor(private readonly store: ArtifactStore, private readonly check: SchemaCheck) {}
  async read(input: ArtifactRef): Promise<EpisodeInspection> {
    const ref = { ...input };
    assertPath(ref.path); if (!isStatePath(ref.path)) throw new Error("ExpectedStatePath");
    const value: unknown = JSON.parse(await this.store.read(ref));
    const result = inspectEpisode(value, this.check); assertStateIdentity(ref.path, value); return result;
  }
  write(input: Omit<ArtifactWrite, "schemaId">): Promise<WriteReceipt> {
    assertPath(input.path); if (!isStatePath(input.path)) throw new Error("ExpectedStatePath");
    const value: unknown = JSON.parse(input.content); inspectEpisode(value, this.check); assertStateIdentity(input.path, value);
    // Revision enforcement occurs at the serialized writer's latest snapshot, not a stale caller read.
    return this.store.write({ ...input, schemaId: "episode-state.schema.json" });
  }
}
