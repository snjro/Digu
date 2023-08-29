import type {
  ChainName,
  Contract,
  ContractName,
  Project,
  Version,
} from "@constants/chains/types";
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
import type { ContractIdentifier, EthersEventLog } from "@db/dbTypes";

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
