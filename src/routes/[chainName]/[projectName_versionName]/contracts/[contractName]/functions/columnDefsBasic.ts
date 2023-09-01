import BaseA from "$lib/base/BaseA.svelte";
import {
  cellRendererFactory,
  type AbstractCellRenderer,
} from "$lib/base/BaseGrid/cellRenderFactory";
import type { ColumnDef } from "$lib/base/BaseGrid/types";
import BaseLabel from "$lib/base/BaseLabel.svelte";
import type { ICellRendererParams, ValueGetterParams } from "ag-grid-community";
import classNames from "classnames";
import type { FunctionRow } from "./gridRows";
import { columnDefStateMutability } from "$lib/gridColumnDefs/columnDefStateMutability";
import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
import type { BaseSize } from "$lib/base/baseSizes";
import { convertToKebabCase } from "@utils/utilsCommon";
import { TAB_VALUES_FUNCTION } from "$lib/PageWrapper/PageWrapper.svelte";

const cellClass: string = classNames("");
const sortable = true;
const editable = false;
const gridSize: BaseSize = sizeSettings.grid;
export const columnDefsBasic = <T extends FunctionRow>(
  urlPathName: string,
): ColumnDef => {
  const columnDef: ColumnDef = {
    headerName: "Basic",
    children: [
      {
        headerName: "Function Name",
        sortable: sortable,
        editable: editable,
        cellClass: cellClass,
        columnGroupShow: undefined,
        filterValueGetter: (valueGetterParams: ValueGetterParams<T>) => {
          return valueGetterParams.data
            ? valueGetterParams.data.functionName
            : "";
        },
        valueGetter: (valueGetterParams: ValueGetterParams<T>) => {
          return valueGetterParams.data
            ? valueGetterParams.data.functionName
            : "";
        },
        cellRenderer: cellRendererFactory(
          (
            cell: AbstractCellRenderer,
            cellRendererParams: ICellRendererParams<T>,
          ) => {
            if (cellRendererParams.data) {
              new BaseA({
                target: cell.eGui,
                props: {
                  text: cellRendererParams.data.functionName,
                  href: `${urlPathName}/${
                    cellRendererParams.data.functionName
                  }${
                    cellRendererParams.data.functionSelectorWithSplitter
                  }#${convertToKebabCase(TAB_VALUES_FUNCTION[0])}`,
                  textSize: gridSize,
                  openNewTab: false,
                  prefixIcon: {
                    name: "function",
                    size: gridSize,
                  },
                },
              });
            }
          },
        ),
      },
      columnDefStateMutability<T>("functionStateMutability"),
      {
        headerName: "Function Selector",
        sortable: sortable,
        editable: editable,
        cellClass: "flex justify-center",
        columnGroupShow: "open",
        filterValueGetter: (valueGetterParams: ValueGetterParams<T>) => {
          return valueGetterParams.data
            ? valueGetterParams.data.functionSelector
            : "";
        },
        valueGetter: (valueGetterParams: ValueGetterParams<T>) => {
          return valueGetterParams.data
            ? valueGetterParams.data.functionSelector
            : "";
        },
        cellRenderer: cellRendererFactory(
          (
            cell: AbstractCellRenderer,
            cellRendererParams: ICellRendererParams<T>,
          ) => {
            if (cellRendererParams.data) {
              new BaseLabel({
                target: cell.eGui,
                props: {
                  text: cellRendererParams.data.functionSelector,
                  textSize: gridSize,
                  fontMono: true,
                  showCopyButton: true,
                },
              });
            }
          },
        ),
      },
    ],
  };

  return columnDef;
};
