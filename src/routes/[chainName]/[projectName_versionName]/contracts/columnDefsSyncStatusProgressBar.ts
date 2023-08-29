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
import GridCellSyncStatusProgressBar from "./GridCellSyncStatusProgressBar.svelte";
import type { SyncStatusContract, SyncStatusesChain } from "@db/dbTypes";
import { storeSyncStatus } from "@stores/storeSyncStatus";
import { storeChainStatus } from "@stores/storeChainStatus";
import type { StateChainStatuses } from "@stores/storeTypes";
import {
  getProgressRate,
  getProgressRateForLabel,
} from "$lib/base/BaseProgressBarForBlockNumber/progressRate";
import { NO_DATA } from "@utils/utilsCostants";

export const columnDefsSyncstatusProgressBar = <T extends ContractRow>(
  targetChain: Chain,
  targetProject: Project,
  targetVersion: Version,
): ColumnDef => {
  const columnDef: ColumnDef = {
    headerName: "Progress",
    sortable: true,
    editable: false,
    cellStyle: (cellClassParams: CellClassParams<T>): CellStyle | undefined => {
      if (cellClassParams.data && cellClassParams.data.contractHasEvent) {
        return undefined;
      } else {
        return cellAlign("center");
      }
    },
    columnGroupShow: undefined,
    valueGetter: (valueGetterParams: ValueGetterParams<T>): string => {
      let contractName: ContractName = valueGetterParams.data!.contract.name;

      let contractSyncStatus: SyncStatusContract | undefined = undefined;
      storeSyncStatus.subscribe((syncStatusesChain: SyncStatusesChain) => {
        contractSyncStatus =
          syncStatusesChain[targetChain.name].subSyncStatuses[
            targetProject.name
          ].subSyncStatuses[targetVersion.name].subSyncStatuses[contractName];
      });

      let latestBlockNumber: number = 0;
      storeChainStatus.subscribe((stateChainStatuses: StateChainStatuses) => {
        latestBlockNumber =
          stateChainStatuses[targetChain.name].latestBlockNumber;
      });

      let startBlockNumber: number =
        valueGetterParams.data!.contract.creation.blockNumber;

      let progressRate: string = contractSyncStatus
        ? getProgressRateForLabel(
            getProgressRate(
              startBlockNumber,
              latestBlockNumber,
              (contractSyncStatus as SyncStatusContract).fetchedBlockNumber,
            ),
          )
        : NO_DATA;

      return progressRate;
    },
    cellRenderer: cellRendererFactory(
      (
        cell: AbstractCellRenderer,
        cellRendererParams: ICellRendererParams<T>,
      ) => {
        new GridCellSyncStatusProgressBar({
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
