import { fetchEventLogsContract } from "./eventLogsContract";
import { DbEventLogs } from "@db/dbEventLogs";
import type { NodeStatus, VersionIdentifier } from "@db/dbTypes";
import { extractEventContracts, getNodeProvider } from "@utils/utilsEthers";
import type { NodeProvider } from "@utils/utilsEthers";
import type { Chain } from "@constants/chains/types";
import {
  startAbortingInChain,
  startSyncingInChain,
  stopSyncingInChain,
} from "@db/dbEventLogsDataHandlersSyncStatus";
import { customLogger } from "@utils/logger";
import { storeRpcSettings } from "@stores/storeRpcSettings";
import { get } from "svelte/store";
import { startUpdateLatestBlockNumber } from "./updateLatestBlockNumber";
import { storeChainStatus } from "@stores/storeChainStatus";

export async function fetchEventLogs(targetChain: Chain): Promise<void> {
  customLogger.start(`Fetch event logs. Chain: ${targetChain.name}`);

  await startSyncingInChain(targetChain.name);
  const promiseFetchAndInsertEthersEvents: Promise<void>[] = [];
  const rpc: string = get(storeRpcSettings)[targetChain.name].rpc;
  const nodeProvider: NodeProvider | undefined = await getNodeProvider(
    targetChain,
    rpc,
  );
  const nodeStatus: NodeStatus =
    get(storeChainStatus)[targetChain.name].nodeStatus;

  if (nodeProvider === undefined || nodeStatus !== "SUCCESS") {
    customLogger.fail("Get provider.", {
      chainName: targetChain.name,
      rpc: rpc,
    });
    await startAbortingInChain(targetChain.name);
    await stopSyncingInChain(targetChain.name);
    return;
  }

  await startUpdateLatestBlockNumber(targetChain.name, nodeProvider);

  for (const targetProject of targetChain.projects) {
    for (const targetVersion of targetProject.versions) {
      const versionIdentifier: VersionIdentifier = {
        chainName: targetChain.name,
        projectName: targetProject.name,
        versionName: targetVersion.name,
      };
      const dbEventLogs: DbEventLogs = new DbEventLogs(versionIdentifier);
      for (const targetContract of extractEventContracts(
        targetVersion.contracts,
      )) {
        // await setSyncing(dbEventLogs, targetContract.name);
        promiseFetchAndInsertEthersEvents.push(
          fetchEventLogsContract(
            dbEventLogs,
            targetProject,
            targetVersion,
            targetContract,
            nodeProvider,
          ),
        );
      }
    }
  }
  await Promise.all(promiseFetchAndInsertEthersEvents);
  customLogger.finished(
    `Terminated fetch event logs. Chain: ${targetChain.name}`,
  );
}
