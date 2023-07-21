import {
  AbstractCellRenderer,
  cellRendererFactory,
} from "$lib/base/BaseGrid/cellRenderFactory";
import type { ColumnDef } from "$lib/base/BaseGrid/types";
import { numberWithCommas } from "@utils/utilsCommon";
import type { ICellRendererParams, ValueGetterParams } from "ag-grid-community";
import type { ContractIdentifier, SyncStatusesChain } from "@db/dbTypes";
import { storeSyncStatus } from "@stores/storeSyncStatus";
import BaseA from "$lib/base/BaseA.svelte";
import BaseLabel from "$lib/base/BaseLabel.svelte";
import type { EventRow } from "./gridRows";
import type { AbiFragmentName } from "@constants/chains/types";
import { cellAlign } from "$lib/gridColumnDefs/cellStyles";
import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
import type { BaseSize } from "$lib/base/baseSizes";

const girdSize: BaseSize = sizeSettings.grid;
export const columnDefsNumOfLogs = <T extends EventRow>(
  contractIdentifier: ContractIdentifier,
  urlPathName: string
): ColumnDef => {
  return {
    headerName: `Num of Logs`,
    sortable: true,
    editable: false,
    cellStyle: cellAlign("end"),
    columnGroupShow: undefined,
    filterValueGetter: (valueGetterParams: ValueGetterParams<T>): number => {
      return recordCount(contractIdentifier, valueGetterParams.data?.eventName);
    },
    valueGetter: (valueGetterParams: ValueGetterParams<T>): number => {
      return recordCount(contractIdentifier, valueGetterParams.data?.eventName);
    },
    cellRenderer: cellRendererFactory(
      (
        cell: AbstractCellRenderer,
        cellRendererParams: ICellRendererParams<T>
      ) => {
        if (cellRendererParams.data) {
          const totalNumber: number = recordCount(
            contractIdentifier,
            cellRendererParams.data?.eventName
          );
          if (totalNumber > 0) {
            {
              const href: string = `${urlPathName}/${cellRendererParams.data.eventName}`;
              new BaseA({
                target: cell.eGui,
                props: {
                  text: numberWithCommas(totalNumber),
                  href: href,
                  textSize: girdSize,
                  openNewTab: false,
                },
              });
            }
          } else {
            new BaseLabel({
              target: cell.eGui,
              props: {
                text: numberWithCommas(totalNumber),
                textSize: girdSize,
              },
            });
          }
        }
      }
    ),
  };
};

const recordCount = (
  contractIdentifier: ContractIdentifier,
  eventName: AbiFragmentName | undefined
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
