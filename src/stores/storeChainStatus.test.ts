import { describe, expect, test } from "vitest";
import { storeChainStatus } from "./storeChainStatus";
import type { ChainStatus } from "@db/dbTypes";
import type { StateChainStatuses } from "./storeTypes";
import { initialDataChainStatus } from "@db/dbChainStatus";
import { get } from "svelte/store";
import type { Chain } from "@constants/chains/types";

const chainNames: Chain["name"][] = ["eth", "matic"];

describe("storeChhainStatus", () => {
  test.each<Chain["name"]>(chainNames)(
    `should have the initial value: chainName "%s"`,
    (chainName: string) => {
      const currenttStateChainStatuses: StateChainStatuses =
        get(storeChainStatus);
      expect(currenttStateChainStatuses).toHaveProperty(chainName);
      expect(currenttStateChainStatuses[chainName]).toEqual(
        initialDataChainStatus(chainName),
      );
    },
  );
  test("should set with the value of the argument passed", () => {
    const testChainName: string = "testChainName";
    const testChainStatus1: ChainStatus = {
      chainName: "chainName1",
      latestBlockNumber: 100,
      nodeStatus: "CONNECTING",
    };
    // set test data to the store by using `set`
    storeChainStatus.set({
      [testChainName]: testChainStatus1,
    });

    const currenttStateChainStatuses: StateChainStatuses =
      get(storeChainStatus);

    expect(currenttStateChainStatuses).toHaveProperty(testChainName);
    expect(currenttStateChainStatuses[testChainName]).toEqual(testChainStatus1);
  });
  test("should update state with the value passed", () => {
    const chainNameEth: Chain["name"] = "eth";
    const testChainStatus2: ChainStatus = {
      chainName: chainNameEth,
      latestBlockNumber: 200,
      nodeStatus: "INVALID_PROTOCOL",
    };
    // set test data to the store by using `updateState`
    storeChainStatus.updateState(chainNameEth, testChainStatus2);

    const currenttStateChainStatuses: StateChainStatuses =
      get(storeChainStatus);

    expect(currenttStateChainStatuses).toHaveProperty(chainNameEth);
    expect(currenttStateChainStatuses[chainNameEth]).toEqual(testChainStatus2);
  });
});
