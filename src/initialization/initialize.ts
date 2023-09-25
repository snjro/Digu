import { initializeDB } from "./initializeDB";
import { initializeStore } from "./initializeStore";
import { browser } from "$app/environment";
import { customLogger } from "@utils/logger";

export async function initialize(): Promise<void> {
  if (browser) {
    customLogger.start("initializeDB");
    await initializeDB();
    customLogger.finished("initializeDB");
    customLogger.start("initializeStore");
    await initializeStore();
    customLogger.finished("initializeStore");
  }
}
