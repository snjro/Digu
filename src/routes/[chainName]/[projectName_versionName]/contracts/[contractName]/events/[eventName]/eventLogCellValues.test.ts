import { afterEach, describe, expect, test } from "vitest";
import { EventFragment } from "ethers";
import {
  AllCommunityModule,
  createGrid,
  ModuleRegistry,
  type ColDef,
  type GridApi,
} from "ag-grid-community";
import { getColumnDefs } from "#lib/grid/GridBody/getColumnDefs.js";
import {
  getCsvText,
  type CsvSelectedValues,
} from "#lib/grid/ExportCsv/exportCsv.js";
import type { ConvertedEventLog } from "#db/dbTypes.js";
import { columnDefs } from "./columnDefs";
import {
  eventLogCellValues,
  type EventLogCellValues,
} from "./eventLogCellValues";

const fragment: EventFragment = EventFragment.from(
  "event Test(address from, address[] owners, uint256 amount, int256 delta, uint256[] amounts, bool ok, bytes data, string name)",
);
const eachArgsMaxLengths: number[] = [1, 2, 1, 1, 2, 1, 1, 1];
const colIds: string[] = [
  "blockNumber",
  "jsDate",
  "args.0.0",
  "args.1.0",
  "args.1.1",
  "args.2.0",
  "args.3.0",
  "args.4.0",
  "args.4.1",
  "args.5.0",
  "args.6.0",
  "args.7.0",
  "transactionIndex",
  "transactionHash",
  "logIndex",
  "removed",
];
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
// The rows are not in any column's order, and some values are the same.
const rows: ConvertedEventLog[] = [
  eventLog({
    transactionHash: "0xa1",
    args: [
      "0xAbC1",
      ["0xaaa", "0xbbb"],
      2n ** 60n + 1n,
      -5n,
      [1234n, 5n],
      true,
      "0x01ff",
      "=SUM(A1)",
    ],
  }),
  eventLog({
    blockNumber: 0,
    jsDate: new Date(Date.UTC(2020, 0, 2, 3, 4, 5)),
    transactionIndex: 0,
    transactionHash: "" as ConvertedEventLog["transactionHash"],
    logIndex: 10,
    args: ["0xdef", ["0xccc"], 7n, 12n, [6n], false, "0x", ""],
  }),
  eventLog({
    blockNumber: 99,
    jsDate: new Date(Date.UTC(2019, 11, 31, 23, 59, 59)),
    transactionIndex: 12,
    transactionHash: "0xc1",
    logIndex: 1,
    removed: true,
    args: ["0x123", [], 1000n, -1000n, [], true, "0xABCD", "hello world"],
  }),
  eventLog({
    blockNumber: 101,
    jsDate: new Date(Date.UTC(2021, 5, 1, 0, 0, 0)),
    transactionIndex: 2,
    transactionHash: "0xd1",
    logIndex: 2,
    args: [
      "0x456",
      ["0xaaa", "0xddd"],
      7n,
      0n,
      [5n, 1234n],
      false,
      "0x00",
      '-a "quoted", text\nnext',
    ],
  }),
  eventLog({
    blockNumber: 100,
    jsDate: new Date(Date.UTC(2020, 0, 2, 13, 0, 0)),
    transactionIndex: 1,
    transactionHash: "0xe1",
    logIndex: 3,
    args: [
      "0x789",
      ["0xeee", "0xfff"],
      2n ** 60n,
      -5n,
      [7n, 8n],
      true,
      null,
      undefined,
    ],
  }),
];
const values: EventLogCellValues[] = eventLogCellValues(
  fragment,
  eachArgsMaxLengths,
);
function valuesOf(colId: string): EventLogCellValues {
  return values.find((value) => value.colId === colId)!;
}

