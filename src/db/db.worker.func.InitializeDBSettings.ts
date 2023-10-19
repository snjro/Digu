import { addInitialData } from "./dbSettings";

export async function dbWorkerFuncInitializeDBSettings(): Promise<void> {
  await addInitialData();
}
