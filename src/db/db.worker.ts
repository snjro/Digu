import { customLogger } from "@utils/logger";
import { executeTargetFunction } from "./db.worker.executeTargetFuction";
import type {
  DbWorkerMessage,
  DbWorkerResultValue,
  TargetFunctionName,
} from "./db.worker.types";

// Listen for a message announcing the start of excuting a function for DB
self.addEventListener(
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
