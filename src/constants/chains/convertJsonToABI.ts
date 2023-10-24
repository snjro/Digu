import { ethers } from "ethers";
import type { JsonFileContract } from "./jsonFileTypes";
import type {
  AdditionalContract,
  BaseContract,
  // AbiFragments,
  ConstructorAbiFragment,
  Contract,
  ContractInterface,
  EventAbiFragment,
  FallbackAbiFragment,
  FunctionAbiFragment,
} from "./types";
import { sortObjectArrayByProperty } from "@utils/utilsCommon";

export function convertJsonFilesContractToContracts(
  jsonFileContracts: JsonFileContract[],
): Contract[] {
  const convertedContracts: Contract[] = jsonFileContracts.map(
    (jsonFileContract: JsonFileContract): Contract => {
      const contractInterface: ContractInterface = new ethers.Interface(
        jsonFileContract.abi,
      );

      const constructorAbiFragment: ConstructorAbiFragment =
        getConstructorFragmentFromContractInterface(contractInterface);
      const eventAbiFragments: EventAbiFragment[] =
        getEventAbiFragmentsFromContractInterface(contractInterface);
      const functionAbiFragments: FunctionAbiFragment[] =
        getFunctionAbiFragmentsFromContractInterface(contractInterface);
      const fallbackAbiFragment: FallbackAbiFragment =
        getFallbackAbiFragmentFromContractInterface(contractInterface);
      // const errorAbiFragments: ErrorAbiFragment[] =
      //   getErrorAbiFragmentsFromContractInterface(contractInterface);

      const eventNames: EventAbiFragment["name"][] = eventAbiFragments.map(
        (eventAbiFragment: EventAbiFragment) => {
          return eventAbiFragment.name;
        },
      );
      const functionNames: FunctionAbiFragment["name"][] =
        functionAbiFragments.map((functionAbiFragment: FunctionAbiFragment) => {
          return functionAbiFragment.name;
        });

      const baseContract: BaseContract = {
        name: jsonFileContract.name,
        address: jsonFileContract.address,
        creation: jsonFileContract.creation,
        sourceCodeUrl: jsonFileContract.sourceCodeUrl,
      };
      const additionalContract: AdditionalContract = {
        jsonFileAbi: jsonFileContract.abi,
        contractInterface: contractInterface,
        events: {
          abiFragments: eventAbiFragments,
          names: eventNames,
        },
        functions: {
          abiFragments: functionAbiFragments,
          names: functionNames,
        },
        construction: { abiFragment: constructorAbiFragment },
        fallback: {
          abiFragment: fallbackAbiFragment,
        },
      };
      return { ...baseContract, ...additionalContract };
    },
  );

  return sortObjectArrayByProperty<Contract>(convertedContracts, "name");
}

function getConstructorFragmentFromContractInterface(
  contractInterface: ContractInterface,
): ConstructorAbiFragment {
  const constructorAbiFragment: ConstructorAbiFragment = {
    ...contractInterface.deploy,
    format: contractInterface.deploy.format,
    stateMutability: contractInterface.deploy.payable
      ? "payable"
      : "nonpayable",
  };
  return constructorAbiFragment;
}
function getEventAbiFragmentsFromContractInterface(
  contractInterface: ContractInterface,
): EventAbiFragment[] {
  let eventAbiFragments: EventAbiFragment[] = [];
  contractInterface.forEachEvent((eventAbiFragment: EventAbiFragment): void => {
    eventAbiFragments.push(eventAbiFragment);
  });
  eventAbiFragments = sortObjectArrayByProperty(eventAbiFragments, "name");
  return eventAbiFragments;
}
function getFunctionAbiFragmentsFromContractInterface(
  contractInterface: ContractInterface,
): FunctionAbiFragment[] {
  let functionAbiFragments: FunctionAbiFragment[] = [];
  contractInterface.forEachFunction(
    (functionAbiFragment: FunctionAbiFragment): void => {
      functionAbiFragments.push(functionAbiFragment);
    },
  );
  functionAbiFragments = sortObjectArrayByProperty(
    functionAbiFragments,
    "name",
  );
  return functionAbiFragments;
}
function getFallbackAbiFragmentFromContractInterface(
  contractInterface: ContractInterface,
): FallbackAbiFragment {
  let fallbackAbiFragment: FallbackAbiFragment;

  if (contractInterface.fallback) {
    fallbackAbiFragment = {
      ...contractInterface.fallback,
      format: contractInterface.fallback.format,
      stateMutability: contractInterface.fallback.payable
        ? "payable"
        : "nonpayable",
    };
  } else {
    fallbackAbiFragment = null;
  }
  return fallbackAbiFragment;
}
