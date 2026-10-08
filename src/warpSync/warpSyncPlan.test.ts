import { afterEach, describe, expect, test, vi } from "vitest";
import { TARGET_CHAINS } from "#constants/chains/_index.js";
import type { Chain, Contract } from "#constants/chains/types.js";
import {
  getNextBlock,
  getRangeAction,
  getWarpSyncEnd,
  getWarpSyncKey,
  matchWarpSyncContracts,
} from "./warpSyncPlan";
import type {
  WarpSyncManifest,
  WarpSyncManifestContract,
} from "./warpSyncTypes";
import { getTargetContract } from "#utils/utilsDb.js";

// The real one, which a test makes fail once.
vi.mock("#utils/utilsDb.js", async (importOriginal) => {
  const original = await importOriginal<typeof import("#utils/utilsDb.js")>();
  return {
    ...original,
    getTargetContract: vi.fn(original.getTargetContract),
  };
});

const matic: Chain = TARGET_CHAINS.find((chain) => chain.name === "matic")!;
const turbo = matic.projects[0].versions[0];
const [first, second]: Contract[] = turbo.contracts;

function manifestContract(contract: Contract): WarpSyncManifestContract {
  return {
    project: matic.projects[0].name,
    version: turbo.name,
    name: contract.name,
    address: contract.address,
    creationBlock: contract.creation.blockNumber,
  };
}
function manifest(contracts: WarpSyncManifestContract[]): WarpSyncManifest {
  return {
    formatVersion: 3,
    chainName: "matic",
    chainId: 137,
    contracts,
    runs: [],
    chunks: [],
    totals: { logCount: 0, bytes: 0, rawBytes: 0 },
  };
}

describe("matchWarpSyncContracts", () => {
  test("matches the contracts with the same names, address and creation block", () => {
    const targets = matchWarpSyncContracts(
      matic.name,
      manifest([manifestContract(first), manifestContract(second)]),
    );
    const target = targets.get(getWarpSyncKey(manifestContract(first)));
    expect(targets.size).toBe(2);
    expect(target?.contract).toBe(first);
    expect(target?.versionIdentifier).toEqual({
      chainName: "matic",
      projectName: matic.projects[0].name,
      versionName: turbo.name,
    });
  });
  test("matches an address in another case", () => {
    const contract = manifestContract(first);
    const targets = matchWarpSyncContracts(
      matic.name,
      manifest([
        {
          ...contract,
          address: contract.address.toUpperCase() as `0x${string}`,
        },
      ]),
    );
    expect(targets.size).toBe(1);
  });
  test.each([
    [
      "another address",
      { address: "0x0000000000000000000000000000000000000001" },
    ],
    ["another creation block", { creationBlock: 1 }],
    ["an unknown contract", { name: "Unknown" }],
    ["an unknown version", { version: "unknown" }],
    ["an unknown project", { project: "unknown" }],
  ])("skips %s and keeps the others", (_, change) => {
    const targets = matchWarpSyncContracts(
      matic.name,
      manifest([
        { ...manifestContract(first), ...change } as WarpSyncManifestContract,
        manifestContract(second),
      ]),
    );
    expect([...targets.values()].map((target) => target.contract)).toEqual([
      second,
    ]);
  });
});

describe("matchWarpSyncContracts when finding a contract fails otherwise", () => {
  afterEach(() => {
    vi.mocked(getTargetContract).mockReset();
  });
  test("throws the error", () => {
    const error: Error = new Error("broken");
    vi.mocked(getTargetContract).mockImplementationOnce(() => {
      throw error;
    });

    expect(() =>
      matchWarpSyncContracts(matic.name, manifest([manifestContract(first)])),
    ).toThrow(error);
  });
});

describe("getNextBlock", () => {
  test("is the creation block until something is fetched", () => {
    expect(getNextBlock(100, 100)).toBe(100);
  });
  test("is the block after the fetched one", () => {
    expect(getNextBlock(150, 100)).toBe(151);
  });
});

describe("getRangeAction", () => {
  const creation = 100;
  test.each([
    [
      "nothing fetched, a range from the creation",
      { fromBlock: 100, toBlock: 200 },
      100,
      "import",
    ],
    [
      "fetched to the middle of the range",
      { fromBlock: 100, toBlock: 200 },
      150,
      "import",
    ],
    [
      "fetched to the block before the range",
      { fromBlock: 201, toBlock: 300 },
      200,
      "import",
    ],
    [
      "fetched to the end of the range",
      { fromBlock: 100, toBlock: 200 },
      200,
      "skip",
    ],
    ["fetched past the range", { fromBlock: 100, toBlock: 200 }, 250, "skip"],
    [
      "a range after the next block",
      { fromBlock: 201, toBlock: 300 },
      150,
      "gap",
    ],
    [
      "nothing fetched, a range after the creation",
      { fromBlock: 201, toBlock: 300 },
      100,
      "gap",
    ],
  ] as const)("%s -> %s", (_, range, fetched, expected) => {
    expect(getRangeAction(range, fetched, creation)).toBe(expected);
  });
});

describe("getWarpSyncEnd", () => {
  test("is the last block of the contracts of the app", () => {
    const key = manifestContract(first);
    const other = { ...manifestContract(second), name: "Unknown" };
    const targets = matchWarpSyncContracts(matic.name, manifest([key]));
    const range = (name: string, toBlock: number) => ({
      project: key.project,
      version: key.version,
      name,
      fromBlock: 1,
      toBlock,
      logCount: 0,
    });
    const value: WarpSyncManifest = {
      ...manifest([key]),
      chunks: [
        { ...range(key.name, 200), file: null },
        { ...range(key.name, 300), file: null },
        { ...range(other.name, 900), file: null },
      ],
    };
    expect(getWarpSyncEnd(value, targets)).toBe(300);
    expect(getWarpSyncEnd(value, new Map())).toBeUndefined();
  });
});
