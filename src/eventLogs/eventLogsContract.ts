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
  ProjectName,
  Version,
  VersionName,
} from "@constants/chains/types";
import {
  getAndUpdateLatestBlockNumber,
  getEthersEventLogs,
  type NodeProvider,
} from "@utils/utilsEthers";
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

  const creationBlockNumber: number = targetContract.creation.blockNumber;

  let doLoop: boolean = true;

  while (doLoop) {
    if (syncStatusContract(contractIdentifier).isAbort) {
      await stopSyncingInContract(dbEventLogs, targetContract.name);
      return;
    }

    const fromBlockNumber: number =
      contractSyncStatus.fetchedBlockNumber === creationBlockNumber
        ? contractSyncStatus.fetchedBlockNumber
        : contractSyncStatus.fetchedBlockNumber + 1;

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
      customLogger.start("Fetch eventLogs. targetBlocks:", {
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

  customLogger.success("Sync process up to the latest block is completed.", {
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
  customLogger.info(`Check if event listenging can begin`, {
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
    customLogger.fail(
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
    customLogger.info("Event listener can begin.", {
      contract: contractIdentifier,
    });
    const logStartup: string = "Event listener startup";
    customLogger.start(logStartup, { contract: contractIdentifier });

    //start event listenning
    await listenContractEvents(
      dbEventLogs,
      targetContract,
      nodeProvider,
      ethersContract,
    );
    customLogger.finished(logStartup, { contract: contractIdentifier });
  }
}

async function listenContractEvents(
  dbEventLogs: DbEventLogs,
  targetContract: Contract,
  nodeProvider: NodeProvider,
  ethersContract: EthersContract,
): Promise<void> {
  type TargetListenerContractInfo = {
    chainName: ChainName;
    projectName: ProjectName;
    versionName: VersionName;
    contractName: ContractName;
  };
  const targetListenerContractInfo: TargetListenerContractInfo = {
    chainName: dbEventLogs.versionIdentifier.chainName,
    projectName: dbEventLogs.versionIdentifier.projectName,
    versionName: dbEventLogs.versionIdentifier.versionName,
    contractName: targetContract.name,
  };
  await watchAbort(dbEventLogs, targetContract, ethersContract);

  const listener: Listener = async (
    ethersEventLog: EthersEventLog,
  ): Promise<void> => {
    const listenedEventInfo: TargetListenerContractInfo & {
      eventName: string;
      blocknumber: number;
      logIdx: number;
    } = {
      ...targetListenerContractInfo,
      eventName: ethersEventLog.eventName,
      blocknumber: ethersEventLog.blockNumber,
      logIdx: ethersEventLog.index,
    };
    customLogger.success(
      "Event listener fetched a eventLog.",
      listenedEventInfo,
    );
    await registerEventLogsAndBlockTimes(
      dbEventLogs,
      targetContract,
      nodeProvider,
      [ethersEventLog],
      ethersEventLog.blockNumber,
    );
    customLogger.success(
      "Event listener registered a eventLog to DB",
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
      const log: string = `Abort listening events. contract: ${contractName}`;
      customLogger.start(log);
      window.clearInterval(intervalId);
      ethersContract.removeAllListeners();
      await stopSyncingInContract(dbEventLogs, contractName);
      customLogger.finished(log);
    }
  }, abortWatchIntervalMs);
}
