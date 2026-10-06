import { afterEach, describe, expect, test } from "vitest";
import { EventFragment } from "ethers";
import {
  AllCommunityModule,
  createGrid,
  ModuleRegistry,
  type GridApi,
  type SortModelItem,
} from "ag-grid-community";
import { getColumnDefs } from "#lib/grid/GridBody/getColumnDefs.js";
import {
  getCsvRequest,
  getCsvTextUpTo,
  type CsvColumnSeparator,
  type CsvSelectedValues,
} from "#lib/grid/ExportCsv/exportCsv.js";
import type { CsvRequest } from "#lib/grid/ExportCsv/csvFormat.js";
import { columnDefs } from "#routes/[chainName]/[projectName_versionName]/contracts/[contractName]/events/[eventName]/columnDefs.js";
import {
  eventLogCellValues,
  eventLogColIds,
} from "#routes/[chainName]/[projectName_versionName]/contracts/[contractName]/events/[eventName]/eventLogCellValues.js";
import type { ConvertedEventLog } from "./dbTypes";
import { EVENT_LOGS_CSV_CHUNK_SIZE, eventLogsCsv } from "./eventLogsTableCsv";
import {
  queryEventLogRows,
  type EventLogsTableQueryModel,
} from "./eventLogsTableQuery";

// An argument without a name, arrays, bigints and texts.
const fragment: EventFragment = EventFragment.from(
  "event Test(address from, address[] owners, uint256 amount, int256, uint256[] amounts, bool ok, bytes data, string name)",
);
const eachArgsMaxLengths: number[] = [1, 2, 1, 1, 2, 1, 1, 1];
const cellValues = eventLogCellValues(fragment, eachArgsMaxLengths);

function eventLog(
  values: Partial<ConvertedEventLog> & { args: unknown[] },
): ConvertedEventLog {
  return {
    blockNumber: 100,
    jsDate: new Date(Date.UTC(2020, 0, 2, 3, 4, 5)),
    transactionIndex: 1,
    transactionHash: "0xtx",
    logIndex: 2,
    removed: false,
    ...values,
  } as ConvertedEventLog;
}
const names: string[] = [
  "=SUM(A1)",
  "",
  "hello world",
  '-a "quoted", text\nnext',
  "a|b",
  "a\tb",
  "a\r\nb",
  "@x",
  "+1",
  "\tx",
];
// Not in the order of any column.
const rows: ConvertedEventLog[] = [
  ...names.map((name, index) =>
    eventLog({
      blockNumber: [100, 0, 99, 101][index % 4],
      transactionIndex: index,
      transactionHash: (index === 1
        ? ""
        : `0x${index}`) as ConvertedEventLog["transactionHash"],
      logIndex: 10 - index,
      removed: index % 3 === 0,
      args: [
        `0xAbC${index}`,
        index % 2 === 0 ? ["0xaaa", '0x"b"'] : [],
        2n ** 60n + BigInt(index),
        -5n * BigInt(index),
        index % 2 === 0 ? [1234n, 5n] : [6n],
        index % 2 === 0,
        index === 2 ? null : "0x01ff",
        index === 3 ? undefined : name,
      ],
    }),
  ),
];

let gridApi: GridApi<ConvertedEventLog> | undefined;
let element: HTMLElement | undefined;
afterEach(() => {
  gridApi?.destroy();
  element?.remove();
  gridApi = undefined;
  element = undefined;
});
// The grid of the screen, as eventLogCellValues.test.ts makes it.
function createRealGrid(
  rowData: ConvertedEventLog[],
): GridApi<ConvertedEventLog> {
  ModuleRegistry.registerModules([AllCommunityModule]);
  element = document.createElement("div");
  document.body.append(element);
  gridApi = createGrid<ConvertedEventLog>(element, {
    columnDefs: getColumnDefs(columnDefs(fragment, eachArgsMaxLengths)),
    defaultColDef: { sortable: true, filter: true },
    defaultColGroupDef: { openByDefault: true, marryChildren: true },
    suppressFieldDotNotation: true,
    rowData,
  });
  return gridApi;
}
function selectedValuesOf(
  skipRowNumber: boolean,
  columnSeparator: CsvColumnSeparator,
  suppressDoubleQuotes: boolean,
  skipColumnHeaders: boolean,
  filteredSorted: CsvSelectedValues["filteredSorted"]["selectedValue"] = "all",
): CsvSelectedValues {
  return {
    skipRowNumber: { selectedValue: skipRowNumber },
    columnSeparator: { selectedValue: columnSeparator },
    suppressDoubleQuotes: { selectedValue: suppressDoubleQuotes },
    skipColumnHeaders: { selectedValue: skipColumnHeaders },
    filteredSorted: { selectedValue: filteredSorted },
  };
}
// The query that the Infinite Row Model would give the table worker for the
// sort and the filters of the grid.
function queryOf(
  api: GridApi<ConvertedEventLog>,
  quickSearch: string,
): EventLogsTableQueryModel {
  const sortModel: SortModelItem[] = api
    .getColumnState()
    .filter((state) => state.sort)
    .sort((a, b) => (a.sortIndex ?? 0) - (b.sortIndex ?? 0))
    .map((state) => ({ colId: state.colId, sort: state.sort! }));
  return { sortModel, filterModel: api.getFilterModel(), quickSearch };
}
// As EventLogsTable.csv with a query.
async function workerCsvTextOfQuery(
  request: CsvRequest,
  query: EventLogsTableQueryModel,
): Promise<string> {
  const queriedRows: ConvertedEventLog[] = queryEventLogRows(
    rows,
    cellValues,
    query,
  ).map((rowIndex) => rows[rowIndex]);
  return await eventLogsCsv(queriedRows, cellValues, request).blob.text();
}
async function workerCsvText(request: CsvRequest): Promise<string> {
  return await eventLogsCsv(rows, cellValues, request).blob.text();
}

