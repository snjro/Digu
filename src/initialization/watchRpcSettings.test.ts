import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { get } from "svelte/store";
import type { Subscription } from "dexie";
import { DB_TABLE_NAMES } from "#db/constants.js";
import { addInitialDataOfDbSettings, dbSettings } from "#db/dbSettings.js";
import { initialDataRpcSetting } from "#db/dbTypes.js";
import { getTargetChain } from "#utils/utilsDb.js";
import { storeRpcSettings } from "#stores/storeRpcSettings.js";
import { storeSyncStoppedReason } from "#stores/storeSyncStoppedReason.js";
import { getNodeProvider, type NodeProvider } from "#utils/utilsEthers.js";
import { watchRpcSettings } from "./watchRpcSettings";

vi.mock("#utils/utilsEthers.js", () => ({ getNodeProvider: vi.fn() }));

const table = () => dbSettings.table(DB_TABLE_NAMES.Settings.rpcSettings);
const destroy = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getNodeProvider).mockResolvedValue({
    destroy,
  } as unknown as NodeProvider);
});

describe("watchRpcSettings", () => {
  let subscription: Subscription | undefined;
  afterEach(() => {
    subscription?.unsubscribe();
    storeSyncStoppedReason.set({});
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

  test("checks the new RPC and clears the stop reason when another tab changes the RPC", async () => {
    await addInitialDataOfDbSettings();
    subscription = watchRpcSettings();
    const rpc: string = await table()
      .get("eth")
      .then((rpcSetting) => rpcSetting.rpc);
    await vi.waitFor(() => {
      expect(get(storeRpcSettings).eth.rpc).toBe(rpc);
    });
    vi.clearAllMocks();
    storeSyncStoppedReason.record("eth", "RPC_ERRORS");

    await table().update("eth", { rpc: "https://other-tab-check" });

    await vi.waitFor(() => {
      expect(destroy).toHaveBeenCalled();
    });
    expect(getNodeProvider).toHaveBeenCalledTimes(1);
    expect(getNodeProvider).toHaveBeenCalledWith(
      getTargetChain({ chainName: "eth" }),
      "https://other-tab-check",
    );
    expect(get(storeSyncStoppedReason).eth).toBeUndefined();
  });

  test.each([
    { name: "inputType", change: { inputType: "password" } },
    { name: "warpSync", change: { warpSync: false } },
  ])(
    "does not check the RPC and keeps the stop reason when only $name changes",
    async ({ change }) => {
      await addInitialDataOfDbSettings();
      await table().update("eth", { inputType: "text", warpSync: true });
      subscription = watchRpcSettings();
      await vi.waitFor(() => {
        expect(get(storeRpcSettings).eth).toMatchObject({
          inputType: "text",
          warpSync: true,
        });
      });
      const rpc: string = get(storeRpcSettings).eth.rpc;
      vi.clearAllMocks();
      storeSyncStoppedReason.record("eth", "RPC_ERRORS");

      await table().update("eth", change);

      await vi.waitFor(() => {
        expect(get(storeRpcSettings).eth).toMatchObject(change);
      });
      expect(get(storeRpcSettings).eth.rpc).toBe(rpc);
      expect(getNodeProvider).not.toHaveBeenCalled();
      expect(get(storeSyncStoppedReason).eth).toBe("RPC_ERRORS");
    },
  );

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
