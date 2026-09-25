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
  TargetNotFoundError,
} from "./utilsDb";
import type {
  AbiFragmentIdentifier,
  ChainIdentifier,
  ContractIdentifier,
  ProjectIdentifier,
  VersionIdentifier,
} from "@db/dbTypes";
import { convertJsonFilesContractToContracts } from "@constants/chains/convertJsonToABI";
import { jsonFileContracts } from "./testCommon";
import { TARGET_CHAINS } from "@constants/chains/_index";
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
// expected values are taken from TARGET_CHAINS directly, not via the functions under test
const expectedChain = TARGET_CHAINS.find(
  (chain) => chain.name === chainIdentifier.chainName,
)!;
const expectedProject = expectedChain.projects.find(
  (project) => project.name === projectIdentifier.projectName,
)!;
const expectedVersion = expectedProject.versions.find(
  (version) => version.name === versionIdentifier.versionName,
)!;
const expectedContract = expectedVersion.contracts.find(
  (contract) => contract.name === contractIdentifier.contractName,
)!;
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

    expect(targetChain).toBe(expectedChain);
    expect(targetChain.name).toBe(chainIdentifier.chainName);
  });
});
describe("getTargetProject", () => {
  test("should return the target project based on the project identifier", () => {
    const targetProject = getTargetProject(projectIdentifier);

    expect(targetProject).toBe(expectedProject);
    expect(targetProject.name).toBe(projectIdentifier.projectName);
  });
});

describe("getTargetVersion", () => {
  test("should return the target version based on the version identifier", () => {
    const targetVersion = getTargetVersion(versionIdentifier);
    expect(targetVersion).toBe(expectedVersion);
    expect(targetVersion.name).toBe(versionIdentifier.versionName);
  });
});

describe("getTargetContract", () => {
  test("should return the target contract based on the contract identifier", () => {
    const targetContract = getTargetContract(contractIdentifier);
    expect(targetContract).toBe(expectedContract);
    expect(targetContract.name).toBe(contractIdentifier.contractName);
  });
});

describe("getTargetEventAbiFragment", () => {
  test("should return the target event ABI fragment based on the ABI fragment identifier", () => {
    const targetEventAbiFragment = getTargetEventAbiFragment(eventIdentifier);
    expect(targetEventAbiFragment.type).toBe("event");
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
    expect(actualFunctionAbiFragment).toEqual(expectedFunctionFragment);
  });
});

describe("getEventTableNames", () => {
  test("should return a list of event table names based on the target contracts", () => {
    const targetContracts =
      convertJsonFilesContractToContracts(jsonFileContracts);
    const expectedEventTabeName: string[] = [
      `${jsonFileContracts[0].name}_${jsonFileContracts[0].abi[0].name}`,
    ];
    const actualEventTableName: string[] = getEventTableNames(targetContracts);
    expect(actualEventTableName).toEqual(expectedEventTabeName);
  });
  test("should not return table names for anonymous events", () => {
    const targetContracts = convertJsonFilesContractToContracts([
      {
        ...jsonFileContracts[0],
        abi: [
          ...jsonFileContracts[0].abi,
          {
            name: "anonymousEvent",
            type: "event",
            anonymous: true,
            inputs: [{ name: "param1", type: "bytes4", indexed: true }],
          },
        ],
      },
    ]);
    const actualEventTableName: string[] = getEventTableNames(targetContracts);
    expect(actualEventTableName).toEqual([
      `${jsonFileContracts[0].name}_${jsonFileContracts[0].abi[0].name}`,
    ]);
  });
});

describe("not found", () => {
  const cases: { name: string; call: () => unknown; message: string }[] = [
    {
      name: "getTargetChain",
      call: () => getTargetChain({ chainName: "foo" }),
      message: "chain not found: foo",
    },
    {
      name: "getTargetProject",
      call: () => getTargetProject({ ...chainIdentifier, projectName: "foo" }),
      message: "project not found: eth/foo",
    },
    {
      name: "getTargetVersion",
      call: () =>
        getTargetVersion({ ...projectIdentifier, versionName: "foo" }),
      message: "version not found: eth/Augur/foo",
    },
    {
      name: "getTargetContract",
      call: () =>
        getTargetContract({ ...versionIdentifier, contractName: "foo" }),
      message: "contract not found: eth/Augur/version1/foo",
    },
    {
      name: "getTargetEventAbiFragment",
      call: () =>
        getTargetEventAbiFragment({
          ...contractIdentifier,
          abiFragmentName: "foo",
        }),
      message: "event not found: eth/Augur/version1/Augur/foo",
    },
    {
      name: "getTargetFunctionAbiFragment",
      call: () =>
        getTargetFunctionAbiFragment({
          ...functionIdentifier,
          functionSelector: "0x00000000",
        }),
      message:
        "function not found: eth/Augur/version1/Augur/disputeCrowdsourcerCreated/0x00000000",
    },
    {
      name: "getTargetFunctionAbiFragment without a selector",
      call: () => getTargetFunctionAbiFragment(functionIdentifier),
      message:
        "function not found: eth/Augur/version1/Augur/disputeCrowdsourcerCreated",
    },
    {
      // getFunction of ethers would find the function by this name.
      name: "getTargetFunctionAbiFragment with a name as the selector",
      call: () =>
        getTargetFunctionAbiFragment({
          ...functionIdentifier,
          functionSelector:
            "disputeCrowdsourcerCreated" as AbiFragmentIdentifier["functionSelector"],
        }),
      message:
        "function not found: eth/Augur/version1/Augur/disputeCrowdsourcerCreated/disputeCrowdsourcerCreated",
    },
    {
      name: "getTargetContract when the chain is missing",
      call: () =>
        getTargetContract({ ...contractIdentifier, chainName: "foo" }),
      message: "chain not found: foo",
    },
  ];
  test.each(cases)(
    "$name should throw TargetNotFoundError",
    ({ call, message }) => {
      expect(call).toThrow(TargetNotFoundError);
      expect(call).toThrow(message);
    },
  );
});
