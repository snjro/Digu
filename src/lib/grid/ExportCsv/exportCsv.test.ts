import {
  AllCommunityModule,
  createGrid,
  ModuleRegistry,
  type CsvExportParams,
  type GridApi,
  type ProcessCellForExportParams,
} from "ag-grid-community";
import { describe, expect, test, vi } from "vitest";
import {
  ColIdRowSequenceNumber,
  getColumnDefs,
} from "../GridBody/getColumnDefs";
import {
  downloadCsvFile,
  exportCsvFile,
  getCsvText,
  type CsvColumnSeparator,
  type CsvFilteredSorted,
  type CsvSelectedValues,
} from "./exportCsv";

function createGridApi(colIds: string[] | undefined) {
  const gridApi = {
    getColumns: vi.fn(() =>
      colIds?.map((colId) => ({ getColId: () => colId })),
    ),
    exportDataAsCsv: vi.fn(),
    getDataAsCsv: vi.fn(() => "csv text"),
  };
  return gridApi as typeof gridApi & GridApi;
}

const COL_IDS: string[] = [ColIdRowSequenceNumber, "name", "value"];

describe("exportCsvFile", () => {
  test("with a file name: exports the file and returns nothing", () => {
    const gridApi = createGridApi(COL_IDS);
    const result = exportCsvFile(
      gridApi,
      false,
      ",",
      false,
      "all",
      false,
      "file.csv",
    );
    expect(result).toBeUndefined();
    expect(gridApi.getDataAsCsv).not.toHaveBeenCalled();
    expect(gridApi.exportDataAsCsv).toHaveBeenCalledWith({
      columnKeys: [ColIdRowSequenceNumber, "name", "value"],
      columnSeparator: ",",
      suppressQuotes: false,
      exportedRows: "all",
      skipColumnHeaders: false,
      skipColumnGroupHeaders: false,
      fileName: "file.csv",
      processCellCallback: expect.any(Function),
    });
  });
  test("without a file name: returns the CSV text", () => {
    const gridApi = createGridApi(COL_IDS);
    const result = exportCsvFile(
      gridApi,
      false,
      `\t`,
      true,
      "filteredAndSorted",
      true,
    );
    expect(result).toBe("csv text");
    expect(gridApi.exportDataAsCsv).not.toHaveBeenCalled();
    expect(gridApi.getDataAsCsv).toHaveBeenCalledWith({
      columnKeys: [ColIdRowSequenceNumber, "name", "value"],
      columnSeparator: `\t`,
      suppressQuotes: true,
      exportedRows: "filteredAndSorted",
      skipColumnHeaders: true,
      skipColumnGroupHeaders: true,
      fileName: undefined,
      processCellCallback: expect.any(Function),
    });
  });
  test("with an empty file name: returns the CSV text", () => {
    const gridApi = createGridApi(COL_IDS);
    const result = exportCsvFile(gridApi, false, ",", false, "all", false, "");
    expect(result).toBe("csv text");
    expect(gridApi.exportDataAsCsv).not.toHaveBeenCalled();
  });
  test.each([
    [ColIdRowSequenceNumber, "name", "value"],
    ["name", ColIdRowSequenceNumber, "value"],
    ["name", "value", ColIdRowSequenceNumber],
  ])(
    "skipRowNumber: removes the row number column (%s, %s, %s)",
    (...colIds) => {
      const gridApi = createGridApi(colIds);
      exportCsvFile(gridApi, true, "|", false, "all", false);
      expect(gridApi.getDataAsCsv).toHaveBeenCalledWith(
        expect.objectContaining({ columnKeys: ["name", "value"] }),
      );
    },
  );
  test("no columns: columnKeys is undefined", () => {
    for (const skipRowNumber of [true, false]) {
      const gridApi = createGridApi(undefined);
      exportCsvFile(gridApi, skipRowNumber, ",", false, "all", false);
      expect(gridApi.getDataAsCsv).toHaveBeenCalledWith(
        expect.objectContaining({ columnKeys: undefined }),
      );
    }
  });
});

