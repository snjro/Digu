import { describe, expect, test } from "vitest";
import { EventFragment } from "ethers";
import type {
  ColDef,
  ColGroupDef,
  ValueFormatterParams,
  ValueGetterParams,
} from "ag-grid-community";
import type { ColumnDef } from "$lib/grid/types";
import type { ConvertedEventLog } from "@db/dbTypes";
import { columnDefs, getHexEventLogColumnDefs } from "./columnDefs";

// An array, an indexed argument and integers, which ethers 6 decodes to bigint.
const fragment: EventFragment = EventFragment.from(
  "event Test(address[] owners, uint256 indexed amount, uint8 flag, bool ok)",
);
const row = {
  blockNumber: 100,
  jsDate: new Date(Date.UTC(2020, 0, 2, 3, 4, 5)),
  args: [["0xaaa", "0xbbb"], 1234567n, 7n, true],
  topics: ["0xtopic0", "0xtopic1"],
  data: "0xdata",
  transactionIndex: 1,
  transactionHash: "0xtx",
  logIndex: 2,
  removed: false,
} as unknown as ConvertedEventLog;

function children(columnDef: ColumnDef): ColumnDef[] {
  return (columnDef as ColGroupDef).children;
}
function headerNames(columnDefs: ColumnDef[]): (string | undefined)[] {
  return columnDefs.map((columnDef) => columnDef.headerName);
}
function getValue(columnDef: ColumnDef): unknown {
  const valueGetter = (columnDef as ColDef).valueGetter as (
    params: ValueGetterParams,
  ) => unknown;
  return valueGetter({ data: row } as ValueGetterParams);
}
function formatValue(columnDef: ColumnDef): unknown {
  const valueFormatter = (columnDef as ColDef).valueFormatter as (
    params: ValueFormatterParams,
  ) => unknown;
  return valueFormatter({ data: row } as ValueFormatterParams);
}

describe("columnDefs", () => {
  // Two columns for the array argument, one for each of the others.
  const defs: ColumnDef[] = columnDefs(fragment, [2, 1, 1, 1]);
  const args: ColumnDef[] = children(defs[1]);

  test("should group the columns by time, args, transaction and log", () => {
    expect(headerNames(defs)).toEqual(["time", "args", "transaction", "log"]);
    expect(headerNames(children(defs[0]))).toEqual(["blocknumber", "datetime"]);
    expect(headerNames(children(defs[2]))).toEqual([
      "transaction index",
      "transaction hash",
    ]);
    expect(headerNames(children(defs[3]))).toEqual(["log index", "removed"]);
  });

  test("should show the datetime in ISO 8601", () => {
    expect(getValue(children(defs[0])[1])).toBe("2020-01-02T03:04:05Z");
  });

  test("should name each argument by its index and its name", () => {
    expect(headerNames(args)).toEqual([
      "args[0]",
      "args[1]",
      "args[2]",
      "args[3]",
    ]);
    expect(args.map((arg) => arg.columnGroupShow)).toEqual([
      undefined,
      "open",
      "open",
      "open",
    ]);
    expect(headerNames(children(args[0]))).toEqual(["owners[0]", "owners[1]"]);
    expect(headerNames(children(args[1]))).toEqual(["amount"]);
  });

  test("should take each item of an array argument", () => {
    expect(children(args[0]).map(getValue)).toEqual(["0xaaa", "0xbbb"]);
  });

  test("should keep a bigint as it is and format it with separators", () => {
    const amount: ColumnDef = children(args[1])[0];
    expect(getValue(amount)).toBe(1234567n);
    expect(formatValue(amount)).toBe(1234567n.toLocaleString());
    expect((amount as ColDef).cellClass).toBe("text-right");

    // uint8 is also a bigint in ethers 6.
    expect(formatValue(children(args[2])[0])).toBe("7");
  });

  test("should not format a value that is not a bigint", () => {
    const ok: ColumnDef = children(args[3])[0];
    expect(getValue(ok)).toBe(true);
    expect(formatValue(ok)).toBe(true);
    expect((ok as ColDef).cellClass).toBe("");
  });
});

describe("getHexEventLogColumnDefs", () => {
  test("should show the timestamp, the topics and the data", () => {
    const defs: ColumnDef[] = getHexEventLogColumnDefs(fragment);
    expect(headerNames(defs)).toEqual([
      "time",
      "topics",
      "data",
      "transaction",
      "log",
    ]);
    expect(getValue(children(defs[0])[1])).toBe(1577934245);
  });

  test("should have a topic for the event and one for each indexed argument", () => {
    const topics: ColumnDef[] = children(getHexEventLogColumnDefs(fragment)[1]);
    expect(headerNames(topics)).toEqual(["topics[0]", "topics[1]"]);
    expect(topics.map(getValue)).toEqual(["0xtopic0", "0xtopic1"]);
  });

  test("should have no topic for an anonymous event without indexed arguments", () => {
    const anonymous: EventFragment = EventFragment.from({
      type: "event",
      name: "Anon",
      anonymous: true,
      inputs: [{ name: "amount", type: "uint256", indexed: false }],
    });
    expect(children(getHexEventLogColumnDefs(anonymous)[1])).toEqual([]);
  });
});
