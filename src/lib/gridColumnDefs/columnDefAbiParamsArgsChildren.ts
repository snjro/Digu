import {
  AbstractCellRenderer,
  cellRendererFactory,
} from "$lib/base/BaseGrid/cellRenderFactory";
import type { ColumnDef } from "$lib/base/BaseGrid/types";
import type { ICellRendererParams, ValueGetterParams } from "ag-grid-community";
import { getAbiParamsFromAbiRow, type AbiRow } from "./columnDefAbiParams";
import type { AbiFragmentParam } from "@constants/chains/types";
import { NO_DATA } from "@utils/utilsCostants";
import BaseLabel from "$lib/base/BaseLabel.svelte";
import { capitalizeFirstLetter } from "@utils/utilsCommon";
import AbiParamComponentsDetailsButton from "$lib/contracts/abiParams/AbiParamComponentsDetailsButton.svelte";
import { cellAlign } from "./cellStyles";
import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";

type ArgKey = "name" | "type" | "indexed";
function getAbiParamsArgStringValueFromAbiRow<T extends AbiRow>(
  targetParams: ValueGetterParams<T> | ICellRendererParams<T>,
  abiParamsKey: keyof T,
  indexOfArgs: number,
  argKey: ArgKey
): string {
  const targetAbiParam: AbiFragmentParam | undefined =
    getAbiParamsFromAbiRow<T>(targetParams, abiParamsKey)[indexOfArgs];
  if (!targetAbiParam || targetAbiParam[argKey] === null) {
    return NO_DATA;
  } else {
    return targetAbiParam[argKey]!.toString();
  }
}

const columnDefAbiParamsStringArg = <T extends AbiRow>(
  abiParamsKey: keyof T,
  indexOfArgs: number,
  argKey: ArgKey
): ColumnDef => {
  return {
    headerName: capitalizeFirstLetter(argKey),
    sortable: true,
    editable: false,
    cellStyle: cellAlign(argKey === "name" ? "start" : "center"),
    columnGroupShow: argKey === "name" ? undefined : "open",
    filterValueGetter: (valueGetterParams: ValueGetterParams<T>): string => {
      return getAbiParamsArgStringValueFromAbiRow<T>(
        valueGetterParams,
        abiParamsKey,
        indexOfArgs,
        argKey
      );
    },
    valueGetter: (valueGetterParams: ValueGetterParams<T>): string => {
      return getAbiParamsArgStringValueFromAbiRow<T>(
        valueGetterParams,
        abiParamsKey,
        indexOfArgs,
        argKey
      );
    },
  };
};
export const columnDefAbiParamsArgsChildren = <T extends AbiRow>(
  abiParamsKey: keyof T,
  showAbiParamsInputIndexedField: boolean,
  abiParamArgHeaderName: string,
  indexOfArgs: number
): ColumnDef[] => {
  let columnDefs: ColumnDef[] = [
    columnDefAbiParamsStringArg(abiParamsKey, indexOfArgs, "name"),
    ...(showAbiParamsInputIndexedField
      ? [columnDefAbiParamsStringArg(abiParamsKey, indexOfArgs, "indexed")]
      : []),
    columnDefAbiParamsStringArg(abiParamsKey, indexOfArgs, "type"),
    {
      headerName: capitalizeFirstLetter("components"),
      sortable: true,
      editable: false,
      cellStyle: cellAlign("center"),
      columnGroupShow: "open",
      filterValueGetter: undefined,
      valueGetter: (valueGetterParams: ValueGetterParams<T>): string => {
        const components: readonly AbiFragmentParam[] | undefined =
          getComponents(valueGetterParams, abiParamsKey, indexOfArgs);
        return components ? JSON.stringify(components) : NO_DATA;
      },
      cellRenderer: cellRendererFactory(
        (
          cell: AbstractCellRenderer,
          cellRendererParams: ICellRendererParams<T>
        ) => {
          const components: readonly AbiFragmentParam[] | undefined =
            getComponents(cellRendererParams, abiParamsKey, indexOfArgs);

          if (components) {
            new AbiParamComponentsDetailsButton({
              target: cell.eGui,
              props: {
                dialogHeaderText: capitalizeFirstLetter(abiParamArgHeaderName),
                components: components,
              },
            });
          } else {
            new BaseLabel({
              target: cell.eGui,
              props: {
                text: NO_DATA,
                textSize: sizeSettings.grid,
              },
            });
          }
        }
      ),
    },
  ];
  return columnDefs;
};
function getComponents<T extends AbiRow>(
  agGridParams: ValueGetterParams<T> | ICellRendererParams<T>,
  abiParamsKey: keyof T,
  indexOfArgs: number
): readonly AbiFragmentParam[] | undefined {
  const abiFragmentParams: AbiFragmentParam[] = getAbiParamsFromAbiRow<T>(
    agGridParams,
    abiParamsKey
  );
  const abiFragmentParam: AbiFragmentParam = abiFragmentParams[indexOfArgs];
  const components: readonly AbiFragmentParam[] | undefined =
    getComponentsFromAbiFragmentParam(abiFragmentParam);
  return components;
}
export function getComponentsFromAbiFragmentParam(
  abiFragmentParam: AbiFragmentParam
): readonly AbiFragmentParam[] | undefined {
  if (!abiFragmentParam) return undefined;
  if (abiFragmentParam.components !== null) return abiFragmentParam.components;
  if (abiFragmentParam.arrayChildren !== null)
    return getComponentsFromAbiFragmentParam(abiFragmentParam.arrayChildren);
  return undefined;
}
