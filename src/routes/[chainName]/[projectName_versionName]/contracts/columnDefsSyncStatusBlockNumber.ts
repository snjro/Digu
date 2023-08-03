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
  Contract,
  Project,
  Version,
} from "@constants/chains/types";
import GridCellSyncStatusBlockNumber, {
  getBlockNumberByHeaderName,
} from "./GridCellSyncStatusBlockNumber.svelte";
import type { SyncStatusContract } from "@db/dbTypes";
import { storeSyncStatus } from "@stores/storeSyncStatus";
import { storeChainStatus } from "@stores/storeChainStatus";
import type { StateChainStatuses } from "@stores/storeTypes";
import { get } from "svelte/store";
import { NO_DATA } from "@utils/utilsCostants";

export const columnDefsSyncStatusBlockNumber = <T extends ContractRow>(
  targetChain: Chain,
  targetProject: Project,
  targetVersion: Version,
  headerName: "Start" | "Current" | "Goal",
): ColumnDef => {
  const columnDef: ColumnDef = {
    headerName: headerName,
    sortable: true,
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
      let targetContract: Contract = valueGetterParams.data!.contract;
      let targetContractSyncStatus: SyncStatusContract =
        get(storeSyncStatus)[targetChain.name].subSyncStatuses[
          targetProject.name
        ].subSyncStatuses[targetVersion.name].subSyncStatuses[
          targetContract.name
        ];
      let latestBlockNumber: number = 0;
      storeChainStatus.subscribe((storeChainStatus: StateChainStatuses) => {
        latestBlockNumber =
          storeChainStatus[targetChain.name].latestBlockNumber;
      });

      const blockNumber: number = getBlockNumberByHeaderName(
        headerName,
        latestBlockNumber,
        targetContractSyncStatus,
      );
      // in order to sort the column, change type of "blockNumber"(=number) to string
      return blockNumber === 0 ? NO_DATA : blockNumber.toString();
    },
    cellRenderer: cellRendererFactory(
      (
        cell: AbstractCellRenderer,
        cellRendererParams: ICellRendererParams<T>,
      ) => {
        new GridCellSyncStatusBlockNumber({
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
