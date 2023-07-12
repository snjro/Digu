import { DbEventLogs } from "@db/dbEventLogs";
import { TARGET_CHAINS } from "@constants/chains/_index";
import type {
  ChainStatus,
  LogSetting,
  ContractIdentifier,
  VersionIdentifier,
  SyncStatusContract,
  UserSetting,
} from "@db/dbTypes";
import { getDbRecordSyncStatusContract } from "@db/dbEventLogsDataHandlersSyncStatus";
import type { ChainName, ContractName } from "@constants/chains/types";
import { getDbRecordChainStatus } from "@db/dbChainStatusDataHandlers";
import {
  getDbRecordLogSettings,
  getDbRecordUserSettings,
} from "@db/dbSettingsDataHandlers";
import { myLogger } from "@utils/logger";
import { storeLogSettings } from "@stores/storeLogSettings";
import { storeChainStatus } from "@stores/storeChainStatus";
import { storeSyncStatus } from "@stores/storeSyncStatus";
import { initialDataUserSettings } from "@db/dbSettings";
import { storeUserSettings } from "@stores/storeUserSettings";
import { extractEventContracts } from "@utils/utilsEthers";

export async function initializeStore(): Promise<void> {
  const promiseUpdateStores: Promise<void>[] = [];
  // promiseUpdateStores.push(syncStoreUserSettingsWithDB());
  await syncStoreUserSettingsWithDB();
  for (const targetChain of TARGET_CHAINS) {
    promiseUpdateStores.push(syncStoreChainStatusWithDB(targetChain.name));

    promiseUpdateStores.push(syncStoreLogSettingsWithDB(targetChain.name));

    for (const targetProject of targetChain.projects) {
      for (const targetVersion of targetProject.versions) {
        const versionIdentifier: VersionIdentifier = {
          chainName: targetChain.name,
          projectName: targetProject.name,
          versionName: targetVersion.name,
        };

        const dbEventLogs: DbEventLogs = new DbEventLogs(versionIdentifier);

        for (const targetContract of extractEventContracts(
          targetVersion.contracts
        )) {
          promiseUpdateStores.push(
            syncStoreSyncStatusWithDB(dbEventLogs, targetContract.name)
          );
        }
      }
    }
  }
  await Promise.all(promiseUpdateStores);
}
async function syncStoreChainStatusWithDB(chainName: ChainName): Promise<void> {
  const chainStatus: ChainStatus = await getDbRecordChainStatus(chainName);
  myLogger.info(`chainStatus in store:`, chainStatus);
  storeChainStatus.updateState(chainName, chainStatus);
}
async function syncStoreLogSettingsWithDB(chainName: ChainName): Promise<void> {
  const logSetting: LogSetting = await getDbRecordLogSettings(chainName);
  myLogger.info(`LogSetting in store:`, logSetting);
  storeLogSettings.updateState(chainName, logSetting);
}
async function syncStoreUserSettingsWithDB(): Promise<void> {
  for (const initialUserSetting of initialDataUserSettings()) {
    const userSettingsKey: UserSetting["userSettingsKey"] =
      initialUserSetting.userSettingsKey;
    const userSetting: UserSetting = await getDbRecordUserSettings(
      userSettingsKey
    );
    storeUserSettings.updateState(userSettingsKey, userSetting.value);
  }
}
async function syncStoreSyncStatusWithDB(
  dbEventLogs: DbEventLogs,
  contractName: ContractName
): Promise<void> {
  const contractIdentifier: ContractIdentifier = {
    ...dbEventLogs.versionIdentifier,
    contractName: contractName,
  };

  const syncStatusContract: SyncStatusContract =
    await getDbRecordSyncStatusContract(
      dbEventLogs,
      contractIdentifier.contractName
    );

  storeSyncStatus.updateState(contractIdentifier, syncStatusContract);
}
