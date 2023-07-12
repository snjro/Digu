import type { ColumnDef } from "$lib/base/BaseGrid/types";
import type { ContractRow } from "./gridRows";
import { columnDefChainExplorerLinkByKeyName } from "@gridColumnDefs/columnDefChainExplorerLinkByKeyName";
import { cellAlign } from "@gridColumnDefs/cellStyles";

export const columnDefsCreation = <T extends ContractRow>(): ColumnDef => {
  const columnDef: ColumnDef = {
    headerName: "Creation",
    openByDefault: false,
    children: [
      columnDefChainExplorerLinkByKeyName<T>(
        "Creation Blocknumber",
        "contractCreationBlockNumber",
        "block",
        undefined
      ),
      {
        field: "contractCreationDatetime",
        headerName: "Creation Datetime",
        sortable: true,
        editable: false,
        cellStyle: cellAlign("start"),
        columnGroupShow: "open",
      },
      columnDefChainExplorerLinkByKeyName<T>(
        "Creation Tx Hash",
        "contractCreationTx",
        "tx",
        "open"
      ),
      columnDefChainExplorerLinkByKeyName<T>(
        "Creator Address",
        "contractCreationCreator",
        "address",
        "open"
      ),
    ],
  };
  return columnDef;
};
