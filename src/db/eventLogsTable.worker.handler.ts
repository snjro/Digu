import { customLogger } from "#utils/logger.js";
import type { AbiFragmentIdentifier } from "./dbTypes";
import { EventLogsTable } from "./eventLogsTable";
import type {
  EventLogsTableRequestParams,
  EventLogsTableResponseValue,
  EventLogsTableWorkerMessage,
  EventLogsTableWorkerResult,
} from "./eventLogsTable.worker.types";

type TableOf = (
  eventIdentifier: AbiFragmentIdentifier,
) => Pick<EventLogsTable, "open" | "query" | "refresh" | "csv">;

// Handles the requests one at a time, in the order they came, and posts the
// response of each with the id of its request.
export function createEventLogsTableRequestHandler(
  post: (result: EventLogsTableWorkerResult) => void,
  tableOf: TableOf = (eventIdentifier) => new EventLogsTable(eventIdentifier),
): (message: EventLogsTableWorkerMessage) => void {
  let table: ReturnType<TableOf> | undefined;
  let queue: Promise<void> = Promise.resolve();

  function openedTable(): ReturnType<TableOf> {
    if (!table) {
      throw new Error("EventLogsTable: no table is open");
    }
    return table;
  }
  async function execute(
    message: EventLogsTableWorkerMessage,
  ): Promise<EventLogsTableResponseValue<typeof message.type>> {
    switch (message.type) {
      case "open": {
        const { eventIdentifier } =
          message.params as EventLogsTableRequestParams<"open">;
        // Not the rows of the previous table while reading the next.
        table = undefined;
        const nextTable = tableOf(eventIdentifier);
        const state = await nextTable.open();
        table = nextTable;
        return state;
      }
      case "query":
        return openedTable().query(
          message.params as EventLogsTableRequestParams<"query">,
        );
      case "refresh":
        return await openedTable().refresh();
      case "csv": {
        const { request, query } =
          message.params as EventLogsTableRequestParams<"csv">;
        return openedTable().csv(request, query);
      }
    }
  }

  return (message) => {
    queue = queue
      .then(async () => {
        try {
          post({ id: message.id, value: await execute(message) });
        } catch (error) {
          // An error thrown in the worker does not reach the page.
          post({
            id: message.id,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      })
      // When post() throws, the next requests still run.
      .catch((error: unknown) => {
        customLogger.error("EventLogsTable: post the response.", {
          id: message.id,
          errorObject: error,
        });
      });
  };
}
