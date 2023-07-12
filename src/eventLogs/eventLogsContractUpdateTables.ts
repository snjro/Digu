import type { DbEventLogs } from "@db/dbEventLogs";
import {
  isHexStrings,
  type ChainName,
  type Contract,
} from "@constants/chains/types";
import { addEventLogs_updateFetchedBlockNumber } from "@db/dbEventLogsDataHandlersEventLog";
import type {
  BlockTime,
  ConvertedEventLog,
  EthersEventLog,
  GroupedEventLogs,
} from "@db/dbTypes";
import { setDbBlockTime } from "@db/dbBlockTimesDataHandlers";
import Dexie from "dexie";
import { isHexString } from "ethers";
import type { NodeProvider } from "@utils/utilsEthers";
import { resetNodeErrorCount } from "./eventLogsContract";
import {
  fetchBlockTimesForEventLogs,
  type BlockTimeForEventLog,
} from "./eventLogsContractBlockTimes";
import { myLogger } from "@utils/logger";

export async function registerEventLogsAndBlockTimes(
  dbEventLogs: DbEventLogs,
  targetContract: Contract,
  nodeProvider: NodeProvider,
  ethersEventLogs: EthersEventLog[],
  lastFetchedBlockNumber: number
) {
  const targetChainName: ChainName = dbEventLogs.versionIdentifier.chainName;
  try {
    const blockTimesForEventLogs: BlockTimeForEventLog[] =
      await fetchBlockTimesForEventLogs(
        nodeProvider,
        targetChainName,
        ethersEventLogs
      );
    const convertedEventLogs: ConvertedEventLog[] = getConvertedEventLogs(
      ethersEventLogs,
      blockTimesForEventLogs
    );

    const groupedEventLogs: GroupedEventLogs =
      groupByEventName(convertedEventLogs);

    const unregisteredBlockTimes: BlockTime[] = getUnregisterdBlockTimes(
      blockTimesForEventLogs
    );

    await setDbBlockTime(targetChainName, unregisteredBlockTimes);

    await addEventLogs_updateFetchedBlockNumber(
      dbEventLogs,
      targetContract,
      groupedEventLogs,
      lastFetchedBlockNumber
    );
  } catch (error) {
    myLogger.error("error on registerEventLogsAndBlockTimes", error);

    throw new Error();
  }

  await resetNodeErrorCount(targetChainName);
}

function getUnregisterdBlockTimes(
  blockTimesForEventLogs: BlockTimeForEventLog[]
): BlockTime[] {
  let unregisterdBlockTimes: BlockTime[] = [];
  for (const blockTimesForEventLog of blockTimesForEventLogs) {
    if (blockTimesForEventLog.fetchedFromProvider) {
      unregisterdBlockTimes.push(blockTimesForEventLog.fetchedBlockTime);
    }
  }
  return unregisterdBlockTimes;
}

function getConvertedEventLogs(
  ethersEventLogs: EthersEventLog[],
  blockTimesForEventLogs: BlockTimeForEventLog[]
): ConvertedEventLog[] {
  let convertedEventLogs: ConvertedEventLog[] = [];

  for (const ethersEventLog of ethersEventLogs) {
    const targetBlockTime: BlockTime | undefined = blockTimesForEventLogs.find(
      (blockTime) => {
        return (
          blockTime.fetchedBlockTime.blockNumber === ethersEventLog.blockNumber
        );
      }
    )?.fetchedBlockTime;

    if (targetBlockTime) {
      const convertedEventLog: ConvertedEventLog = convertEthersEventToEventLog(
        ethersEventLog,
        targetBlockTime.timestamp
      );

      convertedEventLogs.push(convertedEventLog);
    } else {
      throw new Error(
        `Error! cannot find blocktime. blocknumber is ${ethersEventLog.blockNumber}`
      );
    }
  }

  return convertedEventLogs;
}
function convertEthersEventToEventLog(
  ethersEventLog: EthersEventLog,
  timestamp: number
): ConvertedEventLog {
  if (
    isHexString(ethersEventLog.blockHash) &&
    isHexString(ethersEventLog.data) &&
    isHexStrings(ethersEventLog.topics) &&
    isHexString(ethersEventLog.address) &&
    isHexString(ethersEventLog.transactionHash)
  ) {
    return {
      //TODO 現在はanonymous Eventlog は「augurv2.Cash.Lognote」にしか存在していない。
      // これ以外にも対応できたほうが良いが、anonymous Eventlogは
      // ethersEventにイベント名を保持していないため、イベント名を特定できない問題がある。
      // コントラクトの出力するイベントにanonymous Eventlogが１つならば、
      // コントラクトの情報も引数に渡してくればその匿名イベント名を特定できる。
      // しかし、２つ以上あると匿名イベント名は特定できない。
      // ２つ以上存在する場合の対応案としては以下↓
      // １．anonymous Eventlogは対象外とする（テーブルも作らないしイベントログも取得しない。ただし、ABI情報は表示する）
      // ２．ABIにanonymous Eventlogをもつコントラクトはイベントログテーブルとして
      // 「コントラクト名_anonymous」を追加作成し、そのコントラクトが出力するすべてのanonymous Eventlogは
      // そのテーブルに登録する。ただし、この方法は同一コントラクト内に
      // ２つ以上のanonymous Eventlogが存在すると、異なる項目のレコードが
      // １テーブルに混在してしまうため、ag-gridに表示できない問題がある。

      eventName: ethersEventLog.eventName ?? "LogNote",
      eventSignature: ethersEventLog.eventSignature,
      args: Dexie.deepClone(ethersEventLog.args),
      blockNumber: ethersEventLog.blockNumber,
      jsDate: new Date(timestamp * 1000),
      blockHash: ethersEventLog.blockHash,
      data: ethersEventLog.data,
      logIndex: ethersEventLog.index,
      removed: ethersEventLog.removed,
      topics: ethersEventLog.topics,
      address: ethersEventLog.address,
      transactionHash: ethersEventLog.transactionHash,
      transactionIndex: ethersEventLog.transactionIndex,
      interface: ethersEventLog.interface,
      provider: ethersEventLog.provider,
      fragment: ethersEventLog.fragment,
    };
  } else {
    let invalidProps = [];
    if (!isHexString(ethersEventLog.blockHash)) {
      invalidProps.push("blockHash");
    }
    if (!isHexString(ethersEventLog.data)) {
      invalidProps.push("data");
    }
    if (!isHexStrings(ethersEventLog.topics)) {
      invalidProps.push("topics");
    }
    if (!isHexString(ethersEventLog.address)) {
      invalidProps.push("address");
    }
    if (!isHexString(ethersEventLog.transactionHash)) {
      invalidProps.push("transactionHash");
    }
    const errorMessage = `Invalid EthersEventLog object. The following properties are not a valid hex string: ${invalidProps.join(
      ", "
    )}.`;
    throw new Error(errorMessage);
  }
}
function groupByEventName(
  convertedEventLogs: ConvertedEventLog[]
): GroupedEventLogs {
  const groupedEventLogs: GroupedEventLogs = {};
  for (const convertedEventLog of convertedEventLogs) {
    let eventName: ConvertedEventLog["eventName"] = convertedEventLog.eventName;

    if (!(eventName in groupedEventLogs)) {
      groupedEventLogs[eventName] = [];
    }
    groupedEventLogs[eventName].push(convertedEventLog);
  }
  return groupedEventLogs;
}
