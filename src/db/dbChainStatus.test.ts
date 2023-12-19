import { DB_NAME, DB_VERSIONS } from "@db/constants";
import { afterEach, describe, expect, test, vi } from "vitest";
import { dbChainStatus, initialDataChainStatus } from "./dbChainStatus";
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
      unique: false,
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
