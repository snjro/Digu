import { DbEventLogs } from "@db/dbEventLogs";
import { TARGET_CHAINS } from "@constants/chains/_index";
import type {
  ChainStatus,
  RpcSetting,
  ContractIdentifier,
  VersionIdentifier,
  SyncStatusContract,
  UserSetting,
} from "@db/dbTypes";
import { getDbRecordSyncStatusContract } from "@db/dbEventLogsDataHandlersSyncStatus";
import type { ChainName, ContractName } from "@constants/chains/types";
import { getDbRecordChainStatus } from "@db/dbChainStatusDataHandlers";
import {
  getDbRecordRpcSettings,
  getDbRecordUserSettings,
} from "@db/dbSettingsDataHandlers";
import { myLogger } from "@utils/logger";
import { storeRpcSettings } from "@stores/storeRpcSettings";
import { storeChainStatus } from "@stores/storeChainStatus";
import { storeSyncStatus } from "@stores/storeSyncStatus";
import { storeUserSettings } from "@stores/storeUserSettings";
import { extractEventContracts } from "@utils/utilsEthers";
import { get } from "svelte/store";

export async function initializeStore(): Promise<void> {
  const promiseUpdateStores: Promise<void>[] = [];
  await initializeStoreUserSettings();
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

        const dbEventLogs: DbEventLogs = new DbEventLogs(versionIdentifier);

        for (const targetContract of extractEventContracts(
          targetVersion.contracts,
        )) {
          promiseUpdateStores.push(
            InitializeStoreSyncStatus(dbEventLogs, targetContract.name),
          );
        }
      }
    }
  }
  await Promise.all(promiseUpdateStores);
}
async function InitializeStoreChainStatus(chainName: ChainName): Promise<void> {
  const chainStatus: ChainStatus = await getDbRecordChainStatus(chainName);
  storeChainStatus.updateState(chainName, chainStatus);
  myLogger.info(`Initialized "storeChainStatus"`, {
    chainName: chainName,
    storeChainStatus: get(storeChainStatus),
  });
}
async function InitializeStoreRpcSettings(chainName: ChainName): Promise<void> {
  const rpcSetting: RpcSetting = await getDbRecordRpcSettings(chainName);
  storeRpcSettings.updateState(chainName, rpcSetting);
  myLogger.info(`Initialized "storeRpcSetting"`, {
    chainName: chainName,
    storeRpcSettings: get(storeRpcSettings),
  });
}
async function initializeStoreUserSettings(): Promise<void> {
  const userSettings: UserSetting =
    await getDbRecordUserSettings("userSetting01");
  storeUserSettings.updateState(userSettings);
  myLogger.info(`Initialized "storeUserSetting"`, {
    storeUserSettings: get(storeUserSettings),
  });
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
  myLogger.info(`Initialized "storeSyncStatus"`, {
    ...dbEventLogs.versionIdentifier,
    contractName: contractName,
    storeSyncStatus: get(storeSyncStatus),
  });
}
