import "fake-indexeddb/auto";
import { afterEach, describe, expect, test } from "vitest";
import type { Table } from "dexie";
import { TARGET_CHAINS } from "#constants/chains/_index.js";
import { extractEventContracts } from "#utils/utilsEthers.js";
import { getEventLogTableName } from "#utils/utilsDb.js";
import { getEachArgsMaxLengths } from "#routes/[chainName]/[projectName_versionName]/contracts/maxParamsLength.js";
import type { AbiFragmentIdentifier, ConvertedEventLog } from "./dbTypes";
import { getDbEventLogs } from "./dbEventLogs";
import {
  EVENT_LOGS_TABLE_CHUNK_SIZE,
  EventLogsTable,
  type EventLogsTableQuery,
  type StoredEventLog,
} from "./eventLogsTable";

// UniverseCreated(address,address,uint256[],bool): an array argument.
const chain = TARGET_CHAINS[0];
const project = chain.projects[0];
const version = project.versions[0];
const contract = extractEventContracts(version.contracts).find(
  (contract) => contract.name === "Augur",
)!;
const eventName: string = "UniverseCreated";
const eventIdentifier: AbiFragmentIdentifier = {
  chainName: chain.name,
  projectName: project.name,
  versionName: version.name,
  contractName: contract.name,
  abiFragmentName: eventName,
};
const table = (): Table<ConvertedEventLog, number> =>
  getDbEventLogs(eventIdentifier).table(
    getEventLogTableName(contract.name, eventName),
  );

function log(
  blockNumber: number,
  lengthOfArray: number = 1,
): ConvertedEventLog {
  return {
    args: [
      "0xparent",
      "0xchild",
      Array.from({ length: lengthOfArray }, (_, index) => BigInt(index)),
      blockNumber % 2 === 0,
    ],
    blockNumber,
    jsDate: new Date(blockNumber * 1000),
    logIndex: 0,
    removed: false,
    transactionHash: `0xtx${blockNumber}`,
    transactionIndex: 0,
  };
}
function logs(fromBlock: number, count: number): ConvertedEventLog[] {
  return Array.from({ length: count }, (_, index) => log(fromBlock + index));
}
const allRows: EventLogsTableQuery = {
  sortModel: [],
  filterModel: {},
  quickSearch: "",
  startRow: 0,
  endRow: Number.MAX_SAFE_INTEGER,
};
function blockNumbersOf(rows: ConvertedEventLog[]): number[] {
  return rows.map((row) => row.blockNumber);
}
async function storedRows(): Promise<StoredEventLog[]> {
  return (await table().toArray()) as StoredEventLog[];
}

afterEach(async () => {
  await table().clear();
});

