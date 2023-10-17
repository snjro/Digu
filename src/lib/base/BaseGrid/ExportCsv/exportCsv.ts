import type { Column, CsvExportParams, GridOptions } from "ag-grid-community";
import { ColIdRowSequenceNumber } from "../GridBody/getColumnDefs";

export type CsvColumnSeparator = "," | `\t` | "|";
export type CsvFilteredSorted = "all" | "filteredAndSorted";

export function exportCsvFile(
  gridOptions: GridOptions,
  skipRowNumber: boolean,
  columnSeparator: CsvColumnSeparator,
  suppressQuotes: boolean,
  filteredAndSorted: CsvFilteredSorted,
  skipColumnHeaders: boolean,
  fileName: string | undefined = undefined,
): void | string {
  const csvExportParams: CsvExportParams = getParamsForCsv(
    gridOptions,
    skipRowNumber,
    columnSeparator,
    suppressQuotes,
    filteredAndSorted,
    skipColumnHeaders,
    fileName,
  );
  if (fileName) {
    gridOptions.api!.exportDataAsCsv(csvExportParams);
  } else {
    return gridOptions.api!.getDataAsCsv(csvExportParams);
  }
}
function getParamsForCsv(
  gridOptions: GridOptions,
  skipRowNumber: boolean,
  columnSeparator: CsvColumnSeparator,
  suppressQuotes: boolean,
  filteredAndSorted: CsvFilteredSorted,
  skipColumnHeaders: boolean,
  fileName: string | undefined = undefined,
): CsvExportParams {
  const targetColIds: string[] | undefined = gridOptions.columnApi
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