const SELECTED_VALUES: CsvSelectedValues = {
  skipRowNumber: { selectedValue: true },
  columnSeparator: { selectedValue: "|" },
  suppressDoubleQuotes: { selectedValue: true },
  skipColumnHeaders: { selectedValue: false },
  filteredSorted: { selectedValue: "filteredAndSorted" },
};

describe("downloadCsvFile", () => {
  test("passes the selected values and the file name", () => {
    const gridApi = createGridApi(COL_IDS);
    downloadCsvFile(gridApi, SELECTED_VALUES, "file.csv");
    expect(gridApi.getDataAsCsv).not.toHaveBeenCalled();
    expect(gridApi.exportDataAsCsv).toHaveBeenCalledWith({
      columnKeys: ["name", "value"],
      columnSeparator: "|",
      suppressQuotes: true,
      exportedRows: "filteredAndSorted",
      skipColumnHeaders: false,
      skipColumnGroupHeaders: false,
      fileName: "file.csv",
      processCellCallback: expect.any(Function),
    });
  });
});

describe("getCsvText", () => {
  test("passes the selected values and returns the CSV text", () => {
    const gridApi = createGridApi(COL_IDS);
    const result: string = getCsvText(gridApi, {
      ...SELECTED_VALUES,
      skipRowNumber: { selectedValue: false },
      skipColumnHeaders: { selectedValue: true },
    });
    expect(result).toBe("csv text");
    expect(gridApi.exportDataAsCsv).not.toHaveBeenCalled();
    expect(gridApi.getDataAsCsv).toHaveBeenCalledWith({
      columnKeys: [ColIdRowSequenceNumber, "name", "value"],
      columnSeparator: "|",
      suppressQuotes: true,
      exportedRows: "filteredAndSorted",
      skipColumnHeaders: true,
      skipColumnGroupHeaders: true,
      fileName: undefined,
      processCellCallback: expect.any(Function),
    });
  });
});

function getProcessCellCallback(
  suppressQuotes: boolean,
  columnSeparator: CsvColumnSeparator = ",",
) {
  const gridApi = createGridApi(COL_IDS);
  exportCsvFile(gridApi, false, columnSeparator, suppressQuotes, "all", false);
  const [params] = gridApi.getDataAsCsv.mock.calls[0] as unknown as [
    CsvExportParams,
  ];
  return params.processCellCallback!;
}

function cellParams(
  colId: string,
  value: unknown,
  formatValue: (value: unknown) => unknown = (value) => value,
) {
  return {
    column: { getColId: () => colId },
    value,
    formatValue,
  } as unknown as ProcessCellForExportParams;
}