describe("EventLogsTable", () => {
  test("reads the rows across the chunks in the order of the key", async () => {
    await table().bulkAdd(logs(1, 7));
    const eventLogsTable = new EventLogsTable(eventIdentifier, 3);

    expect(await eventLogsTable.open()).toEqual({
      rowCount: 7,
      argsMaxLengths: [1, 1, 1, 1],
    });
    expect(eventLogsTable.query(allRows).rows).toEqual(await storedRows());
  });

  test("reads a table of exactly the chunks", async () => {
    await table().bulkAdd(logs(1, 6));
    const eventLogsTable = new EventLogsTable(eventIdentifier, 3);

    expect((await eventLogsTable.open()).rowCount).toBe(6);
  });

  test("reads the rows across chunks of the default size", async () => {
    await table().bulkAdd(logs(1, EVENT_LOGS_TABLE_CHUNK_SIZE + 1));
    const eventLogsTable = new EventLogsTable(eventIdentifier);

    expect((await eventLogsTable.open()).rowCount).toBe(
      EVENT_LOGS_TABLE_CHUNK_SIZE + 1,
    );
    const { rows } = eventLogsTable.query({
      ...allRows,
      startRow: EVENT_LOGS_TABLE_CHUNK_SIZE - 1,
    });
    expect(blockNumbersOf(rows)).toEqual([
      EVENT_LOGS_TABLE_CHUNK_SIZE,
      EVENT_LOGS_TABLE_CHUNK_SIZE + 1,
    ]);
  }, 60_000);

  test("opens an empty table", async () => {
    const eventLogsTable = new EventLogsTable(eventIdentifier);

    expect(await eventLogsTable.open()).toEqual({
      rowCount: 0,
      argsMaxLengths: [0, 0, 0, 0],
    });
    expect(eventLogsTable.query(allRows)).toEqual({ rows: [], lastRow: 0 });
  });

  test("gives the lengths of the arguments as getEachArgsMaxLengths", async () => {
    const rows: ConvertedEventLog[] = [
      log(1, 0),
      log(2, 3),
      log(3, 1),
      log(4, 5),
      log(5, 2),
    ];
    await table().bulkAdd(rows);
    const eventLogsTable = new EventLogsTable(eventIdentifier, 2);

    expect((await eventLogsTable.open()).argsMaxLengths).toEqual(
      getEachArgsMaxLengths(rows, 4),
    );
    expect(getEachArgsMaxLengths(rows, 4)).toEqual([1, 1, 5, 1]);
  });

  describe("refresh", () => {
    test("adds the new rows", async () => {
      await table().bulkAdd(logs(1, 4));
      const eventLogsTable = new EventLogsTable(eventIdentifier, 3);
      await eventLogsTable.open();
      await table().bulkAdd(logs(5, 4));

      expect(await eventLogsTable.refresh()).toEqual({
        rowCount: 8,
        argsMaxLengths: [1, 1, 1, 1],
        reloaded: false,
      });
      expect(eventLogsTable.query(allRows).rows).toEqual(await storedRows());
    });

    test("keeps the rows when there are no new rows", async () => {
      await table().bulkAdd(logs(1, 3));
      const eventLogsTable = new EventLogsTable(eventIdentifier);
      await eventLogsTable.open();

      expect(await eventLogsTable.refresh()).toEqual({
        rowCount: 3,
        argsMaxLengths: [1, 1, 1, 1],
        reloaded: false,
      });
    });

    test("adds the rows to a table that had none", async () => {
      const eventLogsTable = new EventLogsTable(eventIdentifier);
      await eventLogsTable.open();
      await table().bulkAdd(logs(1, 2));

      expect(await eventLogsTable.refresh()).toMatchObject({
        rowCount: 2,
        reloaded: false,
      });
    });

    test("widens the columns of the arguments with the new rows", async () => {
      await table().bulkAdd(logs(1, 2));
      const eventLogsTable = new EventLogsTable(eventIdentifier);
      await eventLogsTable.open();
      // The filter of a column that is not there yet does nothing.
      const query: EventLogsTableQuery = {
        ...allRows,
        filterModel: {
          "args.2.2": { filterType: "text", type: "equals", filter: "2" },
        },
      };
      expect(eventLogsTable.query(query).lastRow).toBe(2);
      await table().bulkAdd([log(3, 3)]);

      expect((await eventLogsTable.refresh()).argsMaxLengths).toEqual([
        1, 1, 3, 1,
      ]);
      expect(blockNumbersOf(eventLogsTable.query(query).rows)).toEqual([3]);
    });

    test("reads all the rows again after a reset", async () => {
      await table().bulkAdd([log(1, 4), ...logs(2, 3)]);
      const eventLogsTable = new EventLogsTable(eventIdentifier, 2);
      await eventLogsTable.open();
      // The key goes on after clear().
      await table().clear();
      await table().bulkAdd(logs(10, 5));

      expect(await eventLogsTable.refresh()).toEqual({
        rowCount: 5,
        argsMaxLengths: [1, 1, 1, 1],
        reloaded: true,
      });
      expect(eventLogsTable.query(allRows).rows).toEqual(await storedRows());
    });

    test("reads all the rows again when the last row has changed", async () => {
      await table().bulkAdd(logs(1, 3));
      const eventLogsTable = new EventLogsTable(eventIdentifier);
      await eventLogsTable.open();
      const last: StoredEventLog = (await storedRows())[2];
      await table().put({ ...last, transactionHash: "0xother" });

      expect((await eventLogsTable.refresh()).reloaded).toBe(true);
      expect(eventLogsTable.query(allRows).rows[2].transactionHash).toBe(
        "0xother",
      );
    });

    test("reads all the rows again when there are fewer rows", async () => {
      await table().bulkAdd(logs(1, 4));
      const eventLogsTable = new EventLogsTable(eventIdentifier);
      await eventLogsTable.open();
      await table().delete((await storedRows())[1].id);

      expect(await eventLogsTable.refresh()).toMatchObject({
        rowCount: 3,
        reloaded: true,
      });
      expect(blockNumbersOf(eventLogsTable.query(allRows).rows)).toEqual([
        1, 3, 4,
      ]);
    });
  });

  describe("query", () => {
    test("gives the block of the rows that match, and the number of them", async () => {
      await table().bulkAdd(logs(1, 10));
      const eventLogsTable = new EventLogsTable(eventIdentifier);
      await eventLogsTable.open();
      // The even block numbers, from the latest.
      const query: EventLogsTableQuery = {
        sortModel: [{ colId: "blockNumber", sort: "desc" }],
        filterModel: {
          "args.3.0": { filterType: "text", type: "equals", filter: "true" },
        },
        quickSearch: "",
        startRow: 1,
        endRow: 3,
      };

      const result = eventLogsTable.query(query);
      expect(blockNumbersOf(result.rows)).toEqual([8, 6]);
      expect(result.lastRow).toBe(5);
      expect(
        blockNumbersOf(
          eventLogsTable.query({ ...query, startRow: 3, endRow: 6 }).rows,
        ),
      ).toEqual([4, 2]);
    });

    test("gives the rows with their keys", async () => {
      await table().bulkAdd(logs(1, 2));
      const eventLogsTable = new EventLogsTable(eventIdentifier);
      await eventLogsTable.open();

      const ids: number[] = (await storedRows()).map((row) => row.id);
      expect(eventLogsTable.query(allRows).rows.map((row) => row.id)).toEqual(
        ids,
      );
    });

    test("gives the new rows after a refresh", async () => {
      await table().bulkAdd(logs(1, 2));
      const eventLogsTable = new EventLogsTable(eventIdentifier);
      await eventLogsTable.open();
      expect(eventLogsTable.query(allRows).lastRow).toBe(2);
      await table().bulkAdd(logs(3, 2));
      await eventLogsTable.refresh();

      expect(eventLogsTable.query(allRows).lastRow).toBe(4);
    });
  });
});
