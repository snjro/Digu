import type { Contract as EthersContract } from "ethers";
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
import { getEthersEventLogs, type NodeProvider } from "@utils/utilsEthers";
import { myLogger } from "@utils/logger";
import { syncStatusContract } from "./eventLogs";
import { get } from "svelte/store";
import { storeLogSettings } from "@stores/storeLogSettings";
import { storeChainStatus } from "@stores/storeChainStatus";
import { updateDbItemChainStatus } from "@db/dbChainStatusDataHandlers";
import { ethers } from "ethers";
import type { EthersEventLog } from "@db/dbTypes";
import { registerEventLogsAndBlockTimes } from "./eventLogsContractUpdateTables";
import { beginEventListening } from "./eventLogsContractListener";

type FetchingTargetInfo = {
  project: ProjectName;
  version: VersionName;
  contract: ContractName;
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
  if (
    !syncStatusContract({
      ...dbEventLogs.versionIdentifier,
      contractName: targetContract.name,
    }).isSyncTarget
  ) {
    myLogger.info(`Not sync target. Contract: ${targetContract.name}`);
    return;
  }

  const ethersContract: EthersContract = getEthersContract(
    nodeProvider,
    targetContract
  );
  let doLoop = true;

  // await resetNodeErrorCount(chainName);

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

    const fromBlockNumber: number =
      syncStatusContract({
        ...dbEventLogs.versionIdentifier,
        contractName: targetContract.name,
      }).fetchedBlockNumber + 1;

    let toBlockNumber: number =
      fromBlockNumber + get(storeLogSettings)[chainName].bulkUnit - 1;

    const latestBlockNumber =
      get(storeChainStatus)[chainName].latestBlockNumber;

    if (toBlockNumber >= latestBlockNumber) {
      toBlockNumber = latestBlockNumber;
      doLoop = false;
    }
    const fetchingTargetInfo: FetchingTargetInfo = {
      project: targetProject.name,
      version: targetVersion.name,
      contract: targetContract.name,
      blocks: {
        from: fromBlockNumber,
        to: toBlockNumber,
        latest: latestBlockNumber,
      },
    };
    myLogger.info({ fetchingTarget: fetchingTargetInfo });

    try {
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
    } catch (error) {
      myLogger.error({ errorOn: "queryFilter", error: error });
      if (
        await countupNodeErrorCount(
          chainName,
          "fetchEventLogsContract",
          fetchingTargetInfo
        )
      ) {
        await startAbortingInChain(chainName);
      }
      continue;
    }
  }

  await beginEventListening(
    dbEventLogs,
    targetContract,
    nodeProvider,
    ethersContract
  );
}
export async function resetNodeErrorCount(chainName: ChainName): Promise<void> {
  await updateDbItemChainStatus(chainName, "nodeErrorCount", 0);
}
export async function countupNodeErrorCount(
  chainName: ChainName,
  methodName: string,
  fetchingTargetInfo: FetchingTargetInfo | undefined = undefined
): Promise<boolean> {
  const currentErrorCount: number =
    get(storeChainStatus)[chainName].nodeErrorCount + 1;
  const maxErrorCount: number = get(storeLogSettings)[chainName].tryCount;
  let isAbort: boolean = false;
  await updateDbItemChainStatus(chainName, "nodeErrorCount", currentErrorCount);

  type ConsoleMessage = {
    errorOn: string;
    errorCount: string;
    fetchingTarget?: FetchingTargetInfo;
    extraMessage?: string;
  };
  let consoleMessage: ConsoleMessage = {
    errorOn: methodName,
    errorCount: `${currentErrorCount}/${maxErrorCount}`,
    fetchingTarget: fetchingTargetInfo,
  };

  if (currentErrorCount < maxErrorCount) {
    if (fetchingTargetInfo) {
      consoleMessage.fetchingTarget = fetchingTargetInfo;
    }
    myLogger.warn(consoleMessage);
    isAbort = false;
  } else {
    consoleMessage.extraMessage = "The process is going to be aborted.";
    myLogger.error(consoleMessage);
    isAbort = true;
  }
  return isAbort;
}

function getEthersContract(
  nodeProvider: NodeProvider,
  contract: Contract
): EthersContract {
  const ethersContract: EthersContract = new ethers.Contract(
    contract.address,
    contract.contractInterface.fragments,
    nodeProvider
  );
  return ethersContract;
}
