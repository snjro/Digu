import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { Block } from "ethers";
import {
  groupEventLogsByEventName,
  registerEventLogsAndBlockTimes,
} from "./eventLogsContractUpdateTables";
import { addEventLogs_updateFetchedBlockNumber } from "#db/dbEventLogsDataHandlersEventLog.js";
import { dbBlockTimes } from "#db/dbBlockTimes.js";
import { setDbBlockTime } from "#db/dbBlockTimesDataHandlers.js";
import { TARGET_CHAINS } from "#constants/chains/_index.js";
import type { Chain, Contract } from "#constants/chains/types.js";
import type { DbEventLogs } from "#db/dbEventLogs.js";
import type {
  BlockTime,
  ConvertedEventLog,
  EthersEventLog,
  GroupedEventLogs,
  NamedEventLog,
} from "#db/dbTypes.js";
import {
  extractEventContracts,
  type NodeProvider,
} from "#utils/utilsEthers.js";
import { customLogger } from "#utils/logger.js";
import { convertTimestampSecToIso8601 } from "#utils/utilsTime.js";

vi.mock("#db/dbEventLogsDataHandlersEventLog.js");

const targetChain: Chain = TARGET_CHAINS[0];
const targetProject = targetChain.projects[0];
const targetVersion = targetProject.versions[0];
const targetContract: Contract = extractEventContracts(
  targetVersion.contracts,
)[0];
const eventName: string = targetContract.events.names[0];
const dbEventLogs = {
  versionIdentifier: {
    chainName: targetChain.name,
    projectName: targetProject.name,
    versionName: targetVersion.name,
  },
} as DbEventLogs;

function timestampOf(blockNumber: number): number {
  return 1_700_000_000 + blockNumber * 12;
}
function blockTimeOf(blockNumber: number): BlockTime {
  return {
    blockNumber,
    timestamp: timestampOf(blockNumber),
    isoDatetime: convertTimestampSecToIso8601(timestampOf(blockNumber)),
  };
}
function eventLogAt(
  blockNumber: number,
  index: number = 0,
  name: string = eventName,
): EthersEventLog {
  const hex: string = "0x" + blockNumber.toString(16).padStart(64, "0");
  return {
    eventName: name,
    args: [],
    blockNumber,
    index,
    removed: false,
    transactionHash: hex,
    transactionIndex: 0,
  } as unknown as EthersEventLog;
}
// A provider that returns the block of the requested number, or of
// `numberOf(blockNumber)` when it is given.
function fakeProvider(
  numberOf: (blockNumber: number) => number = (blockNumber) => blockNumber,
): NodeProvider {
  return {
    getBlock: async (blockNumber: number): Promise<Block> =>
      ({
        number: numberOf(blockNumber),
        timestamp: timestampOf(numberOf(blockNumber)),
      }) as Block,
  } as unknown as NodeProvider;
}

