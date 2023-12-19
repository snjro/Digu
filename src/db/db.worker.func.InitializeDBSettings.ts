import { addInitialDataOfDbSettings } from "./dbSettings";

export async function dbWorkerFuncInitializeDBSettings(): Promise<void> {
  await addInitialDataOfDbSettings();
}