describe("processCellCallback", () => {
  test("numbers the rows in the exported order", () => {
    const callback = getProcessCellCallback(false);
    // The value comes from rowIndex, which is the position on the screen.
    const numbers = [5, 1, 1].map((value) =>
      callback(cellParams(ColIdRowSequenceNumber, value)),
    );
    expect(numbers).toEqual(["1", "2", "3"]);
  });
  test("starts the row numbers from 1 on each export", () => {
    getProcessCellCallback(false)(cellParams(ColIdRowSequenceNumber, 1));
    const callback = getProcessCellCallback(false);
    expect(callback(cellParams(ColIdRowSequenceNumber, 9))).toBe("1");
  });
  test("formats the other columns like the export without it", () => {
    const callback = getProcessCellCallback(false);
    expect(callback(cellParams("name", "abc", (v) => `<${v}>`))).toBe("<abc>");
    expect(callback(cellParams("name", 12))).toBe("12");
    expect(callback(cellParams("name", true))).toBe("true");
    expect(callback(cellParams("name", null))).toBe("");
  });
  test("exports bigint values without digit grouping", () => {
    const callback = getProcessCellCallback(false);
    const toLocaleString = (v: unknown) => (v as bigint).toLocaleString("en");
    expect(callback(cellParams("value", 1234567n, toLocaleString))).toBe(
      "1234567",
    );
    expect(callback(cellParams("value", -1234n, toLocaleString))).toBe("-1234");
  });
  test.each(["=1+2", "+1", "-1", "@SUM(A1)", "\tx", "\rx", "-"])(
    "puts ' before a string that a spreadsheet reads as a formula: %j",
    (value) => {
      const callback = getProcessCellCallback(false);
      expect(callback(cellParams("name", value))).toBe(`'${value}`);
    },
  );
  test("leaves the other strings and numbers as they are", () => {
    const callback = getProcessCellCallback(false);
    expect(callback(cellParams("name", "a=b"))).toBe("a=b");
    expect(callback(cellParams("name", " =a"))).toBe(" =a");
    expect(callback(cellParams("name", -1))).toBe("-1");
  });
  test.each([
    [",", "a,b", '"a,b"'],
    [",", "a|b", "a|b"],
    ["|", "a|b", '"a|b"'],
    [`\t`, "a\tb", '"a\tb"'],
    [",", "a\nb", '"a\nb"'],
    [",", "a\r\nb", '"a\r\nb"'],
    [",", 'say "hi"', '"say ""hi"""'],
    [",", "abc", "abc"],
  ] as [CsvColumnSeparator, string, string][])(
    "without double quotes: quotes a value that breaks the row (%j, %j)",
    (columnSeparator, value, expected) => {
      const callback = getProcessCellCallback(true, columnSeparator);
      expect(callback(cellParams("name", value))).toBe(expected);
    },
  );
  test("with double quotes: leaves the quoting to ag-grid", () => {
    const callback = getProcessCellCallback(false);
    expect(callback(cellParams("name", 'a,"b"'))).toBe('a,"b"');
  });
  test("without double quotes: quotes a formula value after the '", () => {
    const callback = getProcessCellCallback(true);
    expect(callback(cellParams("name", "=a,b"))).toBe(`"'=a,b"`);
  });
});

describe("with ag-grid", () => {
  type Row = { name: string; amount: bigint; tags: string[] };
  const rows: Row[] = [
    { name: "b", amount: 1234n, tags: ["x", "y"] },
    { name: "a", amount: 5n, tags: [] },
    { name: "=c", amount: 67890n, tags: ["z"] },
  ];
  function createRealGrid() {
    ModuleRegistry.registerModules([AllCommunityModule]);
    const element = document.createElement("div");
    document.body.append(element);
    return createGrid<Row>(element, {
      columnDefs: getColumnDefs([
        { field: "name" },
        {
          field: "amount",
          valueFormatter: (params) =>
            (params.value as bigint).toLocaleString("en"),
        },
        { field: "tags" },
      ]),
      rowData: rows,
    });
  }
  const selectedValues = (
    filteredSorted: CsvFilteredSorted,
  ): CsvSelectedValues => ({
    skipRowNumber: { selectedValue: false },
    columnSeparator: { selectedValue: "," },
    suppressDoubleQuotes: { selectedValue: false },
    skipColumnHeaders: { selectedValue: true },
    filteredSorted: { selectedValue: filteredSorted },
  });

  test("All: numbers the rows in order after sorting and filtering", () => {
    const gridApi = createRealGrid();
    gridApi.applyColumnState({ state: [{ colId: "name", sort: "desc" }] });
    gridApi.setGridOption("quickFilterText", "a");
    expect(getCsvText(gridApi, selectedValues("all"))).toBe(
      ['"1","b","1234","x,y"', '"2","a","5",""', `"3","'=c","67890","z"`].join(
        "\r\n",
      ),
    );
    gridApi.destroy();
  });
  test("Filtered & Sorted: numbers the shown rows in order", () => {
    const gridApi = createRealGrid();
    gridApi.applyColumnState({ state: [{ colId: "name", sort: "desc" }] });
    gridApi.setGridOption("quickFilterText", "b");
    expect(getCsvText(gridApi, selectedValues("filteredAndSorted"))).toBe(
      '"1","b","1234","x,y"',
    );
    gridApi.destroy();
  });
});
