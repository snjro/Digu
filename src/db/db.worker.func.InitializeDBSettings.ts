import { addInitialData } from "./dbSettingsDataHandlers";

export async function dbWorkerFuncInitializeDBSettings(): Promise<void> {
  await addInitialData();
}
