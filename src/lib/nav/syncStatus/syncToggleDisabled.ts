import type { NodeStatus, SyncStateText } from "#db/dbTypes.js";

export type SyncToggleConditions = {
  nodeStatus: NodeStatus;
  isSyncTarget: boolean;
  isToggleOn: boolean;
  syncStateText: SyncStateText;
  isStarting: boolean;
  isSyncingInOtherTab: boolean;
  // The warp sync of this tab imports the chain: the sync would wait for it.
  isWarpSyncImporting: boolean;
};

export function isSyncToggleDisabled(
  conditions: SyncToggleConditions,
): boolean {
  const isAbleToSync: boolean =
    conditions.nodeStatus === "SUCCESS" && conditions.isSyncTarget;
  const isStopping: boolean = conditions.syncStateText === "stopping";
  // A running sync can be stopped even when the node is not ready.
  return (
    (!conditions.isToggleOn && !isAbleToSync) ||
    isStopping ||
    conditions.isStarting ||
    conditions.isSyncingInOtherTab ||
    (!conditions.isToggleOn && conditions.isWarpSyncImporting)
  );
}
