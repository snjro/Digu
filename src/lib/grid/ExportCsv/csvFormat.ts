// The CSV of the grids without ag-grid at run time, so that a worker can make
// the same text as ag-grid's getDataAsCsv.

export type CsvColumnSeparator = "," | `\t` | "|";

// A spreadsheet reads a cell that starts with one of these as a formula.
export const FORMULA_START = /^[=+\-@\t\r]/;

export const CSV_LINE_SEPARATOR = "\r\n";

// The column groups of the column from the top, as ag-grid keeps them. A
// padding group, which aligns the levels, has no header name.
export type CsvColumnGroup = { groupId: string; headerName: string };
export type CsvColumn = {
  colId: string;
  headerName: string;
  groups: CsvColumnGroup[];
};
export type CsvRequest = {
  columns: CsvColumn[];
  columnSeparator: CsvColumnSeparator;
  suppressQuotes: boolean;
  // Skips the rows of the column groups too.
  skipColumnHeaders: boolean;
  // Only the first rows, as the copy takes. All the rows when undefined.
  maxRows?: number;
};
export type CsvResult = {
  blob: Blob;
  // The rows in the CSV, and the rows there were before maxRows.
  rowCount: number;
  totalRowCount: number;
};
export type CsvMaker = (request: CsvRequest) => Promise<CsvResult>;

// ag-grid puts every value in quotes unless suppressQuotes is set.
export function putInQuotes(text: string, suppressQuotes: boolean): string {
  return suppressQuotes ? text : '"' + text.replace(/"/g, '""') + '"';
}
// Without the quotes of ag-grid, a value that breaks the row still needs them.
export function quoteIfItBreaksTheRow(
  text: string,
  columnSeparator: CsvColumnSeparator,
): string {
  return text.includes(columnSeparator) || /["\r\n]/.test(text)
    ? '"' + text.replace(/"/g, '""') + '"'
    : text;
}

// As ag-grid: a row for each level of the groups, then the column headers. A
// group spanning columns has its name in the first one.
export function csvHeaderLines(
  columns: CsvColumn[],
  columnSeparator: CsvColumnSeparator,
  suppressQuotes: boolean,
): string[] {
  const levels: number = Math.max(
    0,
    ...columns.map((column) => column.groups.length),
  );
  const lines: string[][] = [];
  for (let level: number = 0; level < levels; level++) {
    lines.push(
      columns.map((column, index) => {
        const group: CsvColumnGroup | undefined = column.groups[level];
        const isFirst: boolean =
          group?.groupId !== columns[index - 1]?.groups[level]?.groupId;
        return group && isFirst ? group.headerName : "";
      }),
    );
  }
  lines.push(columns.map((column) => column.headerName));
  return lines.map((cells) =>
    cells
      .map((cell) => putInQuotes(cell, suppressQuotes))
      .join(columnSeparator),
  );
}
