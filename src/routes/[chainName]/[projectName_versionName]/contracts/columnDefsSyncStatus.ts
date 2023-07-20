import type { ColumnDef } from "$lib/base/BaseGrid/types";
import type { Chain, Project, Version } from "@constants/chains/types";
import { columnDefsSyncstatusProgressBar } from "./columnDefsSyncStatusProgressBar";
import { columnDefsSyncStatusTarget } from "./columnDefsSyncStatusTarget";
import { columnDefsSyncStatusBlockNumber } from "./columnDefsSyncStatusBlockNumber";
import { columnDefsSyncstatusCurrentState } from "./columnDefsSyncStatusCurrentState";

export const columnDefsSyncStatus = (
  targetChain: Chain,
  targetProject: Project,
  targetVersion: Version,
): ColumnDef => {
  const columnDef: ColumnDef = {
    headerName: "Sync Status",
    openByDefault: false,
    children: [
      columnDefsSyncStatusTarget(targetChain, targetProject, targetVersion),
      columnDefsSyncstatusCurrentState(
        targetChain,
        targetProject,
        targetVersion,
      ),
      columnDefsSyncstatusProgressBar(
        targetChain,
        targetProject,
        targetVersion,
      ),
      columnDefsSyncStatusBlockNumber(
        targetChain,
        targetProject,
        targetVersion,
        "Start",
      ),
      columnDefsSyncStatusBlockNumber(
        targetChain,
        targetProject,
        targetVersion,
        "Current",
      ),
      columnDefsSyncStatusBlockNumber(
        targetChain,
        targetProject,
        targetVersion,
        "Goal",
      ),
    ],
  };
  return columnDef;
};
