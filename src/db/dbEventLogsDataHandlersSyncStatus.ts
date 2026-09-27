import type { ChainName, ContractName } from "@constants/chains/types";
import { DbEventLogs } from "./dbEventLogs";
import { customLogger } from "@utils/logger";
import { updateDbRecordSyncStatus } from "./dbEventLogsDataHandlersSyncStatusUpdateDbRecordSyncStatus";
import { updateSyncStatusInChain } from "./dbEventLogsDataHandlersSyncStatusUpdateSyncStatusInChain";

export async function startSyncingInChain(chainName: ChainName): Promise<void> {
  await updateSyncStatusInChain(chainName, "isSyncTarget", true, {
    isSyncing: true,
  });
}
export async function startAbortingInChain(
  chainName: ChainName,
): Promise<void> {
  const log = `Update syncStaus for aborting. Chain: ${chainName}`;
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
