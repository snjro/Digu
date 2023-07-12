import {
  cellRendererFactory,
  type AbstractCellRenderer,
} from "$lib/base/BaseGrid/cellRenderFactory";
import type { ColumnDef } from "$lib/base/BaseGrid/types";
import type { ICellRendererParams } from "ag-grid-community";
import type { ContractRow } from "./gridRows";
import { cellAlign } from "@gridColumnDefs/cellStyles";
import type { Chain, Project, Version } from "@constants/chains/types";
import GridCellSyncStatusCurrentState from "./GridCellSyncStatusCurrentState.svelte";

export const columnDefsSyncstatusCurrentState = <T extends ContractRow>(
  targetChain: Chain,
  targetProject: Project,
  targetVersion: Version
): ColumnDef => {
  const columnDef: ColumnDef = {
    headerName: "Current State",
    sortable: true,
    editable: false,
    cellStyle: cellAlign("center"),

    columnGroupShow: undefined,
    //TODO: set "filterValueGetter" and "valueGetter".
    // filterValueGetter: (valueGetterParams: ValueGetterParams<T>) => {
    //   return valueGetterParams.data
    //     ? valueGetterParams.data.contractName
    //     : 0;
    // },
    // valueGetter: (valueGetterParams: ValueGetterParams<T>) => {
    //   return valueGetterParams.data
    //     ? valueGetterParams.data.contractName
    //     : 0;
    // },
    cellRenderer: cellRendererFactory(
      (
        cell: AbstractCellRenderer,
        cellRendererParams: ICellRendererParams<T>
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
      }
    ),
  };
  return columnDef;
};
