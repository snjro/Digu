import {
  cellRendererFactory,
  type AbstractCellRenderer,
} from "$lib/base/BaseGrid/cellRenderFactory";
import type { ColumnDef } from "$lib/base/BaseGrid/types";
import type {
  CellClassParams,
  CellStyle,
  ICellRendererParams,
} from "ag-grid-community";
import type { ContractRow } from "./gridRows";
import { cellAlign } from "@gridColumnDefs/cellStyles";
import type { Chain, Project, Version } from "@constants/chains/types";
import GridCellSyncStatusTarget from "./GridCellSyncStatusTarget.svelte";

export const columnDefsSyncStatusTarget = <T extends ContractRow>(
  targetChain: Chain,
  targetProject: Project,
  targetVersion: Version
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
        new GridCellSyncStatusTarget({
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
