import type { Column, CsvExportParams, GridApi } from "ag-grid-community";
import { ColIdRowSequenceNumber } from "../GridBody/getColumnDefs";

export type CsvColumnSeparator = "," | `\t` | "|";
export type CsvFilteredSorted = "all" | "filteredAndSorted";

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
  const targetColIds: string[] | undefined = gridApi
    ?.getColumns()
    ?.map((column: Column) => {
      return column.getColId();
    });

  if (skipRowNumber && targetColIds) {
    const indexOfRowNumber: number = targetColIds.indexOf(
      ColIdRowSequenceNumber,
    );
    targetColIds!.splice(indexOfRowNumber, 1);
  }
  const csvExportParams: CsvExportParams = {
    columnKeys: targetColIds,
    columnSeparator: columnSeparator,
    suppressQuotes: suppressQuotes,
    exportedRows: filteredAndSorted,
    skipColumnHeaders: skipColumnHeaders,
    skipColumnGroupHeaders: skipColumnHeaders,
    fileName: fileName,
  };
  return csvExportParams;
}
