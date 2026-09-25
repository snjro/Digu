import BaseA from "$lib/base/BaseA.svelte";
import {
  cellRendererFactory,
  type AbstractCellRenderer,
} from "$lib/grid/cellRenderFactory";
import type { ColumnDef } from "$lib/grid/types";
import BaseLabel from "$lib/base/BaseLabel.svelte";
import { capitalizeFirstLetter, numberWithCommas } from "@utils/utilsCommon";
import type { ICellRendererParams, ValueGetterParams } from "ag-grid-community";
import type { ContractRow } from "$lib/gridColumnDefs/rowTypes";
import { cellAlign } from "$lib/gridColumnDefs/cellStyles";
import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
import type { BaseSize } from "$lib/base/baseSizes";
import type { AbiFragmentsType } from "$lib/contracts/abiFragmentsType";
const gridSize: BaseSize = sizeSettings.grid;
export const columnDefsEventsFunctions = <T extends ContractRow>(
  abiFragmentsType: AbiFragmentsType,
  urlPathName: string,
): ColumnDef => {
  const keyOfContractRow: keyof T =
    abiFragmentsType === "events"
      ? "contractEventsTotalNumber"
      : "contractFunctionsTotalNumber";

  const columnDef: ColumnDef = {
    headerName: `${capitalizeFirstLetter(abiFragmentsType)}`,
    children: [
      {
        headerName: `Num of ${capitalizeFirstLetter(abiFragmentsType)}`,
        sortable: true,
        editable: false,
        cellStyle: cellAlign("end"),
        columnGroupShow: undefined,
        valueGetter: (valueGetterParams: ValueGetterParams<T>): number => {
          return valueGetterParams.data
            ? (valueGetterParams.data[keyOfContractRow] as number)
            : 0;
        },
        cellRenderer: cellRendererFactory(
          (
            cell: AbstractCellRenderer,
            cellRendererParams: ICellRendererParams<T>,
          ) => {
            if (cellRendererParams.data) {
              const totalNumber: number = cellRendererParams.data[
                keyOfContractRow
              ] as number;
              if (totalNumber > 0) {
                {
                  const href: string = `${urlPathName}${cellRendererParams.data.contractName}/${abiFragmentsType}`;
                  cell.mount(BaseA, {
                    target: cell.eGui,
                    props: {
                      text: numberWithCommas(totalNumber),
                      href: href,
                      textSize: gridSize,
                      openNewTab: false,
                    },
                  });
                }
              } else {
                cell.mount(BaseLabel, {
                  target: cell.eGui,
                  props: {
                    text: numberWithCommas(totalNumber),
                    textSize: gridSize,
                  },
                });
              }
            }
          },
        ),
      },
    ],
  };
  return columnDef;
};
