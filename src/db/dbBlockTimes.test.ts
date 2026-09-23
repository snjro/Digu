import "fake-indexeddb/auto";
import { afterEach, describe, expect, test, vi } from "vitest";
import { dbBlockTimes } from "./dbBlockTimes";
import { DB_NAME, DB_VERSIONS } from "./constants";
import { TARGET_CHAINS } from "@constants/chains/_index";

vi.mock("./constants", () => ({
  DB_NAME: {
    secondNames: {
      blockTimes: "mockBlockTimes",
    },
  },
  DB_VERSIONS: {
    BlockTimes: 1,
  },
}));

vi.mock("@constants/chains/_index", () => ({
  TARGET_CHAINS: [{ name: "chain1" }, { name: "chain2" }],
}));

describe("DbBlockTimes", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("should set up the database with the correct version number", () => {
    expect(dbBlockTimes.verno).toBe(DB_VERSIONS.BlockTimes);
  });
  test("should set up the database with the correct DB name", () => {
    expect(dbBlockTimes.name).toBe(
      [DB_NAME.firstName, DB_NAME.secondNames.blockTimes].join("_"),
    );
  });

  test("should set up the database with the correct schema definition", () => {
    const TABLE_BLOCKTIMES_COLUMN_NAMES = {
      blockNumber: "blockNumber",
    } as const;

    for (let i = 0; i < TARGET_CHAINS.length; i++) {
      const targetChainName = TARGET_CHAINS[i].name;
      const targetDbSchema = dbBlockTimes._dbSchema[targetChainName];
      expect(targetDbSchema.name).toBe(targetChainName);
      expect(targetDbSchema.primKey).toEqual({
        auto: false,
        compound: false,
        keyPath: TABLE_BLOCKTIMES_COLUMN_NAMES.blockNumber,
        multi: false,
        name: TABLE_BLOCKTIMES_COLUMN_NAMES.blockNumber,
        src: TABLE_BLOCKTIMES_COLUMN_NAMES.blockNumber,
        unique: true,
      });
    }
  });

  // DbBlockTimes has no initial data. It does not register "populate", and
  // "addInitialData" only implements the abstract method of dbBase.
  test("should do nothing in addInitialData", async () => {
    await expect(dbBlockTimes.addInitialData()).resolves.toBeUndefined();
  });
  test("should have no initial data after opening the database", async () => {
    await dbBlockTimes.open();
    for (const targetChain of TARGET_CHAINS) {
      expect(await dbBlockTimes.table(targetChain.name).count()).toBe(0);
    }
    dbBlockTimes.close();
  });
});
