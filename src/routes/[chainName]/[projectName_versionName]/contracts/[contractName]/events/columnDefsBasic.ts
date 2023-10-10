import BaseA from "$lib/base/BaseA.svelte";
import {
  cellRendererFactory,
  type AbstractCellRenderer,
} from "$lib/base/BaseGrid/cellRenderFactory";
import type { ColumnDef } from "$lib/base/BaseGrid/types";
import BaseLabel from "$lib/base/BaseLabel.svelte";
import type { ICellRendererParams, ValueGetterParams } from "ag-grid-community";
import classNames from "classnames";
import type { EventRow } from "./gridRows";
import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
import type { BaseSize } from "$lib/base/baseSizes";
import { convertToKebabCase } from "@utils/utilsCommon";
import { TAB_VALUES_EVENT } from "$lib/PageWrapper/PageWrapper.svelte";

const girdSize: BaseSize = sizeSettings.grid;

const cellClass: string = classNames("");
const sortable = true;
const editable = false;
export const columnDefsBasic = <T extends EventRow>(
  urlPathName: string,
): ColumnDef => {
  const columnDef: ColumnDef = {
    headerName: "Basic",
    openByDefault: false,
    children: [
      {
        headerName: "Event Name",
        sortable: sortable,
        editable: editable,
        cellClass: cellClass,
        columnGroupShow: undefined,
        valueGetter: (valueGetterParams: ValueGetterParams<T>) => {
          return valueGetterParams.data ? valueGetterParams.data.eventName : "";
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
                  text: cellRendererParams.data.eventName,
                  href: `${urlPathName}${
                    cellRendererParams.data.eventName
                  }#${convertToKebabCase(TAB_VALUES_EVENT[0])}`,
                  textSize: girdSize,
                  openNewTab: false,
                  prefixIcon: {
                    name: "databaseOutline",
                    size: girdSize,
                  },
                },
              });
            }
          },
        ),
      },
      {
        field: "eventAnonymous",
        headerName: "Anonymous",
        sortable: sortable,
        editable: editable,
        cellClass: "flex justify-center",
        columnGroupShow: "open",
        // ↓ In order to be disabled the data type inference, set "cellDataType" as "false"
        // (https://www.ag-grid.com/javascript-data-grid/cell-data-types/#inferring-data-types)
        cellDataType: false,
      },
      {
        headerName: "Topic Hash",
        sortable: sortable,
        editable: editable,
        cellClass: "flex justify-center",
        columnGroupShow: "open",
        valueGetter: (valueGetterParams: ValueGetterParams<T>) => {
          return valueGetterParams.data
            ? valueGetterParams.data.eventTopicHash
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
                  text: cellRendererParams.data.eventTopicHash,
                  textSize: girdSize,
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
