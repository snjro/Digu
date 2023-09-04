import {
  cellRendererFactory,
  type AbstractCellRenderer,
} from "$lib/base/BaseGrid/cellRenderFactory";
import type { ColumnDef } from "$lib/base/BaseGrid/types";
import CommonChainExplorerLink from "$lib/common/CommonChainExplorerLink.svelte";
import type { EventAbiFragment } from "@constants/chains/types";
import type {
  ICellRendererParams,
  ValueFormatterParams,
  ValueGetterParams,
} from "ag-grid-community";
import classNames from "classnames";
import type { AbiFragmentParam } from "@constants/chains/types";
import type { ConvertedEventLog } from "@db/dbTypes";
import {
  convertJsDateToIso8601,
  convertJsDateToTimestampSec,
} from "@utils/utilsTime";
import { columnDefChainExplorerLinkByKeyName } from "$lib/gridColumnDefs/columnDefChainExplorerLinkByKeyName";
import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
const cellClass: string = classNames("");
const sortable = true;
const editable = false;
export const columnDefs = <T extends ConvertedEventLog>(
  targetEventAbiFragment: EventAbiFragment,
  eachArgsMaxLengths: number[],
): ColumnDef[] => {
  const columnDefs: ColumnDef[] = [
    {
      headerName: "time",
      children: [
        blocknumberColumnDef<T>(undefined),
        {
          field: "jsDate",
          headerName: "datetime",
          sortable: sortable,
          editable: editable,
          cellClass: cellClass,
          columnGroupShow: "open",
          valueGetter: (valueGetterParams: ValueGetterParams) => {
            return convertJsDateToIso8601(valueGetterParams.data.jsDate);
          },
        },
      ],
    },
    argsColumnDef(targetEventAbiFragment, eachArgsMaxLengths),
    ...logAndTransactionInfoColumnDefs(),
  ];
  return columnDefs;
};
export function getHexEventLogColumnDefs(
  targetEventAbiFragment: EventAbiFragment,
): ColumnDef[] {
  const columnDefs: ColumnDef[] = [
    {
      headerName: "time",
      children: [
        blocknumberColumnDef(undefined),
        {
          field: "jsDate",
          headerName: "timestamp",
          sortable: sortable,
          editable: editable,
          cellClass: "text-right",
          columnGroupShow: "open",
          valueGetter: (valueGetterParams: ValueGetterParams) => {
            return convertJsDateToTimestampSec(valueGetterParams.data.jsDate);
          },
        },
      ],
    },

    topicsColumnDef(targetEventAbiFragment),
    {
      field: "data",
      headerName: "data",
      sortable: sortable,
      editable: editable,
      cellClass: cellClass,
    },
    ...logAndTransactionInfoColumnDefs(),
  ];
  return columnDefs;
}

const blocknumberColumnDef = <T extends ConvertedEventLog>(
  columnGroupShow: "open" | "closed" | undefined,
): ColumnDef =>
  columnDefChainExplorerLinkByKeyName<T>(
    "blocknumber",
    "blockNumber",
    "block",
    columnGroupShow,
  );
function getTopicsLength(targetEventAbiFragment: EventAbiFragment): number {
  let topicsLength = targetEventAbiFragment.anonymous ? 0 : 1;
  const abiFragmentInputs: EventAbiFragment["inputs"] =
    targetEventAbiFragment.inputs;
  for (let abiFragmentParam of abiFragmentInputs) {
    abiFragmentParam.indexed && topicsLength++;
  }
  return topicsLength;
}
const topicsColumnDef = (
  targetEventAbiFragment: EventAbiFragment,
): ColumnDef => {
  const topicsColumnDef: ColumnDef = { headerName: "topics", children: [] };
  for (
    let indexTopics = 0;
    indexTopics <= getTopicsLength(targetEventAbiFragment) - 1;
    indexTopics++
  ) {
    const topicItemColumnDef: ColumnDef = {
      headerName: `topics[${indexTopics}]`,
      sortable: sortable,
      editable: editable,
      cellClass: cellClass,
      columnGroupShow: indexTopics === 0 ? undefined : "open",
      valueGetter: (valueGetterParams: ValueGetterParams) => {
        return valueGetterParams.data.topics[indexTopics];
      },
    };

    topicsColumnDef.children.push(topicItemColumnDef);
  }
  return topicsColumnDef;
};
const logAndTransactionInfoColumnDefs = (): ColumnDef[] => {
  return [
    {
      headerName: "transaction",
      children: [
        {
          field: "transactionIndex",
          headerName: "transaction index",
          sortable: sortable,
          editable: editable,
          cellClass: "text-right",
          columnGroupShow: undefined,
        },
        columnDefChainExplorerLinkByKeyName(
          "transaction hash",
          "transactionHash",
          "tx",
          "open",
        ),
      ],
    },
    {
      headerName: "log",
      children: [
        {
          field: "logIndex",
          headerName: "log index",
          sortable: sortable,
          editable: editable,
          cellClass: "text-right",
          columnGroupShow: undefined,
        },
        {
          field: "removed",
          headerName: "removed",
          sortable: sortable,
          editable: editable,
          cellClass: cellClass,
          columnGroupShow: "open",
          // ↓ In order to be disabled the data type inference, set "cellDataType" as "false"
          // (https://www.ag-grid.com/javascript-data-grid/cell-data-types/#inferring-data-types)
          cellDataType: false,
        },
      ],
    },
  ];
};

