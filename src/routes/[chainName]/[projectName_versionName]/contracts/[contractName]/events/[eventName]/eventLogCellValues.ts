// The values of the event logs table, without Svelte or ag-grid at run time,
// so that a worker can sort, filter and export the rows as the grid does.
import type { EventAbiFragment } from "#constants/chains/types.js";
import type { ConvertedEventLog } from "#db/dbTypes.js";
import { NO_DATA } from "#utils/utilsConstants.js";
import { convertJsDateToIso8601 } from "#utils/utilsTime.js";

export type EventLogCellValues = {
  colId: string;
  // The filter that ag-grid gives the column.
  filterType: "text" | "number";
  // The value ag-grid sorts by, and the number filter matches.
  getSortValue: (row: ConvertedEventLog) => unknown;
  // The text the text filter and the quick search match, before ag-grid
  // changes its case. null when there is no value.
  getFilterText: (row: ConvertedEventLog) => string | null;
  // The text of the cell in the CSV, before the quotes.
  getCsvText: (row: ConvertedEventLog) => string;
};

export const eventLogColIds = {
  blockNumber: "blockNumber",
  jsDate: "jsDate",
  transactionIndex: "transactionIndex",
  transactionHash: "transactionHash",
  logIndex: "logIndex",
  removed: "removed",
} as const;
export function argChildColId(
  indexOfInputs: number,
  indexOfArgChild: number,
): string {
  return `args.${indexOfInputs}.${indexOfArgChild}`;
}

// As the column of a chain explorer link: "-" for no value, even for 0.
export function getBlockNumberValue(row: ConvertedEventLog): number | string {
  return row.blockNumber ? row.blockNumber : NO_DATA;
}
export function getTransactionHashValue(row: ConvertedEventLog): string {
  return row.transactionHash ? row.transactionHash : NO_DATA;
}
export function getDatetimeText(row: ConvertedEventLog): string {
  return convertJsDateToIso8601(row.jsDate);
}
export function getArgChildValue(
  row: ConvertedEventLog,
  indexOfInputs: number,
  indexOfArgChild: number,
): unknown {
  const argValue: unknown = row.args[indexOfInputs];
  return Array.isArray(argValue) ? argValue[indexOfArgChild] : argValue;
}
// The screen groups the digits of a bigint.
export function formatArgChildValue(argChildValue: unknown): string {
  if (typeof argChildValue === "bigint") {
    return argChildValue.toLocaleString();
  }
  return argChildValue == null ? "" : String(argChildValue);
}

function toFilterText(value: unknown): string | null {
  return value == null ? null : String(value);
}
// A spreadsheet reads a cell that starts with one of these as a formula.
const FORMULA_START = /^[=+\-@\t\r]/;
// As exportCsv.ts: a bigint without the digit grouping, and a quote before a
// text that a spreadsheet would read as a formula.
function toCsvText(value: unknown, formattedText: string): string {
  if (typeof value === "bigint") {
    return value.toString();
  }
  if (typeof value === "string" && FORMULA_START.test(formattedText)) {
    return "'" + formattedText;
  }
  return formattedText;
}
function valueToText(value: unknown): string {
  return value == null ? "" : String(value);
}

function cellValuesOf(
  colId: string,
  filterType: EventLogCellValues["filterType"],
  getValue: (row: ConvertedEventLog) => unknown,
): EventLogCellValues {
  return {
    colId,
    filterType,
    getSortValue: getValue,
    getFilterText: (row) => toFilterText(getValue(row)),
    getCsvText: (row) => {
      const value: unknown = getValue(row);
      return toCsvText(value, valueToText(value));
    },
  };
}

// In the order of the columns of the table, without the row number.
export function eventLogCellValues(
  targetEventAbiFragment: EventAbiFragment,
  eachArgsMaxLengths: number[],
): EventLogCellValues[] {
  const datetime: EventLogCellValues = {
    colId: eventLogColIds.jsDate,
    filterType: "text",
    getSortValue: (row) => row.jsDate,
    getFilterText: getDatetimeText,
    getCsvText: (row) => toCsvText(row.jsDate, getDatetimeText(row)),
  };
  const args: EventLogCellValues[] = [];
  targetEventAbiFragment.inputs.forEach((_, indexOfInputs) => {
    for (
      let indexOfArgChild: number = 0;
      indexOfArgChild <= eachArgsMaxLengths[indexOfInputs] - 1;
      indexOfArgChild++
    ) {
      args.push(
        cellValuesOf(
          argChildColId(indexOfInputs, indexOfArgChild),
          "text",
          (row) => getArgChildValue(row, indexOfInputs, indexOfArgChild),
        ),
      );
    }
  });
  return [
    cellValuesOf(eventLogColIds.blockNumber, "text", getBlockNumberValue),
    datetime,
    ...args,
    cellValuesOf(
      eventLogColIds.transactionIndex,
      "number",
      (row) => row.transactionIndex,
    ),
    cellValuesOf(
      eventLogColIds.transactionHash,
      "text",
      getTransactionHashValue,
    ),
    cellValuesOf(eventLogColIds.logIndex, "number", (row) => row.logIndex),
    cellValuesOf(eventLogColIds.removed, "text", (row) => row.removed),
  ];
}
