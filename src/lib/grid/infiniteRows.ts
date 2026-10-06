import type { GetRowIdFunc, IDatasource } from "ag-grid-community";
import type { CsvRequest, CsvResult } from "./ExportCsv/csvFormat";
import type { CsvFilteredSorted } from "./ExportCsv/exportCsv";

// The rows of a grid with the Infinite Row Model: ag-grid asks the datasource
// for each block of rows, with the sort and the column filters.
export type InfiniteRows<GridRow> = {
  // undefined while the rows load.
  datasource: IDatasource | undefined;
  getRowId: GetRowIdFunc<GridRow>;
  // ag-grid does not search these rows, so the datasource reads the text of
  // the quick search here.
  quickSearch: { text: string };
  // ag-grid's CSV has only the blocks it keeps. undefined while the rows load.
  csv:
    | ((
        request: CsvRequest,
        filteredSorted: CsvFilteredSorted,
      ) => Promise<CsvResult>)
    | undefined;
  // For the CSV dialog. undefined while unknown.
  rowCounts: Record<CsvFilteredSorted, number | undefined>;
};