describe("eventLogCellValues", () => {
  test("should list the columns in the order of the table", () => {
    expect(values.map((value) => value.colId)).toEqual(colIds);
    expect(
      values
        .filter((value) => value.filterType === "number")
        .map((value) => value.colId),
    ).toEqual(["transactionIndex", "logIndex"]);
  });

  test.each([
    // [colId, row, sort value, filter text, CSV text]
    ["blockNumber", 0, 100, "100", "100"],
    // A missing block number is "-", which a spreadsheet reads as a formula.
    ["blockNumber", 1, "-", "-", "'-"],
    ["args.0.0", 0, "0xAbC1", "0xAbC1", "0xAbC1"],
    ["args.1.1", 0, "0xbbb", "0xbbb", "0xbbb"],
    // An array shorter than the columns.
    ["args.1.1", 1, undefined, null, ""],
    // A bigint over 2^53, without the digit grouping.
    [
      "args.2.0",
      0,
      2n ** 60n + 1n,
      "1152921504606846977",
      "1152921504606846977",
    ],
    // A negative bigint is not text, so it has no quote.
    ["args.3.0", 0, -5n, "-5", "-5"],
    ["args.4.0", 0, 1234n, "1234", "1234"],
    ["args.4.1", 2, undefined, null, ""],
    ["args.5.0", 1, false, "false", "false"],
    ["args.6.0", 0, "0x01ff", "0x01ff", "0x01ff"],
    ["args.6.0", 4, null, null, ""],
    ["args.7.0", 0, "=SUM(A1)", "=SUM(A1)", "'=SUM(A1)"],
    ["args.7.0", 1, "", "", ""],
    ["args.7.0", 4, undefined, null, ""],
    ["transactionIndex", 1, 0, "0", "0"],
    ["transactionHash", 0, "0xa1", "0xa1", "0xa1"],
    ["transactionHash", 1, "-", "-", "'-"],
    ["logIndex", 1, 10, "10", "10"],
    ["removed", 2, true, "true", "true"],
  ] as const)(
    "%s of row %i: sort %s, filter %j, CSV %j",
    (colId, rowIndex, sortValue, filterText, csvText) => {
      const value: EventLogCellValues = valuesOf(colId);
      expect(value.getSortValue(rows[rowIndex])).toEqual(sortValue);
      expect(value.getFilterText(rows[rowIndex])).toBe(filterText);
      expect(value.getCsvText(rows[rowIndex])).toBe(csvText);
    },
  );

  test("should sort the datetime by the date and match it in ISO 8601", () => {
    const datetime: EventLogCellValues = valuesOf("jsDate");
    expect(datetime.getSortValue(rows[2])).toBe(rows[2].jsDate);
    expect(datetime.getFilterText(rows[2])).toBe("2019-12-31T23:59:59Z");
    expect(datetime.getCsvText(rows[2])).toBe("2019-12-31T23:59:59Z");
  });
});

