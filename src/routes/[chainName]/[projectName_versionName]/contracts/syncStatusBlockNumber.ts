import type { SyncStatusContract } from "@db/dbTypes";

export type HeaderName = "Start" | "Current" | "Goal";
export function getBlockNumberByHeaderName(
  headerName: HeaderName,
  latestBlockNumber: number,
  targetContractSyncStatus: SyncStatusContract,
): number {
  if (!targetContractSyncStatus) {
    // When a contract has no event, "targetContractSyncStatus" is undefined.
    return 0;
  }
  if (headerName === "Goal") {
    return latestBlockNumber;
  } else if (headerName === "Current") {
    return targetContractSyncStatus.fetchedBlockNumber;
  } else {
    return targetContractSyncStatus.creationBlockNumber;
  }
}
