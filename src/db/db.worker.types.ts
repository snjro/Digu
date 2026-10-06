import type {
  ImportWarpSyncFileParams,
  ImportWarpSyncFileResult,
} from "#warpSync/warpSyncImportFile.js";
export type TargetFunctionName =
  "initializeDBSyncStatus" | "initializeDbSettings" | "importWarpSyncFile";

export type DbWorkerMessageParams<T extends TargetFunctionName> =
  T extends "importWarpSyncFile" ? ImportWarpSyncFileParams : undefined;

export type DbWorkerMessage<T extends TargetFunctionName> = {
  targetFunctionName: T;
  params: DbWorkerMessageParams<T>;
};
export type DbWorkerResultValue<T extends TargetFunctionName> =
  T extends "importWarpSyncFile" ? ImportWarpSyncFileResult : undefined;

export type DbWorkerResult<T extends TargetFunctionName> =
  | { log: string; value: DbWorkerResultValue<T> }
  | { log: string; error: string };
