import type { Contract as EthersContract } from "ethers";
import type { DbEventLogs } from "@db/dbEventLogs";
import {
  stopSyncingInContract,
  startAbortingInChain,
} from "@db/dbEventLogsDataHandlersSyncStatus";
import type { ChainName, Contract } from "@constants/chains/types";
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

export async function fetchEventLogsContract(
  dbEventLogs: DbEventLogs,
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
    myLogger.info({
      from: fromBlockNumber.toLocaleString(),
      to: toBlockNumber.toLocaleString(),
      latest: latestBlockNumber.toLocaleString(),
      contract: targetContract.name,
    });

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
      myLogger.error("error on queryFilter", error);
      if (await countupNodeErrorCount(chainName, "logContractsEvent")) {
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
  methodName: string
): Promise<boolean> {
  await updateDbItemChainStatus(
    chainName,
    "nodeErrorCount",
    get(storeChainStatus)[chainName].nodeErrorCount + 1
  );
  if (
    get(storeChainStatus)[chainName].nodeErrorCount <=
    get(storeLogSettings)[chainName].tryCount
  ) {
    myLogger.warn(
      `errorCount(=${get(storeChainStatus)[chainName].nodeErrorCount}/${
        get(storeLogSettings)[chainName].tryCount
      }). Trying again.`
    );
    return false;
  } else {
    myLogger.error(
      `Error on ${methodName} in chain ${chainName},
      .errorCount(=${
        get(storeChainStatus)[chainName].nodeErrorCount
      }) is over tryCount(=${
        get(storeLogSettings)[chainName].tryCount
      }). The process is going to be aborted.`
    );
    return true;
  }
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
