import "fake-indexeddb/auto";
import { beforeEach, describe, expect, test, vi } from "vitest";
import type { Block } from "ethers";
import { registerEventLogsAndBlockTimes } from "./eventLogsContractUpdateTables";
import { addEventLogs_updateFetchedBlockNumber } from "@db/dbEventLogsDataHandlersEventLog";
import { dbBlockTimes } from "@db/dbBlockTimes";
import { setDbBlockTime } from "@db/dbBlockTimesDataHandlers";
import { TARGET_CHAINS } from "@constants/chains/_index";
import type { Chain, Contract } from "@constants/chains/types";
import type { DbEventLogs } from "@db/dbEventLogs";
import type { BlockTime, EthersEventLog, GroupedEventLogs } from "@db/dbTypes";
import { extractEventContracts, type NodeProvider } from "@utils/utilsEthers";
import { customLogger } from "@utils/logger";
import { convertTimestampSecToIso8601 } from "@utils/utilsTime";

vi.mock("@db/dbEventLogsDataHandlersEventLog");

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
function eventLogAt(blockNumber: number, index: number = 0): EthersEventLog {
  const hex: string = "0x" + blockNumber.toString(16).padStart(64, "0");
  return {
    eventName,
    eventSignature: "Test()",
    args: [],
    blockNumber,
    blockHash: hex,
    data: "0x",
    index,
    removed: false,
    topics: [hex],
    address: "0x" + "1".repeat(40),
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

  test("should save the block times from the RPC and register the logs with them", async () => {
    await setDbBlockTime(targetChain.name, [blockTimeOf(20)]);

    await registerEventLogsAndBlockTimes(
      dbEventLogs,
      targetContract,
      fakeProvider(),
      [eventLogAt(20), eventLogAt(30), eventLogAt(30, 1)],
      40,
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

  test("should throw with the cause when the block time of a log is not found", async () => {
    vi.spyOn(customLogger, "error").mockImplementation(() => {});

    await expect(
      registerEventLogsAndBlockTimes(
        dbEventLogs,
        targetContract,
        // The RPC returns another block.
        fakeProvider((blockNumber) => blockNumber + 1),
        [eventLogAt(30)],
        40,
      ),
    ).rejects.toMatchObject({
      message: "Failed to register event logs.",
      cause: { message: expect.stringContaining("cannot find blocktime") },
    });
    expect(addEventLogs_updateFetchedBlockNumber).not.toHaveBeenCalled();
  });

  test("should throw with the cause when a log has an invalid hex string", async () => {
    vi.spyOn(customLogger, "error").mockImplementation(() => {});

    await expect(
      registerEventLogsAndBlockTimes(
        dbEventLogs,
        targetContract,
        fakeProvider(),
        [{ ...eventLogAt(30), data: "zz" } as EthersEventLog],
        40,
      ),
    ).rejects.toMatchObject({
      message: "Failed to register event logs.",
      cause: {
        message: expect.stringContaining("not a valid hex string: data."),
      },
    });
    expect(addEventLogs_updateFetchedBlockNumber).not.toHaveBeenCalled();
  });

  test("should log the number of the logs instead of the logs", async () => {
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
      ),
    ).rejects.toThrow();

    expect(spyError).toHaveBeenCalledOnce();
    const [, logged] = spyError.mock.calls[0];
    expect(logged).toMatchObject({ eventLogCount: 2 });
    expect(logged).not.toHaveProperty("ethersEventLogs");
  });
});
