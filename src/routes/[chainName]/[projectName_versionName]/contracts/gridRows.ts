import type { Contract } from "#constants/chains/types.js";
import { NO_DATA } from "#utils/utilsConstants.js";
import { hasSyncTargetEvents } from "#utils/utilsEthers.js";
import { convertTimestampSecToIso8601 } from "#utils/utilsTime.js";
import type { ContractRow } from "#lib/gridColumnDefs/rowTypes.js";

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

      contractHasSyncTargetEvents: hasSyncTargetEvents(targetContract),
    };
    contractRows.push(contractRow);
  }
  return contractRows;
}
