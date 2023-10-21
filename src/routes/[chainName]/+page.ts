import type { LoadEvent } from "@sveltejs/kit";
import type { ChainIdentifier } from "@db/dbTypes";
import type { Chain } from "@constants/chains/types";
import { getTargetChain } from "@utils/utlisDb";

export type LoadChainData = {
  targetChain: Chain;
};

export function load({
  params,
}: {
  params: LoadEvent["params"];
}): LoadChainData {
  return _LoadChainData({ params });
}

export function _LoadChainData({
  params,
}: {
  params: LoadEvent["params"];
}): LoadChainData {
  const chainIdentifier: ChainIdentifier = {
    chainName: params.chainName!,
  };

  const targetChain: Chain = getTargetChain(chainIdentifier);

  return {
    targetChain: targetChain,
  };
}
