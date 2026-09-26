import {
  addInitialDataOfDbEventLogs,
  getDbEventLogs,
  type DbEventLogs,
} from "@db/dbEventLogs";
import { addInitialDataOfDbChainStatus } from "@db/dbChainStatus";
import { TARGET_CHAINS } from "@constants/chains/_index";
import {
  initialDataUserSettings,
  type ChainStatus,
  type RpcSetting,
  type ContractIdentifier,
  type VersionIdentifier,
  type SyncStatusContract,
  type UserSetting,
} from "@db/dbTypes";
import { getDbRecordSyncStatusContract } from "@db/dbEventLogsDataHandlersSyncStatusGetters";
import type {
  ChainName,
  Contract,
  ContractName,
} from "@constants/chains/types";
import { getDbRecordChainStatus } from "@db/dbChainStatusDataHandlers";
import { storeRpcSettings } from "@stores/storeRpcSettings";
import { storeChainStatus } from "@stores/storeChainStatus";
import { storeSyncStatus } from "@stores/storeSyncStatus";
import { storeUserSettings } from "@stores/storeUserSettings";
import { extractEventContracts } from "@utils/utilsEthers";
import {
  getDbRecordRpcSettings,
  getDbRecordUserSettings,
} from "@db/dbSettings";
import { customLogger } from "@utils/logger";

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
      `Error occured in "InitializeStoreRpcSettings"`,
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
      `Error occured in "initializeStoreUserSettings"`,
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
