import type { FunctionAbiFragment } from "@constants/chains/types";
import type { Contract } from "@constants/chains/types";
import { NO_DATA } from "@utils/utilsCostants";
import { convertTimestampSecToIso8601 } from "@utils/utilsTime";

export type ContractRow = {
  contract: Contract;
  contractName: Contract["name"];
  contractAddress: Contract["address"];
  contractSourceCodeUrl: Contract["sourceCodeUrl"];

  contractCreationBlockNumber: Contract["creation"]["blockNumber"];
  contractCreationDatetime: string;
  contractCreationTx: Contract["creation"]["tx"];
  contractCreationCreator: Contract["creation"]["creator"];

  contractEventsTotalNumber: number;

  contractFunctionsTotalNumber: number;

  contractFallbackStateMutability:
    | FunctionAbiFragment["stateMutability"]
    | typeof NO_DATA;

  contractConstructorStateMutability:
    | FunctionAbiFragment["stateMutability"]
    | typeof NO_DATA;
  contractConstructorInputs: FunctionAbiFragment["inputs"];

  contractHasEvent: boolean;
};
export function gridRows(contracts: Contract[]): ContractRow[] {
  const contractRows: ContractRow[] = [];
  for (const targetContract of contracts) {
    const contractRow: ContractRow = {
      contract: targetContract,
      contractName: targetContract.name,
      contractAddress: targetContract.address,
      contractSourceCodeUrl: targetContract.sourceCodeUrl,

      contractCreationBlockNumber: targetContract.creation.blockNumber,
      contractCreationDatetime: convertTimestampSecToIso8601(
        targetContract.creation.timestamp,
      ),
      contractCreationTx: targetContract.creation.tx,
      contractCreationCreator: targetContract.creation.creator,

      contractEventsTotalNumber: targetContract.events.abiFragments.length,

      contractFunctionsTotalNumber:
        targetContract.functions.abiFragments.length,

      contractFallbackStateMutability: targetContract.fallback.abiFragment
        ? targetContract.fallback.abiFragment.stateMutability
        : NO_DATA,

      contractConstructorStateMutability: targetContract.construction
        .abiFragment
        ? targetContract.construction.abiFragment.stateMutability
        : NO_DATA,
      contractConstructorInputs: targetContract.construction.abiFragment.inputs,

      contractHasEvent: targetContract.events.abiFragments.length > 0,
    };
    contractRows.push(contractRow);
  }
  return contractRows;
}
