import {
  cellRendererFactory,
  type AbstractCellRenderer,
} from "$lib/base/BaseGrid/cellRenderFactory";
import type { ColumnDef } from "$lib/base/BaseGrid/types";
import type { ICellRendererParams, ValueGetterParams } from "ag-grid-community";
import type { ContractRow } from "./gridRows";
import { cellAlign } from "$lib/gridColumnDefs/cellStyles";
import type {
  Chain,
  ContractName,
  Project,
  Version,
} from "@constants/chains/types";
import GridCellSyncStatusCurrentState from "./GridCellSyncStatusCurrentState.svelte";
import {
  getCurrentSyncingState,
  type CurrentSyncingState,
} from "$lib/common/CommonSyncCurrentState.svelte";
import { storeSyncStatus } from "@stores/storeSyncStatus";
import type { SyncStatusContract, SyncStatusesChain } from "@db/dbTypes";
import { NO_DATA } from "@utils/utilsCostants";

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
    valueGetter: (
      valueGetterParams: ValueGetterParams<T>,
    ): CurrentSyncingState => {
      let contractSyncStatus: SyncStatusContract | undefined = undefined;
      let contractName: ContractName = valueGetterParams.data!.contract.name;
      storeSyncStatus.subscribe((syncStatusesChain: SyncStatusesChain) => {
        contractSyncStatus =
          syncStatusesChain[targetChain.name].subSyncStatuses[
            targetProject.name
          ].subSyncStatuses[targetVersion.name].subSyncStatuses[contractName];
      });
      return contractSyncStatus
        ? getCurrentSyncingState(contractSyncStatus)
        : NO_DATA;
    },
    cellRenderer: cellRendererFactory(
      (
        cell: AbstractCellRenderer,
        cellRendererParams: ICellRendererParams<T>,
      ) => {
        new GridCellSyncStatusCurrentState({
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