describe("eventLogsCsv and ag-grid", () => {
  const booleans: boolean[] = [false, true];
  const separators: CsvColumnSeparator[] = [",", "\t", "|"];
  test.each(
    booleans.flatMap((skipRowNumber) =>
      separators.flatMap((columnSeparator) =>
        booleans.flatMap((suppressDoubleQuotes) =>
          booleans.map(
            (skipColumnHeaders) =>
              [
                skipRowNumber,
                columnSeparator,
                suppressDoubleQuotes,
                skipColumnHeaders,
              ] as const,
          ),
        ),
      ),
    ),
  )(
    "makes the text of getDataAsCsv for All: skip row number %s, separator %j, no quotes %s, skip headers %s",
    async (...options) => {
      const api = createRealGrid(rows);
      // All ignores the sort, the filter and the hidden columns.
      api.applyColumnState({ state: [{ colId: "args.2.0", sort: "desc" }] });
      api.setGridOption("quickFilterText", "0xaaa");
      api.setColumnGroupOpened("time", false);
      const selectedValues = selectedValuesOf(...options);

      const expected: string = getCsvTextUpTo(api, selectedValues).text;
      expect(await workerCsvText(getCsvRequest(api, selectedValues))).toBe(
        expected,
      );
      expect(expected.split("\r\n").length).toBeGreaterThan(rows.length);
    },
  );

  test.each(
    booleans.flatMap((skipRowNumber) =>
      separators.flatMap((columnSeparator) =>
        booleans.flatMap((suppressDoubleQuotes) =>
          booleans.map(
            (skipColumnHeaders) =>
              [
                skipRowNumber,
                columnSeparator,
                suppressDoubleQuotes,
                skipColumnHeaders,
              ] as const,
          ),
        ),
      ),
    ),
  )(
    "makes the text of getDataAsCsv for Filtered & Sorted: skip row number %s, separator %j, no quotes %s, skip headers %s",
    async (...options) => {
      const api = createRealGrid(rows);
      api.applyColumnState({
        state: [
          { colId: "args.5.0", sort: "desc", sortIndex: 0 },
          { colId: "args.2.0", sort: "asc", sortIndex: 1 },
        ],
      });
      api.setFilterModel({
        logIndex: { filterType: "number", type: "greaterThan", filter: 4 },
      });
      api.setGridOption("quickFilterText", "0xaaa");
      api.setColumnsVisible([eventLogColIds.jsDate], false);
      const selectedValues = selectedValuesOf(...options, "filteredAndSorted");

      const expected: string = getCsvTextUpTo(api, selectedValues).text;
      expect(
        await workerCsvTextOfQuery(
          getCsvRequest(api, selectedValues),
          queryOf(api, "0xaaa"),
        ),
      ).toBe(expected);
      // The rows 0, 2 and 4, and not the hidden column.
      const lines: string[] = expected.split("\r\n");
      expect(lines.length).toBe(options[3] ? 3 : 6);
      expect(expected).not.toContain("2020-01-02");
    },
  );

  test.each([
    [
      "a text filter",
      { "args.7.0": { filterType: "text", type: "contains", filter: "a" } },
      "",
    ],
    ["no filter", {}, "0xabc"],
    ["two words of the quick search", {}, "0xabc 1"],
    [
      "a filter of no rows",
      { blockNumber: { filterType: "text", type: "equals", filter: "1" } },
      "",
    ],
  ])(
    "makes the text of getDataAsCsv for Filtered & Sorted with %s",
    async (_, filterModel, quickSearch) => {
      const api = createRealGrid(rows);
      api.applyColumnState({ state: [{ colId: "blockNumber", sort: "asc" }] });
      api.setFilterModel(filterModel);
      api.setGridOption("quickFilterText", quickSearch);
      const selectedValues = selectedValuesOf(
        false,
        ",",
        false,
        false,
        "filteredAndSorted",
      );

      expect(
        await workerCsvTextOfQuery(
          getCsvRequest(api, selectedValues),
          queryOf(api, quickSearch),
        ),
      ).toBe(getCsvTextUpTo(api, selectedValues).text);
    },
  );

  test("has the rows of the column groups and the column headers", async () => {
    const api = createRealGrid(rows);
    const lines: string[] = (
      await workerCsvText(
        getCsvRequest(api, selectedValuesOf(false, ",", true, false)),
      )
    ).split("\r\n");
    expect(lines.slice(0, 3)).toEqual([
      ",time,,args,,,,,,,,,,transaction,,log,",
      ",,,args[0],args[1],,args[2],args[3],args[4],,args[5],args[6],args[7],,,,",
      "#,blocknumber,datetime,from,owners[0],owners[1],amount,,amounts[0],amounts[1],ok,data,name,transaction index,transaction hash,log index,removed",
    ]);
  });

  test("numbers the rows and goes on across the chunks", async () => {
    const manyRows: ConvertedEventLog[] = Array.from(
      { length: EVENT_LOGS_CSV_CHUNK_SIZE + 1 },
      (_, index) => rows[index % rows.length],
    );
    const api = createRealGrid(manyRows);
    const selectedValues = selectedValuesOf(false, ",", false, false);
    const request: CsvRequest = getCsvRequest(api, selectedValues);

    const { blob, rowCount, totalRowCount } = eventLogsCsv(
      manyRows,
      cellValues,
      request,
    );
    const text: string = await blob.text();
    expect(text).toBe(getCsvTextUpTo(api, selectedValues).text);
    expect([rowCount, totalRowCount]).toEqual([
      manyRows.length,
      manyRows.length,
    ]);
    expect(text.endsWith("\r\n")).toBe(false);
    // The same text in one chunk.
    expect(
      await eventLogsCsv(manyRows, cellValues, request, Infinity).blob.text(),
    ).toBe(text);
  }, 60_000);
});

