import {
  addInitialDataOfDbEventLogs,
  getDbEventLogs,
  type DbEventLogs,
} from "#db/dbEventLogs.js";
import { addInitialDataOfDbChainStatus } from "#db/dbChainStatus.js";
import { TARGET_CHAINS } from "#constants/chains/_index.js";
import {
  initialDataUserSettings,
  type ChainStatus,
  type RpcSetting,
  type ContractIdentifier,
  type VersionIdentifier,
  type SyncStatusContract,
  type UserSetting,
} from "#db/dbTypes.js";
import { getDbRecordSyncStatusContract } from "#db/dbEventLogsDataHandlersSyncStatusGetters.js";
import type {
  ChainName,
  Contract,
  ContractName,
} from "#constants/chains/types.js";
import { getDbRecordChainStatus } from "#db/dbChainStatusDataHandlers.js";
import { storeRpcSettings } from "#stores/storeRpcSettings.js";
import { storeChainStatus } from "#stores/storeChainStatus.js";
import { storeSyncStatus } from "#stores/storeSyncStatus.js";
import { storeUserSettings } from "#stores/storeUserSettings.js";
import { extractEventContracts } from "#utils/utilsEthers.js";
import {
  getDbRecordRpcSettings,
  getDbRecordUserSettings,
} from "#db/dbSettings.js";
import { customLogger } from "#utils/logger.js";

export async function initializeStore(): Promise<void> {
  const promiseUpdateStores: Promise<void>[] = [];
  await initializeStoreUserSettings();
  // Add the rows of the chains and contracts added after the DBs were created.
  await addInitialDataOfDbChainStatus();
  for (const targetChain of TARGET_CHAINS) {
    promiseUpdateStores.push(InitializeStoreChainStatus(targetChain.name));

    promiseUpdateStores.push(InitializeStoreRpcSettings(targetChain.name));

    for (const targetProject of targetChain.projects) {
      for (const targetVersion of targetProject.versions) {
        const versionIdentifier: VersionIdentifier = {
          chainName: targetChain.name,
          projectName: targetProject.name,
          versionName: targetVersion.name,
        };

        const dbEventLogs: DbEventLogs = getDbEventLogs(versionIdentifier);

        promiseUpdateStores.push(
          InitializeStoreSyncStatusInVersion(
            dbEventLogs,
            extractEventContracts(targetVersion.contracts),
          ),
        );
      }
    }
  }
  await Promise.all(promiseUpdateStores);
}
async function InitializeStoreSyncStatusInVersion(
  dbEventLogs: DbEventLogs,
  targetContracts: Contract[],
): Promise<void> {
  await addInitialDataOfDbEventLogs(dbEventLogs);
  await Promise.all(
    targetContracts.map((targetContract) =>
      InitializeStoreSyncStatus(dbEventLogs, targetContract.name),
    ),
  );
}
async function InitializeStoreChainStatus(chainName: ChainName): Promise<void> {
  const chainStatus: ChainStatus = await getDbRecordChainStatus(chainName);
  storeChainStatus.updateState(chainName, chainStatus);
}
async function InitializeStoreRpcSettings(chainName: ChainName): Promise<void> {
  const rpcSetting: RpcSetting | undefined =
    await getDbRecordRpcSettings(chainName);
  if (rpcSetting) {
    storeRpcSettings.updateState(chainName, rpcSetting);
  } else {
    customLogger.error(
      `Error occurred in "InitializeStoreRpcSettings"`,
      `getDbRecordRpcSettings(${chainName}) returned "undefined"`,
    );
  }
}
async function initializeStoreUserSettings(): Promise<void> {
  const userSettings: UserSetting | undefined = await getDbRecordUserSettings(
    initialDataUserSettings.userSettingsId,
  );
  if (userSettings) {
    storeUserSettings.updateState(userSettings);
  } else {
    customLogger.error(
      `Error occurred in "initializeStoreUserSettings"`,
      `getDbRecordUserSettings() returned "undefined"`,
    );
  }
}
async function InitializeStoreSyncStatus(
  dbEventLogs: DbEventLogs,
  contractName: ContractName,
): Promise<void> {
  const contractIdentifier: ContractIdentifier = {
    ...dbEventLogs.versionIdentifier,
    contractName: contractName,
  };

  const syncStatusContract: SyncStatusContract =
    await getDbRecordSyncStatusContract(
      dbEventLogs,
      contractIdentifier.contractName,
    );

  storeSyncStatus.updateState(contractIdentifier, syncStatusContract);
}
