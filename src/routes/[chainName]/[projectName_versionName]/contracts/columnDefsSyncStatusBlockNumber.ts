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
  Contract,
  Project,
  Version,
} from "@constants/chains/types";
import GridCellSyncStatusBlockNumber from "./GridCellSyncStatusBlockNumber.svelte";
import { getBlockNumberByHeaderName } from "./syncStatusBlockNumber";
import type { SyncStatusContract } from "@db/dbTypes";
import { storeSyncStatus } from "@stores/storeSyncStatus";
import { storeChainStatus } from "@stores/storeChainStatus";
import { get } from "svelte/store";
import { NO_DATA } from "@utils/utilsConstants";

// The values are strings (NO_DATA or a number), so compare them as numbers.
export function compareSyncStatusValues(
  valueA: string,
  valueB: string,
): number {
  const numberA: number = valueA === NO_DATA ? -Infinity : Number(valueA);
  const numberB: number = valueB === NO_DATA ? -Infinity : Number(valueB);
  if (numberA === numberB) return 0;
  return numberA < numberB ? -1 : 1;
}

export const columnDefsSyncStatusBlockNumber = <T extends ContractRow>(
  targetChain: Chain,
  targetProject: Project,
  targetVersion: Version,
  headerName: "Start" | "Current" | "Goal",
): ColumnDef => {
  const columnDef: ColumnDef = {
    headerName: headerName,
    sortable: true,
    comparator: compareSyncStatusValues,
    editable: false,
    cellStyle: (cellClassParams: CellClassParams<T>): CellStyle | undefined => {
      if (cellClassParams.data && cellClassParams.data.contractHasEvent) {
        return cellAlign("end");
      } else {
        return cellAlign("center");
      }
    },
    columnGroupShow: "open",
    valueGetter: (valueGetterParams: ValueGetterParams<T>) => {
      const targetContract: Contract = valueGetterParams.data!.contract;
      const targetContractSyncStatus: SyncStatusContract =
        get(storeSyncStatus)[targetChain.name].subSyncStatuses[
          targetProject.name
        ].subSyncStatuses[targetVersion.name].subSyncStatuses[
          targetContract.name
        ];
      const latestBlockNumber: number =
        get(storeChainStatus)[targetChain.name].latestBlockNumber;

      const blockNumber: number = getBlockNumberByHeaderName(
        headerName,
        latestBlockNumber,
        targetContractSyncStatus,
      );
      // A string, so that the CSV shows NO_DATA. The comparator sorts it as a number.
      return blockNumber === 0 ? NO_DATA : blockNumber.toString();
    },
    cellRenderer: cellRendererFactory(
      (
        cell: AbstractCellRenderer,
        cellRendererParams: ICellRendererParams<T>,
      ) => {
        cell.mount(GridCellSyncStatusBlockNumber, {
          target: cell.eGui,
          props: {
            targetChain: targetChain,
            targetProject: targetProject,
            targetVersion: targetVersion,
            targetContract: cellRendererParams.data!.contract,
            headerName: headerName,
          },
        });
      },
    ),
  };
  return columnDef;
};
