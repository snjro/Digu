import BaseA from "$lib/base/BaseA.svelte";
import {
  cellRendererFactory,
  type AbstractCellRenderer,
} from "$lib/base/BaseGrid/cellRenderFactory";
import type { ColumnDef } from "$lib/base/BaseGrid/types";
import BaseLabel from "$lib/base/BaseLabel.svelte";
import CommonOpenLink from "$lib/common/CommonOpenLink.svelte";
import { NO_DATA } from "@utils/utilsCostants";
import type { ICellRendererParams, ValueGetterParams } from "ag-grid-community";
import classNames from "classnames";
import type { ContractRow } from "./gridRows";
import { columnDefChainExplorerLinkByKeyName } from "$lib/gridColumnDefs/columnDefChainExplorerLinkByKeyName";
import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
import type { BaseSize } from "$lib/base/baseSizes";
import { convertToKebabCase } from "@utils/utilsCommon";
import { TAB_VALUES_CONTRACT } from "$lib/base/BasePage/BasePageContainerContent.svelte";

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
        filterValueGetter: (valueGetterParams: ValueGetterParams<T>) => {
          return valueGetterParams.data
            ? valueGetterParams.data.contractName
            : "";
        },
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
              new BaseA({
                target: cell.eGui,
                props: {
                  text: cellRendererParams.data?.contractName,
                  href: `${urlPathName}/${
                    cellRendererParams.data.contractName
                  }#${convertToKebabCase(TAB_VALUES_CONTRACT[0])}`,
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
              new CommonOpenLink({
                target: cell.eGui,
                props: {
                  text: cellRendererParams.data?.contractSourceCodeUrl,
                  href: cellRendererParams.data?.contractSourceCodeUrl,
                  textSize: girdSize,
                  openNewTab: true,
                },
              });
            } else {
              new BaseLabel({
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
