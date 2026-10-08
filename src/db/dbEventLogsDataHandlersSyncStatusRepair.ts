import type { ChainName, Contract } from "#constants/chains/types.js";
import { storeSyncStatus } from "#stores/storeSyncStatus.js";
import { getTargetChain } from "#utils/utilsDb.js";
import { extractEventContracts } from "#utils/utilsEthers.js";
import { DB_TABLE_NAMES } from "./constants";
import { getDbEventLogs, type DbEventLogs } from "./dbEventLogs";
import type { SyncStatusContract, VersionIdentifier } from "./dbTypes";

const tableNameSyncStatus = DB_TABLE_NAMES.EventLog.syncStatus;

// Reads the sync status of every contract of the chain into the store. A row
// that a tab closed while it synced left syncing or aborting, or with the
// creation block of another build, is written in a read-write transaction
// that checks it again, so that of the tabs that read at the same time only
// the first writes. A contract without a row is skipped. Call only while
// holding the sync lock of the chain, exclusive or shared.
export async function repairSyncStatusInChain(
  chainName: ChainName,
): Promise<void> {
  const promises: Promise<void>[] = [];
  for (const targetProject of getTargetChain({ chainName }).projects) {
    for (const targetVersion of targetProject.versions) {
      promises.push(
        repairSyncStatusInVersion(
          getDbEventLogs({
            chainName,
            projectName: targetProject.name,
            versionName: targetVersion.name,
          }),
          extractEventContracts(targetVersion.contracts),
        ),
      );
    }
  }
  await Promise.all(promises);
}

async function repairSyncStatusInVersion(
  dbEventLogs: DbEventLogs,
  contracts: Contract[],
): Promise<void> {
  let rows: Map<string, SyncStatusContract> = await readRows(
    dbEventLogs,
    contracts,
    "r",
  );
  if (contracts.some((contract) => getRepair(contract, rows))) {
    rows = await readRows(dbEventLogs, contracts, "rw");
  }
  // Only after the commit.
  const versionIdentifier: VersionIdentifier = dbEventLogs.versionIdentifier;
  for (const [contractName, row] of rows) {
    storeSyncStatus.updateState({ ...versionIdentifier, contractName }, row);
  }
}

// In "rw", also writes the repairs, in the same transaction.
async function readRows(
  dbEventLogs: DbEventLogs,
  contracts: Contract[],
  mode: "r" | "rw",
): Promise<Map<string, SyncStatusContract>> {
  return await dbEventLogs.transaction(mode, tableNameSyncStatus, async () => {
    const rows: Map<string, SyncStatusContract> = new Map();
    for (const contract of contracts) {
      const row: SyncStatusContract | undefined = await dbEventLogs
        .table(tableNameSyncStatus)
        .get(contract.name);
      if (!row) continue;
      rows.set(contract.name, row);
      const repair: Partial<SyncStatusContract> | undefined = getRepair(
        contract,
        rows,
      );
      if (mode === "rw" && repair) {
        await dbEventLogs
          .table(tableNameSyncStatus)
          .update(contract.name, repair);
        rows.set(contract.name, { ...row, ...repair });
      }
    }
    return rows;
  });
}

// What the row of the contract needs, or undefined.
function getRepair(
  contract: Contract,
  rows: Map<string, SyncStatusContract>,
): Partial<SyncStatusContract> | undefined {
  const row: SyncStatusContract | undefined = rows.get(contract.name);
  if (!row) return undefined;
  const repair: Partial<SyncStatusContract> = {};
  if (row.isSyncing) repair.isSyncing = false;
  if (row.isAbort) repair.isAbort = false;
  if (row.creationBlockNumber !== contract.creation.blockNumber) {
    repair.creationBlockNumber = contract.creation.blockNumber;
  }
  return Object.keys(repair).length > 0 ? repair : undefined;
}
