import type { Chain } from "@constants/chains/types";
import type { RpcSetting } from "@db/dbTypes";

type RpcConfigKeyName = keyof Pick<
  RpcSetting,
  "bulkUnit" | "tryCount" | "blockIntervalMs"
>;
export type RpcConfigParam = {
  readonly name: RpcConfigKeyName;
  readonly label: string;
  readonly minValue: number;
  readonly maxValue: number;
  step: number;
};

export function getRpcConfigParams(targetChain: Chain): RpcConfigParam[] {
  return [
    {
      name: "bulkUnit",
      label: "Bulk Unit",
      minValue: 1,
      maxValue: 10000,
      step: 1,
    },
    {
      name: "tryCount",
      label: "Retry Count",
      minValue: 1,
      maxValue: 10,
      step: 1,
    },
    {
      name: "blockIntervalMs",
      label: "Block Interval [ms]",
      minValue: 1,
      maxValue: targetChain.blockIntervalMs,
      step: 1,
    },
  ];
}
