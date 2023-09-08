import DbWorker from "@db/db.worker?worker";
import type { DbWorkerMessage } from "@db/db.worker";
import { myLogger } from "@utils/logger";

export async function initializeDB(): Promise<void> {
  await Promise.all([
    initializeDbByWorker("initializeDbSettings"),
    initializeDbByWorker("initializeDBSyncStatus"),
  ]);
}

async function initializeDbByWorker(
  targetFunctionName: DbWorkerMessage["targetFunctionName"],
): Promise<void> {
  return new Promise((resolve) => {
    let dbWorker: Worker = new DbWorker();

    dbWorker.addEventListener("message", (message: MessageEvent<string>) => {
      dbWorker.terminate();
      myLogger.info(message.data);
      return resolve();
    });

    const dbWorkerMessage: DbWorkerMessage = {
      targetFunctionName: targetFunctionName,
    };

    dbWorker.postMessage(dbWorkerMessage);
  });
}
