import type { ColumnDef } from "#lib/grid/types.js";
import type { ContractRow } from "#lib/gridColumnDefs/rowTypes.js";
import { columnDefChainExplorerLinkByKeyName } from "#lib/gridColumnDefs/columnDefChainExplorerLinkByKeyName.js";
import { cellAlign } from "#lib/gridColumnDefs/cellStyles.js";

export const columnDefsCreation = <T extends ContractRow>(): ColumnDef => {
  const columnDef: ColumnDef = {
    headerName: "Creation",
    openByDefault: false,
    children: [
      columnDefChainExplorerLinkByKeyName<T>(
        "Creation Block Number",
        "contractCreationBlockNumber",
        "block",
        undefined,
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
        "open",
      ),
      columnDefChainExplorerLinkByKeyName<T>(
        "Creator Address",
        "contractCreationCreator",
        "address",
        "open",
      ),
    ],
  };
  return columnDef;
};
