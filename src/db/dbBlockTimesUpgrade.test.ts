import "fake-indexeddb/auto";
import Dexie from "dexie";
import { expect, test } from "vitest";
import { TARGET_CHAINS } from "#constants/chains/_index.js";
import { dbBlockTimes } from "./dbBlockTimes";
import type { BlockTime } from "./dbTypes";

test("the upgrade to version 2 deletes the table of matic and keeps the others (#809)", async () => {
  const chainName: string = TARGET_CHAINS[0].name;
  const blockTime: BlockTime = {
    blockNumber: 1,
    timestamp: 1,
    isoDatetime: "",
  };
  await Dexie.delete(dbBlockTimes.name);
  // The database of version 1, which v1.7.0 and before made.
  const oldDb = new Dexie(dbBlockTimes.name);
  oldDb.version(1).stores({ [chainName]: "blockNumber", matic: "blockNumber" });
  await oldDb.table(chainName).add(blockTime);
  await oldDb.table("matic").add(blockTime);
  oldDb.close();

  // call target
  await dbBlockTimes.open();

  expect([...dbBlockTimes.backendDB().objectStoreNames]).toEqual([chainName]);
  expect(await dbBlockTimes.table(chainName).toArray()).toEqual([blockTime]);
  dbBlockTimes.close();
  await Dexie.delete(dbBlockTimes.name);
});
