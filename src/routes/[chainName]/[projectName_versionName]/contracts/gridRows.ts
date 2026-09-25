import type { Contract } from "@constants/chains/types";
import { NO_DATA } from "@utils/utilsConstants";
import { hasSyncTargetEvents } from "@utils/utilsEthers";
import { convertTimestampSecToIso8601 } from "@utils/utilsTime";
import type { ContractRow } from "$lib/gridColumnDefs/rowTypes";

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

      contractHasEvent: hasSyncTargetEvents(targetContract),
    };
    contractRows.push(contractRow);
  }
  return contractRows;
}
