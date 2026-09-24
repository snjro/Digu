import type { NodeStatus, SyncStateText } from "@db/dbTypes";

export type SyncToggleConditions = {
  nodeStatus: NodeStatus;
  isSyncTarget: boolean;
  isToggleOn: boolean;
  syncStateText: SyncStateText;
  isStarting: boolean;
  isSyncingInOtherTab: boolean;
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
    conditions.isSyncingInOtherTab
  );
}
