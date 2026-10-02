import type {
  ImportWarpSyncFileParams,
  ImportWarpSyncFileResult,
} from "#warpSync/warpSyncImportFile.js";
import type { AbiFragmentIdentifier, ConvertedEventLog } from "./dbTypes";

export type TargetFunctionName =
  | "initializeDBSyncStatus"
  | "initializeDbSettings"
  | "getConvertedEventLogs"
  | "importWarpSyncFile";

export type DbWorkerMessageParams<T extends TargetFunctionName> =
  T extends "getConvertedEventLogs"
    ? AbiFragmentIdentifier
    : T extends "importWarpSyncFile"
      ? ImportWarpSyncFileParams
      : undefined;

export type DbWorkerMessage<T extends TargetFunctionName> = {
  targetFunctionName: T;
  params: DbWorkerMessageParams<T>;
};
export type DbWorkerResultValue<T extends TargetFunctionName> =
  T extends "getConvertedEventLogs"
    ? ConvertedEventLog[]
    : T extends "importWarpSyncFile"
      ? ImportWarpSyncFileResult
      : undefined;

export type DbWorkerResult<T extends TargetFunctionName> =
  | { log: string; value: DbWorkerResultValue<T> }
  | { log: string; error: string };
