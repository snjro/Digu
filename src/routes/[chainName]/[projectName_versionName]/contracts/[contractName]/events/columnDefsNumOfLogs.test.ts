import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { get } from "svelte/store";
import type { ColDef, ValueGetterParams } from "ag-grid-community";
import { TARGET_CHAINS } from "#constants/chains/_index.js";
import type { Chain, Contract } from "#constants/chains/types.js";
import type { ContractIdentifier } from "#db/dbTypes.js";
import { storeSyncStatus } from "#stores/storeSyncStatus.js";
import { extractEventContracts } from "#utils/utilsEthers.js";
import { trackStoreSubscriptions } from "#utils/testCommon.js";
import { columnDefsNumOfLogs } from "./columnDefsNumOfLogs";
import type { EventRow } from "#lib/gridColumnDefs/rowTypes.js";

const targetChain: Chain = TARGET_CHAINS[0];
const targetContract: Contract = extractEventContracts(
  targetChain.projects[0].versions[0].contracts,
)[0];
const contractIdentifier: ContractIdentifier = {
  chainName: targetChain.name,
  projectName: targetChain.projects[0].name,
  versionName: targetChain.projects[0].versions[0].name,
  contractName: targetContract.name,
};
const eventName: string = targetContract.events.names[0];
const valueGetter = (columnDefsNumOfLogs(contractIdentifier, "") as ColDef)
  .valueGetter as (params: ValueGetterParams<EventRow>) => unknown;
const valueGetterParams = (
  eventName: string | undefined,
): ValueGetterParams<EventRow> =>
  ({
    data: eventName ? ({ eventName } as EventRow) : undefined,
  }) as ValueGetterParams<EventRow>;

describe("columnDefsNumOfLogs", () => {
  let subscriptions: ReturnType<typeof trackStoreSubscriptions>;
  beforeEach(() => {
    subscriptions = trackStoreSubscriptions(storeSyncStatus);
  });
  afterEach(() => {
    subscriptions.restore();
  });

  test("valueGetter should not leave subscriptions to storeSyncStatus", () => {
    for (let count = 0; count < 3; count++) {
      valueGetter(valueGetterParams(eventName));
    }
    expect(subscriptions.countActive()).toBe(0);
  });
  test("valueGetter should return recordCount of the event", () => {
    const expected: number =
      get(storeSyncStatus)[contractIdentifier.chainName].subSyncStatuses[
        contractIdentifier.projectName
      ].subSyncStatuses[contractIdentifier.versionName].subSyncStatuses[
        contractIdentifier.contractName
      ]!.events[eventName]!.recordCount;
    expect(valueGetter(valueGetterParams(eventName))).toBe(expected);
  });
  test("valueGetter should return undefined for an event without sync status", () => {
    expect(valueGetter(valueGetterParams("notSyncedEvent"))).toBeUndefined();
  });
  test("valueGetter should return 0 when the row has no data", () => {
    expect(valueGetter(valueGetterParams(undefined))).toBe(0);
  });
});
