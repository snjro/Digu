import type { RpcConfigParam } from "./rpcConfigParams";

export function isInRpcConfigRange(
  rpcConfigParam: RpcConfigParam,
  newValue: number,
): boolean {
  return (
    Number.isInteger(newValue) &&
    rpcConfigParam.minValue <= newValue &&
    newValue <= rpcConfigParam.maxValue
  );
}
