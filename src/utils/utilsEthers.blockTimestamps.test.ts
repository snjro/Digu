import { describe, expect, test, vi } from "vitest";
import { JsonRpcProvider, Network, toQuantity, type LogParams } from "ethers";
import { TARGET_CHAINS } from "#constants/chains/_index.js";
import type { Chain } from "#constants/chains/types.js";
import { getBlockTimestampFromLogs, getNodeProvider } from "./utilsEthers";

// A bound of 3, so that the maps turn at blocks 3 and 6.
vi.mock("./blockTimestamps", async (importOriginal) => {
  const original = await importOriginal<typeof import("./blockTimestamps")>();
  return {
    ...original,
    BlockTimestamps: class extends original.BlockTimestamps {
      constructor() {
        super(3);
      }
    },
  };
});
vi.mock("#db/dbChainStatusDataHandlers.js", () => ({
  updateDbItemChainStatus: vi.fn(),
}));

const targetChain: Chain = TARGET_CHAINS[0];

describe("the block times that a provider keeps", () => {
  test("should keep the blocks of an answer that fills the map of the current blocks", async () => {
    vi.spyOn(JsonRpcProvider.prototype, "getNetwork").mockResolvedValue(
      Network.from(targetChain.chainId),
    );
    const nodeProvider = (await getNodeProvider(targetChain, "https://bar"))!;
    const network: Network = Network.from(targetChain.chainId);
    const keep = (blockNumber: number): void => {
      nodeProvider._wrapLog(
        {
          address: "0x" + "1".repeat(40),
          data: "0x",
          topics: [],
          blockNumber: toQuantity(blockNumber),
          blockHash: "0x" + "b".repeat(64),
          transactionHash: "0x" + "a".repeat(64),
          transactionIndex: "0x0",
          logIndex: "0x0",
          removed: false,
          blockTimestamp: toQuantity(blockNumber * 10),
        } as unknown as LogParams,
        network,
      );
    };
    const timestampsOf = (blockNumbers: number[]): (number | undefined)[] =>
      blockNumbers.map((blockNumber: number) =>
        getBlockTimestampFromLogs(nodeProvider, blockNumber),
      );
    keep(1);
    keep(2);

    // An answer whose first block fills the map of the current blocks.
    [3, 4, 5].forEach(keep);
    expect(timestampsOf([1, 2, 3, 4, 5])).toEqual([10, 20, 30, 40, 50]);

    keep(6);
    expect(timestampsOf([1, 2, 3, 4, 5, 6])).toEqual([
      undefined,
      undefined,
      undefined,
      40,
      50,
      60,
    ]);
    await nodeProvider.destroy();
    vi.restoreAllMocks();
  });
});
