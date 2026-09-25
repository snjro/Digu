import BaseA from "$lib/base/BaseA.svelte";
import {
  cellRendererFactory,
  type AbstractCellRenderer,
} from "$lib/grid/cellRenderFactory";
import type { ColumnDef } from "$lib/grid/types";
import BaseLabel from "$lib/base/BaseLabel.svelte";
import CommonOpenLink from "$lib/common/CommonOpenLink.svelte";
import { NO_DATA } from "@utils/utilsConstants";
import type { ICellRendererParams, ValueGetterParams } from "ag-grid-community";
import classNames from "classnames";
import type { ContractRow } from "$lib/gridColumnDefs/rowTypes";
import { columnDefChainExplorerLinkByKeyName } from "$lib/gridColumnDefs/columnDefChainExplorerLinkByKeyName";
import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
import type { BaseSize } from "$lib/base/baseSizes";
import { getFirstTabUrlHash } from "$lib/PageWrapper/tabs";

const girdSize: BaseSize = sizeSettings.grid;
const cellClass: string = classNames("");
const sortable = true;
const editable = false;
export const columnDefsBasic = <T extends ContractRow>(
  urlPathName: string,
): ColumnDef => {
  const columnDef: ColumnDef = {
    headerName: "Basics",
    openByDefault: false,
    children: [
      {
        headerName: "Contract Name",
        sortable: sortable,
        editable: editable,
        cellClass: cellClass,
        columnGroupShow: undefined,
        valueGetter: (valueGetterParams: ValueGetterParams<T>) => {
          return valueGetterParams.data
            ? valueGetterParams.data.contractName
            : "";
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
                  text: cellRendererParams.data?.contractName,
                  href: `${urlPathName}${
                    cellRendererParams.data.contractName
                  }#${getFirstTabUrlHash("contracts")}`,
                  textSize: girdSize,
                  openNewTab: false,
                  prefixIcon: {
                    name: "scriptText",
                    size: girdSize,
                  },
                },
              });
            }
          },
        ),
      },

      columnDefChainExplorerLinkByKeyName<T>(
        "contract address",
        "contractAddress",
        "address",
        "open",
      ),
      {
        headerName: "Source URL",
        sortable: sortable,
        editable: editable,
        cellClass: cellClass,
        columnGroupShow: "open",
        valueGetter: (valueGetterParams: ValueGetterParams<T>) => {
          return valueGetterParams.data!.contractSourceCodeUrl ?? NO_DATA;
        },
        cellRenderer: cellRendererFactory(
          (
            cell: AbstractCellRenderer,
            cellRendererParams: ICellRendererParams<T>,
          ) => {
            if (cellRendererParams.data?.contractSourceCodeUrl) {
              cell.mount(CommonOpenLink, {
                target: cell.eGui,
                props: {
                  text: cellRendererParams.data?.contractSourceCodeUrl,
                  href: cellRendererParams.data?.contractSourceCodeUrl,
                  textSize: girdSize,
                  openNewTab: true,
                },
              });
            } else {
              cell.mount(BaseLabel, {
                target: cell.eGui,
                props: {
                  text: NO_DATA,
                  textSize: girdSize,
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
