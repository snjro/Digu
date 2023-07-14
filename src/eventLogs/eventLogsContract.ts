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
import { storeRpcSettings } from "@stores/storeRpcSettings";
import { storeChainStatus } from "@stores/storeChainStatus";
import { ethers } from "ethers";
import type {
  EthersEventLog,
  RpcSetting,
  SyncStatusContract,
} from "@db/dbTypes";
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
  const functionName: string = "fetchEventLogsContract";
  const chainName: ChainName = dbEventLogs.versionIdentifier.chainName;

  const contractSyncStatus: SyncStatusContract = syncStatusContract({
    ...dbEventLogs.versionIdentifier,
    contractName: targetContract.name,
  });
  const rpcSetting: RpcSetting = get(storeRpcSettings)[chainName];
  const maxErrorCount: number = rpcSetting.tryCount;
  let errorCount: number = 0;

  if (!contractSyncStatus.isSyncTarget) {
    myLogger.info(`Not sync target. Contract: ${targetContract.name}`);
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
      errorCount = 0;
    } catch (error) {
      errorCount++;

      myLogger.warn({
        errorOn: functionName,
        errorCount: `${errorCount}/${maxErrorCount}`,
        fetchingTarget: fetchingTargetInfo,
        error: error,
      });
    }
    if (errorCount > maxErrorCount) {
      myLogger.error({
        errorOn: functionName,
        errorCount: `${errorCount}/${maxErrorCount}`,
        errorMessage: "errorCount exceeded the limit. Start aborting.",
      });
      await startAbortingInChain(chainName);
    }
  }

  await beginEventListening(
    dbEventLogs,
    targetProject,
    targetVersion,
    targetContract,
    nodeProvider,
    ethersContract
  );
}
