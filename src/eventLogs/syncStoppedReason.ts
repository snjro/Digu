import type { ChainName } from "#constants/chains/types.js";
import { startAbortingInChain } from "#db/dbEventLogsDataHandlersSyncStatus.js";
import { storeSyncStatus } from "#stores/storeSyncStatus.js";
import {
  storeSyncStoppedReason,
  type SyncStoppedReason,
} from "#stores/storeSyncStoppedReason.js";
import { get } from "svelte/store";
import { customLogger } from "#utils/logger.js";
import { getLoggableError } from "#utils/utilsEthers.js";

// Call before starting to abort, when the sync stops by itself. Keeps no
// reason when the chain is already stopping (the user stopped it).
export function recordSyncStoppedReason(
  chainName: ChainName,
  reason: SyncStoppedReason,
): void {
  if (get(storeSyncStatus)[chainName].isAbort) return;
  storeSyncStoppedReason.record(chainName, reason);
}
// The sync stops the chain by itself: logs why, records the reason, then
// starts to abort. A step that fails is logged, and the next one still runs.
// It never throws, so that the caller goes on to stop its own work.
export async function abortChainWithReason(
  chainName: ChainName,
  reason: SyncStoppedReason,
  message: string,
  details: Record<string, unknown> = {},
): Promise<void> {
  logError(message, { chainName, reason, ...details });
  try {
    recordSyncStoppedReason(chainName, reason);
  } catch (error) {
    logError("Failed to record why the sync stopped.", {
      chainName,
      error: getLoggableError(error),
    });
  }
  try {
    await startAbortingInChain(chainName);
  } catch (error) {
    logError("Failed to start aborting.", {
      chainName,
      error: getLoggableError(error),
    });
  }
}
function logError(message: string, details: Record<string, unknown>): void {
  try {
    customLogger.error(message, details);
  } catch {
    // A logger that fails must not keep the chain from stopping.
  }
}
