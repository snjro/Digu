import "fake-indexeddb/auto";
import { afterEach, describe, expect, test, vi } from "vitest";
import { get } from "svelte/store";
import type { Subscription } from "dexie";
import { DB_TABLE_NAMES } from "@db/constants";
import { addInitialDataOfDbSettings, dbSettings } from "@db/dbSettings";
import { storeRpcSettings } from "@stores/storeRpcSettings";
import { watchRpcSettings } from "./watchRpcSettings";

const table = () => dbSettings.table(DB_TABLE_NAMES.Settings.rpcSettings);

describe("watchRpcSettings", () => {
  let subscription: Subscription | undefined;
  afterEach(() => {
    subscription?.unsubscribe();
  });

  test("updates the store when the DB is written without going through the store", async () => {
    await addInitialDataOfDbSettings();
    storeRpcSettings.updateState("eth", { bulkUnit: 1 });
    subscription = watchRpcSettings();
    // Wait for the first result, so the check below sees a change, not it.
    await vi.waitFor(() => {
      expect(get(storeRpcSettings).eth.bulkUnit).toBe(100);
    });

    // Written like another tab does: the DB only, not this tab's store.
    await table().update("eth", { bulkUnit: 321, rpc: "https://other-tab" });

    await vi.waitFor(() => {
      expect(get(storeRpcSettings).eth.bulkUnit).toBe(321);
    });
    expect(get(storeRpcSettings).eth.rpc).toBe("https://other-tab");
  });

  test("returns the same subscription while it is open", () => {
    subscription = watchRpcSettings();

    expect(watchRpcSettings()).toBe(subscription);
  });

  test("stops updating the store after unsubscribing", async () => {
    await addInitialDataOfDbSettings();
    subscription = watchRpcSettings();
    await table().update("eth", { tryCount: 7 });
    await vi.waitFor(() => {
      expect(get(storeRpcSettings).eth.tryCount).toBe(7);
    });

    subscription.unsubscribe();
    await table().update("eth", { tryCount: 8 });
    // Give liveQuery time to deliver a change if it were still subscribed.
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(get(storeRpcSettings).eth.tryCount).toBe(7);
  });

  test("subscribes again after the previous subscription is closed", () => {
    const first: Subscription = watchRpcSettings();
    first.unsubscribe();

    subscription = watchRpcSettings();

    expect(subscription).not.toBe(first);
    expect(subscription.closed).toBe(false);
  });
});
