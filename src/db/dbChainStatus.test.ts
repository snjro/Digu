import "fake-indexeddb/auto";
import { DB_NAME, DB_TABLE_NAMES, DB_VERSIONS } from "@db/constants";
import { afterEach, describe, expect, test, vi } from "vitest";
import {
  addInitialDataOfDbChainStatus,
  dbChainStatus,
  initialDataChainStatus,
} from "./dbChainStatus";
import { TARGET_CHAINS } from "@constants/chains/_index";

vi.mock("@constants/chains/_index", () => ({
  TARGET_CHAINS: [{ name: "chain1" }, { name: "chain2" }],
}));

describe("DbChainStatus", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("should set up the database with the correct version number", () => {
    expect(dbChainStatus.verno).toBe(DB_VERSIONS.ChainStatus);
  });
  test("should set up the database with the correct DB name", () => {
    expect(dbChainStatus.name).toBe(
      [DB_NAME.firstName, DB_NAME.secondNames.chainStatus].join("_"),
    );
  });

  test("should set up the database with the correct schema definition", () => {
    const targetDbSchema =
      dbChainStatus._dbSchema[DB_NAME.secondNames.chainStatus];
    expect(targetDbSchema.name).toBe(DB_NAME.secondNames.chainStatus);
    expect(targetDbSchema.primKey).toEqual({
      auto: false,
      compound: false,
      keyPath: "chainName",
      multi: false,
      name: "chainName",
      src: "chainName",
      unique: true,
    });
  });

  test("should generate initial data for ChainStatus", () => {
    const testChainName = TARGET_CHAINS[0].name;
    const initialData = initialDataChainStatus(testChainName);
    expect(initialData).toEqual({
      chainName: testChainName,
      latestBlockNumber: 0,
      nodeStatus: undefined,
    });
  });
});

describe("addInitialDataOfDbChainStatus", () => {
  test("should add the rows of the chains added after the database was created", async () => {
    const table = dbChainStatus.table(DB_TABLE_NAMES.ChainStatus);
    await dbChainStatus.open();
    // make the database created with the constants before "chain2" was added
    await table.delete("chain2");
    await table.update("chain1", { latestBlockNumber: 100 });

    // call target
    await addInitialDataOfDbChainStatus();

    // "chain2" gets the initial data, and "chain1" is kept
    expect(await table.toArray()).toEqual([
      { ...initialDataChainStatus("chain1"), latestBlockNumber: 100 },
      initialDataChainStatus("chain2"),
    ]);
  });
});
