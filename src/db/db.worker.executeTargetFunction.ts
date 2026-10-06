import { dbWorkerFuncInitializeDBSettings } from "./db.worker.func.InitializeDBSettings";
import { dbWorkerFuncInitializeDBSyncStatus } from "./db.worker.func.InitializeDBSyncStatus";
import type {
  DbWorkerMessageParams,
  DbWorkerResultValue,
  TargetFunctionName,
} from "./db.worker.types";
import {
  importWarpSyncFile,
  type ImportWarpSyncFileParams,
} from "#warpSync/warpSyncImportFile.js";

export async function executeTargetFunction<T extends TargetFunctionName>(
  targetFunctionName: T,
  params: DbWorkerMessageParams<T>,
): Promise<DbWorkerResultValue<TargetFunctionName>> {
  let resultValue: DbWorkerResultValue<TargetFunctionName> = undefined;

  switch (targetFunctionName) {
    case "initializeDBSyncStatus":
      await dbWorkerFuncInitializeDBSyncStatus();
      break;
    case "initializeDbSettings":
      await dbWorkerFuncInitializeDBSettings();
      break;
    case "importWarpSyncFile":
      resultValue = await importWarpSyncFile(
        params as ImportWarpSyncFileParams,
      );
      break;
  }
  return resultValue;
}
