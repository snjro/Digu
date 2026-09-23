import { beforeEach, describe, expect, test, vi } from "vitest";
import type { StateRpcSettings } from "./storeTypes";
import { get } from "svelte/store";
import type { Chain } from "@constants/chains/types";
import { TARGET_CHAINS } from "@constants/chains/_index";
import { initialDataRpcSetting, type RpcSetting } from "@db/dbTypes";

// Import a fresh store for each test, so that no test depends on the state
// left by another test.
async function importStoreRpcSettings() {
  return (await import("./storeRpcSettings")).storeRpcSettings;
}

describe("storeRpcSettings", () => {
  beforeEach(() => {
    vi.resetModules();
  });
  test.each<Chain>(TARGET_CHAINS)(
    `should have the initial value: chainName "$name"`,
    async (targetChain: Chain) => {
      const storeRpcSettings = await importStoreRpcSettings();
      const currenttStateRpcSettings: StateRpcSettings = get(storeRpcSettings);
      expect(currenttStateRpcSettings).toHaveProperty(targetChain.name);
      expect(currenttStateRpcSettings[targetChain.name]).toEqual(
        initialDataRpcSetting(targetChain),
      );
    },
  );
  test("should set with the value of the argument passed", async () => {
    const storeRpcSettings = await importStoreRpcSettings();
    const testChainName: string = "testChainName";
    const rpcSetting: RpcSetting = {
      chainName: "chainName1",
      rpc: "rpc",
      bulkUnit: 1,
      chainExplorerIndex: 2,
      blockIntervalMs: 3,
      tryCount: 4,
      inputType: "password",
    };
    // set test data to the store by using `set`
    storeRpcSettings.set({
      [testChainName]: rpcSetting,
    });

    const currenttStateRpcSettings: StateRpcSettings = get(storeRpcSettings);

    expect(currenttStateRpcSettings).toHaveProperty(testChainName);
    expect(currenttStateRpcSettings[testChainName]).toEqual(rpcSetting);
  });
  test("should update state with the value passed", async () => {
    const storeRpcSettings = await importStoreRpcSettings();
    const chainNameEth: Chain["name"] = "eth";
    const rpcSetting: RpcSetting = {
      chainName: chainNameEth,
      rpc: "rpcUpdated",
      bulkUnit: 10,
      chainExplorerIndex: 20,
      blockIntervalMs: 30,
      tryCount: 40,
      inputType: "text",
    };
    // set test data to the store by using `updateState`
    storeRpcSettings.updateState(chainNameEth, rpcSetting);

    const currenttStateRpcSettings: StateRpcSettings = get(storeRpcSettings);

    expect(currenttStateRpcSettings).toHaveProperty(chainNameEth);
    expect(currenttStateRpcSettings[chainNameEth]).toEqual(rpcSetting);
  });
  test("should update the current value, not the initial value", async () => {
    const storeRpcSettings = await importStoreRpcSettings();
    const chainNameEth: Chain["name"] = "eth";
    const rpcSetting: RpcSetting = {
      chainName: chainNameEth,
      rpc: "rpcSet",
      bulkUnit: 1,
      chainExplorerIndex: 2,
      blockIntervalMs: 3,
      tryCount: 4,
      inputType: "password",
    };
    const rpcSettings: StateRpcSettings = { [chainNameEth]: rpcSetting };
    storeRpcSettings.set(rpcSettings);
    storeRpcSettings.updateState(chainNameEth, { bulkUnit: 10 });

    expect(get(storeRpcSettings)).toStrictEqual({
      [chainNameEth]: { ...rpcSetting, bulkUnit: 10 },
    });
    // The object passed to `set` is not changed.
    expect(rpcSetting.bulkUnit).toBe(1);
  });
});
