import { beforeEach, describe, expect, test, vi } from "vitest";
import type { ChainStatus } from "#db/dbTypes.js";
import type { StateChainStatuses } from "./storeTypes";
import { initialDataChainStatus } from "#db/dbChainStatus.js";
import { get } from "svelte/store";
import type { Chain } from "#constants/chains/types.js";
import { TARGET_CHAINS } from "#constants/chains/_index.js";

const chainNames: Chain["name"][] = TARGET_CHAINS.map((targetChain: Chain) => {
  return targetChain.name;
});

// Import a fresh store for each test, so that no test depends on the state
// left by another test.
async function importStoreChainStatus() {
  return (await import("./storeChainStatus")).storeChainStatus;
}

describe("storeChhainStatus", () => {
  beforeEach(() => {
    vi.resetModules();
  });
  test.each<Chain["name"]>(chainNames)(
    `should have the initial value: chainName "%s"`,
    async (chainName: Chain["name"]) => {
      const storeChainStatus = await importStoreChainStatus();
      const currenttStateChainStatuses: StateChainStatuses =
        get(storeChainStatus);
      expect(currenttStateChainStatuses).toHaveProperty(chainName);
      expect(currenttStateChainStatuses[chainName]).toEqual(
        initialDataChainStatus(chainName),
      );
    },
  );
  test("should set with the value of the argument passed", async () => {
    const storeChainStatus = await importStoreChainStatus();
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
  test("should update state with the value passed", async () => {
    const storeChainStatus = await importStoreChainStatus();
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
  test("should update the current value, not the initial value", async () => {
    const storeChainStatus = await importStoreChainStatus();
    const chainNameEth: Chain["name"] = "eth";
    const chainStatuses: StateChainStatuses = {
      [chainNameEth]: {
        chainName: chainNameEth,
        latestBlockNumber: 300,
        nodeStatus: "CONNECTING",
      },
    };
    storeChainStatus.set(chainStatuses);
    storeChainStatus.updateState(chainNameEth, { nodeStatus: "SUCCESS" });

    expect(get(storeChainStatus)).toStrictEqual({
      [chainNameEth]: {
        chainName: chainNameEth,
        latestBlockNumber: 300,
        nodeStatus: "SUCCESS",
      },
    });
    // The object passed to `set` is not changed.
    expect(chainStatuses[chainNameEth].nodeStatus).toBe("CONNECTING");
  });
  describe("raiseLatestBlockNumber", () => {
    const chainNameEth: Chain["name"] = "eth";
    test("should raise the latest block, and keep the other items", async () => {
      const storeChainStatus = await importStoreChainStatus();
      storeChainStatus.updateState(chainNameEth, {
        latestBlockNumber: 100,
        nodeStatus: "SUCCESS",
      });

      storeChainStatus.raiseLatestBlockNumber(chainNameEth, 110);

      expect(get(storeChainStatus)[chainNameEth]).toStrictEqual({
        chainName: chainNameEth,
        latestBlockNumber: 110,
        nodeStatus: "SUCCESS",
      });
    });
    test.each([100, 90])(
      "should not lower or notify a store at 100 with %s",
      async (latestBlockNumber: number) => {
        const storeChainStatus = await importStoreChainStatus();
        storeChainStatus.updateState(chainNameEth, { latestBlockNumber: 100 });
        const notified: StateChainStatuses[] = [];
        const unsubscribe = storeChainStatus.subscribe((state) =>
          notified.push(state),
        );

        storeChainStatus.raiseLatestBlockNumber(
          chainNameEth,
          latestBlockNumber,
        );
        unsubscribe();

        // Only the call of subscribe.
        expect(notified).toHaveLength(1);
        expect(get(storeChainStatus)[chainNameEth].latestBlockNumber).toBe(100);
      },
    );
  });
});
