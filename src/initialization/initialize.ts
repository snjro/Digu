import { initializeDB } from "./initializeDB";
import { initializeStore } from "./initializeStore";
import { browser } from "$app/environment";

export async function initialize(): Promise<void> {
  if (browser) {
    await initializeDB();
    await initializeStore();
  }
}