describe("registerEventLogsAndBlockTimes", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await dbBlockTimes.table(targetChain.name).clear();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("should save the block times from the RPC and register the logs with them", async () => {
    await setDbBlockTime(targetChain.name, [blockTimeOf(20)]);

    await registerEventLogsAndBlockTimes(
      dbEventLogs,
      targetContract,
      fakeProvider(),
      [eventLogAt(20), eventLogAt(30), eventLogAt(30, 1)],
      40,
      () => false,
    );

    expect(await dbBlockTimes.table(targetChain.name).toArray()).toEqual([
      blockTimeOf(20),
      blockTimeOf(30),
    ]);
    expect(addEventLogs_updateFetchedBlockNumber).toHaveBeenCalledOnce();
    const [, , groupedEventLogs, toBlockNumber] = vi.mocked(
      addEventLogs_updateFetchedBlockNumber,
    ).mock.calls[0];
    expect(toBlockNumber).toBe(40);
    // The row keeps only these fields.
    expect((groupedEventLogs as GroupedEventLogs)[eventName][0]).toStrictEqual({
      args: [],
      blockNumber: 20,
      jsDate: new Date(timestampOf(20) * 1000),
      logIndex: 0,
      removed: false,
      transactionHash: "0x" + (20).toString(16).padStart(64, "0"),
      transactionIndex: 0,
    });
    expect(
      (groupedEventLogs as GroupedEventLogs)[eventName].map((eventLog) => [
        eventLog.blockNumber,
        eventLog.logIndex,
        eventLog.jsDate,
      ]),
    ).toEqual([
      [20, 0, new Date(timestampOf(20) * 1000)],
      [30, 0, new Date(timestampOf(30) * 1000)],
      [30, 1, new Date(timestampOf(30) * 1000)],
    ]);
  });

  test("should save nothing when stopped while it fetches the block times", async () => {
    let stopped: boolean = false;
    const provider: NodeProvider = {
      getBlock: async (blockNumber: number): Promise<Block> => {
        stopped = true;
        return {
          number: blockNumber,
          timestamp: timestampOf(blockNumber),
        } as Block;
      },
    } as unknown as NodeProvider;

    await registerEventLogsAndBlockTimes(
      dbEventLogs,
      targetContract,
      provider,
      [eventLogAt(30)],
      40,
      () => stopped,
    );

    expect(await dbBlockTimes.table(targetChain.name).toArray()).toEqual([]);
    // fetchedBlockNumber is moved only with the logs.
    expect(addEventLogs_updateFetchedBlockNumber).not.toHaveBeenCalled();
  });

  test("should group the logs of mixed events by event name in block order", async () => {
    const otherEventName: string = targetContract.events.names[1];
    expect(otherEventName).toBeDefined();

    // The order of one eth_getLogs for all the events.
    await registerEventLogsAndBlockTimes(
      dbEventLogs,
      targetContract,
      fakeProvider(),
      [
        eventLogAt(20, 0, otherEventName),
        eventLogAt(20, 1),
        eventLogAt(30, 0),
        eventLogAt(30, 1, otherEventName),
        eventLogAt(31, 0, otherEventName),
      ],
      40,
      () => false,
    );

    const [, , groupedEventLogs] = vi.mocked(
      addEventLogs_updateFetchedBlockNumber,
    ).mock.calls[0];
    const blocksOf = (name: string): number[][] =>
      (groupedEventLogs as GroupedEventLogs)[name].map((eventLog) => [
        eventLog.blockNumber,
        eventLog.logIndex,
      ]);
    expect(Object.keys(groupedEventLogs).sort()).toEqual(
      [eventName, otherEventName].sort(),
    );
    expect(blocksOf(eventName)).toEqual([
      [20, 1],
      [30, 0],
    ]);
    expect(blocksOf(otherEventName)).toEqual([
      [20, 0],
      [30, 1],
      [31, 0],
    ]);
  });

  test("should throw with the cause when the block time of a log is not found", async () => {
    await expect(
      registerEventLogsAndBlockTimes(
        dbEventLogs,
        targetContract,
        // The RPC returns another block.
        fakeProvider((blockNumber) => blockNumber + 1),
        [eventLogAt(30)],
        40,
        () => false,
      ),
    ).rejects.toMatchObject({
      message: "Failed to register event logs.",
      cause: { message: expect.stringContaining("cannot find blocktime") },
    });
    expect(addEventLogs_updateFetchedBlockNumber).not.toHaveBeenCalled();
  });

  test("should throw with the cause when a log has an invalid hex string", async () => {
    await expect(
      registerEventLogsAndBlockTimes(
        dbEventLogs,
        targetContract,
        fakeProvider(),
        [{ ...eventLogAt(30), transactionHash: "zz" } as EthersEventLog],
        40,
        () => false,
      ),
    ).rejects.toMatchObject({
      message: "Failed to register event logs.",
      cause: {
        message:
          "Invalid event log. transactionHash is not a valid hex string: zz (block 30, log index 0).",
      },
    });
    expect(addEventLogs_updateFetchedBlockNumber).not.toHaveBeenCalled();
  });

  test("should rethrow with the cause without logging the error", async () => {
    const spyError = vi
      .spyOn(customLogger, "error")
      .mockImplementation(() => {});

    await expect(
      registerEventLogsAndBlockTimes(
        dbEventLogs,
        targetContract,
        fakeProvider((blockNumber) => blockNumber + 1),
        [eventLogAt(30), eventLogAt(31)],
        40,
        () => false,
      ),
    ).rejects.toMatchObject({
      message: "Failed to register event logs.",
      cause: expect.any(Error),
    });

    // The caller logs the error, so it is not logged here as well.
    expect(spyError).not.toHaveBeenCalled();
  });
});

describe("groupEventLogsByEventName", () => {
  function namedEventLog(
    eventName: string,
    blockNumber: number,
  ): NamedEventLog {
    return {
      eventName,
      eventLog: { blockNumber } as ConvertedEventLog,
    };
  }

  test("should split the logs by event name and keep their order in each group", () => {
    const groupedEventLogs: GroupedEventLogs = groupEventLogsByEventName([
      namedEventLog("A", 1),
      namedEventLog("B", 2),
      namedEventLog("A", 3),
      namedEventLog("C", 4),
      namedEventLog("B", 5),
      namedEventLog("A", 6),
    ]);

    expect(
      Object.fromEntries(
        Object.entries(groupedEventLogs).map(([eventName, eventLogs]) => [
          eventName,
          eventLogs.map((eventLog) => eventLog.blockNumber),
        ]),
      ),
    ).toStrictEqual({ A: [1, 3, 6], B: [2, 5], C: [4] });
  });
});
