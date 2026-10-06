import type {
  Column,
  CsvExportParams,
  GridApi,
  ProcessCellForExportParams,
  ProvidedColumnGroup,
} from "ag-grid-community";
import type { BaseSnackbarProps } from "#lib/base/snackbarProps.js";
import { numberWithCommas } from "#utils/utilsCommon.js";
import { ColIdRowSequenceNumber } from "../GridBody/getColumnDefs";
import {
  FORMULA_START,
  quoteIfItBreaksTheRow,
  type CsvColumn,
  type CsvColumnGroup,
  type CsvColumnSeparator,
  type CsvRequest,
} from "./csvFormat";

export type { CsvColumnSeparator } from "./csvFormat";
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

// The copy takes only the first rows (#644).
export const CSV_COPY_MAX_ROWS: number = 5_000;

export const showSnackBarAsCopiedFirstRows: BaseSnackbarProps = {
  visible: true,
  iconProps: {
    name: "checkBold",
    colorCategory: "success",
  },
  text: `Copied the first ${numberWithCommas(CSV_COPY_MAX_ROWS)} rows`,
  displayTimeInMilliseconds: 4000,
};
export const showSnackBarAsExportFailed: BaseSnackbarProps = {
  visible: true,
  iconProps: {
    name: "close",
    colorCategory: "error",
  },
  text: "Export failed",
};

export type CsvTextUpTo = {
  text: string;
  rowCount: number;
  totalRowCount: number;
};
export function getCsvTextUpTo(
  gridApi: GridApi,
  selectedValues: CsvSelectedValues,
  maxRows: number,
): CsvTextUpTo {
  let totalRowCount: number = 0;
  const text: string | undefined = gridApi.getDataAsCsv({
    ...getParamsForCsv(
      gridApi,
      selectedValues.skipRowNumber.selectedValue,
      selectedValues.columnSeparator.selectedValue,
      selectedValues.suppressDoubleQuotes.selectedValue,
      selectedValues.filteredSorted.selectedValue,
      selectedValues.skipColumnHeaders.selectedValue,
    ),
    // ag-grid asks for each row in the exported order, so this also counts
    // the rows after the first ones.
    shouldRowBeSkipped: (): boolean => ++totalRowCount > maxRows,
  });
  return {
    text: text ?? "",
    rowCount: Math.min(totalRowCount, maxRows),
    totalRowCount,
  };
}

// The rows that the selected one of All and Filtered & Sorted exports.
export function getCsvRowCount(
  gridApi: GridApi,
  filteredAndSorted: CsvFilteredSorted,
): number {
  if (filteredAndSorted === "filteredAndSorted") {
    return gridApi.getDisplayedRowCount();
  }
  let rowCount: number = 0;
  gridApi.forEachNode(() => {
    rowCount++;
  });
  return rowCount;
}

// For a worker that makes the CSV of the selected values as ag-grid does.
export function getCsvRequest(
  gridApi: GridApi,
  selectedValues: CsvSelectedValues,
  maxRows?: number,
): CsvRequest {
  const columns: Column[] =
    getCsvTargetColumns(
      gridApi,
      selectedValues.skipRowNumber.selectedValue,
      selectedValues.filteredSorted.selectedValue,
    ) ?? [];
  return {
    columns: columns.map((column: Column): CsvColumn => ({
      colId: column.getColId(),
      headerName: gridApi.getDisplayNameForColumn(column, "csv"),
      groups: getCsvColumnGroups(column),
    })),
    columnSeparator: selectedValues.columnSeparator.selectedValue,
    suppressQuotes: selectedValues.suppressDoubleQuotes.selectedValue,
    skipColumnHeaders: selectedValues.skipColumnHeaders.selectedValue,
    maxRows,
  };
}
// As the header of a group in ag-grid's CSV, which has no headerValueGetter.
function getCsvColumnGroups(column: Column): CsvColumnGroup[] {
  const groups: CsvColumnGroup[] = [];
  for (
    let group: ProvidedColumnGroup | null = column.getOriginalParent();
    group;
    group = group.getOriginalParent()
  ) {
    groups[group.getLevel()] = {
      groupId: group.getGroupId(),
      headerName: group.getColGroupDef()?.headerName ?? "",
    };
  }
  return groups;
}

// Filtered & Sorted follows the screen: the shown columns in the shown order.
function getCsvTargetColumns(
  gridApi: GridApi,
  skipRowNumber: boolean,
  filteredAndSorted: CsvFilteredSorted,
): Column[] | undefined {
  const columns: Column[] | null | undefined =
    filteredAndSorted === "filteredAndSorted"
      ? gridApi?.getAllDisplayedColumns()
      : gridApi?.getColumns();
  if (!columns) {
    return undefined;
  }
  // The shown columns may not have the row number.
  return skipRowNumber
    ? columns.filter(
        (column: Column) => column.getColId() !== ColIdRowSequenceNumber,
      )
    : columns;
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
  const targetColIds: string[] | undefined = getCsvTargetColumns(
    gridApi,
    skipRowNumber,
    filteredAndSorted,
  )?.map((column: Column) => {
    return column.getColId();
  });
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
    if (suppressQuotes) {
      text = quoteIfItBreaksTheRow(text, columnSeparator);
    }
    return text;
  };
}
