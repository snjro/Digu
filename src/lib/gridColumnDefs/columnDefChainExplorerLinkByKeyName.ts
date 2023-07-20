import {
  AbstractCellRenderer,
  cellRendererFactory,
} from "$lib/base/BaseGrid/cellRenderFactory";
import type { ColumnDef } from "$lib/base/BaseGrid/types";
import CommonChainExplorerLink, {
  type CommonChainExplorerLinkProps,
} from "$lib/common/CommonChainExplorerLink.svelte";
import type { ChainExplorer } from "@constants/chains/types";
import type {
  CellClassParams,
  CellStyle,
  ICellRendererParams,
  ValueGetterParams,
} from "ag-grid-community";
import { cellAlign, type CellAlignPosition } from "./cellStyles";
import BaseLabel from "$lib/base/BaseLabel.svelte";
import { NO_DATA } from "@utils/utilsCostants";
import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
import type { BaseSize } from "$lib/base/baseSizes";

const gridSize: BaseSize = sizeSettings.grid;
export const columnDefChainExplorerLinkByKeyName = <T>(
  headerName: string,
  keyName: keyof T,
  subdirectory: keyof ChainExplorer["subdirectory"],
  columnGroupShow: "open" | "closed" | undefined = undefined,
): ColumnDef => {
  return {
    headerName: headerName,
    sortable: true,
    editable: false,
    cellStyle: (cellClassParams: CellClassParams<T>): CellStyle => {
      if (cellClassParams.data && cellClassParams.data[keyName]) {
        const cellAlignPosition = (): CellAlignPosition => {
          if (subdirectory === "block") {
            return "end";
          } else {
            return "start";
          }
        };

        return cellAlign(cellAlignPosition());
      } else {
        return cellAlign("center");
      }
    },
    columnGroupShow: columnGroupShow,
    filterValueGetter: (valueGetterParams: ValueGetterParams<T>) => {
      if (valueGetterParams.data && valueGetterParams.data[keyName]) {
        return valueGetterParams.data[keyName];
      } else {
        return NO_DATA;
      }
    },
    valueGetter: (valueGetterParams: ValueGetterParams<T>) => {
      if (valueGetterParams.data && valueGetterParams.data[keyName]) {
        return valueGetterParams.data[keyName];
      } else {
        return NO_DATA;
      }
    },
    cellRenderer: cellRendererFactory(
      (
        cell: AbstractCellRenderer,
        cellRendererParams: ICellRendererParams<T>,
      ) => {
        if (cellRendererParams.data && cellRendererParams.data[keyName]) {
          new CommonChainExplorerLink({
            target: cell.eGui,
            props: {
              subdirectory: subdirectory,
              justifyEnd: subdirectory === "block",
              value: cellRendererParams.data[
                keyName
              ] as CommonChainExplorerLinkProps["value"],
              textSize: gridSize,
              isFontMono: subdirectory !== "block",
            },
          });
        } else {
          new BaseLabel({
            target: cell.eGui,
            props: {
              text: NO_DATA,
              textSize: gridSize,
            },
          });
        }
      },
    ),
  };
};
