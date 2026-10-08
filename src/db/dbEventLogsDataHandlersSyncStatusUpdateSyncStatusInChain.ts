import type { Chain, ChainName, Contract } from "#constants/chains/types.js";
import { DB_TABLE_NAMES } from "./constants";
import { getDbEventLogs, type DbEventLogs } from "./dbEventLogs";
import type {
  ContractIdentifier,
  SyncStatusContract,
  VersionIdentifier,
} from "./dbTypes";
import { getTargetChain } from "#utils/utilsDb.js";
import { extractEventContracts } from "#utils/utilsEthers.js";
import { getDbRecordsSyncStatusContractByKeyValue } from "./dbEventLogsDataHandlersSyncStatusGetters";
import { storeSyncStatus } from "#stores/storeSyncStatus.js";

const tableNameSyncStatus = DB_TABLE_NAMES.EventLog.syncStatus;

// Changes every row that matches, and returns the contracts of those rows
// among the event contracts of this build: the DB may have a row of a
// contract that this build does not know (from a tab of another build).
export async function updateSyncStatusInChain<
  T extends keyof SyncStatusContract,
>(
  chainName: ChainName,
  targetKey: T,
  targetValue: SyncStatusContract[T],
  newSyncStatusContract: Partial<SyncStatusContract>,
): Promise<ContractIdentifier[]> {
  const targetChain: Chain = getTargetChain({ chainName: chainName });
  const promiseUpdate: Promise<ContractIdentifier[]>[] = [];
  for (const project of targetChain.projects) {
    for (const version of project.versions) {
      const versionIdentifier: VersionIdentifier = {
        chainName: chainName,
        projectName: project.name,
        versionName: version.name,
      };
      const dbEventLogs = getDbEventLogs(versionIdentifier);
      const eventContractNames: Set<string> = new Set(
        extractEventContracts(version.contracts).map(
          (contract: Contract) => contract.name,
        ),
      );
      promiseUpdate.push(
        updateSyncStatusInVersion(
          dbEventLogs,
          eventContractNames,
          targetKey,
          targetValue,
          newSyncStatusContract,
        ),
      );
    }
  }
  return (await Promise.all(promiseUpdate)).flat();
}

async function updateSyncStatusInVersion<T extends keyof SyncStatusContract>(
  dbEventLogs: DbEventLogs,
  eventContractNames: Set<string>,
  targetKey: T,
  targetValue: SyncStatusContract[T],
  newSyncStatusContract: Partial<SyncStatusContract>,
): Promise<ContractIdentifier[]> {
  // Read and write in one transaction, so that a row changed in between is
  // not overwritten with the result of an old read.
  const updatedNames: string[] = await dbEventLogs.transaction(
    "rw",
    tableNameSyncStatus,
    async () => {
      const syncStatusesContract: SyncStatusContract[] =
        await getDbRecordsSyncStatusContractByKeyValue(
          dbEventLogs,
          targetKey,
          targetValue,
        );
      await Promise.all(
        syncStatusesContract.map((syncStatusContract: SyncStatusContract) =>
          dbEventLogs
            .table(tableNameSyncStatus)
            .update(syncStatusContract.name, newSyncStatusContract),
        ),
      );
      return syncStatusesContract.map(
        (syncStatusContract: SyncStatusContract) => syncStatusContract.name,
      );
    },
  );
  // The loops and the store follow this build's event contracts only.
  const contractIdentifiers: ContractIdentifier[] = updatedNames
    .filter((name: string) => eventContractNames.has(name))
    .map((name: string) => ({
      ...dbEventLogs.versionIdentifier,
      contractName: name,
    }));
  // Update the store only after the commit.
  for (const contractIdentifier of contractIdentifiers) {
    storeSyncStatus.updateState(contractIdentifier, newSyncStatusContract);
  }
  return contractIdentifiers;
}
