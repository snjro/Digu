import type { Contract as EthersContract, Listener } from "ethers";
import type { DbEventLogs } from "@db/dbEventLogs";
import {
  stopSyncingInContract,
  startAbortingInChain,
} from "@db/dbEventLogsDataHandlersSyncStatus";
import type {
  ChainName,
  Contract,
  ContractName,
  Project,
  Version,
} from "@constants/chains/types";
import {
  getAndUpdateLatestBlockNumber,
  getEthersEventLogs,
  type NodeProvider,
} from "@utils/utilsEthers";
import { myLogger } from "@utils/logger";
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
type FetchingTargetInfo = ContractIdentifier & {
  blocks: { from: number; to: number; latest: number };
};
export async function fetchEventLogsContract(
  dbEventLogs: DbEventLogs,
  targetProject: Project,
  targetVersion: Version,
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

  let doLoop: boolean = true;

  while (doLoop) {
    if (syncStatusContract(contractIdentifier).isAbort) {
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
        myLogger.success(
          "Event logs was successfully fetched & registered to DB.",
          {
            fetchingTarget: fetchingTargetInfo,
          },
        );
      } else {
        myLogger.info("No event logs within target blocks.", {
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
        },
      );
    }
    if (errorCount > maxErrorCount) {
      myLogger.fatal(
        "Error count exceeded the limit. Start to abort sync process.",
        {
          errorCount: `${errorCount}/${maxErrorCount}`,
          fetchingTarget: fetchingTargetInfo,
        },
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
    ethersContract,
  );
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

export async function beginEventListening(
  dbEventLogs: DbEventLogs,
  targetProject: Project,
  targetVersion: Version,
  targetContract: Contract,
  nodeProvider: NodeProvider,
  ethersContract: EthersContract,
): Promise<void> {
  const contractIdentifier: ContractIdentifier = {
    ...dbEventLogs.versionIdentifier,
    contractName: targetContract.name,
  };
  myLogger.start(`Check if event listenging can begin`, {
    contract: contractIdentifier,
  });

  const latestBlockNumber: number = await getAndUpdateLatestBlockNumber(
    nodeProvider,
    dbEventLogs.versionIdentifier.chainName,
  );

  const fetchedBlockNumber: number = syncStatusContract({
    ...dbEventLogs.versionIdentifier,
    contractName: targetContract.name,
  }).fetchedBlockNumber;

  const blockInfo: {
    contract: ContractIdentifier;
    fetchedBlockNumber: number;
    latestBlockNumber: number;
  } = {
    contract: contractIdentifier,
    fetchedBlockNumber: fetchedBlockNumber,
    latestBlockNumber: latestBlockNumber,
  };
  if (fetchedBlockNumber < latestBlockNumber) {
    myLogger.fail(
      `Cannot begin event listening because fetchedBlockNumber is older than latestBlockNumber.\tStart to return bulk insert of event logs.`,
      blockInfo,
    );
    await fetchEventLogsContract(
      dbEventLogs,
      targetProject,
      targetVersion,
      targetContract,
      nodeProvider,
    );
  } else {
    myLogger.info(
      `Event listening can begin. Start to listen events of the contract.`,
      { contract: contractIdentifier },
    );
    //start event listenning
    await listenContractEvents(
      dbEventLogs,
      targetContract,
      nodeProvider,
      ethersContract,
    );
    myLogger.info(`Event listening startup complete.`, {
      contract: contractIdentifier,
    });
  }
}

async function listenContractEvents(
  dbEventLogs: DbEventLogs,
  targetContract: Contract,
  nodeProvider: NodeProvider,
  ethersContract: EthersContract,
): Promise<void> {
  await watchAbort(dbEventLogs, targetContract, ethersContract);

  const listener: Listener = async (
    ethersEventLog: EthersEventLog,
  ): Promise<void> => {
    const listenedEventInfo: {
      contractName: ContractName;
      eventName: string;
      blocknumber: number;
      logIdx: number;
    } = {
      contractName: targetContract.name,
      eventName: ethersEventLog.eventName,
      blocknumber: ethersEventLog.blockNumber,
      logIdx: ethersEventLog.index,
    };
    myLogger.info("Event listened.", listenedEventInfo);
    await registerEventLogsAndBlockTimes(
      dbEventLogs,
      targetContract,
      nodeProvider,
      [ethersEventLog],
      ethersEventLog.blockNumber,
    );
    myLogger.success(
      "Listened event was successfully fetched & registered to DB.",
      listenedEventInfo,
    );
  };

  let promisesEthersContract: Promise<EthersContract>[] = [];
  for (const eventName of targetContract.events.names) {
    promisesEthersContract.push(ethersContract.on(eventName, listener));
  }
  await Promise.all(promisesEthersContract);
}
async function watchAbort(
  dbEventLogs: DbEventLogs,
  targetContract: Contract,
  ethersContract: EthersContract,
): Promise<void> {
  const chainName: ChainName = dbEventLogs.versionIdentifier.chainName;
  const contractName: ContractName = targetContract.name;
  const abortWatchIntervalMs: number =
    get(storeRpcSettings)[chainName].abortWatchIntervalMs;
  const intervalId: number = window.setInterval(async () => {
    //abort listening
    const isAbort: boolean = syncStatusContract({
      ...dbEventLogs.versionIdentifier,
      contractName: contractName,
    }).isAbort;
    if (isAbort) {
      myLogger.info(`Abort listening. contract: ${contractName}`);
      window.clearInterval(intervalId);
      ethersContract.removeAllListeners();
      await stopSyncingInContract(dbEventLogs, contractName);
    }
  }, abortWatchIntervalMs);
}
