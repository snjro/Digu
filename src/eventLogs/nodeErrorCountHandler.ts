import type {
  ChainName,
  ContractName,
  ProjectName,
  VersionName,
} from "@constants/chains/types";
import { updateDbItemChainStatus } from "@db/dbChainStatusDataHandlers";
import { storeChainStatus } from "@stores/storeChainStatus";
import { storeLogSettings } from "@stores/storeLogSettings";
import { myLogger } from "@utils/logger";
import { get } from "svelte/store";

export type FetchingTargetInfo = {
  project: ProjectName;
  version: VersionName;
  contract: ContractName;
  blocks: { from: number; to: number; latest: number };
};

export async function countupNodeErrorCount(
  chainName: ChainName,
  methodName: string,
  fetchingTargetInfo: FetchingTargetInfo | undefined = undefined
): Promise<boolean> {
  const currentErrorCount: number =
    get(storeChainStatus)[chainName].nodeErrorCount + 1;
  const maxErrorCount: number = get(storeLogSettings)[chainName].tryCount;
  let isAbort: boolean = false;
  await updateDbItemChainStatus(chainName, "nodeErrorCount", currentErrorCount);

  type ConsoleMessage = {
    errorOn: string;
    errorCount: string;
    fetchingTarget?: FetchingTargetInfo;
    extraMessage?: string;
  };
  let consoleMessage: ConsoleMessage = {
    errorOn: methodName,
    errorCount: `${currentErrorCount}/${maxErrorCount}`,
    fetchingTarget: fetchingTargetInfo,
  };

  if (currentErrorCount < maxErrorCount) {
    if (fetchingTargetInfo) {
      consoleMessage.fetchingTarget = fetchingTargetInfo;
    }
    myLogger.warn(consoleMessage);
    isAbort = false;
  } else {
    consoleMessage.extraMessage = "The process is going to be aborted.";
    myLogger.error(consoleMessage);
    isAbort = true;
  }
  return isAbort;
}
export async function resetNodeErrorCount(chainName: ChainName): Promise<void> {
  await updateDbItemChainStatus(chainName, "nodeErrorCount", 0);
}
