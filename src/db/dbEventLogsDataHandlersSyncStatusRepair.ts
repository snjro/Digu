import type { ChainName, Contract } from "#constants/chains/types.js";
import { storeSyncStatus } from "#stores/storeSyncStatus.js";
import { customLogger } from "#utils/logger.js";
import { getTargetChain } from "#utils/utilsDb.js";
import { extractEventContracts } from "#utils/utilsEthers.js";
import { DB_TABLE_NAMES } from "./constants";
import { getDbEventLogs, type DbEventLogs } from "./dbEventLogs";
import {
  clearedSyncFlags,
  type SyncStatusContract,
  type VersionIdentifier,
} from "./dbTypes";

const tableNameSyncStatus = DB_TABLE_NAMES.EventLog.syncStatus;

type Rows = Map<string, SyncStatusContract>;

// Reads the sync status of every contract of the chain into the store, and
// clears the flags of a sync that a tab closed while it synced left set. A
// row is written only when it needs it, in a read-write transaction that
// checks it again, so that of the tabs that read at the same time only the
// first writes. Call only while holding the sync lock of the chain, exclusive
// or shared, with no sync of this tab.
export async function repairSyncStatusInChain(
  chainName: ChainName,
): Promise<void> {
  await forEachVersion(chainName, true);
}

// Reads the sync status of every contract of the chain into the store, as it
// is in the DB.
export async function readSyncStatusInChain(
  chainName: ChainName,
): Promise<void> {
  await forEachVersion(chainName, false);
}

async function forEachVersion(
  chainName: ChainName,
  repair: boolean,
): Promise<void> {
  const promises: Promise<void>[] = [];
  for (const targetProject of getTargetChain({ chainName }).projects) {
    for (const targetVersion of targetProject.versions) {
      promises.push(
        readVersion(
          getDbEventLogs({
            chainName,
            projectName: targetProject.name,
            versionName: targetVersion.name,
          }),
          extractEventContracts(targetVersion.contracts),
          repair,
        ),
      );
    }
  }
  await Promise.all(promises);
}

async function readVersion(
  dbEventLogs: DbEventLogs,
  contracts: Contract[],
  repair: boolean,
): Promise<void> {
  let rows: Rows = await readRows(dbEventLogs, contracts, "r");
  if (repair && [...rows.values()].some((row) => getRepair(row))) {
    rows = await readRows(dbEventLogs, contracts, "rw");
  }
  // Only after the commit.
  const versionIdentifier: VersionIdentifier = dbEventLogs.versionIdentifier;
  for (const contract of contracts) {
    const contractIdentifier = {
      ...versionIdentifier,
      contractName: contract.name,
    };
    const row: SyncStatusContract | undefined = rows.get(contract.name);
    if (row) {
      storeSyncStatus.updateState(contractIdentifier, row);
    } else {
      customLogger.warn(
        "Skip a contract without a sync status in the DB.",
        contractIdentifier,
      );
    }
  }
}

// In "rw", also writes the repairs, in the same transaction.
async function readRows(
  dbEventLogs: DbEventLogs,
  contracts: Contract[],
  mode: "r" | "rw",
): Promise<Rows> {
  return await dbEventLogs.transaction(mode, tableNameSyncStatus, async () => {
    const table = dbEventLogs.table(tableNameSyncStatus);
    const records: (SyncStatusContract | undefined)[] = await table.bulkGet(
      contracts.map((contract: Contract) => contract.name),
    );
    const rows: Rows = new Map();
    for (const [index, contract] of contracts.entries()) {
      const row: SyncStatusContract | undefined = records[index];
      if (!row) continue;
      const repairOfRow: Partial<SyncStatusContract> | undefined =
        getRepair(row);
      if (mode === "rw" && repairOfRow) {
        await table.update(contract.name, repairOfRow);
        rows.set(contract.name, { ...row, ...repairOfRow });
      } else {
        rows.set(contract.name, row);
      }
    }
    return rows;
  });
}

// The flags of the row to clear, or undefined.
function getRepair(
  row: SyncStatusContract,
): Partial<SyncStatusContract> | undefined {
  const repair: Partial<SyncStatusContract> = {};
  for (const [key, value] of Object.entries(clearedSyncFlags)) {
    const flag = key as keyof typeof clearedSyncFlags;
    if (row[flag] !== value) repair[flag] = value;
  }
  return Object.keys(repair).length > 0 ? repair : undefined;
}