function getArgChildValue(argChildValue: any, indexArgChild: number): any {
  if (Array.isArray(argChildValue)) {
    argChildValue = argChildValue[indexArgChild];
  } else {
    argChildValue = argChildValue;
  }
  return argChildValue;
}

const argsColumnDef = (
  targetEventAbiFragment: EventAbiFragment,
  eachArgsMaxLengths: number[],
): ColumnDef => {
  // name     |number of occurances|type
  // address  |407,                |address
  // address[]|2,                  |address[]
  // bool:    |15,                 |boolean(true/false)
  // bytes:   |8,                  |string
  // bytes32: |16,                 |string
  // bytes32[]|2,                  |string[]
  // bytes4:  |4,                  |string
  // string:  |13,                 |string
  // string[] |1                   |string[]
  // int256:  |17,                 |BigNumber({_hex:"0x02",isBigNumber:true})
  // int256[] |1,                  |BigNumber({_hex:"0x02",isBigNumber:true})[]
  // uint112: |2,                  |BigNumber({_hex:"0x02",isBigNumber:true})
  // uint256: |301,                |BigNumber({_hex:"0x02",isBigNumber:true})
  // uint256[]|21,                 |BigNumber({_hex:"0x02",isBigNumber:true})[]
  // uint8    |20,                 |number

  const columnDef: ColumnDef = { headerName: "args", children: [] };
  const abiFragmentInputs: EventAbiFragment["inputs"] =
    targetEventAbiFragment.inputs;
  if (abiFragmentInputs && Array.isArray(abiFragmentInputs)) {
    for (
      let indexOfInputs: number = 0;
      indexOfInputs <= abiFragmentInputs.length - 1;
      indexOfInputs++
    ) {
      const abiFragmentInput: AbiFragmentParam =
        abiFragmentInputs[indexOfInputs];
      let argColumnDef: ColumnDef = {
        headerName: `args[${indexOfInputs}]`,
        children: [],
        columnGroupShow: indexOfInputs === 0 ? undefined : "open",
      };
      for (
        let indexOfArgChild: number = 0;
        indexOfArgChild <= eachArgsMaxLengths[indexOfInputs] - 1;
        indexOfArgChild++
      ) {
        argColumnDef.children.push(
          argChildColumnDef(abiFragmentInput, indexOfInputs, indexOfArgChild),
        );
      }
      columnDef.children.push(argColumnDef);
    }
  }
  return columnDef;
};
const argChildColumnDef = (
  abiFragmentInput: AbiFragmentParam,
  indexOfInputs: number,
  indexOfArgChild: number,
): ColumnDef => {
  let argChildColumnDef: ColumnDef;
  const headerName: string = abiFragmentInput.isArray()
    ? abiFragmentInput.name + "[" + indexOfArgChild + "]"
    : abiFragmentInput.name;

  if (abiFragmentInput.type.startsWith("address")) {
    argChildColumnDef = {
      headerName: headerName,
      sortable: sortable,
      editable: editable,
      cellClass: cellClass,
      valueGetter: (valueGetterParams: ValueGetterParams) => {
        return getArgChildValue(
          valueGetterParams.data.args[indexOfInputs],
          indexOfArgChild,
        );
      },
      cellRenderer: cellRendererFactory(
        (
          cell: AbstractCellRenderer,
          cellRendererParams: ICellRendererParams,
        ) => {
          new CommonChainExplorerLink({
            target: cell.eGui,
            props: {
              subdirectory: "address",
              value: getArgChildValue(
                cellRendererParams.data.args[indexOfInputs],
                indexOfArgChild,
              ),
              isFontMono: true,
              textSize: sizeSettings.grid,
            },
          });
        },
      ),
    };
  } else {
    argChildColumnDef = {
      headerName: headerName,
      sortable: sortable,
      editable: editable,
      cellClass:
        abiFragmentInput.type.startsWith("int") ||
        abiFragmentInput.type.startsWith("uint")
          ? "text-right"
          : cellClass,
      valueFormatter: (valueFormatterParams: ValueFormatterParams) => {
        let argChildValue = getArgChildValue(
          valueFormatterParams.data.args[indexOfInputs],
          indexOfArgChild,
        );
        return typeof argChildValue === "bigint"
          ? argChildValue.toLocaleString()
          : argChildValue;
      },
      valueGetter: (valueGetterParams: ValueGetterParams) => {
        return getArgChildValue(
          valueGetterParams.data.args[indexOfInputs],
          indexOfArgChild,
        );
      },
    };
  }
  return argChildColumnDef;
};
