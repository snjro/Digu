import "fake-indexeddb/auto";
import { afterEach, describe, expect, test, vi } from "vitest";
import { get } from "svelte/store";
import type { Subscription } from "dexie";
import { DB_TABLE_NAMES } from "#db/constants.js";
import { addInitialDataOfDbSettings, dbSettings } from "#db/dbSettings.js";
import { initialDataRpcSetting } from "#db/dbTypes.js";
import { getTargetChain } from "#utils/utilsDb.js";
import { storeRpcSettings } from "#stores/storeRpcSettings.js";
import { watchRpcSettings } from "./watchRpcSettings";

const table = () => dbSettings.table(DB_TABLE_NAMES.Settings.rpcSettings);

describe("watchRpcSettings", () => {
  let subscription: Subscription | undefined;
  afterEach(() => {
    subscription?.unsubscribe();
  });

  test("updates the store when the DB is written without going through the store", async () => {
    await addInitialDataOfDbSettings();
    const initialRpc: string = initialDataRpcSetting(
      getTargetChain({ chainName: "eth" }),
    ).rpc;
    storeRpcSettings.updateState("eth", { rpc: "https://stale" });
    subscription = watchRpcSettings();
    // Wait for the first result, so the check below sees a change, not it.
    await vi.waitFor(() => {
      expect(get(storeRpcSettings).eth.rpc).toBe(initialRpc);
    });

    // Written like another tab does: the DB only, not this tab's store.
    await table().update("eth", {
      inputType: "password",
      rpc: "https://other-tab",
    });

    await vi.waitFor(() => {
      expect(get(storeRpcSettings).eth.inputType).toBe("password");
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
    await table().update("eth", { rpc: "https://first" });
    await vi.waitFor(() => {
      expect(get(storeRpcSettings).eth.rpc).toBe("https://first");
    });

    subscription.unsubscribe();
    await table().update("eth", { rpc: "https://second" });
    // Give liveQuery time to deliver a change if it were still subscribed.
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(get(storeRpcSettings).eth.rpc).toBe("https://first");
  });

  test("subscribes again after the previous subscription is closed", () => {
    const first: Subscription = watchRpcSettings();
    first.unsubscribe();

    subscription = watchRpcSettings();

    expect(subscription).not.toBe(first);
    expect(subscription.closed).toBe(false);
  });
});
