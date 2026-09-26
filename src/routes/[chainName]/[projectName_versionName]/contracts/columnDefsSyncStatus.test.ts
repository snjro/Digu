import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { get } from "svelte/store";
import type {
  ColDef,
  IRowNode,
  SortComparatorFn,
  ValueGetterParams,
} from "ag-grid-community";
import type { ColumnDef } from "$lib/grid/types";
import { TARGET_CHAINS } from "@constants/chains/_index";
import type {
  Chain,
  Contract,
  Project,
  Version,
} from "@constants/chains/types";
import type { SyncStatusContract } from "@db/dbTypes";
import { storeSyncStatus } from "@stores/storeSyncStatus";
import { storeChainStatus } from "@stores/storeChainStatus";
import { syncTargetLabelText } from "$lib/common/syncTargetStatus";
import { extractEventContracts } from "@utils/utilsEthers";
import { trackStoreSubscriptions } from "@utils/testCommon";
import { columnDefsSyncStatusBlockNumber } from "./columnDefsSyncStatusBlockNumber";
import { columnDefsSyncstatusCurrentState } from "./columnDefsSyncStatusCurrentState";
import { columnDefsSyncstatusProgressBar } from "./columnDefsSyncStatusProgressBar";
import { columnDefsSyncStatusTarget } from "./columnDefsSyncStatusTarget";
import type { ContractRow } from "$lib/gridColumnDefs/rowTypes";

const targetChain: Chain = TARGET_CHAINS[0];
const targetProject: Project = targetChain.projects[0];
const targetVersion: Version = targetProject.versions[0];
const targetContract: Contract = extractEventContracts(
  targetVersion.contracts,
)[0];
const valueGetterParams = {
  data: { contract: targetContract } as ContractRow,
} as ValueGetterParams<ContractRow>;
const numOfCalls: number = 3;

function callValueGetter(columnDef: ColumnDef): unknown {
  const valueGetter = (columnDef as ColDef).valueGetter as (
    params: ValueGetterParams<ContractRow>,
  ) => unknown;
  return valueGetter(valueGetterParams);
}
function contractSyncStatus(): SyncStatusContract {
  return get(storeSyncStatus)[targetChain.name].subSyncStatuses[
    targetProject.name
  ].subSyncStatuses[targetVersion.name].subSyncStatuses[targetContract.name]!;
}

const columnDefs: [string, ColumnDef][] = [
  ...(["Start", "Current", "Goal"] as const).map(
    (headerName): [string, ColumnDef] => [
      `columnDefsSyncStatusBlockNumber (${headerName})`,
      columnDefsSyncStatusBlockNumber(
        targetChain,
        targetProject,
        targetVersion,
        headerName,
      ),
    ],
  ),
  [
    "columnDefsSyncstatusCurrentState",
    columnDefsSyncstatusCurrentState(targetChain, targetProject, targetVersion),
  ],
  [
    "columnDefsSyncstatusProgressBar",
    columnDefsSyncstatusProgressBar(targetChain, targetProject, targetVersion),
  ],
  [
    "columnDefsSyncStatusTarget",
    columnDefsSyncStatusTarget(targetChain, targetProject, targetVersion),
  ],
];

describe("valueGetter of sync status columns", () => {
  let syncStatusSubscriptions: ReturnType<typeof trackStoreSubscriptions>;
  let chainStatusSubscriptions: ReturnType<typeof trackStoreSubscriptions>;
  beforeEach(() => {
    syncStatusSubscriptions = trackStoreSubscriptions(storeSyncStatus);
    chainStatusSubscriptions = trackStoreSubscriptions(storeChainStatus);
  });
  afterEach(() => {
    syncStatusSubscriptions.restore();
    chainStatusSubscriptions.restore();
  });

  for (const [name, columnDef] of columnDefs) {
    test(`${name}: should not leave subscriptions to the stores`, () => {
      for (let count = 0; count < numOfCalls; count++) {
        callValueGetter(columnDef);
      }
      expect(syncStatusSubscriptions.countActive()).toBe(0);
      expect(chainStatusSubscriptions.countActive()).toBe(0);
    });
  }

  test("columnDefsSyncstatusCurrentState: should return syncStateText of the contract", () => {
    const [, columnDef] = columnDefs.find(
      ([name]) => name === "columnDefsSyncstatusCurrentState",
    )!;
    expect(callValueGetter(columnDef)).toBe(contractSyncStatus().syncStateText);
  });
  test("columnDefsSyncStatusTarget: should return the label of the contract", () => {
    const [, columnDef] = columnDefs.find(
      ([name]) => name === "columnDefsSyncStatusTarget",
    )!;
    expect(callValueGetter(columnDef)).toBe(
      syncTargetLabelText(contractSyncStatus()),
    );
  });
});

describe("comparator of sync status columns", () => {
  function sortWith(columnDef: ColumnDef, values: string[]): string[] {
    const comparator = (columnDef as ColDef).comparator as SortComparatorFn;
    const rowNode = {} as IRowNode;
    return [...values].sort((valueA, valueB) =>
      comparator(valueA, valueB, rowNode, rowNode, false),
    );
  }

  for (const [name, columnDef] of columnDefs.filter(([name]) =>
    name.startsWith("columnDefsSyncStatusBlockNumber"),
  )) {
    test(`${name}: should sort block numbers as numbers, with NO_DATA first`, () => {
      expect(
        sortWith(columnDef, ["10000835", "4634748", "-", "8952139", "-"]),
      ).toEqual(["-", "-", "4634748", "8952139", "10000835"]);
    });
  }
  test("columnDefsSyncstatusProgressBar: should sort rates as numbers, with NO_DATA first", () => {
    const [, columnDef] = columnDefs.find(
      ([name]) => name === "columnDefsSyncstatusProgressBar",
    )!;
    expect(sortWith(columnDef, ["100", "9.5", "-", "45.3", "0.0"])).toEqual([
      "-",
      "0.0",
      "9.5",
      "45.3",
      "100",
    ]);
  });
});
