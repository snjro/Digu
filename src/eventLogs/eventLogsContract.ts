import type { Contract as EthersContract } from "ethers";
import type { DbEventLogs } from "@db/dbEventLogs";
import {
  stopSyncingInContract,
  startAbortingInChain,
} from "@db/dbEventLogsDataHandlersSyncStatus";
import type {
  ChainName,
  Contract,
  Project,
  Version,
} from "@constants/chains/types";
import { getEthersEventLogs, type NodeProvider } from "@utils/utilsEthers";
import { myLogger } from "@utils/logger";
import { syncStatusContract } from "./eventLogs";
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
import { beginEventListening } from "./eventLogsContractListener";
type FetchingTargetInfo = ContractIdentifier & {
  blocks: { from: number; to: number; latest: number };
};
export async function fetchEventLogsContract(
  dbEventLogs: DbEventLogs,
  targetProject: Project,
  targetVersion: Version,
  targetContract: Contract,
  nodeProvider: NodeProvider
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
    nodeProvider
  );

  let doLoop: boolean = true;

  while (doLoop) {
    if (
      syncStatusContract({
        ...dbEventLogs.versionIdentifier,
        contractName: targetContract.name,
      }).isAbort
    ) {
      await stopSyncingInContract(dbEventLogs, targetContract.name);
      return;
    }

    const fromBlockNumber: number = contractSyncStatus.fetchedBlockNumber + 1;

    const latestBlockNumber =
      get(storeChainStatus)[chainName].latestBlockNumber;

    let toBlockNumber: number = fromBlockNumber + rpcSetting.bulkUnit - 1;

    if (toBlockNumber >= latestBlockNumber) {
      toBlockNumber = latestBlockNumber;
      doLoop = false;
    }

    const fetchingTargetInfo: FetchingTargetInfo = {
      ...contractIdentifier,
      blocks: {
        from: fromBlockNumber,
        to: toBlockNumber,
        latest: latestBlockNumber,
      },
    };

    try {
      myLogger.start("Fetch event logs within target blocks.", {
        fetchingTarget: fetchingTargetInfo,
      });
      const ethersEventLogs: EthersEventLog[] = await getEthersEventLogs(
        targetContract.events.names,
        ethersContract,
        fromBlockNumber,
        toBlockNumber
      );
      await registerEventLogsAndBlockTimes(
        dbEventLogs,
        targetContract,
        nodeProvider,
        ethersEventLogs,
        toBlockNumber
      );
      if (ethersEventLogs.length) {
        myLogger.success(
          "Event logs was successfully fetched & registered to DB.",
          {
            fetchingTarget: fetchingTargetInfo,
          }
        );
      } else {
        myLogger.success("No event logs within target blocks.", {
          fetchingTarget: fetchingTargetInfo,
        });
      }
      errorCount = 0;
    } catch (error) {
      errorCount++;

      myLogger.error(
        "Error occurred in fetching event logs or registering those logs to DB.",
        {
          errorCount: `${errorCount}/${maxErrorCount}`,
          fetchingTarget: fetchingTargetInfo,
          errorObject: error,
        }
      );
    }
    if (errorCount > maxErrorCount) {
      myLogger.fatal(
        "Error count exceeded the limit. Start to abort sync process.",
        {
          errorCount: `${errorCount}/${maxErrorCount}`,
          fetchingTarget: fetchingTargetInfo,
        }
      );
      await startAbortingInChain(chainName);
    }
  }

  myLogger.success("Sync process up to the latest block is completed.", {
    contract: contractIdentifier,
  });
  await beginEventListening(
    dbEventLogs,
    targetProject,
    targetVersion,
    targetContract,
    nodeProvider,
    ethersContract
  );
}
