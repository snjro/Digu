import type { AbiFragmentIdentifier, ConvertedEventLog } from "./dbTypes";
import { customLogger } from "@utils/logger";
import { dbWorkerFuncGetConvertedEventLogs } from "./db.worker.func.getConvertedEventLogs";
import { dbWorkerFuncInitializeDBSettings } from "./db.worker.func.InitializeDBSettings";
import { dbWorkerFuncInitializeDBSyncStatus } from "./db.worker.func.InitializeDBSyncStatus";

export type TargetFunctionName =
  | "initializeDBSyncStatus"
  | "initializeDbSettings"
  | "getConvertedEventLogs";

type DbWorkerMessageParams<T extends TargetFunctionName> =
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

addEventListener(
  "message",
  async (
    event: MessageEvent<DbWorkerMessage<TargetFunctionName>>,
  ): Promise<void> => {
    const targetFunctionName: TargetFunctionName =
      event.data.targetFunctionName;

    const log: string = `DbWorker: ${targetFunctionName}`;
    customLogger.start(log);

    const resultValue: DbWorkerResultValue<TargetFunctionName> =
      await executeTargetFunction(
        event.data.targetFunctionName,
        event.data.params,
      );

    postMessage({
      log: log,
      value: resultValue,
    });
  },
);

async function executeTargetFunction<T extends TargetFunctionName>(
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
    default:
      break;
  }
  return resultValue;
}
