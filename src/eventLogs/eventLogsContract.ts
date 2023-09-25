import type { Contract as EthersContract } from "ethers";
import type { DbEventLogs } from "@db/dbEventLogs";
import {
  stopSyncingInContract,
  startAbortingInChain,
} from "@db/dbEventLogsDataHandlersSyncStatus";
import type { Chain, ChainName, Contract } from "@constants/chains/types";
import { getEthersEventLogs, type NodeProvider } from "@utils/utilsEthers";
import { customLogger } from "@utils/logger";
import { get } from "svelte/store";
import { storeRpcSettings } from "@stores/storeRpcSettings";
import { storeChainStatus } from "@stores/storeChainStatus";
import { ethers } from "ethers";
import type {
  ContractIdentifier,
  EthersEventLog,
  RpcSetting,
  SyncStatusContract,
} from "@db/dbTypes";
import { registerEventLogsAndBlockTimes } from "./eventLogsContractUpdateTables";
import { storeSyncStatus } from "@stores/storeSyncStatus";
import { sleep } from "@utils/utilsCommon";
type FetchingTargetInfo = ContractIdentifier & {
  blocks: { from: number; to: number; latest: number };
};
export async function fetchEventLogsContract(
  dbEventLogs: DbEventLogs,
  targetChain: Chain,
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
  const rpcSetting: RpcSetting = get(storeRpcSettings)[chainName];
  const maxErrorCount: number = rpcSetting.tryCount;
  let errorCount: number = 0;

  // Skip sync process for a contract that is not sync target.
  if (!contractSyncStatus.isSyncTarget) {
    return;
  }

  const ethersContract: EthersContract = new ethers.Contract(
    targetContract.address,
    targetContract.contractInterface.fragments,
    nodeProvider,
  );

  const creationBlockNumber: number = targetContract.creation.blockNumber;

  // In order to optimize memory usage, declare variables OUTSIDE the loop
  let fromBlockNumber: number;
  let latestBlockNumber: number;
  let toBlockNumber: number;
  let fetchingTargetInfo: FetchingTargetInfo;
  let ethersEventLogs: EthersEventLog[];

  while (true) {
    if (syncStatusContract(contractIdentifier).isAbort) {
      await stopSyncingInContract(dbEventLogs, targetContract.name);
      return;
    }

    fromBlockNumber =
      contractSyncStatus.fetchedBlockNumber === creationBlockNumber
        ? contractSyncStatus.fetchedBlockNumber
        : contractSyncStatus.fetchedBlockNumber + 1;

    latestBlockNumber = get(storeChainStatus)[chainName].latestBlockNumber;

    toBlockNumber = fromBlockNumber + rpcSetting.bulkUnit - 1;

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

    if ((toBlockNumber = latestBlockNumber)) {
      // If "toBlockNumber" reaches the latest,
      // sleep for fetching events to be called in the next loop
      await sleep(targetChain.blockIntervalMs);
      if (toBlockNumber < fromBlockNumber) {
        // If "fetchedBlockNumber" and "latestBlockNumber" have the same value,
        // the above condition is satisfied.
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
      await registerEventLogsAndBlockTimes(
        dbEventLogs,
        targetContract,
        nodeProvider,
        ethersEventLogs,
        toBlockNumber,
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
    } catch (error) {
      errorCount++;

      customLogger.error("Fetch eventLogs. Error occurred:", {
        errorCount: `${errorCount}/${maxErrorCount}`,
        fetchingTarget: fetchingTargetInfo,
        errorObject: error,
      });
    }
    if (errorCount > maxErrorCount) {
      customLogger.fatal(
        "Fetch EventLogs. Error count exceeded the limit. Start to abort:",
        {
          errorCount: `${errorCount}/${maxErrorCount}`,
          fetchingTarget: fetchingTargetInfo,
        },
      );
      await startAbortingInChain(chainName);
    }
  }
}
export const syncStatusContract = (
  contractIdentifier: ContractIdentifier,
): SyncStatusContract => {
  const syncStatusContract: SyncStatusContract =
    get(storeSyncStatus)[contractIdentifier.chainName].subSyncStatuses[
      contractIdentifier.projectName
    ].subSyncStatuses[contractIdentifier.versionName].subSyncStatuses[
      contractIdentifier.contractName
    ];
  return syncStatusContract;
};
