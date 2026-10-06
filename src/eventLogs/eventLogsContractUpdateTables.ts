import type { DbEventLogs } from "#db/dbEventLogs.js";
import type { ChainName, Contract } from "#constants/chains/types.js";
import { addEventLogs_updateFetchedBlockNumber } from "#db/dbEventLogsDataHandlersEventLog.js";
import type {
  BlockTime,
  ConvertedEventLog,
  EthersEventLog,
  GroupedEventLogs,
  NamedEventLog,
} from "#db/dbTypes.js";
import { setDbBlockTime } from "#db/dbBlockTimesDataHandlers.js";
import Dexie from "dexie";
import { isHexString } from "ethers";
import type { NodeProvider } from "#utils/utilsEthers.js";
import {
  fetchBlockTimesForEventLogs,
  type BlockTimeForEventLog,
} from "./eventLogsContractBlockTimes";

export async function registerEventLogsAndBlockTimes(
  dbEventLogs: DbEventLogs,
  targetContract: Contract,
  nodeProvider: NodeProvider,
  ethersEventLogs: EthersEventLog[],
  lastFetchedBlockNumber: number,
  isStopped: () => boolean,
) {
  const targetChainName: ChainName = dbEventLogs.versionIdentifier.chainName;
  try {
    const blockTimesForEventLogs: BlockTimeForEventLog[] =
      await fetchBlockTimesForEventLogs(
        nodeProvider,
        targetChainName,
        ethersEventLogs,
      );
    // Stopped while fetching the block times: save nothing, so that the range
    // is fetched again on the next start.
    if (isStopped()) {
      return;
    }
    const namedEventLogs: NamedEventLog[] = getConvertedEventLogs(
      ethersEventLogs,
      blockTimesForEventLogs,
    );

    const groupedEventLogs: GroupedEventLogs =
      groupEventLogsByEventName(namedEventLogs);

    const unregisteredBlockTimes: BlockTime[] = getUnregisterdBlockTimes(
      blockTimesForEventLogs,
    );

    await setDbBlockTime(targetChainName, unregisteredBlockTimes);

    await addEventLogs_updateFetchedBlockNumber(
      dbEventLogs,
      targetContract,
      groupedEventLogs,
      lastFetchedBlockNumber,
    );
  } catch (error) {
    throw new Error("Failed to register event logs.", { cause: error });
  }
}

function getUnregisterdBlockTimes(
  blockTimesForEventLogs: BlockTimeForEventLog[],
): BlockTime[] {
  const unregisterdBlockTimes: BlockTime[] = [];
  for (const blockTimesForEventLog of blockTimesForEventLogs) {
    if (blockTimesForEventLog.fetchedFromProvider) {
      unregisterdBlockTimes.push(blockTimesForEventLog.fetchedBlockTime);
    }
  }
  return unregisterdBlockTimes;
}

function getConvertedEventLogs(
  ethersEventLogs: EthersEventLog[],
  blockTimesForEventLogs: BlockTimeForEventLog[],
): NamedEventLog[] {
  const namedEventLogs: NamedEventLog[] = [];
  const blockTimes: Map<number, BlockTime> = new Map();
  for (const { fetchedBlockTime } of blockTimesForEventLogs) {
    // Keep the first one for a block number, as find() did.
    if (!blockTimes.has(fetchedBlockTime.blockNumber)) {
      blockTimes.set(fetchedBlockTime.blockNumber, fetchedBlockTime);
    }
  }

  for (const ethersEventLog of ethersEventLogs) {
    const targetBlockTime: BlockTime | undefined = blockTimes.get(
      ethersEventLog.blockNumber,
    );

    if (targetBlockTime) {
      const convertedEventLog: ConvertedEventLog = convertEthersEventToEventLog(
        ethersEventLog,
        targetBlockTime.timestamp,
      );

      namedEventLogs.push({
        eventName: ethersEventLog.eventName,
        eventLog: convertedEventLog,
      });
    } else {
      throw new Error(
        `Error! cannot find blocktime. blocknumber is ${ethersEventLog.blockNumber}`,
      );
    }
  }

  return namedEventLogs;
}
// Also used by the warp sync, so that its rows are the same as the sync's.
export function convertEthersEventToEventLog(
  ethersEventLog: EthersEventLog,
  timestamp: number,
): ConvertedEventLog {
  if (isHexString(ethersEventLog.transactionHash)) {
    return {
      args: Dexie.deepClone(ethersEventLog.args),
      blockNumber: ethersEventLog.blockNumber,
      jsDate: new Date(timestamp * 1000),
      logIndex: ethersEventLog.index,
      removed: ethersEventLog.removed,
      transactionHash: ethersEventLog.transactionHash,
      transactionIndex: ethersEventLog.transactionIndex,
    };
  } else {
    throw new Error(
      "Invalid EthersEventLog object. The following properties are not a valid hex string: transactionHash.",
    );
  }
}
export function groupEventLogsByEventName(
  namedEventLogs: NamedEventLog[],
): GroupedEventLogs {
  const groupedEventLogs: GroupedEventLogs = {};
  for (const { eventName, eventLog } of namedEventLogs) {
    if (!(eventName in groupedEventLogs)) {
      groupedEventLogs[eventName] = [];
    }
    groupedEventLogs[eventName].push(eventLog);
  }
  return groupedEventLogs;
}
