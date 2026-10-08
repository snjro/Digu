import type { DbEventLogs } from "#db/dbEventLogs.js";
import type {
  ChainName,
  Contract,
  HexString,
} from "#constants/chains/types.js";
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
    const namedEventLogs: NamedEventLog[] = getNamedEventLogs(
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

function getNamedEventLogs(
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
    namedEventLogs.push(
      convertEthersEventToEventLog(
        ethersEventLog,
        blockTimes.get(ethersEventLog.blockNumber)?.timestamp,
      ),
    );
  }

  return namedEventLogs;
}
// The row of a log that the sync decoded with ethers.
export function convertEthersEventToEventLog(
  ethersEventLog: EthersEventLog,
  timestamp: number | undefined,
): NamedEventLog {
  return makeNamedEventLog(
    {
      eventName: ethersEventLog.eventName,
      args: Dexie.deepClone(ethersEventLog.args),
      blockNumber: ethersEventLog.blockNumber,
      logIndex: ethersEventLog.index,
      removed: ethersEventLog.removed,
      transactionHash: ethersEventLog.transactionHash as HexString,
      transactionIndex: ethersEventLog.transactionIndex,
    },
    timestamp,
  );
}
// Makes the row of a log for the sync and the warp sync, so that both save
// the same rows. timestamp: of the block of the log, in seconds.
export function makeNamedEventLog(
  {
    eventName,
    ...fields
  }: Omit<ConvertedEventLog, "jsDate"> & Pick<NamedEventLog, "eventName">,
  timestamp: number | undefined,
): NamedEventLog {
  if (timestamp === undefined) {
    throw new Error(
      `Error! cannot find blocktime. blocknumber is ${fields.blockNumber}`,
    );
  }
  if (!isHexString(fields.transactionHash)) {
    throw new Error(
      `Invalid event log. transactionHash is not a valid hex string: ${String(fields.transactionHash)} (block ${fields.blockNumber}, log index ${fields.logIndex}).`,
    );
  }
  return {
    eventName,
    eventLog: { ...fields, jsDate: new Date(timestamp * 1000) },
  };
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
