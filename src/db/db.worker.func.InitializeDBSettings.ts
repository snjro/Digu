import { DbSettingsDataHandlers } from "./dbSettings";

export async function dbWorkerFuncInitializeDBSettings(): Promise<void> {
  await DbSettingsDataHandlers.addInitialData();
}
