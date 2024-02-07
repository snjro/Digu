import type { ContractName } from "@constants/chains/types";
import { DbEventLogs } from "./dbEventLogs";
import { updateDbItemSyncStatus } from "./dbEventLogsDataHandlersSyncStatusUpdateDbItemSyncStatus";

export async function updateDbIsSyncTarget(
  dbEventLogs: DbEventLogs,
  contractName: ContractName,
  newValue: boolean,
) {
  await updateDbItemSyncStatus(
    dbEventLogs,
    contractName,
    "isSyncTarget",
    newValue,
  );

  const numOfSyncTargetContract: number = newValue ? 1 : 0;

  await updateDbItemSyncStatus(
    dbEventLogs,
    contractName,
    "numOfSyncTargetContract",
    numOfSyncTargetContract,
  );
}
