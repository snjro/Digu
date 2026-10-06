// Sorts, filters and searches the rows of the event logs table as the
// Client-Side row model of ag-grid does (ag-grid-community 36), so that the
// table worker gives the grid the same rows in the same order.
import type {
  FilterModel,
  ICombinedSimpleModel,
  ISimpleFilterModel,
  NumberFilterModel,
  SortModelItem,
  TextFilterModel,
} from "ag-grid-community";
import type { EventLogCellValues } from "#routes/[chainName]/[projectName_versionName]/contracts/[contractName]/events/[eventName]/eventLogCellValues.js";
import type { ConvertedEventLog } from "./dbTypes";

export type EventLogsTableQueryModel = {
  sortModel: SortModelItem[];
  filterModel: FilterModel;
  // The text of the quick search, as the grid option quickFilterText.
  quickSearch: string;
};

// ag-grid's _defaultComparator, without accentedSort, which the grids do not
// use, and without the values with toNumber(), which the rows do not have.
export function compareCellValues(valueA: unknown, valueB: unknown): number {
  if (valueA == null) {
    return valueB == null ? 0 : -1;
  }
  if (valueB == null) {
    return 1;
  }
  if ((valueA as number) > (valueB as number)) {
    return 1;
  }
  if ((valueA as number) < (valueB as number)) {
    return -1;
  }
  return 0;
}

// ag-grid's _isBlank: an empty text, or one of only white space, has no value.
function isBlank(cellValue: unknown): boolean {
  if (typeof cellValue === "string") {
    const first: number = cellValue.codePointAt(0) ?? 0;
    return first > 32 && first < 160 ? false : !cellValue.trim();
  }
  return cellValue == null;
}

type Condition<M> = (row: ConvertedEventLog, model: M) => boolean;

const TEXT_COMPARISONS: Record<
  string,
  (value: string, filterText: string) => boolean
> = {
  contains: (value, filterText) => value.includes(filterText),
  notContains: (value, filterText) => !value.includes(filterText),
  equals: (value, filterText) => value === filterText,
  notEqual: (value, filterText) => value != filterText,
  startsWith: (value, filterText) => value.startsWith(filterText),
  endsWith: (value, filterText) => value.endsWith(filterText),
};
// As ag-grid's TextFilterHandler: matches the text without its case. An empty
// text counts as a value.
function textCondition(values: EventLogCellValues): Condition<TextFilterModel> {
  return (row, model) => {
    const type = model.type;
    const cellText: string | null = values.getFilterText(row);
    if (cellText == null) {
      return type === "notEqual" || type === "notContains" || type === "blank";
    }
    if (type === "blank") {
      return isBlank(values.getSortValue(row));
    }
    if (type === "notBlank") {
      return !isBlank(values.getSortValue(row));
    }
    const compare = type == null ? undefined : TEXT_COMPARISONS[type];
    // ag-grid reads an empty filter as no text, which matches nothing.
    const filterText: string | null = model.filter || null;
    if (!compare || filterText == null) {
      return false;
    }
    return compare(cellText.toLowerCase(), filterText.toLowerCase());
  };
}

function numberFilterValue(value: unknown): unknown {
  if (value == null) {
    return null;
  }
  return isNaN(value as number) ? null : value;
}
// The comparator of ag-grid's NumberFilterHandler: positive when the cell is
// greater than the filter.
function compareNumberFilter(left: unknown, right: unknown): number {
  if (left === right) {
    return 0;
  }
  return (left as number) < (right as number) ? 1 : -1;
}
// As ag-grid's NumberFilterHandler, without the includeBlanks options, which
// the grids do not use. inRange does not include its ends.
function numberCondition(
  values: EventLogCellValues,
): Condition<NumberFilterModel> {
  return (row, model) => {
    const type = model.type;
    const cellValue: unknown = values.getSortValue(row);
    if (isBlank(cellValue)) {
      return type === "blank";
    }
    if (isNaN(cellValue as number)) {
      return type === "notEqual" || type === "notBlank";
    }
    if (type === "blank") {
      return false;
    }
    if (type === "notBlank") {
      return true;
    }
    const filter: unknown = numberFilterValue(model.filter);
    const compareResult: number =
      filter != null ? compareNumberFilter(filter, cellValue) : 0;
    switch (type) {
      case "equals":
        return compareResult === 0;
      case "notEqual":
        return compareResult !== 0;
      case "greaterThan":
        return compareResult > 0;
      case "greaterThanOrEqual":
        return compareResult >= 0;
      case "lessThan":
        return compareResult < 0;
      case "lessThanOrEqual":
        return compareResult <= 0;
      case "inRange":
        return (
          compareResult > 0 &&
          compareNumberFilter(numberFilterValue(model.filterTo), cellValue) < 0
        );
      default:
        return true;
    }
  };
}

