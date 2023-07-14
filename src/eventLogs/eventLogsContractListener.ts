import type { Contract, Project, Version } from "@constants/chains/types";
import type { DbEventLogs } from "@db/dbEventLogs";
import { stopSyncingInContract } from "@db/dbEventLogsDataHandlersSyncStatus";
import type { Contract as EthersContract, Listener } from "ethers";
import { fetchEventLogsContract } from "./eventLogsContract";
import { registerEventLogsAndBlockTimes } from "./eventLogsContractUpdateTables";
import {
  getAndUpdateLatestBlockNumber,
  type NodeProvider,
} from "@utils/utilsEthers";
import { myLogger } from "@utils/logger";
import { syncStatusContract } from "./eventLogs";
import { get } from "svelte/store";
import { storeRpcSettings } from "@stores/storeRpcSettings";
import type { EthersEventLog } from "@db/dbTypes";

export async function beginEventListening(
  dbEventLogs: DbEventLogs,
  targetProject: Project,
  targetVersion: Version,
  targetContract: Contract,
  nodeProvider: NodeProvider,
  ethersContract: EthersContract
): Promise<void> {
  myLogger.info(`[START]beginEventListening. contract:`, targetContract.name);

  const newLatestBlockNumber: number = await getAndUpdateLatestBlockNumber(
    nodeProvider,
    dbEventLogs.versionIdentifier.chainName
  );

  const fetchedBlockNumber: number = syncStatusContract({
    ...dbEventLogs.versionIdentifier,
    contractName: targetContract.name,
  }).fetchedBlockNumber;

  myLogger.info(
    `fetchedBlockNumber:${fetchedBlockNumber}
     new minedBlock:${newLatestBlockNumber}. contract:${targetContract.name}`
  );

  if (fetchedBlockNumber < newLatestBlockNumber) {
    myLogger.info(`無限ループに戻る. contract:`, targetContract.name);
    await fetchEventLogsContract(
      dbEventLogs,
      targetProject,
      targetVersion,
      targetContract,
      nodeProvider
    );
  } else {
    myLogger.info(`イベントリスニング起動開始. contract:`, targetContract.name);
    //start event listenning
    await listenContractEvents(
      dbEventLogs,
      targetContract,
      nodeProvider,
      ethersContract
    );
    myLogger.info(`イベントリスニング起動完了. contract:`, targetContract.name);
  }
}

async function listenContractEvents(
  dbEventLogs: DbEventLogs,
  targetContract: Contract,
  nodeProvider: NodeProvider,
  ethersContract: EthersContract
): Promise<void> {
  await watchAbort(dbEventLogs, targetContract, ethersContract);

  const listener: Listener = async (
    ethersEventLog: EthersEventLog
  ): Promise<void> => {
    myLogger.info(
      `Listen. blocknumber:${ethersEventLog.blockNumber} contractName:${targetContract.name} eventName:${ethersEventLog.eventName} logIdx:${ethersEventLog.index}`
    );
    await registerEventLogsAndBlockTimes(
      dbEventLogs,
      targetContract,
      nodeProvider,
      [ethersEventLog],
      ethersEventLog.blockNumber
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
  ethersContract: EthersContract
): Promise<void> {
  const intervalId: number = window.setInterval(async () => {
    //abort listening
    const isAbort: boolean = syncStatusContract({
      ...dbEventLogs.versionIdentifier,
      contractName: targetContract.name,
    }).isAbort;
    if (isAbort) {
      window.clearInterval(intervalId);
      ethersContract.removeAllListeners();
      await stopSyncingInContract(dbEventLogs, targetContract.name);
    }
  }, get(storeRpcSettings)[dbEventLogs.versionIdentifier.chainName].abortWatchIntervalMs);
}
