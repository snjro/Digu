import "fake-indexeddb/auto";
import { afterEach, describe, expect, test, vi } from "vitest";
import { TARGET_CHAINS } from "@constants/chains/_index";
import { storeSyncStatus } from "@stores/storeSyncStatus";
import { extractEventContracts } from "@utils/utilsEthers";
import { getEventLogTableName } from "@utils/utilsDb";
import type { AbiFragmentIdentifier, ConvertedEventLog } from "./dbTypes";
import { getDbEventLogs } from "./dbEventLogs";
import { dbWorkerFuncGetConvertedEventLogs } from "./db.worker.func.getConvertedEventLogs";
import { addEventLogs_updateFetchedBlockNumber } from "./dbEventLogsDataHandlersEventLog";
import * as DataHandlerSyncStatusGetters from "./dbEventLogsDataHandlersSyncStatusGetters";
import { getEventLogEdges } from "./dbEventLogsGetEventLogEdges";

const chain = TARGET_CHAINS[0];
const project = chain.projects[0];
const version = project.versions[0];
const contract = extractEventContracts(version.contracts)[0];
const eventIdentifier: AbiFragmentIdentifier = {
  chainName: chain.name,
  projectName: project.name,
  versionName: version.name,
  contractName: contract.name,
  abiFragmentName: contract.events.names[0],
};
const table = () =>
  getDbEventLogs(eventIdentifier).table(
    getEventLogTableName(contract.name, contract.events.names[0]),
  );

function log(blockNumber: number, logIndex: number): ConvertedEventLog {
  return {
    blockNumber,
    logIndex,
    transactionHash: `0xtx${blockNumber}_${logIndex}`,
    jsDate: new Date(blockNumber * 13_000),
    args: [BigInt(blockNumber)],
  } as unknown as ConvertedEventLog;
}

afterEach(async () => {
  vi.restoreAllMocks();
  await table().clear();
});

describe("getEventLogEdges", () => {
  test("shows the same count, latest and oldest as all the logs", async () => {
    // Saved like the sync: each range with bulkPut, in the order of the RPC
    // (block, then log index), and the ranges from old to new blocks.
    await table().bulkPut([log(100, 0), log(100, 1), log(105, 0)]);
    await table().bulkPut([log(106, 3)]);
    await table().bulkPut([log(120, 0), log(120, 2), log(120, 5)]);

    const all: ConvertedEventLog[] =
      await dbWorkerFuncGetConvertedEventLogs(eventIdentifier);
    const edges = await getEventLogEdges(eventIdentifier);
    expect(edges).toEqual({
      count: all.length,
      oldest: all[0],
      latest: all[all.length - 1],
    });
    expect(edges.count).toBe(7);
    expect(edges.oldest?.transactionHash).toBe("0xtx100_0");
    expect(edges.latest?.transactionHash).toBe("0xtx120_5");
  });

  test("shows the oldest and the latest log also when the RPC returned them out of order", async () => {
    vi.spyOn(
      DataHandlerSyncStatusGetters,
      "getDbItemSyncStatus",
    ).mockResolvedValue({ [contract.events.names[0]]: { recordCount: 0 } });
    vi.spyOn(storeSyncStatus, "updateState").mockImplementation(() => {});
    const save = (logs: ConvertedEventLog[], toBlockNumber: number) =>
      addEventLogs_updateFetchedBlockNumber(
        getDbEventLogs(eventIdentifier),
        contract,
        { [contract.events.names[0]]: logs },
        toBlockNumber,
      );
    await save([log(105, 0), log(100, 1), log(100, 0)], 110);
    await save([log(120, 5), log(111, 0), log(120, 0)], 130);

    const edges = await getEventLogEdges(eventIdentifier);
    expect(edges.count).toBe(6);
    expect(edges.oldest?.transactionHash).toBe("0xtx100_0");
    expect(edges.latest?.transactionHash).toBe("0xtx120_5");
  });

  test("shows one log as the latest and the oldest", async () => {
    await table().bulkPut([log(100, 0)]);
    const all: ConvertedEventLog[] =
      await dbWorkerFuncGetConvertedEventLogs(eventIdentifier);
    expect(await getEventLogEdges(eventIdentifier)).toEqual({
      count: 1,
      oldest: all[0],
      latest: all[0],
    });
  });

  test("shows no logs for an empty table", async () => {
    expect(await getEventLogEdges(eventIdentifier)).toEqual({
      count: 0,
      oldest: undefined,
      latest: undefined,
    });
  });
});
