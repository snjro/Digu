import MyWorker from "@db/db.worker?worker";
import type { DbWorkerMessage } from "@db/db.worker";
import { myLogger } from "@utils/logger";

export async function initializeDB(): Promise<void> {
  await Promise.all([
    callDbWorker("initializeDbSettings"),
    callDbWorker("initializeDBSyncStatus"),
  ]);
}

async function callDbWorker(
  targetFunctionName: DbWorkerMessage["targetFunctionName"],
): Promise<void> {
  return new Promise((resolve) => {
    let myWorker: Worker = new MyWorker();

    myWorker.addEventListener("message", (message: MessageEvent<string>) => {
      myWorker.terminate();
      myLogger.info(message.data);
      return resolve();
    });

    const dbWorkerMessage: DbWorkerMessage = {
      targetFunctionName: targetFunctionName,
    };

    myWorker.postMessage(dbWorkerMessage);
  });
}
