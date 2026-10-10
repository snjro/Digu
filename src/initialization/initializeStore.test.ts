import "fake-indexeddb/auto";
import { expect, test, vi } from "vitest";
import { get } from "svelte/store";
import { TARGET_CHAINS } from "#constants/chains/_index.js";
import * as chainStatusHandlers from "#db/dbChainStatusDataHandlers.js";
import type { ChainStatus } from "#db/dbTypes.js";
import { storeChainStatus } from "#stores/storeChainStatus.js";
import { initializeStore } from "./initializeStore";

vi.mock("#utils/logger.js", () => ({
  customLogger: class {
    static start() {}
    static finished() {}
    static fail() {}
    static error() {}
    static fatal() {}
    static warn() {}
    static debug() {}
  },
}));

const chainName = TARGET_CHAINS[0].name;

test("does not lower the latest block that another writer raised after the read", async () => {
  await initializeStore();
  await chainStatusHandlers.updateDbItemChainStatus(
    chainName,
    "nodeStatus",
    "SUCCESS",
  );
  await chainStatusHandlers.raiseDbLatestBlockNumber(chainName, 100);
  // The DB, not the store, gives the other items.
  storeChainStatus.updateState(chainName, { nodeStatus: undefined });
  const { getDbRecordChainStatus, raiseDbLatestBlockNumber } =
    chainStatusHandlers;
  vi.spyOn(chainStatusHandlers, "getDbRecordChainStatus").mockImplementation(
    async (...args) => {
      const record: ChainStatus = await getDbRecordChainStatus(...args);
      // A raise that commits between the read and the write of the store.
      if (args[0] === chainName) await raiseDbLatestBlockNumber(chainName, 110);
      return record;
    },
  );

  await initializeStore();

  expect(get(storeChainStatus)[chainName]).toStrictEqual({
    chainName,
    latestBlockNumber: 110,
    nodeStatus: "SUCCESS",
  });
});
