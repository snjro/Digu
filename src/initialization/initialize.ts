import { initializeDB } from "./initializeDB";
import { initializeStore } from "./initializeStore";
import { browser } from "$app/env";
import { customLogger } from "@utils/logger";
import { watchSyncLocksOfOtherTabs } from "@eventLogs/syncLock";
import { watchSyncResetsOfOtherTabs } from "@eventLogs/syncReset";
import { watchRpcSettings } from "./watchRpcSettings";

let initialization: Promise<void> | undefined;

// SvelteKit 3 runs the load of +layout.ts again when a link to the current page
// is clicked. Run again, watchSyncLocksOfOtherTabs takes this tab's own sync for
// another tab's. A failed run is forgotten, so the next load tries again.
export function initialize(): Promise<void> {
  initialization ??= initializeOnce().catch((error: unknown) => {
    initialization = undefined;
    throw error;
  });
  return initialization;
}

// For the tests.
export function forgetInitialization(): void {
  initialization = undefined;
}

async function initializeOnce(): Promise<void> {
  if (browser) {
    customLogger.start("initializeDB");
    await initializeDB();
    customLogger.finished("initializeDB");
    customLogger.start("initializeStore");
    await initializeStore();
    customLogger.finished("initializeStore");
    watchRpcSettings();
    watchSyncResetsOfOtherTabs();
    await watchSyncLocksOfOtherTabs();
  }
}