// The grid of the screen, so that a worker can do the same with the values.
describe("eventLogCellValues and ag-grid", () => {
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
    // The same filter and group options as GridBody.
    gridApi = createGrid<ConvertedEventLog>(element, {
      columnDefs: getColumnDefs(columnDefs(fragment, eachArgsMaxLengths)),
      defaultColDef: { sortable: true, filter: true },
      defaultColGroupDef: { openByDefault: true, marryChildren: true },
      suppressFieldDotNotation: true,
      rowData: rows,
    });
    return gridApi;
  }
  function shownRows(gridApi: GridApi<ConvertedEventLog>): number[] {
    const indexes: number[] = [];
    gridApi.forEachNodeAfterFilterAndSort((node) => {
      indexes.push(rows.indexOf(node.data!));
    });
    return indexes;
  }
  function allRows(): number[] {
    return rows.map((_, index) => index);
  }

  test("has the column ids and the filters of the values", async () => {
    const gridApi = createRealGrid();
    expect(gridApi.getColumns()!.map((column) => column.getColId())).toEqual([
      "rowSequenceNumber",
      ...colIds,
    ]);
    for (const value of values) {
      const filter = await gridApi.getColumnFilterInstance(value.colId);
      expect([value.colId, filter?.constructor.name]).toEqual([
        value.colId,
        value.filterType === "number" ? "NumberFilter" : "TextFilter",
      ]);
    }
    // Infinite rows have no type inference.
    for (const colId of ["transactionIndex", "logIndex"]) {
      expect(
        (gridApi.getColumn(colId)!.getColDef() as ColDef).cellDataType,
      ).toBe("number");
    }
  });

  // ag-grid upper-cases the words and the text of each column. Every word
  // must be in the text of one column.
  function quickSearch(text: string): number[] {
    const words: string[] = text.toUpperCase().split(" ");
    return allRows().filter((index) =>
      words.every((word) =>
        values.some((value) =>
          value.getFilterText(rows[index])?.toUpperCase().includes(word),
        ),
      ),
    );
  }
  test.each([
    "0xaaa",
    "1234",
    // The screen groups the digits, but the search does not.
    "1,234",
    "-5",
    "-",
    "1152921504606846977",
    "FALSE",
    "true 0xa1",
    "hello world",
    "2020-01-02T03",
    "GMT",
    "0x",
    "quoted",
  ])("finds the rows by the quick search: %j", (text) => {
    const gridApi = createRealGrid();
    gridApi.setGridOption("quickFilterText", text);
    expect(shownRows(gridApi)).toEqual(quickSearch(text));
  });

  function textFilter(
    value: EventLogCellValues,
    type: "contains" | "notContains",
    filter: string,
  ): number[] {
    return allRows().filter((index) => {
      const text: string | null = value.getFilterText(rows[index]);
      if (text == null) {
        return type === "notContains";
      }
      const contains: boolean = text
        .toLowerCase()
        .includes(filter.toLowerCase());
      return type === "contains" ? contains : !contains;
    });
  }
  const textFilters: [string, string][] = [
    ["blockNumber", "10"],
    ["blockNumber", "-"],
    ["jsDate", "T03:04"],
    ["args.0.0", "abc"],
    ["args.1.1", "0x"],
    ["args.2.0", "7"],
    ["args.3.0", "-"],
    ["args.4.0", "1234"],
    ["args.4.1", "1,234"],
    ["args.5.0", "TRUE"],
    ["args.6.0", "ff"],
    ["args.7.0", "quoted"],
    ["transactionHash", "1"],
    ["removed", "fal"],
  ];
  test.each(
    textFilters.flatMap(([colId, filter]) =>
      (["contains", "notContains"] as const).map(
        (type) => [colId, type, filter] as const,
      ),
    ),
  )(
    "filters the rows by the text filter: %s %s %j",
    async (colId, type, filter) => {
      const gridApi = createRealGrid();
      await gridApi.setColumnFilterModel(colId, {
        filterType: "text",
        type,
        filter,
      });
      gridApi.onFilterChanged();
      expect(shownRows(gridApi)).toEqual(
        textFilter(valuesOf(colId), type, filter),
      );
    },
  );

  test.each([
    ["transactionIndex", 1],
    ["transactionIndex", 0],
    ["logIndex", 2],
  ])("filters the rows by the number filter: %s %i", async (colId, filter) => {
    const gridApi = createRealGrid();
    await gridApi.setColumnFilterModel(colId, {
      filterType: "number",
      type: "equals",
      filter,
    });
    gridApi.onFilterChanged();
    expect(shownRows(gridApi)).toEqual(
      allRows().filter(
        (index) => valuesOf(colId).getSortValue(rows[index]) === filter,
      ),
    );
  });

  // ag-grid's default comparator, on a copy in the order of the rows.
  function compare(a: unknown, b: unknown): number {
    if (a == null) {
      return b == null ? 0 : -1;
    }
    if (b == null) {
      return 1;
    }
    return (a as number) > (b as number)
      ? 1
      : (a as number) < (b as number)
        ? -1
        : 0;
  }
  function sorted(value: EventLogCellValues, sort: "asc" | "desc"): number[] {
    return allRows().sort((a, b) => {
      const result: number = compare(
        value.getSortValue(rows[a]),
        value.getSortValue(rows[b]),
      );
      return sort === "desc" ? -result : result;
    });
  }
  test.each(
    colIds.flatMap((colId) =>
      (["asc", "desc"] as const).map((sort) => [colId, sort] as const),
    ),
  )("sorts the rows: %s %s", (colId, sort) => {
    const gridApi = createRealGrid();
    gridApi.applyColumnState({ state: [{ colId, sort }] });
    expect(shownRows(gridApi)).toEqual(sorted(valuesOf(colId), sort));
  });

  function csvSelectedValues(
    suppressDoubleQuotes: boolean,
    filteredSorted: "all" | "filteredAndSorted",
  ): CsvSelectedValues {
    return {
      skipRowNumber: { selectedValue: true },
      columnSeparator: { selectedValue: "," },
      suppressDoubleQuotes: { selectedValue: suppressDoubleQuotes },
      skipColumnHeaders: { selectedValue: true },
      filteredSorted: { selectedValue: filteredSorted },
    };
  }
  function csv(indexes: number[], quote: (text: string) => string): string {
    return indexes
      .map((index) =>
        values.map((value) => quote(value.getCsvText(rows[index]))).join(","),
      )
      .join("\r\n");
  }
  test("exports the CSV text of the values in quotes", () => {
    const gridApi = createRealGrid();
    expect(getCsvText(gridApi, csvSelectedValues(false, "all"))).toBe(
      csv(allRows(), (text) => '"' + text.replace(/"/g, '""') + '"'),
    );
  });

  test("exports the CSV text of the values without quotes", () => {
    const gridApi = createRealGrid();
    gridApi.applyColumnState({ state: [{ colId: "args.2.0", sort: "desc" }] });
    expect(
      getCsvText(gridApi, csvSelectedValues(true, "filteredAndSorted")),
    ).toBe(
      csv(sorted(valuesOf("args.2.0"), "desc"), (text) =>
        /[,"\r\n]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text,
      ),
    );
  });
});
