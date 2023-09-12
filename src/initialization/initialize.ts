import { initializeDB } from "./initializeDB";
import { initializeStore } from "./initializeStore";
import { browser } from "$app/environment";
import { myLogger } from "@utils/logger";

export async function initialize(): Promise<void> {
  if (browser) {
    myLogger.start("initializeDB");
    await initializeDB();
    myLogger.finished("initializeDB");
    myLogger.start("initializeStore");
    await initializeStore();
    myLogger.finished("initializeStore");
  }
}
