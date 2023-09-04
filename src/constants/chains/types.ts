import {
  isHexString,
  type ConstructorFragment,
  type EventFragment,
  type FunctionFragment,
  type Interface,
  type ParamType,
  type FallbackFragment,
} from "ethers";
import type { JsonFileAbi } from "./jsonFileTypes";
// import type { FallbackFragment } from "ethers/types/abi";

export type HexString = `0x${string}`;

export function isHexStrings(value: unknown): value is HexString[] {
  if (
    Array.isArray(value) &&
    value.every((element) => {
      return isHexString(element);
    })
  ) {
    return true;
  } else {
    return false;
  }
}

//ABI fragment (https://docs.ethers.org/v5/api/utils/abi/fragments)
export type AbiFragmentParam = ParamType;
export type EventAbiFragment = EventFragment;
export type FunctionAbiFragment = FunctionFragment;
export type ConstructorAbiFragment = ConstructorFragment &
  Pick<FunctionAbiFragment, "stateMutability">;
export type FallbackAbiFragment =
  | (FallbackFragment & Pick<FunctionAbiFragment, "stateMutability">)
  | null;
// export type ErrorAbiFragment = ErrorFragment;
// export type AbiFragment =
//   | EventAbiFragment
//   | FunctionAbiFragment
//   | ConstructorAbiFragment
//   | FallbackAbiFragment;
//   | ErrorAbiFragment;

// export type AbiFragments = {
//   eventAbiFragments: EventAbiFragment[];
//   functionAbiFragments: FunctionAbiFragment[];
//   constructorAbiFragment: ConstructorAbiFragment;
//   fallbackAbiFragment: FallbackAbiFragment;
//   // errorAbiFragment: ErrorAbiFragment;
// };
//ABI
export type ContractInterface = Interface;
//Contract
export type BaseContract = {
  readonly name: ContractName;
  readonly address: HexString;
  readonly creation: {
    readonly tx: HexString;
    readonly blockNumber: number;
    readonly timestamp: number;
    readonly creator: HexString;
  };
  readonly sourceCodeUrl?: string;
};
export type AdditionalContract = {
  readonly jsonFileAbi: JsonFileAbi;
  readonly contractInterface: ContractInterface;
  readonly events: {
    readonly abiFragments: EventAbiFragment[];
    readonly names: EventAbiFragment["name"][];
  };
  readonly functions: {
    readonly abiFragments: FunctionAbiFragment[];
    readonly names: FunctionAbiFragment["name"][];
  };
  readonly construction: {
    readonly abiFragment: ConstructorAbiFragment;
  };
  readonly fallback: {
    readonly abiFragment: FallbackAbiFragment;
  };
};
export type Contract = BaseContract & AdditionalContract;

//Version
export type Version = {
  readonly name: VersionName;
  // eventContracts: Contract[];
  // allContracts: Contract[];
  readonly contracts: Contract[];
};

//Project
export type Project = {
  readonly name: ProjectName;
  readonly versions: Version[];
};

//Chain
export type Chain = {
  readonly name: ChainName;
  readonly fullName: string;
  readonly chain: string;
  readonly icon?: string;
  readonly rpc: string[];
  readonly faucets: string[];
  readonly nativeCurrency: {
    readonly name: string;
    readonly symbol: string;
    readonly decimals: number;
  };
  readonly infoURL: string;
  readonly shortName: string;
  readonly chainId: number;
  readonly networkId: number;
  readonly slip44?: number;
  readonly ens?: { readonly registry: string };
  readonly chainExplorers: ChainExplorer[];
  readonly blockIntervalMs: number;
  readonly tryCount: number;
  readonly abortWatchIntervalMs: number;
  readonly projects: Project[];
};
export type ChainExplorer = {
  readonly name: string;
  readonly url: string;
  readonly subdirectory: {
    readonly address: "address";
    readonly tx: "tx" | "transaction";
    readonly block: "block";
  };
};
// ====================== Names ======================
export type ChainName = string;
export type ProjectName = string;
export type VersionName = string;
export type ContractName = string;
export type AbiFragmentName = string;
