import type { GridApi } from "ag-grid-community";
import { describe, expect, test, vi } from "vitest";
import { ColIdRowSequenceNumber } from "../GridBody/getColumnDefs";
import {
  downloadCsvFile,
  exportCsvFile,
  getCsvText,
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
    });
  });
});
