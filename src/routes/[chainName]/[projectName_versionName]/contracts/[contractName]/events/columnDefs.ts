import type { ColumnDef } from "$lib/base/BaseGrid/types";
import type { EventRow } from "./gridRows";
// import { columnDefsOutputs } from "./columnDefsOutputs";
import { columnDefsBasic } from "./columnDefsBasic";
import { columnDefsInputs } from "./columnDefsInputs";
import { columnDefsNumOfLogs } from "./columnDefsNumOfLogs";
import type { ContractIdentifier } from "@db/dbTypes";

export const columnDefs = <T extends EventRow>(
  urlPathName: string,
  maxLengthOfFunctionInputsParams: number,
  contractIdentifier: ContractIdentifier,
): ColumnDef[] => {
  const columnDefs: ColumnDef[] = [
    columnDefsBasic<T>(urlPathName),
    columnDefsNumOfLogs<T>(contractIdentifier, urlPathName),
    columnDefsInputs<T>(maxLengthOfFunctionInputsParams),
  ];
  return columnDefs;
};
