import {
  AbstractCellRenderer,
  cellRendererFactory,
} from "$lib/base/BaseGrid/cellRenderFactory";
import type { ColumnDef } from "$lib/base/BaseGrid/types";
import type { ICellRendererParams, ValueGetterParams } from "ag-grid-community";
import type { ContractIdentifier, SyncStatusesChain } from "@db/dbTypes";
import { storeSyncStatus } from "@stores/storeSyncStatus";
import type { EventRow } from "./gridRows";
import type { AbiFragmentName } from "@constants/chains/types";
import { cellAlign } from "$lib/gridColumnDefs/cellStyles";
import GridCellNumOfLogs from "./GridCellNumOfLogs.svelte";

export const columnDefsNumOfLogs = <T extends EventRow>(
  contractIdentifier: ContractIdentifier,
  urlPathName: string,
): ColumnDef => {
  return {
    headerName: `Num of Logs`,
    sortable: true,
    editable: false,
    cellStyle: cellAlign("end"),
    columnGroupShow: undefined,
    valueGetter: (valueGetterParams: ValueGetterParams<T>): number => {
      return recordCount(contractIdentifier, valueGetterParams.data?.eventName);
    },
    cellRenderer: cellRendererFactory(
      (
        cell: AbstractCellRenderer,
        cellRendererParams: ICellRendererParams<T>,
      ) => {
        new GridCellNumOfLogs({
          target: cell.eGui,
          props: {
            contractIdentifier: contractIdentifier,
            targetEventName: cellRendererParams.data!.eventName,
            urlPathName: urlPathName,
          },
        });
      },
    ),
  };
};

const recordCount = (
  contractIdentifier: ContractIdentifier,
  eventName: AbiFragmentName | undefined,
): number => {
  let recordCount: number = 0;
  if (eventName) {
    storeSyncStatus.subscribe((syncStatusesChain: SyncStatusesChain) => {
      recordCount =
        syncStatusesChain[contractIdentifier.chainName].subSyncStatuses[
          contractIdentifier.projectName
        ].subSyncStatuses[contractIdentifier.versionName].subSyncStatuses[
          contractIdentifier.contractName
        ].events[eventName].recordCount;
    });
  }
  return recordCount;
};
