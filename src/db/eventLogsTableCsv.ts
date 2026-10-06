// The CSV of the rows of an event logs table, made in the table worker as
// ag-grid's getDataAsCsv makes it on the page.
import { ColIdRowSequenceNumber } from "#lib/grid/GridBody/getColumnDefs.js";
import {
  CSV_LINE_SEPARATOR,
  csvHeaderLines,
  putInQuotes,
  quoteIfItBreaksTheRow,
  type CsvRequest,
  type CsvResult,
} from "#lib/grid/ExportCsv/csvFormat.js";
import type { EventLogCellValues } from "#routes/[chainName]/[projectName_versionName]/contracts/[contractName]/events/[eventName]/eventLogCellValues.js";
import type { ConvertedEventLog } from "./dbTypes";

// Each chunk of lines becomes a Blob at once, so that the text of all the
// rows is not kept at the same time.
export const EVENT_LOGS_CSV_CHUNK_SIZE: number = 10_000;

// The rows in the given order. The row number is the position in the CSV.
export function eventLogsCsv(
  rows: ConvertedEventLog[],
  cellValues: EventLogCellValues[],
  {
    columns,
    columnSeparator,
    suppressQuotes,
    skipColumnHeaders,
    maxRows,
  }: CsvRequest,
  chunkSize: number = EVENT_LOGS_CSV_CHUNK_SIZE,
): CsvResult {
  const valuesByColId: Map<string, EventLogCellValues> = new Map(
    cellValues.map((values) => [values.colId, values]),
  );
  // undefined for the row number. A column the rows do not have, such as a
  // longer array than any row, has no text.
  const getTexts: (((row: ConvertedEventLog) => string) | undefined)[] =
    columns.map(({ colId }) =>
      colId === ColIdRowSequenceNumber
        ? undefined
        : (valuesByColId.get(colId)?.getCsvText ?? (() => "")),
    );
  const quote = (text: string): string =>
    suppressQuotes
      ? quoteIfItBreaksTheRow(text, columnSeparator)
      : putInQuotes(text, false);

  const parts: Blob[] = [];
  let lines: string[] = skipColumnHeaders
    ? []
    : csvHeaderLines(columns, columnSeparator, suppressQuotes);
  const flush = (): void => {
    if (lines.length === 0) return;
    const text: string = lines.join(CSV_LINE_SEPARATOR);
    parts.push(new Blob([parts.length > 0 ? CSV_LINE_SEPARATOR + text : text]));
    lines = [];
  };
  const rowCount: number = Math.min(rows.length, maxRows ?? Infinity);
  for (let rowIndex: number = 0; rowIndex < rowCount; rowIndex++) {
    const row: ConvertedEventLog = rows[rowIndex];
    lines.push(
      getTexts
        .map((getText) => quote(getText ? getText(row) : String(rowIndex + 1)))
        .join(columnSeparator),
    );
    if (lines.length >= chunkSize) {
      flush();
    }
  }
  flush();
  return {
    blob: new Blob(parts, { type: "text/plain" }),
    rowCount,
    totalRowCount: rows.length,
  };
}
