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
import type { ContractRow } from "$lib/gridColumnDefs/rowTypes";
import { cellAlign } from "$lib/gridColumnDefs/cellStyles";
import type {
  Chain,
  ContractName,
  Project,
  Version,
} from "@constants/chains/types";
import GridCellSyncStatusProgressBar from "./GridCellSyncStatusProgressBar.svelte";
import type { SyncStatusContract } from "@db/dbTypes";
import { storeSyncStatus } from "@stores/storeSyncStatus";
import { storeChainStatus } from "@stores/storeChainStatus";
import { get } from "svelte/store";
import {
  getProgressRate,
  getProgressRateForLabel,
} from "$lib/base/BaseProgressBarForBlockNumber/progressRate";
import { NO_DATA } from "@utils/utilsConstants";

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
      const contractName: ContractName = valueGetterParams.data!.contract.name;

      const contractSyncStatus: SyncStatusContract | undefined =
        get(storeSyncStatus)[targetChain.name].subSyncStatuses[
          targetProject.name
        ].subSyncStatuses[targetVersion.name].subSyncStatuses[contractName];

      const latestBlockNumber: number =
        get(storeChainStatus)[targetChain.name].latestBlockNumber;

      const startBlockNumber: number =
        valueGetterParams.data!.contract.creation.blockNumber;

      const progressRate: string = contractSyncStatus
        ? getProgressRateForLabel(
            getProgressRate(
              startBlockNumber,
              latestBlockNumber,
              contractSyncStatus.fetchedBlockNumber,
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
        cell.mount(GridCellSyncStatusProgressBar, {
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
