import { describe, expect, test } from "vitest";
import { convertJsonFilesContractToContracts } from "./convertJsonToABI";
import type { JsonFileContract } from "./jsonFileTypes";
import type { Contract } from "./types";
import Cash from "./ethereum-mainnet/augur/version2/Cash.json";

const jsonFileContractWithAnonymousEvent: JsonFileContract = {
  name: "contractName1",
  address: "0x11",
  creation: {
    tx: "0x12",
    blockNumber: 1,
    timestamp: 1,
    creator: "0x13",
  },
  abi: [
    {
      name: "namedEvent",
      type: "event",
      anonymous: false,
      inputs: [{ name: "param1", type: "address", indexed: true }],
    },
    {
      name: "anonymousEvent",
      type: "event",
      anonymous: true,
      inputs: [{ name: "param1", type: "bytes4", indexed: true }],
    },
  ],
};

describe("convertJsonFilesContractToContracts", () => {
  test("should exclude anonymous events from events.names", () => {
    const [contract]: Contract[] = convertJsonFilesContractToContracts([
      jsonFileContractWithAnonymousEvent,
    ]);
    expect(contract.events.names).toEqual(["namedEvent"]);
  });
  test("should keep anonymous events in events.abiFragments", () => {
    const [contract]: Contract[] = convertJsonFilesContractToContracts([
      jsonFileContractWithAnonymousEvent,
    ]);
    expect(
      contract.events.abiFragments.map((abiFragment) => abiFragment.name),
    ).toEqual(["anonymousEvent", "namedEvent"]);
  });
  test(`should exclude "LogNote" of "Cash" from events.names`, () => {
    const [contract]: Contract[] = convertJsonFilesContractToContracts([
      Cash as JsonFileContract,
    ]);
    expect(contract.events.names).toEqual(["Approval", "Transfer"]);
    expect(
      contract.events.abiFragments.map((abiFragment) => abiFragment.name),
    ).toEqual(["Approval", "LogNote", "Transfer"]);
  });
});
