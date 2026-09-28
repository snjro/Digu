// The texts of the confirmation and the progress of a large import. Without
// ethers, so that the components can import it.
import { numberWithCommas } from "@utils/utilsCommon";
import type { WarpSyncState } from "./warpSyncState";

// Measured with the DB worker on a desktop computer (2,330,000 logs in 519 s).
const IMPORTED_LOGS_PER_SECOND = 4_500;
// Stored in IndexedDB for each log: 412 B in a real browser, 950 B with fake
// logs in the measurement.
const STORED_BYTES_PER_LOG: [number, number] = [412, 950];

export function formatBytes(bytes: number): string {
  if (bytes < 1_000_000) return `${Math.max(1, Math.round(bytes / 1_000))} KB`;
  if (bytes < 1_000_000_000) return `${Math.round(bytes / 1_000_000)} MB`;
  return `${(bytes / 1_000_000_000).toFixed(1)} GB`;
}

export function formatDuration(seconds: number): string {
  const minutes: number = Math.round(seconds / 60);
  if (minutes < 1) return "less than a minute";
  if (minutes < 120) return `${minutes} minute${minutes === 1 ? "" : "s"}`;
  return `${Math.round(minutes / 60)} hours`;
}

export type WarpSyncConfirmationTexts = {
  header: string;
  lines: string[];
  // When the browser may not have the space.
  warning?: string;
};

// freeBytes: quota - usage of navigator.storage.estimate(), when known.
export function getConfirmationTexts(
  chainFullName: string,
  state: WarpSyncState,
  freeBytes: number | undefined,
): WarpSyncConfirmationTexts {
  const pending = state.pending ?? {
    logCount: 0,
    snapshotLogCount: 0,
    bytes: 0,
    rawBytes: 0,
    files: 0,
  };
  const logs: string = numberWithCommas(pending.logCount);
  const upTo: string = `up to block ${numberWithCommas(state.toBlock ?? 0)} (${state.createdAt?.slice(0, 10) ?? "-"})`;
  // Some were imported before (or synced from an RPC).
  const isRest: boolean = pending.logCount < pending.snapshotLogCount;
  const [low, high] = STORED_BYTES_PER_LOG.map(
    (bytesPerLog) => pending.logCount * bytesPerLog,
  );
  const lines: string[] = [
    isRest
      ? `${chainFullName}: ${logs} of ${numberWithCommas(pending.snapshotLogCount)} logs are left, ${upTo}.`
      : `${chainFullName}: ${logs} logs ${upTo}.`,
    `Download: ${formatBytes(pending.bytes)}. Stored in this browser: about ${formatBytes(low)} to ${formatBytes(high)}.`,
    `Time: about ${formatDuration(pending.logCount / IMPORTED_LOGS_PER_SECOND)} on a desktop computer; slower on a phone.`,
    "You can use Digu while it imports, stop it at any time, and go on later.",
  ];
  if (freeBytes !== undefined) {
    lines.push(`Free space for this site: ${formatBytes(freeBytes)}.`);
  }
  return {
    header: isRest
      ? "Import the rest of the event logs published with this site?"
      : "Import the event logs published with this site?",
    lines,
    warning:
      freeBytes !== undefined && freeBytes < high * 1.2
        ? `This browser may not have enough space for this site: about ${formatBytes(high)} is needed, ${formatBytes(freeBytes)} is free.`
        : undefined,
  };
}

// "34%", and the time left once a range is done.
export function getImportProgressText(
  state: WarpSyncState,
  now: number,
): string {
  const total: number = state.pending?.logCount ?? 0;
  const done: number = state.progress?.doneLogCount ?? 0;
  if (!state.progress || total === 0) return "Importing logs";
  const percent: number = Math.floor((done * 100) / total);
  const elapsed: number = (now - state.progress.startedAt) / 1000;
  if (done === 0 || elapsed <= 0) return `Importing logs ${percent}%`;
  const left: number = ((total - done) * elapsed) / done;
  return `Importing logs ${percent}% · ${formatDuration(left)} left`;
}

export const SYNC_WAITS_FOR_IMPORT =
  "Importing the published logs. Stop it to sync from your RPC now.";
