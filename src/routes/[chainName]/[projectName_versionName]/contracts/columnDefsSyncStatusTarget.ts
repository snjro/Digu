import {
  cellRendererFactory,
  type AbstractCellRenderer,
} from "$lib/grid/cellRenderFactory";
import type { ColumnDef } from "$lib/grid/types";
import type {
  CellClassParams,
  CellStyle,
  ICellRendererParams,
  ValueGetterParams,
} from "ag-grid-community";
import type { ContractRow } from "$lib/gridColumnDefs/rowTypes";
import { cellAlign } from "$lib/gridColumnDefs/cellStyles";
import type {
  Chain,
  ContractName,
  Project,
  Version,
} from "@constants/chains/types";
import GridCellSyncStatusTarget from "./GridCellSyncStatusTarget.svelte";
import type { SyncStatusContract } from "@db/dbTypes";
import { storeSyncStatus } from "@stores/storeSyncStatus";
import { get } from "svelte/store";
import {
  syncTargetLabelText,
  type SyncTargetLabelText,
} from "$lib/common/syncTargetStatus";
import { NO_DATA } from "@utils/utilsConstants";

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
      const contractName: ContractName = valueGetterParams.data!.contract.name;
      const contractSyncStatus: SyncStatusContract | undefined =
        get(storeSyncStatus)[targetChain.name].subSyncStatuses[
          targetProject.name
        ].subSyncStatuses[targetVersion.name].subSyncStatuses[contractName];
      return contractSyncStatus
        ? syncTargetLabelText(contractSyncStatus)
        : NO_DATA;
    },
    cellRenderer: cellRendererFactory(
      (
        cell: AbstractCellRenderer,
        cellRendererParams: ICellRendererParams<T>,
      ) => {
        cell.mount(GridCellSyncStatusTarget, {
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
