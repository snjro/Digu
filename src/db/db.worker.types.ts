import type { AbiFragmentIdentifier, ConvertedEventLog } from "./dbTypes";

export type TargetFunctionName =
  | "initializeDBSyncStatus"
  | "initializeDbSettings"
  | "getConvertedEventLogs";

export type DbWorkerMessageParams<T extends TargetFunctionName> =
  T extends "getConvertedEventLogs" ? AbiFragmentIdentifier : undefined;

export type DbWorkerMessage<T extends TargetFunctionName> = {
  targetFunctionName: T;
  params: DbWorkerMessageParams<T>;
};
export type DbWorkerResultValue<T extends TargetFunctionName> =
  T extends "getConvertedEventLogs" ? ConvertedEventLog[] : undefined;

export type DbWorkerResult<T extends TargetFunctionName> = {
  log: string;
  value: DbWorkerResultValue<T>;
};
