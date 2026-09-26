import { customLogger } from "@utils/logger";
import { executeTargetFunction } from "./db.worker.executeTargetFunction";
import type {
  DbWorkerMessage,
  DbWorkerResultValue,
  TargetFunctionName,
} from "./db.worker.types";

// Listen for a message announcing the start of executing a function for DB
self.addEventListener(
  "message",
  (event: MessageEvent<DbWorkerMessage<TargetFunctionName>>): void => {
    // executeMessage() sends its errors back to the page.
    void executeMessage(event);
  },
);

async function executeMessage(
  event: MessageEvent<DbWorkerMessage<TargetFunctionName>>,
): Promise<void> {
  const targetFunctionName: TargetFunctionName = event.data.targetFunctionName;

  const log: string = `DbWorker: ${targetFunctionName}`;
  customLogger.start(log);

  try {
    const resultValue: DbWorkerResultValue<TargetFunctionName> =
      await executeTargetFunction(
        event.data.targetFunctionName,
        event.data.params,
      );
    postMessage({
      log: log,
      value: resultValue,
    });
  } catch (error) {
    // An error thrown here does not reach the page, so send it back.
    postMessage({
      log: log,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
