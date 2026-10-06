import type { AbiFragmentIdentifier } from "./dbTypes";
import type {
  EventLogsTableQuery,
  EventLogsTableQueryResult,
  EventLogsTableRefreshResult,
  EventLogsTableState,
} from "./eventLogsTable";

export type EventLogsTableRequestType = "open" | "query" | "refresh";
export type EventLogsTableRequestParams<T extends EventLogsTableRequestType> =
  T extends "open"
    ? { eventIdentifier: AbiFragmentIdentifier }
    : T extends "query"
      ? EventLogsTableQuery
      : undefined;
export type EventLogsTableResponseValue<T extends EventLogsTableRequestType> =
  T extends "open"
    ? EventLogsTableState
    : T extends "query"
      ? EventLogsTableQueryResult
      : EventLogsTableRefreshResult;

// The id pairs the response with its request.
export type EventLogsTableWorkerMessage<
  T extends EventLogsTableRequestType = EventLogsTableRequestType,
> = {
  id: number;
  type: T;
  params: EventLogsTableRequestParams<T>;
};
export type EventLogsTableWorkerResult<
  T extends EventLogsTableRequestType = EventLogsTableRequestType,
> =
  | { id: number; value: EventLogsTableResponseValue<T> }
  | { id: number; error: string };
