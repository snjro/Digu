import type {
  GetRowIdParams,
  IDatasource,
  IGetRowsParams,
} from "ag-grid-community";
import type { AbiFragmentIdentifier } from "#db/dbTypes.js";
import type {
  EventLogsTableState,
  StoredEventLog,
} from "#db/eventLogsTable.js";
import type { EventLogsTableQueryModel } from "#db/eventLogsTableQuery.js";
import type { EventLogsTableClient } from "#db/eventLogsTable.worker.portal.js";
import type { InfiniteRows } from "#lib/grid/infiniteRows.js";
import { customLogger } from "#utils/logger.js";

export type EventLogsDatasource = IDatasource & {
  csv: InfiniteRows<StoredEventLog>["csv"];
};

// The key of the DB, which keeps the selection of a row across the queries.
export function getEventLogRowId({
  data,
}: GetRowIdParams<StoredEventLog>): string {
  return String(data.id);
}

// undefined when the table could not be read.
export async function openEventLogsTable(
  client: EventLogsTableClient,
  eventIdentifier: AbiFragmentIdentifier,
  signal: AbortSignal,
): Promise<EventLogsTableState | undefined> {
  try {
    return await client.open(eventIdentifier);
  } catch (error) {
    // Stopped on purpose: nobody uses the rows.
    if (signal.aborted) throw error;
    customLogger.error("Get event logs.", {
      eventIdentifier: eventIdentifier,
      errorObject: error,
    });
    return undefined;
  }
}

// Answers the blocks of the grid from the table worker, which sorts, filters
// and searches all the rows. Without a client, the table has no rows.
export function createEventLogsDatasource(
  client: EventLogsTableClient | undefined,
  quickSearch: { text: string },
  {
    onRowCount,
    isClosed,
  }: {
    // The rows of the query of each block.
    onRowCount: (rowCount: number) => void;
    // After the table closes, the client rejects the requests.
    isClosed: () => boolean;
  },
): EventLogsDatasource {
  // The CSV of Filtered & Sorted has the rows that the grid shows.
  let shownQuery: EventLogsTableQueryModel = {
    sortModel: [],
    filterModel: {},
    quickSearch: quickSearch.text,
  };
  return {
    getRows: (params: IGetRowsParams): void => {
      if (!client) {
        onRowCount(0);
        params.successCallback([], 0);
        return;
      }
      const query: EventLogsTableQueryModel = {
        sortModel: params.sortModel,
        filterModel: params.filterModel,
        quickSearch: quickSearch.text,
      };
      // The worker answers in the order of the requests.
      client
        .query({ ...query, startRow: params.startRow, endRow: params.endRow })
        .then(
          ({ rows, lastRow }) => {
            shownQuery = query;
            onRowCount(lastRow);
            params.successCallback(rows, lastRow);
          },
          (error: unknown) => {
            if (!isClosed()) {
              customLogger.error("Get the rows of event logs.", {
                errorObject: error,
              });
            }
            params.failCallback();
          },
        );
    },
    csv: client
      ? (request, filteredSorted) =>
          client.csv(
            request,
            filteredSorted === "filteredAndSorted" ? shownQuery : undefined,
          )
      : undefined,
  };
}
