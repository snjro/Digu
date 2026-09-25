import type { AbiFragmentIdentifier } from "./dbTypes";
import { dbWorkerFuncGetConvertedEventLogs } from "./db.worker.func.getConvertedEventLogs";
import { dbWorkerFuncInitializeDBSettings } from "./db.worker.func.InitializeDBSettings";
import { dbWorkerFuncInitializeDBSyncStatus } from "./db.worker.func.InitializeDBSyncStatus";
import type {
  DbWorkerMessageParams,
  DbWorkerResultValue,
  TargetFunctionName,
} from "./db.worker.types";

export async function executeTargetFunction<T extends TargetFunctionName>(
  targetFunctionName: T,
  params: DbWorkerMessageParams<T>,
): Promise<DbWorkerResultValue<TargetFunctionName>> {
  let resultValue: DbWorkerResultValue<TargetFunctionName> =
    targetFunctionName === "getConvertedEventLogs" ? [] : undefined;

  switch (targetFunctionName) {
    case "initializeDBSyncStatus":
      await dbWorkerFuncInitializeDBSyncStatus();
      break;
    case "initializeDbSettings":
      await dbWorkerFuncInitializeDBSettings();
      break;
    case "getConvertedEventLogs":
      resultValue = await dbWorkerFuncGetConvertedEventLogs(
        params as AbiFragmentIdentifier,
      );
      break;
  }
  return resultValue;
}
