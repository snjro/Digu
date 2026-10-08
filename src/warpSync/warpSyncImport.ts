import type { Chain } from "#constants/chains/types.js";
import { raiseDbLatestBlockNumber } from "#db/dbChainStatusDataHandlers.js";
import { getDbEventLogs, type DbEventLogs } from "#db/dbEventLogs.js";
import { addEventLogs_updateFetchedBlockNumber } from "#db/dbEventLogsDataHandlersEventLog.js";
import { getDbItemSyncStatus } from "#db/dbEventLogsDataHandlersSyncStatusGetters.js";
import { startDbWorker } from "#db/db.worker.portal.js";
import { storeSyncStatus } from "#stores/storeSyncStatus.js";
import { customLogger } from "#utils/logger.js";
import { getWarpSyncFileUrl } from "./warpSyncFetch";
import type { ImportWarpSyncFileResult } from "./warpSyncImportFile";
import {
  getRangeAction,
  getWarpSyncEnd,
  getWarpSyncKey,
  matchWarpSyncContracts,
  type WarpSyncTarget,
} from "./warpSyncPlan";
import type { WarpSyncPending } from "./warpSyncState";
import type {
  WarpSyncManifest,
  WarpSyncManifestChunk,
  WarpSyncManifestChunkWithFile,
} from "./warpSyncTypes";

// What is left to import: the ranges that have blocks the DB does not have,
// in the same way as importWarpSync, without importing: a contract goes on
// from its fetchedBlockNumber until a gap.
export async function getWarpSyncPending(
  targetChain: Chain,
  manifest: WarpSyncManifest,
): Promise<WarpSyncPending> {
  const targets: Map<string, WarpSyncTarget> = matchWarpSyncContracts(
    targetChain.name,
    manifest,
  );
  const pending: WarpSyncPending = {
    logCount: 0,
    snapshotLogCount: 0,
    bytes: 0,
    rawBytes: 0,
    files: 0,
  };
  // The fetchedBlockNumber of each contract as if the ranges before were
  // imported; undefined after a gap.
  const fetched: Map<string, number | undefined> = new Map();
  for (const chunk of manifest.chunks) {
    const key: string = getWarpSyncKey(chunk);
    const target: WarpSyncTarget | undefined = targets.get(key);
    if (!target) continue;
    pending.snapshotLogCount += chunk.logCount;
    if (!fetched.has(key))
      fetched.set(key, await getFetchedBlockNumber(target));
    const fetchedBlockNumber: number | undefined = fetched.get(key);
    if (fetchedBlockNumber === undefined) continue;
    const action = getRangeAction(
      chunk,
      fetchedBlockNumber,
      target.contract.creation.blockNumber,
    );
    if (action === "gap") fetched.set(key, undefined);
    if (action !== "import") continue;
    fetched.set(key, chunk.toBlock);
    pending.logCount += chunk.logCount;
    if (chunk.file !== null) {
      pending.bytes += chunk.bytes;
      pending.rawBytes += chunk.rawBytes;
      pending.files += 1;
    }
  }
  return pending;
}

export type ImportWarpSyncOptions = {
  // Stops before the next range, and stops the DB worker of the file that is
  // imported.
  signal?: AbortSignal;
  // After each range is saved.
  onRangeDone?: (chunk: WarpSyncManifestChunk) => void;
};

