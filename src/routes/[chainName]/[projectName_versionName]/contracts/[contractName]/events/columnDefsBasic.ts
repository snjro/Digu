import BaseA from "$lib/base/BaseA.svelte";
import {
  cellRendererFactory,
  type AbstractCellRenderer,
} from "$lib/grid/cellRenderFactory";
import type { ColumnDef } from "$lib/grid/types";
import BaseLabel from "$lib/base/BaseLabel.svelte";
import type { ICellRendererParams, ValueGetterParams } from "ag-grid-community";
import classNames from "classnames";
import type { EventRow } from "$lib/gridColumnDefs/rowTypes";
import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
import type { BaseSize } from "$lib/base/baseSizes";
import { getFirstTabUrlHash } from "$lib/PageWrapper/tabs";

const gridSize: BaseSize = sizeSettings.grid;

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
              cell.mount(BaseA, {
                target: cell.eGui,
                props: {
                  text: cellRendererParams.data.eventName,
                  href: `${urlPathName}${
                    cellRendererParams.data.eventName
                  }#${getFirstTabUrlHash("events")}`,
                  textSize: gridSize,
                  openNewTab: false,
                  prefixIcon: {
                    name: "databaseOutline",
                    size: gridSize,
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
              cell.mount(BaseLabel, {
                target: cell.eGui,
                props: {
                  text: cellRendererParams.data.eventTopicHash,
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
