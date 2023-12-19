import DbWorker from "@db/db.worker?worker"; // ref: https://ja.vitejs.dev/guide/features.html#%E3%82%AF%E3%82%A8%E3%83%AA%E3%82%B5%E3%83%95%E3%82%A3%E3%83%83%E3%82%AF%E3%82%B9%E3%81%AB%E3%82%88%E3%82%8B%E3%82%A4%E3%83%B3%E3%83%9B%E3%82%9A%E3%83%BC%E3%83%88
import { customLogger } from "@utils/logger";
import type {
  DbWorkerMessage,
  DbWorkerResult,
  DbWorkerResultValue,
  TargetFunctionName,
} from "./db.worker.types";

export async function startDbWorker<T extends TargetFunctionName>(
  dbWorkerMessage: DbWorkerMessage<T>,
): Promise<DbWorkerResultValue<T>> {
  return new Promise((resolve) => {
    const dbWorker: Worker = new DbWorker();

    // Listen for a message from webworker announcing the end of processing
    dbWorker.addEventListener(
      "message",
      (message: MessageEvent<DbWorkerResult<T>>) => {
        dbWorker.terminate();
        customLogger.finished(message.data.log);
        return resolve(message.data.value);
      },
    );

    dbWorker.postMessage(dbWorkerMessage);
  });
}