describe("eventLogsCsv", () => {
  const request: CsvRequest = {
    columns: [{ colId: "rowSequenceNumber", headerName: "#", groups: [] }],
    columnSeparator: ",",
    suppressQuotes: true,
    skipColumnHeaders: true,
  };

  test.each([
    // [rows, maxRows, rowCount]
    [9, 8, 8],
    [8, 8, 8],
    [7, 8, 7],
  ])(
    "takes the first rows: %i rows, up to %i",
    async (length, maxRows, rowCount) => {
      const result = eventLogsCsv(rows.slice(0, length), cellValues, {
        ...request,
        maxRows,
      });
      expect(await result.blob.text()).toBe(
        Array.from({ length: rowCount }, (_, index) => index + 1).join("\r\n"),
      );
      expect([result.rowCount, result.totalRowCount]).toEqual([
        rowCount,
        length,
      ]);
    },
  );

  test("puts a line between the chunks, not after the last", async () => {
    const result = eventLogsCsv(rows.slice(0, 5), cellValues, request, 2);
    expect(await result.blob.text()).toBe("1\r\n2\r\n3\r\n4\r\n5");
  });

  test("gives the headers only, and nothing without them", async () => {
    const withHeaders = { ...request, skipColumnHeaders: false };
    expect(await eventLogsCsv([], cellValues, withHeaders).blob.text()).toBe(
      "#",
    );
    expect(await eventLogsCsv([], cellValues, request).blob.text()).toBe("");
  });

  test("gives no text for a column that the rows do not have", async () => {
    const result = eventLogsCsv(rows.slice(0, 2), cellValues, {
      ...request,
      columns: [
        { colId: "args.1.5", headerName: "owners[5]", groups: [] },
        { colId: "blockNumber", headerName: "blocknumber", groups: [] },
      ],
    });
    expect(await result.blob.text()).toBe(",100\r\n,'-");
  });
});
