import type {
  AbiFragmentName,
  ContractName,
  FunctionAbiFragment,
} from "@constants/chains/types";
import { describe, expect, test } from "vitest";
import {
  getEventLogTableName,
  getEventTableNames,
  getTargetChain,
  getTargetContract,
  getTargetEventAbiFragment,
  getTargetFunctionAbiFragment,
  getTargetProject,
  getTargetVersion,
} from "./utlisDb";
import type {
  AbiFragmentIdentifier,
  ChainIdentifier,
  ContractIdentifier,
  ProjectIdentifier,
  VersionIdentifier,
} from "@db/dbTypes";
import { convertJsonFilesContractToContracts } from "@constants/chains/convertJsonToABI";
import type { JsonFileContract } from "@constants/chains/jsonFileTypes";
const jsonFileContract1EventOnly: JsonFileContract = {
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
      name: "event1",
      type: "event",
      inputs: [{ name: "param1", type: "address" }],
    },
  ],
};
const jsonFileContract2FunctionOnly: JsonFileContract = {
  name: "contractName2",
  address: "0x21",
  creation: {
    tx: "0x22",
    blockNumber: 2,
    timestamp: 2,
    creator: "0x23",
  },
  abi: [
    {
      name: "function1",
      type: "function",
      inputs: [{ name: "param1", type: "address" }],
    },
  ],
};
const jsonFileContract3FunctionOnly: JsonFileContract = {
  name: "contractName3",
  address: "0x31",
  creation: {
    tx: "0x32",
    blockNumber: 3,
    timestamp: 3,
    creator: "0x33",
  },
  abi: [
    {
      name: "function1",
      type: "function",
      inputs: [{ name: "param1", type: "address" }],
    },
  ],
};

export const jsonFileContracts: JsonFileContract[] = [
  jsonFileContract1EventOnly,
  jsonFileContract2FunctionOnly,
  jsonFileContract3FunctionOnly,
];
const chainIdentifier: ChainIdentifier = { chainName: "eth" };
const projectIdentifier: ProjectIdentifier = {
  ...chainIdentifier,
  projectName: "Augur",
};
const versionIdentifier: VersionIdentifier = {
  ...projectIdentifier,
  versionName: "version1",
};
const contractIdentifier: ContractIdentifier = {
  ...versionIdentifier,
  contractName: "Augur",
};
const eventIdentifier: AbiFragmentIdentifier = {
  ...contractIdentifier,
  abiFragmentName: "MarketCreated",
};
const functionIdentifier: AbiFragmentIdentifier = {
  ...contractIdentifier,
  abiFragmentName: "disputeCrowdsourcerCreated",
};
describe("getEventLogTableName", () => {
  test("should return a table name based on the contract name and event name", () => {
    const contractName: ContractName = "contract1";
    const eventName: AbiFragmentName = "event1";
    const expected: string = "contract1_event1";

    expect(getEventLogTableName(contractName, eventName)).toBe(expected);
  });
});

describe("getTargetChain", () => {
  test("should return the target chain based on the chain identifier", () => {
    const targetChain = getTargetChain(chainIdentifier);

    expect(targetChain).toBeDefined();
    expect(targetChain.name).toBe(chainIdentifier.chainName);
  });
});
describe("getTargetProject", () => {
  test("should return the target project based on the project identifier", () => {
    const targetProject = getTargetProject(projectIdentifier);

    expect(targetProject).toBeDefined();
    expect(targetProject.name).toBe(projectIdentifier.projectName);
  });
});

describe("getTargetVersion", () => {
  test("should return the target version based on the version identifier", () => {
    const targetVersion = getTargetVersion(versionIdentifier);
    expect(targetVersion).toBeDefined();
    expect(targetVersion.name).toBe(versionIdentifier.versionName);
  });
});

describe("getTargetContract", () => {
  test("should return the target contract based on the contract identifier", () => {
    const targetContract = getTargetContract(contractIdentifier);
    expect(targetContract).toBeDefined();
    expect(targetContract.name).toBe(contractIdentifier.contractName);
  });
});

describe("getTargetEventAbiFragment", () => {
  test("should return the target event ABI fragment based on the ABI fragment identifier", () => {
    const targetEventAbiFragment = getTargetEventAbiFragment(eventIdentifier);
    expect(targetEventAbiFragment).toBeDefined();
    expect(targetEventAbiFragment.name).toBe(eventIdentifier.abiFragmentName);
  });
});

describe("getTargetFunctionAbiFragment", () => {
  test("should return the target function ABI fragment based on the ABI fragment identifier", () => {
    const targetContract = getTargetContract(contractIdentifier);

    const expectedFunctionFragment: FunctionAbiFragment =
      targetContract.functions.abiFragments.find((abiFragment) => {
        return (
          abiFragment.type === "function" &&
          abiFragment.name === functionIdentifier.abiFragmentName
        );
      })!;
    const actualFunctionAbiFragment: FunctionAbiFragment =
      getTargetFunctionAbiFragment({
        ...functionIdentifier,
        functionSelector: expectedFunctionFragment.selector as `0x${string}`,
      });
    expect(actualFunctionAbiFragment).toBeDefined();
    expect(expectedFunctionFragment).toEqual(actualFunctionAbiFragment);
  });
});

describe("getEventTableNames", () => {
  test("should return a list of event table names based on the target contracts", () => {
    const targetContracts =
      convertJsonFilesContractToContracts(jsonFileContracts);
    const expectedEventTabeName: string[] = [
      `${jsonFileContract1EventOnly.name}_${jsonFileContract1EventOnly.abi[0].name}`,
    ];
    const actualEventTableName: string[] = getEventTableNames(targetContracts);
    expect(actualEventTableName).toEqual(expectedEventTabeName);
  });
});
