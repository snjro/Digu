import type { ColumnDef } from "$lib/base/BaseGrid/types";
import type { ContractRow } from "./gridRows";
import { columnDefsCreation } from "./columnDefsCreation";
import { columnDefsBasic } from "./columnDefsBasic";
import { columnDefsConstructor } from "./columnDefsConstructor";
import { columnDefsFallback } from "./columnDefsFallback";
import { columnDefsEventsFunctions } from "./columnDefsEventsFunctions";
import type { Chain, Project, Version } from "@constants/chains/types";
import { columnDefsSyncStatus } from "./columnDefsSyncStatus";

export const columnDefs = <T extends ContractRow>(
  targetChain: Chain,
  targetProject: Project,
  targetVersion: Version,
  urlPathName: string,
  maxLengthOfConstructorInputsParams: number,
): ColumnDef[] => {
  const columnDefs: ColumnDef[] = [
    columnDefsBasic<T>(urlPathName),
    columnDefsSyncStatus(targetChain, targetProject, targetVersion),
    columnDefsCreation<T>(),
    columnDefsEventsFunctions<T>("events", urlPathName),
    columnDefsEventsFunctions<T>("functions", urlPathName),
    columnDefsFallback(),
    columnDefsConstructor<T>(maxLengthOfConstructorInputsParams),
  ];
  return columnDefs;
};
