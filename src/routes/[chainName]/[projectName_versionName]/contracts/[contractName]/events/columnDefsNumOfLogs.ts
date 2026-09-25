import {
  AbstractCellRenderer,
  cellRendererFactory,
} from "$lib/base/BaseGrid/cellRenderFactory";
import type { ColumnDef } from "$lib/base/BaseGrid/types";
import type { ICellRendererParams, ValueGetterParams } from "ag-grid-community";
import type { ContractIdentifier } from "@db/dbTypes";
import { storeSyncStatus } from "@stores/storeSyncStatus";
import { get } from "svelte/store";
import type { EventRow } from "$lib/gridColumnDefs/rowTypes";
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
    valueGetter: (
      valueGetterParams: ValueGetterParams<T>,
    ): number | undefined => {
      return recordCount(contractIdentifier, valueGetterParams.data?.eventName);
    },
    cellRenderer: cellRendererFactory(
      (
        cell: AbstractCellRenderer,
        cellRendererParams: ICellRendererParams<T>,
      ) => {
        cell.mount(GridCellNumOfLogs, {
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
): number | undefined => {
  if (!eventName) {
    return 0;
  }
  return get(storeSyncStatus)[contractIdentifier.chainName].subSyncStatuses[
    contractIdentifier.projectName
  ].subSyncStatuses[contractIdentifier.versionName].subSyncStatuses[
    contractIdentifier.contractName
  ]?.events[eventName]?.recordCount;
};
