import {
  cellRendererFactory,
  type AbstractCellRenderer,
} from "$lib/base/BaseGrid/cellRenderFactory";
import type { ColumnDef } from "$lib/base/BaseGrid/types";
import type { ICellRendererParams, ValueGetterParams } from "ag-grid-community";
import type { ContractRow } from "$lib/gridColumnDefs/rowTypes";
import { cellAlign } from "$lib/gridColumnDefs/cellStyles";
import type {
  Chain,
  ContractName,
  Project,
  Version,
} from "@constants/chains/types";
import GridCellSyncStatusSyncStateText from "./GridCellSyncStatusSyncStateText.svelte";
import { storeSyncStatus } from "@stores/storeSyncStatus";
import type { SyncStateText, SyncStatusContract } from "@db/dbTypes";
import { get } from "svelte/store";
import { NO_DATA } from "@utils/utilsConstants";

export const columnDefsSyncstatusCurrentState = <T extends ContractRow>(
  targetChain: Chain,
  targetProject: Project,
  targetVersion: Version,
): ColumnDef => {
  const columnDef: ColumnDef = {
    headerName: "Current State",
    sortable: true,
    editable: false,
    cellStyle: cellAlign("center"),

    columnGroupShow: undefined,
    valueGetter: (valueGetterParams: ValueGetterParams<T>): SyncStateText => {
      const contractName: ContractName = valueGetterParams.data!.contract.name;
      const contractSyncStatus: SyncStatusContract | undefined =
        get(storeSyncStatus)[targetChain.name].subSyncStatuses[
          targetProject.name
        ].subSyncStatuses[targetVersion.name].subSyncStatuses[contractName];
      return contractSyncStatus ? contractSyncStatus.syncStateText : NO_DATA;
    },
    cellRenderer: cellRendererFactory(
      (
        cell: AbstractCellRenderer,
        cellRendererParams: ICellRendererParams<T>,
      ) => {
        cell.mount(GridCellSyncStatusSyncStateText, {
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
