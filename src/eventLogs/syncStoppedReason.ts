import type { ChainName } from "#constants/chains/types.js";
import { startAbortingInChain } from "#db/dbEventLogsDataHandlersSyncStatus.js";
import type { SyncStatusChain } from "#db/dbTypes.js";
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
export type AbortResult =
  { aborted: true } | { aborted: false; error: unknown };
type LogLevel = "error" | "fail" | "fatal";
// The sync stops the chain by itself: logs why, records the reason (the first
// one is kept), then starts to abort. A step that fails is logged, and the
// next one still runs. When the abort fails, the chain is marked as aborting
// in the store, so that the loops of its contracts end and the sync of the
// chain ends. It never throws, so that the caller goes on to stop its own
// work, and returns whether the abort started. A caller that ends with the
// error of the abort passes logAbortError: false, so that the error is logged
// once.
export async function abortChainWithReason(
  chainName: ChainName,
  reason: SyncStoppedReason,
  message: string,
  {
    level = "error",
    details = {},
    error,
    logAbortError = true,
  }: {
    level?: LogLevel;
    details?: Record<string, unknown>;
    // The error that stops the chain, logged without what ethers adds.
    error?: unknown;
    logAbortError?: boolean;
  } = {},
): Promise<AbortResult> {
  safeLog(level, message, { chainName, reason, ...details }, error);
  try {
    recordSyncStoppedReason(chainName, reason);
  } catch (recordError) {
    safeLog(
      "error",
      "Failed to record why the sync stopped.",
      { chainName },
      recordError,
    );
  }
  try {
    await startAbortingInChain(chainName);
    return { aborted: true };
  } catch (abortError) {
    if (logAbortError) {
      safeLog("error", "Failed to start aborting.", { chainName }, abortError);
    }
    try {
      markChainAbortingInStore(chainName);
    } catch (markError) {
      safeLog(
        "error",
        "Failed to mark the chain as aborting.",
        { chainName },
        markError,
      );
    }
    return { aborted: false, error: abortError };
  }
}
// As startAbortingInChain does after the write, for the syncing contracts.
function markChainAbortingInStore(chainName: ChainName): void {
  const chain: SyncStatusChain = get(storeSyncStatus)[chainName];
  for (const [projectName, project] of Object.entries(chain.subSyncStatuses)) {
    for (const [versionName, version] of Object.entries(
      project.subSyncStatuses,
    )) {
      for (const [contractName, contract] of Object.entries(
        version.subSyncStatuses,
      )) {
        if (!contract?.isSyncing) continue;
        storeSyncStatus.updateState(
          { chainName, projectName, versionName, contractName },
          { isAbort: true },
        );
      }
    }
  }
}
// A logger that fails must not keep the chain from stopping.
function safeLog(
  level: LogLevel,
  message: string,
  details: Record<string, unknown>,
  error?: unknown,
): void {
  try {
    customLogger[level](
      message,
      error === undefined
        ? details
        : { ...details, error: getLoggableError(error) },
    );
  } catch {
    // Nowhere else to report it.
  }
}
