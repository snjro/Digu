import type {
  ChainName,
  Contract,
  ContractName,
} from "#constants/chains/types.js";
import { getTargetVersion } from "#utils/utilsDb.js";
import { extractEventContracts } from "#utils/utilsEthers.js";
import { DbEventLogs } from "./dbEventLogs";
import type { ContractIdentifier } from "./dbTypes";
import { customLogger } from "#utils/logger.js";
import { updateDbRecordSyncStatus } from "./dbEventLogsDataHandlersSyncStatusUpdateDbRecordSyncStatus";
import { updateSyncStatusInChain } from "./dbEventLogsDataHandlersSyncStatusUpdateSyncStatusInChain";

// Marks the sync targets in the DB as syncing, which another tab may have
// changed since this tab read them, and returns those that this build syncs:
// its event contracts. A row of a contract that this build does not know
// (from a tab of another build) is marked too, and cleared by the stop.
export async function startSyncingInChain(
  chainName: ChainName,
): Promise<ContractIdentifier[]> {
  const marked: ContractIdentifier[] = await updateSyncStatusInChain(
    chainName,
    "isSyncTarget",
    true,
    { isSyncing: true },
  );
  return marked.filter((contractIdentifier: ContractIdentifier) =>
    extractEventContracts(getTargetVersion(contractIdentifier).contracts).some(
      (contract: Contract) => contract.name === contractIdentifier.contractName,
    ),
  );
}
export async function startAbortingInChain(
  chainName: ChainName,
): Promise<void> {
  const log = `Update syncStatus for aborting. Chain: ${chainName}`;
  customLogger.start(log);
  await updateSyncStatusInChain(chainName, "isSyncing", true, {
    isAbort: true,
  });
  customLogger.finished(log);
}
export async function stopSyncingInChain(chainName: ChainName): Promise<void> {
  const log: string = `Update syncStatus for stopping. Chain: ${chainName}`;
  customLogger.start(log);
  // One write, so that an abort cannot come in between the two fields.
  await updateSyncStatusInChain(chainName, "isSyncing", true, {
    isSyncing: false,
    isAbort: false,
  });
  customLogger.finished(log);
}
export async function stopSyncingInContract(
  dbEventLogs: DbEventLogs,
  contractName: ContractName,
): Promise<void> {
  const log: string = `Update syncStatus for stopping. Contract: ${contractName}`;
  customLogger.start(log);
  await updateDbRecordSyncStatus(dbEventLogs, contractName, {
    isSyncing: false,
    isAbort: false,
  });
  customLogger.finished(log);
}
