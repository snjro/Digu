import type {
  Contract,
  EventAbiFragment,
  FunctionAbiFragment,
} from "@constants/chains/types";
import type { NO_DATA } from "@utils/utilsCostants";

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
    FunctionAbiFragment["stateMutability"] | typeof NO_DATA;

  contractConstructorStateMutability:
    FunctionAbiFragment["stateMutability"] | typeof NO_DATA;
  contractConstructorInputs: FunctionAbiFragment["inputs"];

  contractHasEvent: boolean;
};

export type EventRow = {
  eventName: EventAbiFragment["name"];
  eventAnonymous: EventAbiFragment["anonymous"];
  eventInputs: EventAbiFragment["inputs"];
  eventTopicHash: EventAbiFragment["topicHash"];
};

export type FunctionRow = {
  functionName: FunctionAbiFragment["name"];
  functionStateMutability: FunctionAbiFragment["stateMutability"];
  functionSelector: FunctionAbiFragment["selector"];
  functionInputs: FunctionAbiFragment["inputs"];
  functionOutputs: FunctionAbiFragment["outputs"];
  functionSelectorWithSplitter: string;
};
