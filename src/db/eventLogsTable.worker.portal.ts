import EventLogsTableWorker from "#db/eventLogsTable.worker.js?worker";
import type { CsvRequest, CsvResult } from "#lib/grid/ExportCsv/csvFormat.js";
import type { AbiFragmentIdentifier } from "./dbTypes";
import type {
  EventLogsTableQuery,
  EventLogsTableQueryResult,
  EventLogsTableRefreshResult,
  EventLogsTableState,
} from "./eventLogsTable";
import type { EventLogsTableQueryModel } from "./eventLogsTableQuery";
import type {
  EventLogsTableRequestParams,
  EventLogsTableRequestType,
  EventLogsTableResponseValue,
  EventLogsTableWorkerResult,
} from "./eventLogsTable.worker.types";

type Pending = {
  resolve: (value: never) => void;
  reject: (reason: Error) => void;
};

// The page's side of the table worker, which lives until terminate() or an
// error of the worker.
export class EventLogsTableClient {
  private readonly worker: Worker = new EventLogsTableWorker();
  private nextId: number = 0;
  private readonly pending: Map<number, Pending> = new Map();
  // Set after terminate() or an error of the worker, which answers no more.
  private closedMessage: string | undefined;

  constructor() {
    this.worker.addEventListener(
      "message",
      (message: MessageEvent<EventLogsTableWorkerResult>) => {
        const pending: Pending | undefined = this.pending.get(message.data.id);
        if (!pending) return;
        this.pending.delete(message.data.id);
        if ("error" in message.data) {
          pending.reject(
            new Error(`EventLogsTableWorker: ${message.data.error}`),
          );
        } else {
          pending.resolve(message.data.value as never);
        }
      },
    );
    // The handler answers the errors of each request, so this is an error of
    // the worker itself, such as a worker that could not load.
    this.worker.addEventListener("error", (event: Event | ErrorEvent) => {
      // A worker that could not load gives an Event without a message.
      const message: string =
        ("message" in event && event.message) || "could not load";
      this.close(`EventLogsTableWorker: ${message}`);
    });
    this.worker.addEventListener("messageerror", () => {
      this.rejectAll("EventLogsTableWorker: could not read the message");
    });
  }

  open(eventIdentifier: AbiFragmentIdentifier): Promise<EventLogsTableState> {
    return this.request("open", { eventIdentifier });
  }
  query(query: EventLogsTableQuery): Promise<EventLogsTableQueryResult> {
    return this.request("query", query);
  }
  refresh(): Promise<EventLogsTableRefreshResult> {
    return this.request("refresh", undefined);
  }
  // The rows of the query, or all the rows without it.
  csv(
    request: CsvRequest,
    query?: EventLogsTableQueryModel,
  ): Promise<CsvResult> {
    return this.request("csv", { request, query });
  }
  // Drops the rows, and rejects the requests that wait and the later ones.
  terminate(): void {
    this.close("EventLogsTableWorker: terminated");
  }

  private request<T extends EventLogsTableRequestType>(
    type: T,
    params: EventLogsTableRequestParams<T>,
  ): Promise<EventLogsTableResponseValue<T>> {
    if (this.closedMessage !== undefined) {
      return Promise.reject(new Error(this.closedMessage));
    }
    const id: number = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.worker.postMessage({ id, type, params });
    });
  }
  // Stops the worker, so that it does not keep the rows.
  private close(message: string): void {
    this.worker.terminate();
    this.closedMessage ??= message;
    this.rejectAll(message);
  }
  private rejectAll(message: string): void {
    for (const pending of this.pending.values()) {
      pending.reject(new Error(message));
    }
    this.pending.clear();
  }
}
