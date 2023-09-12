import DbWorker from "@db/db.worker?worker";
import type {
  DbWorkerMessage,
  DbWorkerResult,
  DbWorkerResultValue,
  TargetFunctionName,
} from "@db/db.worker";
import { myLogger } from "@utils/logger";

export async function startDbWorker<T extends TargetFunctionName>(
  dbWorkerMessage: DbWorkerMessage<T>,
): Promise<DbWorkerResultValue<T>> {
  return new Promise((resolve) => {
    let dbWorker: Worker = new DbWorker();

    dbWorker.addEventListener(
      "message",
      (message: MessageEvent<DbWorkerResult<T>>) => {
        dbWorker.terminate();
        myLogger.finished(message.data.log);
        return resolve(message.data.value);
      },
    );

    dbWorker.postMessage(dbWorkerMessage);
  });
}
