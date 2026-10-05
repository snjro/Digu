import type {
  SyncStatusChain,
  SyncStatusProject,
  SyncStatusVersion,
} from "#db/dbTypes.js";

export type ProgressRange = { start: number; goal: number; current: number };

// The goal is the latest block times the number of sync target contracts.
export function getSummedProgressRange(
  syncStatus: SyncStatusChain | SyncStatusProject | SyncStatusVersion,
  latestBlockNumber: number,
): ProgressRange {
  return {
    start: syncStatus.creationBlockNumber,
    goal: latestBlockNumber * syncStatus.numOfSyncTargetContract,
    current: syncStatus.fetchedBlockNumber,
  };
}
