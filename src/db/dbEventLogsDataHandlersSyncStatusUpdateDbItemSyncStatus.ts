import type { ContractName } from "@constants/chains/types";
import { DbEventLogs } from "./dbEventLogs";
import type { SyncStatusContract } from "./dbTypes";
import { updateDbRecordSyncStatus } from "./dbEventLogsDataHandlersSyncStatusUpdateDbRecordSyncStatus";

export async function updateDbItemSyncStatus<
  T extends keyof SyncStatusContract,
>(
  dbEventLogs: DbEventLogs,
  contractName: ContractName,
  key: T,
  newValue: SyncStatusContract[T],
): Promise<void> {
  await updateDbRecordSyncStatus(dbEventLogs, contractName, {
    [key]: newValue,
  });
}
