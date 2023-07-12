import type { BaseContract } from "./types";

type JsonFileAbiFragmentParam = {
  readonly name: string;
  readonly indexed?: boolean;
  readonly type:
    | `address${string}`
    | `bool`
    | `bytes${string}`
    | `int${string}`
    | `string${string}`
    | `uint${string}`
    | `tuple${string}`;
  readonly internalType?: any; // @TODO: in v6 reduce type
  readonly components?: ReadonlyArray<JsonFileAbiFragmentParam>;
};
type JsonFileAbiFragmentType =
  | "constructor"
  | "function"
  | "event"
  | "error"
  | "fallback";

type JsonFileAbiFragment = {
  readonly name?: string;
  readonly type: JsonFileAbiFragmentType;

  readonly anonymous?: boolean;

  readonly payable?: boolean;
  readonly constant?: boolean;
  readonly stateMutability?: string;

  readonly inputs?: ReadonlyArray<JsonFileAbiFragmentParam>;
  readonly outputs?: ReadonlyArray<JsonFileAbiFragmentParam>;

  readonly gas?: string;
};
export type JsonFileAbi = readonly JsonFileAbiFragment[];

export type JsonFileContract = BaseContract & {
  readonly abi: JsonFileAbi;
};