type ColumnFilterModel<M extends ISimpleFilterModel> =
  M | ICombinedSimpleModel<M>;
// One or two conditions, with AND or OR.
function columnFilter<M extends ISimpleFilterModel>(
  condition: Condition<M>,
  model: ColumnFilterModel<M>,
): (row: ConvertedEventLog) => boolean {
  const combined = model as ICombinedSimpleModel<M>;
  const models: M[] = combined.operator
    ? (combined.conditions ?? [])
    : [model as M];
  if (models.length === 0) {
    return () => true;
  }
  if (combined.operator === "OR") {
    return (row) => models.some((m) => condition(row, m));
  }
  return (row) => models.every((m) => condition(row, m));
}

// As ag-grid's QuickFilterService without the cache: each word must be in the
// text of one column. The text of the quick search keeps its spaces.
function quickSearchFilter(
  cellValues: EventLogCellValues[],
  quickSearch: string,
): ((row: ConvertedEventLog) => boolean) | undefined {
  if (!quickSearch) {
    return undefined;
  }
  const words: string[] = quickSearch.toUpperCase().split(" ");
  return (row) => {
    // The text of a column is made when a word first needs it, and kept for
    // the next words. null when the column has no text.
    const texts: (string | null | undefined)[] = new Array(cellValues.length);
    return words.every((word) =>
      cellValues.some((values, index) => {
        let text: string | null | undefined = texts[index];
        if (text === undefined) {
          const filterText: string | null = values.getFilterText(row);
          text = filterText ? filterText.toUpperCase() : null;
          texts[index] = text;
        }
        return text !== null && text.includes(word);
      }),
    );
  };
}

function rowFilters(
  cellValues: EventLogCellValues[],
  filterModel: FilterModel,
  quickSearch: string,
): ((row: ConvertedEventLog) => boolean)[] {
  const filters: ((row: ConvertedEventLog) => boolean)[] = [];
  for (const values of cellValues) {
    const model: unknown = filterModel[values.colId];
    if (model == null) {
      continue;
    }
    // By the filter of the column, as ag-grid, not by the filterType of the model.
    filters.push(
      values.filterType === "number"
        ? columnFilter(
            numberCondition(values),
            model as ColumnFilterModel<NumberFilterModel>,
          )
        : columnFilter(
            textCondition(values),
            model as ColumnFilterModel<TextFilterModel>,
          ),
    );
  }
  const quickSearchRow = quickSearchFilter(cellValues, quickSearch);
  if (quickSearchRow) {
    filters.push(quickSearchRow);
  }
  return filters;
}

// Sorts the indexes with Array.prototype.sort in the order of the rows, as
// ag-grid sorts the rows after the filter. The comparison of "-" and a number
// is 0 and not transitive, so the same steps keep such rows where ag-grid
// puts them.
function sortRowIndexes(
  rows: readonly ConvertedEventLog[],
  cellValues: EventLogCellValues[],
  rowIndexes: number[],
  sortModel: SortModelItem[],
): number[] {
  const sortKeys: { keys: unknown[]; descending: boolean }[] = [];
  for (const sortModelItem of sortModel) {
    const values: EventLogCellValues | undefined = cellValues.find(
      (cellValue) => cellValue.colId === sortModelItem.colId,
    );
    if (!values) {
      continue;
    }
    // The values once per row, not once per comparison.
    sortKeys.push({
      keys: rowIndexes.map((rowIndex) => values.getSortValue(rows[rowIndex])),
      descending: sortModelItem.sort === "desc",
    });
  }
  if (sortKeys.length === 0) {
    return rowIndexes;
  }
  const positions: number[] = rowIndexes.map((_, position) => position);
  positions.sort((a, b) => {
    for (const { keys, descending } of sortKeys) {
      const result: number = compareCellValues(keys[a], keys[b]);
      if (result) {
        return descending ? -result : result;
      }
    }
    return 0;
  });
  return positions.map((position) => rowIndexes[position]);
}

// The indexes of the rows that match, in the order of the table.
export function queryEventLogRows(
  rows: readonly ConvertedEventLog[],
  cellValues: EventLogCellValues[],
  { sortModel, filterModel, quickSearch }: EventLogsTableQueryModel,
): number[] {
  const filters = rowFilters(cellValues, filterModel, quickSearch);
  const rowIndexes: number[] = [];
  for (let rowIndex: number = 0; rowIndex < rows.length; rowIndex++) {
    const row: ConvertedEventLog = rows[rowIndex];
    if (filters.every((filter) => filter(row))) {
      rowIndexes.push(rowIndex);
    }
  }
  return sortRowIndexes(rows, cellValues, rowIndexes, sortModel);
}
