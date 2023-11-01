import { describe, expect, test } from "vitest";
import { storeRpcSettings } from "./storeRpcSettings";
import type { StateRpcSettings } from "./storeTypes";
import { get } from "svelte/store";
import type { Chain } from "@constants/chains/types";
import { TARGET_CHAINS } from "@constants/chains/_index";
import { initialDataRpcSetting, type RpcSetting } from "@db/dbTypes";

describe("storeRpcSettings", () => {
  test.each<Chain>(TARGET_CHAINS)(
    `should have the initial value: chainName "$name"`,
    (targetChain: Chain) => {
      const currenttStateRpcSettings: StateRpcSettings = get(storeRpcSettings);
      expect(currenttStateRpcSettings).toHaveProperty(targetChain.name);
      expect(currenttStateRpcSettings[targetChain.name]).toEqual(
        initialDataRpcSetting(targetChain),
      );
    },
  );
  test("should set with the value of the argument passed", () => {
    const testChainName: string = "testChainName";
    const rpcSetting: RpcSetting = {
      chainName: "chainName1",
      rpc: "rpc",
      bulkUnit: 1,
      chainExplorerIndex: 2,
      blockIntervalMs: 3,
      tryCount: 4,
      abortWatchIntervalMs: 5,
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
  test("should update state with the value passed", () => {
    const chainNameEth: Chain["name"] = "eth";
    const rpcSetting: RpcSetting = {
      chainName: chainNameEth,
      rpc: "rpcUpdated",
      bulkUnit: 10,
      chainExplorerIndex: 20,
      blockIntervalMs: 30,
      tryCount: 40,
      abortWatchIntervalMs: 50,
      inputType: "text",
    };
    // set test data to the store by using `updateState`
    storeRpcSettings.updateState(chainNameEth, rpcSetting);

    const currenttStateRpcSettings: StateRpcSettings = get(storeRpcSettings);

    expect(currenttStateRpcSettings).toHaveProperty(chainNameEth);
    expect(currenttStateRpcSettings[chainNameEth]).toEqual(rpcSetting);
  });
});
