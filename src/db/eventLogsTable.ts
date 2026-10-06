// The rows of one event logs table, for the table worker: reads them in
// chunks, adds the new ones, and answers the blocks of rows the grid asks for.
import type { Table } from "dexie";
import type { EventAbiFragment } from "#constants/chains/types.js";
import {
  getEventLogTableName,
  getTargetEventAbiFragment,
} from "#utils/utilsDb.js";
import { getEachArgsMaxLengths } from "#routes/[chainName]/[projectName_versionName]/contracts/maxParamsLength.js";
import {
  eventLogCellValues,
  type EventLogCellValues,
} from "#routes/[chainName]/[projectName_versionName]/contracts/[contractName]/events/[eventName]/eventLogCellValues.js";
import type { AbiFragmentIdentifier, ConvertedEventLog } from "./dbTypes";
import { getDbEventLogs, type DbEventLogs } from "./dbEventLogs";
import {
  queryEventLogRows,
  type EventLogsTableQueryModel,
} from "./eventLogsTableQuery";
import { eventLogsCsv } from "./eventLogsTableCsv";
import type { CsvRequest, CsvResult } from "#lib/grid/ExportCsv/csvFormat.js";

// A row as the DB keeps it: the key is auto-incremented.
export type StoredEventLog = ConvertedEventLog & { id: number };

export type EventLogsTableState = {
  rowCount: number;
  // As getEachArgsMaxLengths of all the rows.
  argsMaxLengths: number[];
};
export type EventLogsTableRefreshResult = EventLogsTableState & {
  // All the rows were read again, not only the new ones.
  reloaded: boolean;
};
export type EventLogsTableQuery = EventLogsTableQueryModel & {
  startRow: number;
  endRow: number;
};
export type EventLogsTableQueryResult = {
  rows: StoredEventLog[];
  // The number of the rows that match.
  lastRow: number;
};

// Reading in chunks lowers the peak of the memory while reading.
export const EVENT_LOGS_TABLE_CHUNK_SIZE: number = 50_000;

export class EventLogsTable {
  private readonly dbEventLogs: DbEventLogs;
  private readonly table: Table<StoredEventLog, number>;
  private readonly fragment: EventAbiFragment;
  // In the order of the key, which is the order of the blocks.
  private rows: StoredEventLog[] = [];
  private argsMaxLengths: number[];
  private cellValues: EventLogCellValues[];
  // The indexes of the rows of the last query.
  private result: { key: string; rowIndexes: number[] } | undefined;

  constructor(
    eventIdentifier: AbiFragmentIdentifier,
    private readonly chunkSize: number = EVENT_LOGS_TABLE_CHUNK_SIZE,
  ) {
    this.dbEventLogs = getDbEventLogs({
      chainName: eventIdentifier.chainName,
      projectName: eventIdentifier.projectName,
      versionName: eventIdentifier.versionName,
    });
    this.table = this.dbEventLogs.table(
      getEventLogTableName(
        eventIdentifier.contractName,
        eventIdentifier.abiFragmentName,
      ),
    );
    this.fragment = getTargetEventAbiFragment(eventIdentifier);
    this.argsMaxLengths = this.argsMaxLengthsOf([]);
    this.cellValues = eventLogCellValues(this.fragment, this.argsMaxLengths);
  }

  async open(): Promise<EventLogsTableState> {
    await this.reload();
    return this.state();
  }

  // Adds the rows after the last one. Reads all the rows again when the last
  // row has changed or there are fewer rows, as after a reset.
  async refresh(): Promise<EventLogsTableRefreshResult> {
    const last: StoredEventLog | undefined = this.rows.at(-1);
    if (last) {
      const [stored, count] = await this.dbEventLogs.transaction(
        "r",
        this.table,
        () => Promise.all([this.table.get(last.id), this.table.count()]),
      );
      if (!isSameLog(stored, last) || count < this.rows.length) {
        await this.reload();
        return { ...this.state(), reloaded: true };
      }
    }
    await this.readAfter(last?.id ?? 0);
    return { ...this.state(), reloaded: false };
  }

  // The result of a query is kept, so that each block of the same query only
  // slices it.
  query({
    startRow,
    endRow,
    ...model
  }: EventLogsTableQuery): EventLogsTableQueryResult {
    const key: string = JSON.stringify([
      model.sortModel,
      model.filterModel,
      model.quickSearch,
    ]);
    if (this.result?.key !== key) {
      this.result = {
        key,
        rowIndexes: queryEventLogRows(this.rows, this.cellValues, model),
      };
    }
    const rowIndexes: number[] = this.result.rowIndexes;
    return {
      rows: rowIndexes
        .slice(startRow, endRow)
        .map((rowIndex) => this.rows[rowIndex]),
      lastRow: rowIndexes.length,
    };
  }

  // All the rows, in the order of the blocks.
  csv(request: CsvRequest): CsvResult {
    return eventLogsCsv(this.rows, this.cellValues, request);
  }

  private state(): EventLogsTableState {
    return { rowCount: this.rows.length, argsMaxLengths: this.argsMaxLengths };
  }

  private async reload(): Promise<void> {
    // Not the old rows and the new ones at the same time.
    this.rows = [];
    this.result = undefined;
    this.setArgsMaxLengths(this.argsMaxLengthsOf([]));
    await this.readAfter(0);
  }

  // Each chunk in its own transaction.
  private async readAfter(lastId: number): Promise<void> {
    for (;;) {
      const chunk: StoredEventLog[] = await this.table
        .where(":id")
        .above(lastId)
        .limit(this.chunkSize)
        .toArray();
      if (chunk.length === 0) {
        return;
      }
      for (const row of chunk) {
        this.rows.push(row);
      }
      this.result = undefined;
      const chunkMaxLengths: number[] = this.argsMaxLengthsOf(chunk);
      this.setArgsMaxLengths(
        this.argsMaxLengths.map((maxLength, index) =>
          Math.max(maxLength, chunkMaxLengths[index]),
        ),
      );
      lastId = chunk[chunk.length - 1].id;
      if (chunk.length < this.chunkSize) {
        return;
      }
    }
  }

  private argsMaxLengthsOf(rows: ConvertedEventLog[]): number[] {
    return getEachArgsMaxLengths(rows, this.fragment.inputs.length);
  }
  // A longer array adds columns, whose values the queries need.
  private setArgsMaxLengths(argsMaxLengths: number[]): void {
    if (argsMaxLengths.join(",") === this.argsMaxLengths.join(",")) {
      return;
    }
    this.argsMaxLengths = argsMaxLengths;
    this.cellValues = eventLogCellValues(this.fragment, argsMaxLengths);
    this.result = undefined;
  }
}

function isSameLog(
  stored: StoredEventLog | undefined,
  kept: StoredEventLog,
): boolean {
  return (
    stored !== undefined &&
    stored.blockNumber === kept.blockNumber &&
    stored.logIndex === kept.logIndex &&
    stored.transactionHash === kept.transactionHash
  );
}
