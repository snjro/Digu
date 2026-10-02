import type { ContractName } from "#constants/chains/types.js";
import { DbEventLogs } from "./dbEventLogs";
import { updateDbRecordSyncStatus } from "./dbEventLogsDataHandlersSyncStatusUpdateDbRecordSyncStatus";

export async function updateDbIsSyncTarget(
  dbEventLogs: DbEventLogs,
  contractName: ContractName,
  newValue: boolean,
) {
  const numOfSyncTargetContract: number = newValue ? 1 : 0;

  // Both fields in one transaction, so they cannot disagree.
  await updateDbRecordSyncStatus(dbEventLogs, contractName, {
    isSyncTarget: newValue,
    numOfSyncTargetContract: numOfSyncTargetContract,
  });
}
