import "fake-indexeddb/auto";
import { beforeEach, describe, expect, test } from "vitest";
import { TARGET_CHAINS } from "@constants/chains/_index";
import type { Chain, Contract, Version } from "@constants/chains/types";
import { extractEventContracts } from "@utils/utilsEthers";
import { getEventLogTableName } from "@utils/utilsDb";
import Dexie from "dexie";
import { DB_TABLE_NAMES } from "./constants";
import { dbBlockTimes } from "./dbBlockTimes";
import {
  getDbRecordChainStatus,
  updateDbItemChainStatus,
} from "./dbChainStatusDataHandlers";
import { getDbEventLogs, type DbEventLogs } from "./dbEventLogs";
import { getInitialDataOfSyncStatusContract } from "./dbEventLogsAddInitialData";
import { resetDbSyncedData } from "./dbResetSyncedData";
import { dbSettings, getDbRecordRpcSettings } from "./dbSettings";
import type { BlockTime, SyncStatusContract } from "./dbTypes";

const matic: Chain = TARGET_CHAINS.find((chain) => chain.name === "matic")!;
const eth: Chain = TARGET_CHAINS.find((chain) => chain.name === "eth")!;

function firstVersion(chain: Chain): {
  db: DbEventLogs;
  version: Version;
  contract: Contract;
} {
  const project = chain.projects[0];
  const version = project.versions[0];
  return {
    db: getDbEventLogs({
      chainName: chain.name,
      projectName: project.name,
      versionName: version.name,
    }),
    version,
    contract: extractEventContracts(version.contracts)[0],
  };
}
function eventTableName(contract: Contract): string {
  return getEventLogTableName(contract.name, contract.events.names[0]);
}
const syncStatusTableName = DB_TABLE_NAMES.EventLog.syncStatus;
const blockTime = (blockNumber: number): BlockTime => ({
  blockNumber,
  timestamp: blockNumber,
  isoDatetime: "",
});

// Logs, a sync status that has moved on, and block times for the chain.
async function fillChain(chain: Chain): Promise<void> {
  const { db, contract } = firstVersion(chain);
  await db.table(eventTableName(contract)).bulkAdd([{ a: 1 }, { a: 2 }]);
  await db.table(syncStatusTableName).update(contract.name, {
    fetchedBlockNumber: contract.creation.blockNumber + 1000,
    isSyncTarget: false,
    numOfSyncTargetContract: 0,
    [`events.${contract.events.names[0]}.recordCount`]: 2,
  });
  await dbBlockTimes.table(chain.name).bulkPut([blockTime(1), blockTime(2)]);
}

describe("resetDbSyncedData", () => {
  beforeEach(async () => {
    for (const chain of [matic, eth]) {
      const { db } = firstVersion(chain);
      await Dexie.delete(db.name);
      await dbBlockTimes.table(chain.name).clear();
      await fillChain(chain);
    }
  });

  test("empties the logs and sets the sync status back to the creation block", async () => {
    // The two logs that fillChain() added.
    expect(await resetDbSyncedData(matic)).toBe(2);

    const { db, version, contract } = firstVersion(matic);
    for (const eventContract of extractEventContracts(version.contracts)) {
      for (const eventName of eventContract.events.names) {
        expect(
          await db
            .table(getEventLogTableName(eventContract.name, eventName))
            .count(),
        ).toBe(0);
      }
    }
    const status: SyncStatusContract = await db
      .table(syncStatusTableName)
      .get(contract.name);
    expect(status).toEqual({
      ...getInitialDataOfSyncStatusContract(contract),
      // The choice of the user is kept.
      isSyncTarget: false,
      numOfSyncTargetContract: 0,
    });
    expect(await dbBlockTimes.table(matic.name).count()).toBe(0);
  });

  test("keeps the other chains", async () => {
    await resetDbSyncedData(matic);

    const { db, contract } = firstVersion(eth);
    expect(await db.table(eventTableName(contract)).count()).toBe(2);
    const status: SyncStatusContract = await db
      .table(syncStatusTableName)
      .get(contract.name);
    expect(status.fetchedBlockNumber).toBe(
      contract.creation.blockNumber + 1000,
    );
    expect(await dbBlockTimes.table(eth.name).count()).toBe(2);
  });

  test("keeps the settings and the latest block number", async () => {
    await dbSettings.open();
    const rpcSetting = await getDbRecordRpcSettings(matic.name);
    await updateDbItemChainStatus(matic.name, "latestBlockNumber", 80_000_000);

    await resetDbSyncedData(matic);

    expect(await getDbRecordRpcSettings(matic.name)).toEqual(rpcSetting);
    expect((await getDbRecordChainStatus(matic.name)).latestBlockNumber).toBe(
      80_000_000,
    );
  });

  test("keeps the connection of the DB open", async () => {
    const { db, contract } = firstVersion(matic);
    await resetDbSyncedData(matic);
    expect(db.isOpen()).toBe(true);
    await db.table(eventTableName(contract)).add({ a: 3 });
    expect(await db.table(eventTableName(contract)).count()).toBe(1);
  });
});