// Imports the files that have blocks the DB does not have yet, one at a time,
// in the order of the manifest. Run it while holding the sync lock of the
// chain. Returns the last block of the snapshot, or undefined when the
// snapshot has no contract of the app.
export async function importWarpSync(
  targetChain: Chain,
  manifest: WarpSyncManifest,
  options: ImportWarpSyncOptions = {},
): Promise<number | undefined> {
  const targets: Map<string, WarpSyncTarget> = matchWarpSyncContracts(
    targetChain.name,
    manifest,
  );
  // A contract whose logs would have a gap is not imported any more.
  const stopped: Set<string> = new Set();
  for (const chunk of manifest.chunks) {
    const key: string = getWarpSyncKey(chunk);
    const target: WarpSyncTarget | undefined = targets.get(key);
    if (!target || stopped.has(key)) continue;
    options.signal?.throwIfAborted();
    const action = getRangeAction(
      chunk,
      await getFetchedBlockNumber(target),
      target.contract.creation.blockNumber,
    );
    if (action === "gap") {
      stopped.add(key);
      customLogger.fail("Skip the warp sync of a contract: a gap.", {
        contract: key,
        fromBlock: chunk.fromBlock,
      });
    }
    if (action === "import") {
      await importChunk(targetChain, target, chunk, options.signal);
      options.onRangeDone?.(chunk);
    }
  }
  const end: number | undefined = getWarpSyncEnd(manifest, targets);
  // Without an RPC, the latest block is 0 and the progress stays at 0%. The end
  // of the snapshot is a block that exists and is at most latest -
  // confirmationBlocks when it was made, so it can be the latest block until
  // the sync gets the real one.
  if (end !== undefined) await raiseDbLatestBlockNumber(targetChain.name, end);
  return end;
}

async function getFetchedBlockNumber(target: WarpSyncTarget): Promise<number> {
  const dbEventLogs: DbEventLogs = getDbEventLogs(target.versionIdentifier);
  return await getDbItemSyncStatus(
    dbEventLogs,
    target.contract.name,
    "fetchedBlockNumber",
  );
}

async function importChunk(
  targetChain: Chain,
  target: WarpSyncTarget,
  chunk: WarpSyncManifestChunk,
  signal: AbortSignal | undefined,
): Promise<void> {
  // A range without logs only moves fetchedBlockNumber.
  if (chunk.file === null) {
    await addEventLogs_updateFetchedBlockNumber(
      getDbEventLogs(target.versionIdentifier),
      target.contract,
      {},
      chunk.toBlock,
    );
    return;
  }
  const result: ImportWarpSyncFileResult = await importWarpSyncFileInWorker(
    targetChain,
    target,
    chunk,
    signal,
  );
  // After the commit, as the sync does.
  if (result.syncStatusContract) {
    storeSyncStatus.updateState(
      { ...target.versionIdentifier, contractName: target.contract.name },
      result.syncStatusContract,
    );
  }
}

export async function importWarpSyncFileInWorker(
  targetChain: Chain,
  target: WarpSyncTarget,
  chunk: WarpSyncManifestChunkWithFile,
  // Aborting it terminates the worker; its transaction is not committed.
  signal?: AbortSignal,
): Promise<ImportWarpSyncFileResult> {
  // A fetch that never ends would keep the sync lock of the chain.
  const timeout: AbortSignal = AbortSignal.timeout(FILE_TIMEOUT_MS);
  return await startDbWorker(
    {
      targetFunctionName: "importWarpSyncFile",
      params: {
        versionIdentifier: target.versionIdentifier,
        contractName: target.contract.name,
        chainId: targetChain.chainId,
        url: getWarpSyncFileUrl(targetChain, chunk.file),
        chunk,
      },
    },
    signal ? anySignal(signal, timeout) : timeout,
  );
}
// Aborted when either is. AbortSignal.any is missing in some browsers that
// have DecompressionStream (such as Safari before 17.4).
export function anySignal(
  first: AbortSignal,
  second: AbortSignal,
): AbortSignal {
  if (typeof AbortSignal.any === "function") {
    return AbortSignal.any([first, second]);
  }
  const controller = new AbortController();
  for (const signal of [first, second]) {
    if (signal.aborted) {
      controller.abort(signal.reason);
      break;
    }
    signal.addEventListener("abort", () => controller.abort(signal.reason), {
      once: true,
    });
  }
  return controller.signal;
}
// A file has about 20,000 logs (more when the logs of one block cross it). A
// desktop computer imports one in a few seconds with the download (#695), so
// the limit leaves room for slower devices and networks.
export const FILE_TIMEOUT_MS = 120_000;
