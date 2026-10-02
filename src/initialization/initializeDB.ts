import { startDbWorker } from "#db/db.worker.portal.js";

export async function initializeDB(): Promise<void> {
  await Promise.all([
    startDbWorker({
      targetFunctionName: "initializeDbSettings",
      params: undefined,
    }),
    startDbWorker({
      targetFunctionName: "initializeDBSyncStatus",
      params: undefined,
    }),
  ]);
}
