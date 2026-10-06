import { afterEach, describe, expect, test } from "vitest";
import { EventFragment } from "ethers";
import {
  AllCommunityModule,
  createGrid,
  ModuleRegistry,
  type ColDef,
  type ColGroupDef,
  type GridApi,
  type ValueFormatterParams,
  type ValueGetterParams,
} from "ag-grid-community";
import type { ColumnDef } from "#lib/grid/types.js";
import { getColumnDefs } from "#lib/grid/GridBody/getColumnDefs.js";
import { getCsvText } from "#lib/grid/ExportCsv/exportCsv.js";
import type { ConvertedEventLog } from "#db/dbTypes.js";
import { columnDefs } from "./columnDefs";

// An array, an indexed argument and integers, which ethers 6 decodes to bigint.
const fragment: EventFragment = EventFragment.from(
  "event Test(address[] owners, uint256 indexed amount, uint8 flag, bool ok)",
);
const row = {
  blockNumber: 100,
  jsDate: new Date(Date.UTC(2020, 0, 2, 3, 4, 5)),
  args: [["0xaaa", "0xbbb"], 1234567n, 7n, true],
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

  test("should sort the datetime by the date and show it in ISO 8601", () => {
    const datetime: ColumnDef = children(defs[0])[1];
    expect(getValue(datetime)).toBe(row.jsDate);
    const valueFormatter = (datetime as ColDef).valueFormatter as (
      params: ValueFormatterParams,
    ) => unknown;
    expect(
      valueFormatter({ data: row, value: row.jsDate } as ValueFormatterParams),
    ).toBe("2020-01-02T03:04:05Z");
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

  test("should show a value that is not a bigint as text", () => {
    const ok: ColumnDef = children(args[3])[0];
    expect(getValue(ok)).toBe(true);
    expect(formatValue(ok)).toBe("true");
    expect((ok as ColDef).cellClass).toBe("");
  });
});

describe("the datetime column in ag-grid", () => {
  // Shuffled, with a and c in the same second.
  const rows = [
    ["0xa1", Date.UTC(2020, 0, 2, 3, 4, 5)],
    ["0xb1", Date.UTC(2019, 11, 31, 23, 59, 59)],
    ["0xc1", Date.UTC(2020, 0, 2, 3, 4, 5)],
    ["0xd1", Date.UTC(2020, 0, 2, 13, 0, 0)],
    ["0xe1", Date.UTC(2021, 5, 1, 0, 0, 0)],
  ].map(
    ([transactionHash, time]) =>
      ({
        transactionHash,
        jsDate: new Date(time),
      }) as unknown as ConvertedEventLog,
  );
  let element: HTMLElement | undefined;
  let gridApi: GridApi<ConvertedEventLog> | undefined;
  afterEach(() => {
    gridApi?.destroy();
    element?.remove();
    gridApi = undefined;
    element = undefined;
  });
  function createRealGrid(): GridApi<ConvertedEventLog> {
    ModuleRegistry.registerModules([AllCommunityModule]);
    element = document.createElement("div");
    document.body.append(element);
    const datetime: ColumnDef = children(
      columnDefs(fragment, [2, 1, 1, 1])[0],
    )[1];
    // The same filter and group options as GridBody.
    gridApi = createGrid<ConvertedEventLog>(element, {
      columnDefs: getColumnDefs([
        { field: "transactionHash" },
        { headerName: "time", children: [datetime] },
      ]),
      defaultColDef: { sortable: true, filter: true },
      defaultColGroupDef: { openByDefault: true, marryChildren: true },
      suppressFieldDotNotation: true,
      rowData: rows,
    });
    return gridApi;
  }
  function shownRows(gridApi: GridApi<ConvertedEventLog>): string[] {
    const hashes: string[] = [];
    gridApi.forEachNodeAfterFilterAndSort((node) => {
      hashes.push(node.data!.transactionHash);
    });
    return hashes;
  }

  test("exports the datetime to CSV in ISO 8601", () => {
    const gridApi = createRealGrid();
    expect(
      getCsvText(gridApi, {
        skipRowNumber: { selectedValue: true },
        columnSeparator: { selectedValue: "," },
        suppressDoubleQuotes: { selectedValue: false },
        skipColumnHeaders: { selectedValue: false },
        filteredSorted: { selectedValue: "all" },
      }),
    ).toBe(
      [
        '"","time"',
        '"Transaction Hash","datetime"',
        '"0xa1","2020-01-02T03:04:05Z"',
        '"0xb1","2019-12-31T23:59:59Z"',
        '"0xc1","2020-01-02T03:04:05Z"',
        '"0xd1","2020-01-02T13:00:00Z"',
        '"0xe1","2021-06-01T00:00:00Z"',
      ].join("\r\n"),
    );
  });

  test.each([
    ["2020-01-02T03", ["0xa1", "0xc1"]],
    ["t13:00", ["0xd1"]],
    ["59Z", ["0xb1"]],
    // Words of Date.toString(), not of the ISO text.
    ["GMT", []],
  ])("finds the ISO 8601 text by the quick search: %j", (text, expected) => {
    const gridApi = createRealGrid();
    gridApi.setGridOption("quickFilterText", text);
    expect(shownRows(gridApi)).toEqual(expected);
  });

  test.each([
    ["contains", "T03:04", ["0xa1", "0xc1"]],
    ["equals", "2021-06-01T00:00:00Z", ["0xe1"]],
    ["startsWith", "2020", ["0xa1", "0xc1", "0xd1"]],
    ["endsWith", ":59Z", ["0xb1"]],
    ["notContains", "2020", ["0xb1", "0xe1"]],
    ["contains", "GMT", []],
  ])(
    "filters the ISO 8601 text by the column filter: %s %j",
    async (type, filter, expected) => {
      const gridApi = createRealGrid();
      await gridApi.setColumnFilterModel("jsDate", {
        filterType: "text",
        type,
        filter,
      });
      gridApi.onFilterChanged();
      expect(shownRows(gridApi)).toEqual(expected);
    },
  );

  test.each([
    ["asc", ["0xb1", "0xa1", "0xc1", "0xd1", "0xe1"]],
    ["desc", ["0xe1", "0xd1", "0xa1", "0xc1", "0xb1"]],
  ] as const)("sorts by the time: %s", (sort, expected) => {
    const gridApi = createRealGrid();
    gridApi.applyColumnState({ state: [{ colId: "jsDate", sort }] });
    expect(shownRows(gridApi)).toEqual(expected);
  });
});

describe("the args columns in ag-grid", () => {
  const argsFragment: EventFragment = EventFragment.from(
    "event Args(bool ok, string name, uint256[] amounts)",
  );
  // The second row has one amount, so its amounts[1] is empty.
  const rows = [
    ["0xa1", [true, "abc", [1234n, 5n]]],
    ["0xb1", [false, "", [6n]]],
  ].map(
    ([transactionHash, args]) =>
      ({ transactionHash, args }) as unknown as ConvertedEventLog,
  );
  let element: HTMLElement | undefined;
  let gridApi: GridApi<ConvertedEventLog> | undefined;
  afterEach(() => {
    gridApi?.destroy();
    element?.remove();
    gridApi = undefined;
    element = undefined;
  });
  function createRealGrid(): GridApi<ConvertedEventLog> {
    ModuleRegistry.registerModules([AllCommunityModule]);
    element = document.createElement("div");
    document.body.append(element);
    const args: ColumnDef = columnDefs(argsFragment, [1, 1, 2])[1];
    gridApi = createGrid<ConvertedEventLog>(element, {
      columnDefs: getColumnDefs([{ field: "transactionHash" }, args]),
      defaultColDef: { sortable: true, filter: true },
      defaultColGroupDef: { openByDefault: true, marryChildren: true },
      suppressFieldDotNotation: true,
      rowData: rows,
    });
    return gridApi;
  }

  test("shows each value as text, and nothing for a missing one", async () => {
    createRealGrid();
    await new Promise((resolve) => setTimeout(resolve, 100));
    const texts: string[][] = [...element!.querySelectorAll(".ag-row")]
      .sort(
        (a, b) =>
          Number(a.getAttribute("row-index")) -
          Number(b.getAttribute("row-index")),
      )
      .map((row) =>
        [...row.querySelectorAll(".ag-cell")].map(
          (cell) => cell.textContent ?? "",
        ),
      );
    // The first column is the row number.
    expect(texts).toEqual([
      ["1", "0xa1", "true", "abc", 1234n.toLocaleString(), "5"],
      ["2", "0xb1", "false", "", "6", ""],
    ]);
  });

  test("exports each value as text, and nothing for a missing one", () => {
    const gridApi = createRealGrid();
    expect(
      getCsvText(gridApi, {
        skipRowNumber: { selectedValue: true },
        columnSeparator: { selectedValue: "," },
        suppressDoubleQuotes: { selectedValue: false },
        skipColumnHeaders: { selectedValue: true },
        filteredSorted: { selectedValue: "all" },
      }),
    ).toBe(
      ['"0xa1","true","abc","1234","5"', '"0xb1","false","","6",""'].join(
        "\r\n",
      ),
    );
  });
});
