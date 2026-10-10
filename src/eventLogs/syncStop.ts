import type { ChainName } from "#constants/chains/types.js";
import { startAbortingInChain } from "#db/dbEventLogsDataHandlersSyncStatus.js";
import type { SyncStoppedReason } from "#stores/storeSyncStoppedReason.js";
import { recordSyncStoppedReason } from "./syncStoppedReason";

// The abort of the sync run of this tab for each chain, in memory. It stops
// the loops even when isAbort cannot be written to the DB, and ends with the
// run, so that nothing is left to stop the next one.
const runAborts: Map<ChainName, AbortController> = new Map();

// Call at the start of a run, before its first await, so that a stop right
// after the start reaches it. Returns the function that ends the run.
export function startSyncRun(chainName: ChainName): () => void {
  const controller: AbortController = new AbortController();
  runAborts.set(chainName, controller);
  return () => {
    if (runAborts.get(chainName) === controller) runAborts.delete(chainName);
  };
}

// The signal of the run of the chain, if one runs in this tab.
export function getSyncRunSignal(
  chainName: ChainName,
): AbortSignal | undefined {
  return runAborts.get(chainName)?.signal;
}

// The one way to stop the sync of a chain, by the sync itself (with a reason)
// or by the user. Records the reason, stops the loops of this tab, and writes
// isAbort to the DB. Rejects when the write fails, after the loops have been
// told to stop.
export async function stopSync(
  chainName: ChainName,
  reason?: SyncStoppedReason,
): Promise<void> {
  // Keeps the reason of the first stop.
  if (reason !== undefined && !getSyncRunSignal(chainName)?.aborted) {
    recordSyncStoppedReason(chainName, reason);
  }
  runAborts.get(chainName)?.abort();
  await startAbortingInChain(chainName);
}
