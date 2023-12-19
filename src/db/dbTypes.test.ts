import type { Chain } from "@constants/chains/types";
import { describe, expect, test } from "vitest";
import {
  initialDataRpcSetting,
  initialDataUserSettings,
  syncStatusBaseBooleanKeys,
  syncStatusBaseNumberKeys,
  type UserSetting,
} from "./dbTypes";

describe("initialDataRpcSetting", () => {
  test("returns the correct RpcSetting object", () => {
    const dummyChain: Chain = {
      name: "TestChain",
      fullName: "TestChainFull",
      shortName: "TestChainShort",
      networkId: 999,
      chainId: 998,
      nativeCurrency: {
        name: "nativeCurrencyName",
        decimals: 9,
        symbol: "NTV",
      },
      faucets: [],
      chainExplorers: [],
      infoURL: "http://info-url",
      projects: [],
      chain: "chainFoo",
      rpc: ["http://test-rpc"],
      blockIntervalMs: 3000,
      tryCount: 3,
      abortWatchIntervalMs: 5000,
    };

    const result = initialDataRpcSetting(dummyChain);

    const expectedRpcSetting = {
      chainName: dummyChain.name,
      rpc: dummyChain.rpc![0],
      bulkUnit: 1000,
      chainExplorerIndex: 0,
      blockIntervalMs: dummyChain.blockIntervalMs,
      tryCount: dummyChain.tryCount,
      abortWatchIntervalMs: dummyChain.abortWatchIntervalMs,
      inputType: "text",
    };

    expect(result).toEqual(expectedRpcSetting);
  });
});

describe("initialDataUserSettings", () => {
  test("returns the correct UserSetting object", () => {
    const expectedUserSetting: UserSetting = {
      userSettingsId: "userSetting01",
      themeColor: "light",
      devMode: false,
      selectedChainName: "eth",
      isOpenSidebar: true,
    };
    expect(initialDataUserSettings).toEqual(expectedUserSetting);
  });
});

describe("syncStatusBaseNumberKeys", () => {
  test("returns the correct array", () => {
    const expectedSyncStatusBaseNumberKeys: string[] = [
      "fetchedBlockNumber",
      "creationBlockNumber",
      "numOfSyncTargetContract",
    ];
    expect(syncStatusBaseNumberKeys).toEqual(expectedSyncStatusBaseNumberKeys);
  });
});

describe("syncStatusBaseBooleanKeys", () => {
  test("returns the correct array", () => {
    const expectedSyncStatusBaseBooleanKeys: string[] = [
      "isAbort",
      "isSyncing",
      "isSyncTarget",
    ];
    expect(syncStatusBaseBooleanKeys).toEqual(
      expectedSyncStatusBaseBooleanKeys,
    );
  });
});
