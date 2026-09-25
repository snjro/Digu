import type {
  Column,
  CsvExportParams,
  GridApi,
  ProcessCellForExportParams,
} from "ag-grid-community";
import { ColIdRowSequenceNumber } from "../GridBody/getColumnDefs";

export type CsvColumnSeparator = "," | `\t` | "|";
export type CsvFilteredSorted = "all" | "filteredAndSorted";

// The radio props of the dialog (ExportCsvRadioProps) are built from this.
export type CsvSelectedValues = {
  skipRowNumber: { selectedValue: boolean };
  columnSeparator: { selectedValue: CsvColumnSeparator };
  suppressDoubleQuotes: { selectedValue: boolean };
  skipColumnHeaders: { selectedValue: boolean };
  filteredSorted: { selectedValue: CsvFilteredSorted };
};

export function downloadCsvFile(
  gridApi: GridApi,
  selectedValues: CsvSelectedValues,
  fileName: string,
): void {
  exportCsvFile(
    gridApi,
    selectedValues.skipRowNumber.selectedValue,
    selectedValues.columnSeparator.selectedValue,
    selectedValues.suppressDoubleQuotes.selectedValue,
    selectedValues.filteredSorted.selectedValue,
    selectedValues.skipColumnHeaders.selectedValue,
    fileName,
  );
}
export function getCsvText(
  gridApi: GridApi,
  selectedValues: CsvSelectedValues,
): string {
  return exportCsvFile(
    gridApi,
    selectedValues.skipRowNumber.selectedValue,
    selectedValues.columnSeparator.selectedValue,
    selectedValues.suppressDoubleQuotes.selectedValue,
    selectedValues.filteredSorted.selectedValue,
    selectedValues.skipColumnHeaders.selectedValue,
  ) as string;
}

export function exportCsvFile(
  gridApi: GridApi,
  skipRowNumber: boolean,
  columnSeparator: CsvColumnSeparator,
  suppressQuotes: boolean,
  filteredAndSorted: CsvFilteredSorted,
  skipColumnHeaders: boolean,
  fileName: string | undefined = undefined,
): void | string {
  const csvExportParams: CsvExportParams = getParamsForCsv(
    gridApi,
    skipRowNumber,
    columnSeparator,
    suppressQuotes,
    filteredAndSorted,
    skipColumnHeaders,
    fileName,
  );
  if (fileName) {
    gridApi.exportDataAsCsv(csvExportParams);
  } else {
    return gridApi.getDataAsCsv(csvExportParams);
  }
}
function getParamsForCsv(
  gridApi: GridApi,
  skipRowNumber: boolean,
  columnSeparator: CsvColumnSeparator,
  suppressQuotes: boolean,
  filteredAndSorted: CsvFilteredSorted,
  skipColumnHeaders: boolean,
  fileName: string | undefined = undefined,
): CsvExportParams {
  // Filtered & Sorted follows the screen: the shown columns in the shown order.
  const columns: Column[] | null | undefined =
    filteredAndSorted === "filteredAndSorted"
      ? gridApi?.getAllDisplayedColumns()
      : gridApi?.getColumns();
  const targetColIds: string[] | undefined = columns?.map((column: Column) => {
    return column.getColId();
  });

  if (skipRowNumber && targetColIds) {
    const indexOfRowNumber: number = targetColIds.indexOf(
      ColIdRowSequenceNumber,
    );
    // The shown columns may not have it.
    if (indexOfRowNumber !== -1) {
      targetColIds.splice(indexOfRowNumber, 1);
    }
  }
  const csvExportParams: CsvExportParams = {
    columnKeys: targetColIds,
    columnSeparator: columnSeparator,
    suppressQuotes: suppressQuotes,
    exportedRows: filteredAndSorted,
    skipColumnHeaders: skipColumnHeaders,
    skipColumnGroupHeaders: skipColumnHeaders,
    fileName: fileName,
    processCellCallback: getProcessCellCallback(
      columnSeparator,
      suppressQuotes,
    ),
  };
  return csvExportParams;
}

// A spreadsheet reads a cell that starts with one of these as a formula.
const FORMULA_START = /^[=+\-@\t\r]/;

// With this callback, ag-grid no longer formats the values, so it calls formatValue.
function getProcessCellCallback(
  columnSeparator: CsvColumnSeparator,
  suppressQuotes: boolean,
): (params: ProcessCellForExportParams) => string {
  // rowIndex is the position on the screen, and a hidden row has none, so
  // number the rows in the exported order.
  let rowNumber: number = 0;
  return (params: ProcessCellForExportParams): string => {
    if (params.column.getColId() === ColIdRowSequenceNumber) {
      rowNumber++;
      return String(rowNumber);
    }
    // Without the digit grouping of the screen, which may be the separator.
    const formattedValue: unknown =
      typeof params.value === "bigint"
        ? params.value.toString()
        : params.formatValue(params.value);
    let text: string = formattedValue == null ? "" : String(formattedValue);
    if (typeof params.value === "string" && FORMULA_START.test(text)) {
      text = "'" + text;
    }
    if (
      suppressQuotes &&
      (text.includes(columnSeparator) || /["\r\n]/.test(text))
    ) {
      text = '"' + text.replace(/"/g, '""') + '"';
    }
    return text;
  };
}
