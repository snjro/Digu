import type { NodeStatus, SyncStateText } from "@db/dbTypes";

export type SyncToggleConditions = {
  nodeStatus: NodeStatus;
  isSyncTarget: boolean;
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
  return (
    !isAbleToSync ||
    isStopping ||
    conditions.isStarting ||
    conditions.isSyncingInOtherTab
  );
}
