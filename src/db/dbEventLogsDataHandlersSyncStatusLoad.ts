import type { ChainName, Contract } from "#constants/chains/types.js";
import { storeSyncStatus } from "#stores/storeSyncStatus.js";
import { getInitialValueContract } from "#stores/storeSyncStatusGetInitialState.js";
import { customLogger } from "#utils/logger.js";
import { getTargetChain } from "#utils/utilsDb.js";
import { extractEventContracts } from "#utils/utilsEthers.js";
import { DB_TABLE_NAMES } from "./constants";
import { getDbEventLogs, type DbEventLogs } from "./dbEventLogs";
import {
  clearedSyncFlags,
  getSyncStatusReset,
  type SyncStatusContract,
  type VersionIdentifier,
} from "./dbTypes";

const tableNameSyncStatus = DB_TABLE_NAMES.EventLog.syncStatus;

// How the sync status of a chain is loaded into the store. Call only while
// holding the sync lock of the chain, when no sync runs.
// - "repair" (with the lock shared or exclusive): clears the flags of a sync
//   that a tab closed while it synced left set. A row is written only when
//   it needs it, in a read-write transaction that checks it again, so that
//   of the tabs that read at the same time only the first writes.
// - "reset" (for an operation of this tab, with the lock exclusive): writes
//   the cleared flags and the creation block of this build to every row.
export type SyncStatusLoad = "repair" | "reset";

type Row = { contract: Contract; row: SyncStatusContract };

export async function loadSyncStatusInChain(
  chainName: ChainName,
  load: SyncStatusLoad,
): Promise<void> {
  const promises: Promise<void>[] = [];
  for (const targetProject of getTargetChain({ chainName }).projects) {
    for (const targetVersion of targetProject.versions) {
      promises.push(
        loadVersion(
          getDbEventLogs({
            chainName,
            projectName: targetProject.name,
            versionName: targetVersion.name,
          }),
          extractEventContracts(targetVersion.contracts),
          load,
        ),
      );
    }
  }
  await Promise.all(promises);
}

async function loadVersion(
  dbEventLogs: DbEventLogs,
  contracts: Contract[],
  load: SyncStatusLoad,
): Promise<void> {
  let rows: Row[];
  switch (load) {
    case "repair":
      rows = await readRows(dbEventLogs, contracts, "r");
      if (rows.some(({ row }) => getRepair(row))) {
        rows = await readRows(dbEventLogs, contracts, "rw");
      }
      break;
    case "reset":
      rows = await resetRows(dbEventLogs, contracts);
      break;
  }
  // Only after the commit.
  const versionIdentifier: VersionIdentifier = dbEventLogs.versionIdentifier;
  const rowsByName: Map<string, SyncStatusContract> = new Map(
    rows.map(({ contract, row }) => [contract.name, row]),
  );
  for (const contract of contracts) {
    const contractIdentifier = {
      ...versionIdentifier,
      contractName: contract.name,
    };
    const row: SyncStatusContract | undefined = rowsByName.get(contract.name);
    if (!row) {
      customLogger.warn(
        "No sync status of the contract in the DB: the store gets its initial value.",
        contractIdentifier,
      );
    }
    storeSyncStatus.updateState(
      contractIdentifier,
      toStoreRecord(contract, row),
    );
  }
}

// A whole record, as the store starts with, so that the store keeps nothing
// of before.
function toStoreRecord(
  contract: Contract,
  row: SyncStatusContract | undefined,
): SyncStatusContract {
  return {
    ...getInitialValueContract(contract),
    ...row,
    // A missing flag is false.
    isSyncing: row?.isSyncing === true,
    isAbort: row?.isAbort === true,
    // The creation block that this build syncs from, also when a tab on
    // another build wrote its own. Tabs of two builds on one DB are not
    // supported beyond keeping the screen right: Digu has no users yet.
    creationBlockNumber: contract.creation.blockNumber,
  };
}

// The rows of the contracts that have one. In "rw", also clears the flags
// that are set, in the same transaction.
async function readRows(
  dbEventLogs: DbEventLogs,
  contracts: Contract[],
  mode: "r" | "rw",
): Promise<Row[]> {
  return await dbEventLogs.transaction(mode, tableNameSyncStatus, async () => {
    const table = dbEventLogs.table(tableNameSyncStatus);
    const rows: Row[] = await getRows(dbEventLogs, contracts);
    if (mode === "r") return rows;
    const repaired = rows.map(({ contract, row }) => ({
      contract,
      row,
      repair: getRepair(row),
    }));
    const changes = repaired.flatMap(({ contract, repair }) =>
      repair ? [{ key: contract.name, changes: repair }] : [],
    );
    if (changes.length > 0) await table.bulkUpdate(changes);
    return repaired.map(({ contract, row, repair }) => ({
      contract,
      row: { ...row, ...repair },
    }));
  });
}

// Writes the reset to every row, and reads it back, in one transaction.
async function resetRows(
  dbEventLogs: DbEventLogs,
  contracts: Contract[],
): Promise<Row[]> {
  return await dbEventLogs.transaction("rw", tableNameSyncStatus, async () => {
    const table = dbEventLogs.table(tableNameSyncStatus);
    const reset = (await getRows(dbEventLogs, contracts)).map(
      ({ contract, row }) => ({
        contract,
        row,
        changes: getSyncStatusReset(contract),
      }),
    );
    if (reset.length > 0) {
      await table.bulkUpdate(
        reset.map(({ contract, changes }) => ({ key: contract.name, changes })),
      );
    }
    return reset.map(({ contract, row, changes }) => ({
      contract,
      row: { ...row, ...changes },
    }));
  });
}

// In the transaction of the caller.
async function getRows(
  dbEventLogs: DbEventLogs,
  contracts: Contract[],
): Promise<Row[]> {
  const records: (SyncStatusContract | undefined)[] = await dbEventLogs
    .table(tableNameSyncStatus)
    .bulkGet(contracts.map((contract: Contract) => contract.name));
  return contracts.flatMap((contract: Contract, index: number) => {
    const row: SyncStatusContract | undefined = records[index];
    return row ? [{ contract, row }] : [];
  });
}

// The flags of the row that are set, cleared, or undefined.
function getRepair(
  row: SyncStatusContract,
): Partial<SyncStatusContract> | undefined {
  const repair: Partial<SyncStatusContract> = {};
  for (const [key, value] of Object.entries(clearedSyncFlags)) {
    const flag = key as keyof typeof clearedSyncFlags;
    if (row[flag] === true) repair[flag] = value;
  }
  return Object.keys(repair).length > 0 ? repair : undefined;
}
