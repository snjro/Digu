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
import type { SyncStatusContract, SyncStatusesChain } from "@db/dbTypes";
import { storeSyncStatus } from "@stores/storeSyncStatus";
import { storeChainStatus } from "@stores/storeChainStatus";
import type { StateChainStatuses } from "@stores/storeTypes";

export const columnDefsSyncStatusBlockNumber = <T extends ContractRow>(
  targetChain: Chain,
  targetProject: Project,
  targetVersion: Version,
  headerName: "Start" | "Current" | "Goal"
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
      let targetContractSyncStatus: SyncStatusContract;
      let fetchedBlockNumber: number | undefined;
      let latestBlockNumber: number = 0;
      let targetContract: Contract = valueGetterParams.data!.contract;
      storeSyncStatus.subscribe((syncStatusesChain: SyncStatusesChain) => {
        targetContractSyncStatus =
          syncStatusesChain[targetChain.name].subSyncStatuses[
            targetProject.name
          ].subSyncStatuses[targetVersion.name].subSyncStatuses[
            targetContract.name
          ];
        fetchedBlockNumber = targetContractSyncStatus
          ? targetContractSyncStatus.fetchedBlockNumber
          : undefined;
      });
      storeChainStatus.subscribe((storeChainStatus: StateChainStatuses) => {
        latestBlockNumber =
          storeChainStatus[targetChain.name].latestBlockNumber;
      });

      return getBlockNumberByHeaderName(
        targetContract,
        headerName,
        latestBlockNumber,
        fetchedBlockNumber
      );
    },

    cellRenderer: cellRendererFactory(
      (
        cell: AbstractCellRenderer,
        cellRendererParams: ICellRendererParams<T>
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
      }
    ),
  };
  return columnDef;
};
