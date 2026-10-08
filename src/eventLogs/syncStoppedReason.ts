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
export type AbortResult =
  { aborted: true } | { aborted: false; error: unknown };
type LogLevel = "error" | "fail" | "fatal";
// The sync stops the chain by itself: logs why, records the reason, then
// starts to abort. A step that fails is logged, and the next one still runs.
// It never throws, so that the caller goes on to stop its own work, and
// returns whether the abort started. A caller that ends with the error of the
// abort passes logAbortError: false, so that the error is logged once.
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
    return { aborted: false, error: abortError };
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
      error === undefined ? details : { ...details, error: loggable(error) },
    );
  } catch {
    // Nowhere else to report it.
  }
}
// Also the cause, which getLoggableError does not look into: an ethers error
// there has the RPC URL.
function loggable(error: unknown): unknown {
  const loggableError: unknown = getLoggableError(error);
  if (!(loggableError instanceof Error) || loggableError.cause === undefined) {
    return loggableError;
  }
  return {
    name: loggableError.name,
    message: loggableError.message,
    cause: loggable(loggableError.cause),
  };
}
