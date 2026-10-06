import { afterEach, describe, expect, test } from "vitest";
import { EventFragment } from "ethers";
import {
  AllCommunityModule,
  createGrid,
  ModuleRegistry,
  type ColumnState,
  type FilterModel,
  type GridApi,
  type SortModelItem,
} from "ag-grid-community";
import { getColumnDefs } from "#lib/grid/GridBody/getColumnDefs.js";
import { columnDefs } from "#routes/[chainName]/[projectName_versionName]/contracts/[contractName]/events/[eventName]/columnDefs.js";
import {
  eventLogCellValues,
  type EventLogCellValues,
} from "#routes/[chainName]/[projectName_versionName]/contracts/[contractName]/events/[eventName]/eventLogCellValues.js";
import type { ConvertedEventLog } from "./dbTypes";
import {
  compareCellValues,
  queryEventLogRows,
  type EventLogsTableQueryModel,
} from "./eventLogsTableQuery";

const fragment: EventFragment = EventFragment.from(
  "event Test(address from, address[] owners, uint256 amount, int256 delta, uint256[] amounts, bool ok, bytes data, string name)",
);
const eachArgsMaxLengths: number[] = [1, 2, 1, 1, 2, 1, 1, 1];
const cellValues: EventLogCellValues[] = eventLogCellValues(
  fragment,
  eachArgsMaxLengths,
);
const colIds: string[] = cellValues.map((values) => values.colId);

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
// Not in the order of any column. Some values are the same, some are missing,
// and a block number of 0 is "-", which is neither less than nor greater than
// a number.
const rows: ConvertedEventLog[] = [
  eventLog({
    blockNumber: 105,
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
    blockNumber: 0,
    jsDate: new Date(Date.UTC(2020, 0, 2, 13, 0, 0)),
    transactionIndex: undefined,
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
  eventLog({
    blockNumber: 100,
    transactionIndex: 1,
    transactionHash: "0xf1",
    logIndex: 4,
    args: ["0xabc1", ["0xaaa"], 7n, 3n, [1n], false, "0x01", "   "],
  }),
  eventLog({
    blockNumber: 103,
    jsDate: new Date(Date.UTC(2020, 0, 2, 13, 0, 0)),
    transactionIndex: 5,
    transactionHash: "0xa2",
    logIndex: 0,
    args: [
      "0x999",
      ["0xbbb", "0xaaa"],
      1000n,
      12n,
      [6n, 6n],
      true,
      "0x",
      "Hello",
    ],
  }),
  eventLog({
    blockNumber: 0,
    transactionIndex: 3,
    transactionHash: "0xb2",
    logIndex: 7,
    args: ["0x000", [], 0n, 0n, [], false, "0xff", "world"],
  }),
  eventLog({
    blockNumber: 98,
    jsDate: new Date(Date.UTC(2018, 2, 3, 4, 5, 6)),
    transactionIndex: 12,
    transactionHash: "0xc2",
    logIndex: 2,
    args: [
      "0xAbC1",
      ["0xaaa", "0xbbb"],
      5n,
      -6n,
      [0n, 1n],
      true,
      "0x01ff",
      "name",
    ],
  }),
  eventLog({
    blockNumber: 104,
    transactionIndex: null as unknown as number,
    transactionHash: "0xd2",
    logIndex: 2,
    args: ["0x456", ["0xddd"], 2n ** 60n, 1n, [5n], false, "0x00", "-"],
  }),
  eventLog({
    blockNumber: 102,
    jsDate: new Date(Date.UTC(2021, 5, 1, 0, 0, 0)),
    transactionIndex: 2,
    transactionHash: "0xe2",
    logIndex: 9,
    args: [
      "0x123",
      ["0xccc", "0xaaa"],
      7n,
      -5n,
      [8n, 9n],
      true,
      "0xabcd",
      "HELLO WORLD",
    ],
  }),
  eventLog({
    blockNumber: 0,
    transactionIndex: 4,
    transactionHash: "0xf2",
    logIndex: 5,
    args: ["0xdef", ["0xfff"], 999n, 4n, [3n], true, "0x02", "quoted"],
  }),
];

// The same rows in another order, which moves the rows of "-" in ag-grid.
const rowSets: [string, ConvertedEventLog[]][] = [
  ["rows", rows],
  ["reversed rows", [...rows].reverse()],
];

let element: HTMLElement | undefined;
let gridApi: GridApi<ConvertedEventLog> | undefined;
afterEach(() => {
  gridApi?.destroy();
  element?.remove();
  gridApi = undefined;
  element = undefined;
});
// As the grid of the screen: the same filter and group options as GridBody.
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
function shownRows(
  gridApi: GridApi<ConvertedEventLog>,
  rowData: ConvertedEventLog[],
): number[] {
  const indexes: number[] = [];
  gridApi.forEachNodeAfterFilterAndSort((node) => {
    indexes.push(rowData.indexOf(node.data!));
  });
  return indexes;
}
// The query of the grid, as the Infinite Row Model gives it to getRows.
function queryModelOf(
  gridApi: GridApi<ConvertedEventLog>,
): EventLogsTableQueryModel {
  const sortModel: SortModelItem[] = gridApi
    .getColumnState()
    .filter((state: ColumnState) => state.sort)
    .sort((a, b) => (a.sortIndex ?? 0) - (b.sortIndex ?? 0))
    .map((state) => ({ colId: state.colId, sort: state.sort! }));
  return {
    sortModel,
    filterModel: gridApi.getFilterModel(),
    quickSearch: gridApi.getGridOption("quickFilterText") ?? "",
  };
}
// The rows of the grid and of the query are the same, and the query gives
// some rows.
async function expectSameRows(
  rowData: ConvertedEventLog[],
  setUp: (gridApi: GridApi<ConvertedEventLog>) => void | Promise<void>,
): Promise<number[]> {
  const gridApi = createRealGrid(rowData);
  await setUp(gridApi);
  gridApi.onFilterChanged();
  const expected: number[] = shownRows(gridApi, rowData);
  expect(queryEventLogRows(rowData, cellValues, queryModelOf(gridApi))).toEqual(
    expected,
  );
  return expected;
}
function sortBy(
  gridApi: GridApi<ConvertedEventLog>,
  sorts: [string, "asc" | "desc"][],
): void {
  gridApi.applyColumnState({
    state: sorts.map(([colId, sort], sortIndex) => ({
      colId,
      sort,
      sortIndex,
    })),
    defaultState: { sort: null },
  });
}

describe("compareCellValues", () => {
  test.each([
    [null, undefined, 0],
    [null, 0, -1],
    [0, undefined, 1],
    [1n, 2n, -1],
    [2n ** 60n, 2n ** 60n, 0],
    ["b", "a", 1],
    [new Date(2), new Date(1), 1],
    // Neither less than nor greater than a number.
    ["-", 100, 0],
    [100, "-", 0],
  ])("compares %s and %s as ag-grid: %i", (a, b, expected) => {
    expect(compareCellValues(a, b)).toBe(expected);
  });
});

describe.each(rowSets)("queryEventLogRows and ag-grid on %s", (_, rowData) => {
  test("gives all the rows in their order without a query", async () => {
    expect(await expectSameRows(rowData, () => {})).toEqual(
      rowData.map((_, index) => index),
    );
  });

  test.each(
    colIds.flatMap((colId) =>
      (["asc", "desc"] as const).map((sort) => [colId, sort] as const),
    ),
  )("sorts by %s %s", async (colId, sort) => {
    await expectSameRows(rowData, (gridApi) =>
      sortBy(gridApi, [[colId, sort]]),
    );
  });

  test.each([
    [
      [
        ["blockNumber", "asc"],
        ["logIndex", "desc"],
      ],
    ],
    [
      [
        ["blockNumber", "desc"],
        ["args.2.0", "asc"],
      ],
    ],
    [
      [
        ["removed", "desc"],
        ["jsDate", "asc"],
        ["transactionHash", "desc"],
      ],
    ],
    [
      [
        ["args.5.0", "asc"],
        ["args.3.0", "desc"],
        ["blockNumber", "asc"],
      ],
    ],
    [
      [
        ["transactionIndex", "asc"],
        ["blockNumber", "desc"],
      ],
    ],
    [
      [
        ["args.7.0", "desc"],
        ["args.4.1", "asc"],
      ],
    ],
  ] as [string, "asc" | "desc"][][][])(
    "sorts by more than one column: %j",
    async (sorts) => {
      await expectSameRows(rowData, (gridApi) => sortBy(gridApi, sorts));
    },
  );

  const textTypes = [
    "contains",
    "notContains",
    "equals",
    "notEqual",
    "startsWith",
    "endsWith",
  ] as const;
  const textFilters: [string, string][] = [
    ["blockNumber", "10"],
    ["blockNumber", "-"],
    ["jsDate", "2020-01-02T13:00:00Z"],
    ["jsDate", "T03:04"],
    ["args.0.0", "0xabc1"],
    ["args.1.1", "0xA"],
    ["args.2.0", "7"],
    ["args.2.0", "1152921504606846976"],
    ["args.3.0", "-5"],
    ["args.4.1", "1,234"],
    ["args.5.0", "TRUE"],
    ["args.6.0", "0x"],
    ["args.7.0", "hello"],
    ["args.7.0", " "],
    ["transactionHash", "0xa"],
    ["removed", "false"],
  ];
  test.each(
    textFilters.flatMap(([colId, filter]) =>
      textTypes.map((type) => [colId, type, filter] as const),
    ),
  )("filters by the text filter: %s %s %j", async (colId, type, filter) => {
    await expectSameRows(rowData, (gridApi) =>
      gridApi.setColumnFilterModel(colId, { filterType: "text", type, filter }),
    );
  });

  test.each(
    [
      "blockNumber",
      "transactionHash",
      "args.1.1",
      "args.6.0",
      "args.7.0",
    ].flatMap((colId) =>
      (["blank", "notBlank"] as const).map((type) => [colId, type]),
    ),
  )("filters by the text filter: %s %s", async (colId, type) => {
    await expectSameRows(rowData, (gridApi) =>
      gridApi.setColumnFilterModel(colId, { filterType: "text", type }),
    );
  });

  test.each(textTypes)(
    "filters by the text filter %s with no text",
    async (type) => {
      await expectSameRows(rowData, (gridApi) =>
        gridApi.setColumnFilterModel("args.7.0", {
          filterType: "text",
          type,
          filter: "",
        }),
      );
    },
  );

  test.each([
    [
      "AND",
      { type: "contains", filter: "0x" },
      { type: "notContains", filter: "ff" },
    ],
    [
      "OR",
      { type: "startsWith", filter: "0xa" },
      { type: "endsWith", filter: "cd" },
    ],
    ["OR", { type: "blank" }, { type: "equals", filter: "0X00" }],
  ] as const)(
    "filters by two text conditions with %s: %j %j",
    async (operator, condition1, condition2) => {
      await expectSameRows(rowData, (gridApi) =>
        gridApi.setColumnFilterModel("args.6.0", {
          filterType: "text",
          operator,
          conditions: [
            { filterType: "text", ...condition1 },
            { filterType: "text", ...condition2 },
          ],
        }),
      );
    },
  );

  const numberTypes = [
    "equals",
    "notEqual",
    "greaterThan",
    "greaterThanOrEqual",
    "lessThan",
    "lessThanOrEqual",
  ] as const;
  test.each(
    ["transactionIndex", "logIndex"].flatMap((colId) =>
      numberTypes.flatMap((type) =>
        [0, 2, 12].map((filter) => [colId, type, filter] as const),
      ),
    ),
  )("filters by the number filter: %s %s %i", async (colId, type, filter) => {
    await expectSameRows(rowData, (gridApi) =>
      gridApi.setColumnFilterModel(colId, {
        filterType: "number",
        type,
        filter,
      }),
    );
  });

  test.each([
    ["transactionIndex", 1, 5],
    ["transactionIndex", 0, 12],
    ["logIndex", 2, 9],
    ["logIndex", 9, 2],
  ])(
    "filters by the number filter inRange without the ends: %s %i %i",
    async (colId, filter, filterTo) => {
      await expectSameRows(rowData, (gridApi) =>
        gridApi.setColumnFilterModel(colId, {
          filterType: "number",
          type: "inRange",
          filter,
          filterTo,
        }),
      );
    },
  );

  test.each(
    ["transactionIndex", "logIndex"].flatMap((colId) =>
      (["blank", "notBlank"] as const).map((type) => [colId, type]),
    ),
  )("filters by the number filter: %s %s", async (colId, type) => {
    await expectSameRows(rowData, (gridApi) =>
      gridApi.setColumnFilterModel(colId, { filterType: "number", type }),
    );
  });

  test.each([
    [
      "AND",
      { type: "greaterThan", filter: 0 },
      { type: "lessThan", filter: 5 },
    ],
    ["OR", { type: "equals", filter: 12 }, { type: "blank" }],
  ] as const)(
    "filters by two number conditions with %s: %j %j",
    async (operator, condition1, condition2) => {
      await expectSameRows(rowData, (gridApi) =>
        gridApi.setColumnFilterModel("transactionIndex", {
          filterType: "number",
          operator,
          conditions: [
            { filterType: "number", ...condition1 },
            { filterType: "number", ...condition2 },
          ],
        }),
      );
    },
  );

  test.each([
    "0xaaa",
    "hello",
    "HELLO WORLD",
    // Each word in a column of its own.
    "0xabc1 true",
    "0xaaa 1234 false",
    // Two spaces make an empty word.
    "0xaaa  0xbbb",
    // A bigint over 2^53, without the digit grouping of the screen.
    "1152921504606846977",
    "1,234",
    "-5",
    "-",
    // The datetime is matched in ISO 8601.
    "2020-01-02T13:00",
    "2021-06-01T00:00:00Z",
    "GMT",
    "no such text",
  ])("finds the rows by the quick search: %j", async (text) => {
    await expectSameRows(rowData, (gridApi) =>
      gridApi.setGridOption("quickFilterText", text),
    );
  });

  test("sorts the rows that the filters and the quick search leave", async () => {
    const expected: number[] = await expectSameRows(
      rowData,
      async (gridApi) => {
        gridApi.setGridOption("quickFilterText", "0x");
        await gridApi.setColumnFilterModel("logIndex", {
          filterType: "number",
          type: "lessThan",
          filter: 9,
        });
        await gridApi.setColumnFilterModel("args.5.0", {
          filterType: "text",
          type: "notEqual",
          filter: "true",
        });
        sortBy(gridApi, [
          ["blockNumber", "desc"],
          ["args.2.0", "asc"],
        ]);
      },
    );
    expect(expected.length).toBeGreaterThan(1);
    expect(expected.length).toBeLessThan(rowData.length);
  });
});

test("puts the rows of '-' where ag-grid does, which depends on the order of the rows", async () => {
  // Check that the rows test what they should: the sort by the block number
  // moves the rows of "-" with the order of the rows.
  const positionsOfDash = (rowData: ConvertedEventLog[]): number[] => {
    const sorted: number[] = queryEventLogRows(rowData, cellValues, {
      sortModel: [{ colId: "blockNumber", sort: "asc" }],
      filterModel: {},
      quickSearch: "",
    });
    return sorted
      .map((rowIndex, position) => [rowData[rowIndex].blockNumber, position])
      .filter(([blockNumber]) => blockNumber === 0)
      .map(([, position]) => position);
  };
  expect(positionsOfDash(rowSets[0][1])).not.toEqual(
    positionsOfDash(rowSets[1][1]),
  );
});

// Array.prototype.sort takes other steps for a long array than for a short one.
describe("queryEventLogRows and ag-grid on many rows", () => {
  // The same rows on each run: many same values and many rows of "-".
  let seed: number = 7;
  const random = (count: number): number => {
    seed = (seed * 1103515245 + 12345) % 2 ** 31;
    return seed % count;
  };
  const manyRows: ConvertedEventLog[] = Array.from({ length: 300 }, () =>
    eventLog({
      blockNumber: random(8) === 0 ? 0 : 100 + random(20),
      transactionIndex: random(5),
      logIndex: random(4),
      args: [
        `0x${random(6)}`,
        [],
        BigInt(random(10)),
        BigInt(random(3) - 1),
        [],
        random(2) === 0,
        "0x",
        "",
      ],
    }),
  );

  test.each([
    [[["blockNumber", "asc"]]],
    [[["blockNumber", "desc"]]],
    [
      [
        ["args.2.0", "desc"],
        ["blockNumber", "asc"],
      ],
    ],
    [
      [
        ["logIndex", "asc"],
        ["blockNumber", "desc"],
        ["args.0.0", "asc"],
      ],
    ],
  ] as [string, "asc" | "desc"][][][])("sorts by %j", async (sorts) => {
    await expectSameRows(manyRows, (gridApi) => sortBy(gridApi, sorts));
  });
});

test("ignores a column that the table does not have", () => {
  const model: EventLogsTableQueryModel = {
    sortModel: [{ colId: "noSuchColumn", sort: "desc" }],
    filterModel: {
      noSuchColumn: { filterType: "text", type: "equals", filter: "x" },
    } as FilterModel,
    quickSearch: "",
  };
  expect(queryEventLogRows(rows, cellValues, model)).toEqual(
    rows.map((_, index) => index),
  );
});
