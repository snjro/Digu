import {
  AbstractCellRenderer,
  cellRendererFactory,
} from "$lib/base/BaseGrid/cellRenderFactory";
import type { ColumnDef } from "$lib/base/BaseGrid/types";
import AbiParamsNumberButton from "$lib/contracts/abiParams/AbiParamsNumberButton.svelte";
import { capitalizeFirstLetter } from "@utils/utilsCommon";
import type { ICellRendererParams, ValueGetterParams } from "ag-grid-community";
import {
  getAbiParamsFromAbiRow,
  type AbiFragmentParamTypeName,
  type AbiRow,
} from "./columnDefAbiParams";
import { cellAlign } from "./cellStyles";

export const columnDefAbiParamsNumOfParams = <T extends AbiRow>(
  abiParamsKey: keyof T,
  paramTypeName: AbiFragmentParamTypeName,
  showAbiParamsInputIndexedField: boolean,
): ColumnDef => {
  return {
    headerName: `Num of ${capitalizeFirstLetter(paramTypeName)}`,
    sortable: true,
    editable: false,
    cellStyle: cellAlign("end"),
    columnGroupShow: undefined,
    filterValueGetter: (valueGetterParams: ValueGetterParams<T>): number => {
      return abiParamsLength<T>(valueGetterParams, abiParamsKey);
    },
    valueGetter: (valueGetterParams: ValueGetterParams<T>): number => {
      return abiParamsLength<T>(valueGetterParams, abiParamsKey);
    },
    cellRenderer: cellRenderer<T>(
      abiParamsKey,
      paramTypeName,
      showAbiParamsInputIndexedField,
    ),
  };
};

const abiParamsLength = <T extends AbiRow>(
  targetParams: ValueGetterParams<T> | ICellRendererParams<T>,
  abiParamsKey: keyof T,
): number => {
  return getAbiParamsFromAbiRow<T>(targetParams, abiParamsKey).length;
};
const cellRenderer = <T extends AbiRow>(
  abiParamsKey: keyof T,
  paramTypeName: AbiFragmentParamTypeName,
  showAbiParamsInputIndexedField: boolean,
) => {
  return cellRendererFactory(
    (
      cell: AbstractCellRenderer,
      cellRendererParams: ICellRendererParams<T>,
    ) => {
      if (cellRendererParams.data) {
        new AbiParamsNumberButton({
          target: cell.eGui,
          props: {
            paramTypes: getAbiParamsFromAbiRow<T>(
              cellRendererParams,
              abiParamsKey,
            ),
            dialogHeaderText: `Params of ${capitalizeFirstLetter(
              paramTypeName,
            )}`,
            showAbiParamsInputIndexedField: showAbiParamsInputIndexedField,
          },
        });
      }
    },
  );
};
