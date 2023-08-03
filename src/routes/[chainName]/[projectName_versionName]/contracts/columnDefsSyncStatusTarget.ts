import {
  cellRendererFactory,
  type AbstractCellRenderer,
} from "$lib/base/BaseGrid/cellRenderFactory";
import type { ColumnDef } from "$lib/base/BaseGrid/types";
import type {
  CellClassParams,
  CellStyle,
  ICellRendererParams,
  ValueGetterParams,
} from "ag-grid-community";
import type { ContractRow } from "./gridRows";
import { cellAlign } from "$lib/gridColumnDefs/cellStyles";
import type {
  Chain,
  ContractName,
  Project,
  Version,
} from "@constants/chains/types";
import GridCellSyncStatusTarget from "./GridCellSyncStatusTarget.svelte";
import type { SyncStatusContract, SyncStatusesChain } from "@db/dbTypes";
import { storeSyncStatus } from "@stores/storeSyncStatus";
import {
  syncTargetLabelText,
  type SyncTargetLabelText,
} from "$lib/common/CommonToggleSyncTarget.svelte";
import { NO_DATA } from "@utils/utilsCostants";

export const columnDefsSyncStatusTarget = <T extends ContractRow>(
  targetChain: Chain,
  targetProject: Project,
  targetVersion: Version,
): ColumnDef => {
  const columnDef: ColumnDef = {
    headerName: "target",
    sortable: true,
    editable: false,
    cellStyle: (cellClassParams: CellClassParams<T>): CellStyle | undefined => {
      if (cellClassParams.data && cellClassParams.data.contractHasEvent) {
        return cellAlign("start");
      } else {
        return cellAlign("center");
      }
    },
    columnGroupShow: undefined,
    valueGetter: (
      valueGetterParams: ValueGetterParams<T>,
    ): SyncTargetLabelText | typeof NO_DATA => {
      let contractSyncStatus: SyncStatusContract | undefined = undefined;
      let contractName: ContractName = valueGetterParams.data!.contract.name;
      storeSyncStatus.subscribe((syncStatusesChain: SyncStatusesChain) => {
        contractSyncStatus =
          syncStatusesChain[targetChain.name].subSyncStatuses[
            targetProject.name
          ].subSyncStatuses[targetVersion.name].subSyncStatuses[contractName];
      });
      return contractSyncStatus
        ? syncTargetLabelText(contractSyncStatus)
        : NO_DATA;
    },
    cellRenderer: cellRendererFactory(
      (
        cell: AbstractCellRenderer,
        cellRendererParams: ICellRendererParams<T>,
      ) => {
        new GridCellSyncStatusTarget({
          target: cell.eGui,
          props: {
            targetChain: targetChain,
            targetProject: targetProject,
            targetVersion: targetVersion,
            targetContract: cellRendererParams.data!.contract,
          },
        });
      },
    ),
  };
  return columnDef;
};
