import { assertCommit, SchemaCheck } from "./repo-store";
import { inspectEpisode } from "./episode-state";

/** Pure projection only. Only a separately authorized reindex workflow may persist it. */
export function buildIndex(states: readonly unknown[], sourceCommit: string, rebuiltAt: string, check: SchemaCheck): unknown {
  assertCommit(sourceCommit);
  const seen = new Set<string>();
  const episodes = states.map(value => {
    const { state, complete, pendingWriteIds } = inspectEpisode(value, check);
    const episodeId = String(state.episodeId);
    if (seen.has(episodeId)) throw new Error("DuplicateEpisode");
    seen.add(episodeId);
    // Do not publish a false done projection while reconciliation is outstanding.
    const stageStatus = !complete && pendingWriteIds.length && state.stageStatus === "done" ? "blocked" : state.stageStatus;
    return { episodeId, channel: state.channel, currentStage: state.currentStage, stageStatus,
      updatedAt: state.updatedAt, spendUsd: state.spendUsd };
  }).sort((a, b) => a.episodeId < b.episodeId ? -1 : a.episodeId > b.episodeId ? 1 : 0);
  const index = { rebuiltAt, sourceCommit, episodes }; check("pipeline-state.schema.json", index); return index;
}
