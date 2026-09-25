import { describe, expect, test } from "vitest";
import { extractEventContracts, hasSyncTargetEvents } from "./utilsEthers";
import { convertJsonFilesContractToContracts } from "@constants/chains/convertJsonToABI";
import type { JsonFileContract } from "@constants/chains/jsonFileTypes";
import type { Contract } from "@constants/chains/types";
import { gridRows } from "@routes/[chainName]/[projectName_versionName]/contracts/gridRows";
import { columnDefsNumOfLogs } from "@routes/[chainName]/[projectName_versionName]/contracts/[contractName]/events/columnDefsNumOfLogs";
import type { EventRow } from "$lib/gridColumnDefs/rowTypes";
import { TARGET_CHAINS } from "@constants/chains/_index";
import type { ContractIdentifier } from "@db/dbTypes";
import type { ColDef, ValueGetterParams } from "ag-grid-community";
import { jsonFileContracts } from "./testCommon";

const jsonFileContractAnonymousOnly: JsonFileContract = {
  name: "anonymousOnlyContract",
  address: "0x41",
  creation: {
    tx: "0x42",
    blockNumber: 4,
    timestamp: 4,
    creator: "0x43",
  },
  abi: [
    {
      name: "anonymousEvent",
      type: "event",
      anonymous: true,
      inputs: [{ name: "param1", type: "bytes4", indexed: true }],
    },
  ],
};
const jsonFileContractNamedAndAnonymous: JsonFileContract = {
  ...jsonFileContractAnonymousOnly,
  name: "namedAndAnonymousContract",
  abi: [
    ...jsonFileContractAnonymousOnly.abi,
    {
      name: "namedEvent",
      type: "event",
      anonymous: false,
      inputs: [{ name: "param1", type: "address", indexed: true }],
    },
  ],
};
const [anonymousOnlyContract, namedAndAnonymousContract]: Contract[] = [
  jsonFileContractAnonymousOnly,
  jsonFileContractNamedAndAnonymous,
].map(
  (jsonFileContract: JsonFileContract) =>
    convertJsonFilesContractToContracts([jsonFileContract])[0],
);
// contractName1 has an event, contractName2 has only a function.
const [eventContract, functionOnlyContract]: Contract[] =
  convertJsonFilesContractToContracts(jsonFileContracts);

describe("a contract that has only anonymous events", () => {
  test("should have the ABI of the event but no event name to sync", () => {
    expect(anonymousOnlyContract.events.abiFragments).toHaveLength(1);
    expect(anonymousOnlyContract.events.names).toEqual([]);
  });
});

describe("hasSyncTargetEvents", () => {
  test.each([
    ["an event", eventContract, true],
    ["named and anonymous events", namedAndAnonymousContract, true],
    ["only anonymous events", anonymousOnlyContract, false],
    ["only a function", functionOnlyContract, false],
  ])("a contract that has %s -> %s", (_, contract, expected) => {
    expect(hasSyncTargetEvents(contract)).toBe(expected);
  });
});

describe("extractEventContracts", () => {
  test("should exclude a contract that has only anonymous events", () => {
    expect(
      extractEventContracts([
        anonymousOnlyContract,
        namedAndAnonymousContract,
        eventContract,
      ]),
    ).toEqual([namedAndAnonymousContract, eventContract]);
  });
});

describe("gridRows", () => {
  test("contractHasEvent should be false for a contract that has only anonymous events", () => {
    const [anonymousOnlyRow, namedAndAnonymousRow] = gridRows([
      anonymousOnlyContract,
      namedAndAnonymousContract,
    ]);
    expect(anonymousOnlyRow.contractHasEvent).toBe(false);
    expect(anonymousOnlyRow.contractEventsTotalNumber).toBe(1);
    expect(namedAndAnonymousRow.contractHasEvent).toBe(true);
  });
});

describe("columnDefsNumOfLogs", () => {
  test("valueGetter should return undefined for a contract without sync status", () => {
    const targetChain = TARGET_CHAINS[0];
    const contractIdentifier: ContractIdentifier = {
      chainName: targetChain.name,
      projectName: targetChain.projects[0].name,
      versionName: targetChain.projects[0].versions[0].name,
      contractName: anonymousOnlyContract.name,
    };
    const valueGetter = (columnDefsNumOfLogs(contractIdentifier, "") as ColDef)
      .valueGetter as (params: ValueGetterParams<EventRow>) => unknown;
    expect(
      valueGetter({
        data: { eventName: "anonymousEvent" } as EventRow,
      } as ValueGetterParams<EventRow>),
    ).toBeUndefined();
  });
});
