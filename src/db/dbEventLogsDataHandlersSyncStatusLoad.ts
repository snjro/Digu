import type { ChainName, Contract } from "#constants/chains/types.js";
import { storeSyncStatus } from "#stores/storeSyncStatus.js";
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
// - "release" (at startup and after another tab's operation, with the lock
//   shared): clears the flags of a sync that a tab closed while it synced
//   left set, and only those: with the creation block too, two builds would
//   write theirs back and forth, and their writes would run one after
//   another and keep a new operation waiting. A row is written only when it
//   needs it, in a read-write transaction that checks it again, so that of
//   the tabs that read at the same time only the first writes.
// - "reset" (for an operation of this tab, with the lock exclusive): writes
//   the cleared flags and the creation block of this build to every row.
export type SyncStatusLoad = "release" | "reset";

type Row = { contract: Contract; row: SyncStatusContract | undefined };

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
  const changeOf: ChangeOf = getChangeOf(load);
  let rows: Row[];
  switch (load) {
    case "release":
      rows = await readRows(dbEventLogs, contracts);
      if (rows.some(({ contract, row }) => row && changeOf(contract, row))) {
        rows = await writeRows(dbEventLogs, contracts, changeOf);
      }
      break;
    case "reset":
      rows = await writeRows(dbEventLogs, contracts, changeOf);
      break;
  }
  // Only after the commit. Each row as it is in the DB, as before.
  const versionIdentifier: VersionIdentifier = dbEventLogs.versionIdentifier;
  for (const { contract, row } of rows) {
    const contractIdentifier = {
      ...versionIdentifier,
      contractName: contract.name,
    };
    if (row) {
      storeSyncStatus.updateState(contractIdentifier, row);
      continue;
    }
    customLogger.warn(
      "No sync status of the contract in the DB.",
      contractIdentifier,
    );
    // As the reset of each contract did before, also without a row.
    if (load === "reset") {
      storeSyncStatus.updateState(
        contractIdentifier,
        getSyncStatusReset(contract),
      );
    }
  }
}

// What a row needs, or undefined.
type ChangeOf = (
  contract: Contract,
  row: SyncStatusContract,
) => Partial<SyncStatusContract> | undefined;

function getChangeOf(load: SyncStatusLoad): ChangeOf {
  switch (load) {
    case "release":
      return (_contract, row) => getRepair(row);
    case "reset":
      return (contract) => getSyncStatusReset(contract);
  }
}

async function readRows(
  dbEventLogs: DbEventLogs,
  contracts: Contract[],
): Promise<Row[]> {
  return await dbEventLogs.transaction("r", tableNameSyncStatus, () =>
    getRows(dbEventLogs, contracts),
  );
}

// Reads the rows again and writes the change of each row that needs one, in
// one read-write transaction, and gives the rows as written.
async function writeRows(
  dbEventLogs: DbEventLogs,
  contracts: Contract[],
  changeOf: ChangeOf,
): Promise<Row[]> {
  return await dbEventLogs.transaction("rw", tableNameSyncStatus, async () => {
    const changed = (await getRows(dbEventLogs, contracts)).map(
      ({ contract, row }) => ({
        contract,
        row,
        change: row && changeOf(contract, row),
      }),
    );
    const changes = changed.flatMap(({ contract, change }) =>
      change ? [{ key: contract.name, changes: change }] : [],
    );
    if (changes.length > 0) {
      await dbEventLogs.table(tableNameSyncStatus).bulkUpdate(changes);
    }
    return changed.map(({ contract, row, change }) => ({
      contract,
      row: row && { ...row, ...change },
    }));
  });
}

// Every contract with its row, or undefined. In the transaction of the
// caller.
async function getRows(
  dbEventLogs: DbEventLogs,
  contracts: Contract[],
): Promise<Row[]> {
  const records: (SyncStatusContract | undefined)[] = await dbEventLogs
    .table(tableNameSyncStatus)
    .bulkGet(contracts.map((contract: Contract) => contract.name));
  return contracts.map((contract: Contract, index: number) => ({
    contract,
    row: records[index],
  }));
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
