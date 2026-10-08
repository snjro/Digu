import type { Contract as EthersContract } from "ethers";
import type { DbEventLogs } from "#db/dbEventLogs.js";
import {
  stopSyncingInContract,
  startAbortingInChain,
} from "#db/dbEventLogsDataHandlersSyncStatus.js";
import type { Chain, ChainName, Contract } from "#constants/chains/types.js";
import {
  getEthersEventLogs,
  getLoggableError,
  isErrorUnrelatedToRange,
  type NodeProvider,
} from "#utils/utilsEthers.js";
import { customLogger } from "#utils/logger.js";
import { get } from "svelte/store";
import { storeChainStatus } from "#stores/storeChainStatus.js";
import { ethers } from "ethers";
import type {
  ContractIdentifier,
  EthersEventLog,
  SyncStatusContract,
} from "#db/dbTypes.js";
import { registerEventLogsAndBlockTimes } from "./eventLogsContractUpdateTables";
import { storeSyncStatus } from "#stores/storeSyncStatus.js";
import { recordSyncStoppedReason } from "./syncStoppedReason";
import { assertIsDefined, sleep } from "#utils/utilsCommon.js";
import { getTargetChain } from "#utils/utilsDb.js";
import { getNextBlock } from "#warpSync/warpSyncPlan.js";
type FetchingTargetInfo = ContractIdentifier & {
  blocks: { from: number; to: number; latest: number };
};
// Longer than the 250 ms for which ethers returns the result of an identical
// request, so that a retry sends the request again. Not much longer: a public
// RPC may fail about a fifth of the requests.
const RETRY_WAIT_MS: number = 300;
// Errors in a row allowed before the sync of the chain is aborted.
export const TRY_COUNT: number = 10;
// The width of the first range. It is doubled or halved from there.
export const INITIAL_BULK_UNIT: number = 100;
// A public RPC of Polygon returned 100,000 blocks in a few seconds.
export const MAX_BULK_UNIT: number = 100000;
// An RPC may pass each request to a different node, with a different limit or
// a transient error, so the limit learned from an error is raised again.
export const SUCCESSES_TO_RAISE_LIMIT: number = 10;
// Errors in a row, of any kind, after which the range is halved. A node may
// answer a range that is too wide with HTTP 500. Below TRY_COUNT, so that the
// range is halved several times before giving up.
export const ERRORS_TO_HALVE_ANYWAY: number = 3;
export async function fetchEventLogsContract(
  dbEventLogs: DbEventLogs,
  targetContract: Contract,
  nodeProvider: NodeProvider,
): Promise<void> {
  const chainName: ChainName = dbEventLogs.versionIdentifier.chainName;
  const contractIdentifier: ContractIdentifier = {
    ...dbEventLogs.versionIdentifier,
    contractName: targetContract.name,
  };
  const contractSyncStatus: SyncStatusContract = syncStatusContract({
    ...dbEventLogs.versionIdentifier,
    contractName: targetContract.name,
  });
  const targetChain: Chain = getTargetChain({ chainName: chainName });
  let errorCount: number = 0;
  // Errors in a row that may come from a range that is too wide.
  let rangeErrorCount: number = 0;
  // Doubled after each success, and halved after two errors in a row that may
  // come from a range that is too wide, or after ERRORS_TO_HALVE_ANYWAY errors
  // of any kind. After that, it is not doubled beyond the halved width until
  // SUCCESSES_TO_RAISE_LIMIT successes in a row, so that the same error does
  // not come each time.
  let bulkUnit: number = INITIAL_BULK_UNIT;
  let maxBulkUnit: number = MAX_BULK_UNIT;
  let successCount: number = 0;

  // Only the contracts that the start marked as syncing, which it does from
  // the DB: another tab may have changed the sync target since this tab read
  // it, and a loop that the abort does not reach would never end.
  if (!contractSyncStatus.isSyncing) {
    return;
  }

  const ethersContract: EthersContract = new ethers.Contract(
    targetContract.address,
    targetContract.contractInterface.fragments,
    nodeProvider,
  );

  const creationBlockNumber: number = targetContract.creation.blockNumber;

  // In order to optimize memory usage, declare variables OUTSIDE the loop
  let fetchedBlockNumber: number;
  let fromBlockNumber: number;
  let latestBlockNumber: number;
  let minToBlockNumber: number;
  let toBlockNumber: number;
  let fetchingTargetInfo: FetchingTargetInfo;
  let ethersEventLogs: EthersEventLog[];

  /*eslint no-constant-condition: ["error", { "checkLoops": false }]*/
  while (true) {
    if (syncStatusContract(contractIdentifier).isAbort) {
      await stopSyncingInContract(dbEventLogs, targetContract.name);
      return;
    }

    // Read it from the store in each loop, because it is updated after
    // registering event logs.
    fetchedBlockNumber =
      syncStatusContract(contractIdentifier).fetchedBlockNumber;
    fromBlockNumber = getNextBlock(fetchedBlockNumber, creationBlockNumber);

    latestBlockNumber = get(storeChainStatus)[chainName].latestBlockNumber;

    // At least 2 blocks from the creation block: fetching only the creation
    // block would leave fetchedBlockNumber unchanged and fetch it again.
    minToBlockNumber =
      fetchedBlockNumber === creationBlockNumber
        ? fromBlockNumber + 1
        : fromBlockNumber;
    toBlockNumber = Math.max(fromBlockNumber + bulkUnit - 1, minToBlockNumber);

    if (toBlockNumber >= latestBlockNumber) {
      toBlockNumber = latestBlockNumber;
    }

    fetchingTargetInfo = {
      ...contractIdentifier,
      blocks: {
        from: fromBlockNumber,
        to: toBlockNumber,
        latest: latestBlockNumber,
      },
    };

    if (toBlockNumber === latestBlockNumber) {
      // If "toBlockNumber" reaches the latest,
      // sleep for fetching events to be called in the next loop
      await sleepUnlessAborted(contractIdentifier, targetChain.blockIntervalMs);
      // Stopped while sleeping: stop at the top of the loop without fetching.
      if (syncStatusContract(contractIdentifier).isAbort) {
        continue;
      }
      if (toBlockNumber < minToBlockNumber) {
        // If "fetchedBlockNumber" and "latestBlockNumber" have the same value,
        // or the latest block is the creation block, the above condition is
        // satisfied.
        // This can happen if "toBlockNumber" reaches "latestBlockNumber"
        // and this loop is executed again before the new block is generated.
        customLogger.info(
          "Fetch eventLogs. No new blocks have been generated yet. Skip fetching event logs",
          fetchingTargetInfo,
        );
        continue;
      }
    }
    try {
      customLogger.start("Fetch eventLogs. targetBlocks:", {
        fetchingTarget: fetchingTargetInfo,
      });
      ethersEventLogs = await getEthersEventLogs(
        targetContract.events.names,
        ethersContract,
        fromBlockNumber,
        toBlockNumber,
      );
      // Stopped while fetching: stop at the top of the loop without saving the
      // range. fetchedBlockNumber does not move, so the next start fetches it
      // again.
      if (syncStatusContract(contractIdentifier).isAbort) {
        continue;
      }
      await registerEventLogsAndBlockTimes(
        dbEventLogs,
        targetContract,
        nodeProvider,
        ethersEventLogs,
        toBlockNumber,
        () => syncStatusContract(contractIdentifier).isAbort,
      );
      if (ethersEventLogs.length) {
        customLogger.success("Fetch eventLogs. Fetched & registered to DB:", {
          fetchingTarget: fetchingTargetInfo,
        });
      } else {
        customLogger.info("Fetch eventLogs. No logs. targetBlocks:", {
          fetchingTarget: fetchingTargetInfo,
        });
      }
      errorCount = 0;
      rangeErrorCount = 0;
      // A range cut at the latest block does not show that the width works.
      if (toBlockNumber - fromBlockNumber + 1 === bulkUnit) {
        successCount++;
        if (successCount >= SUCCESSES_TO_RAISE_LIMIT) {
          maxBulkUnit = Math.min(maxBulkUnit * 2, MAX_BULK_UNIT);
          successCount = 0;
        }
        bulkUnit = Math.min(bulkUnit * 2, maxBulkUnit);
      }
    } catch (error) {
      errorCount++;
      // Such an error does not show that the range is too wide, so the same
      // range is tried again. It still counts toward TRY_COUNT.
      if (!isErrorUnrelatedToRange(error)) {
        rangeErrorCount++;
      }
      // One error may come from one node of the RPC, so the same range is
      // tried once more before halving.
      if (rangeErrorCount >= 2 || errorCount >= ERRORS_TO_HALVE_ANYWAY) {
        bulkUnit = Math.max(1, Math.floor(bulkUnit / 2));
        maxBulkUnit = bulkUnit;
        successCount = 0;
      }

      customLogger.error("Fetch eventLogs. Error occurred:", {
        errorCount: `${errorCount}/${TRY_COUNT}`,
        fetchingTarget: fetchingTargetInfo,
        errorObject: getLoggableError(error),
      });
    }
    if (errorCount > TRY_COUNT) {
      customLogger.fatal(
        "Fetch EventLogs. Error count exceeded the limit. Start to abort:",
        {
          errorCount: `${errorCount}/${TRY_COUNT}`,
          fetchingTarget: fetchingTargetInfo,
        },
      );
      recordSyncStoppedReason(chainName, "RPC_ERRORS");
      await startAbortingInChain(chainName);
    } else if (errorCount > 0) {
      await sleepUnlessAborted(contractIdentifier, RETRY_WAIT_MS);
    }
  }
}
// Ends early when the contract is stopped, so that "stop sync" does not wait
// for the Block Interval (20 s on Ethereum). Nothing is being saved then, and
// the loop stops at its top.
async function sleepUnlessAborted(
  contractIdentifier: ContractIdentifier,
  ms: number,
): Promise<void> {
  let wake: () => void = () => {};
  const aborted: Promise<void> = new Promise((resolve) => (wake = resolve));
  const unsubscribe = storeSyncStatus.subscribe(() => {
    if (syncStatusContract(contractIdentifier).isAbort) wake();
  });
  try {
    await Promise.race([sleep(ms), aborted]);
  } finally {
    unsubscribe();
  }
}
export const syncStatusContract = (
  contractIdentifier: ContractIdentifier,
): SyncStatusContract => {
  const syncStatusContract: SyncStatusContract | undefined =
    get(storeSyncStatus)[contractIdentifier.chainName].subSyncStatuses[
      contractIdentifier.projectName
    ].subSyncStatuses[contractIdentifier.versionName].subSyncStatuses[
      contractIdentifier.contractName
    ];
  // Only contracts with an event to sync are synced, and they have a status.
  assertIsDefined(syncStatusContract);
  return syncStatusContract;
};
