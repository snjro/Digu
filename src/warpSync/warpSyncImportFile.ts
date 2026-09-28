// Imports one file of the snapshot. It runs in the DB worker, so that the
// page does not stop while the logs are decoded and saved.
import { TARGET_CHAINS } from "@constants/chains/_index";
import type { Contract, ContractName } from "@constants/chains/types";
import { getDbEventLogs, type DbEventLogs } from "@db/dbEventLogs";
import { saveEventLogs_updateFetchedBlockNumber } from "@db/dbEventLogsDataHandlersEventLog";
import { getDbItemSyncStatus } from "@db/dbEventLogsDataHandlersSyncStatusGetters";
import type {
  ConvertedEventLog,
  EthersEventLog,
  GroupedEventLogs,
  SyncStatusContract,
  VersionIdentifier,
} from "@db/dbTypes";
import {
  convertEthersEventToEventLog,
  groupEventLogsByEventName,
} from "@eventLogs/eventLogsContractUpdateTables";
import { getNumber } from "ethers";
import { decodeWarpSyncLogs } from "./warpSyncDecode";
import { readWarpSyncFile } from "./warpSyncFile";
import { getNextBlock, getRangeAction } from "./warpSyncPlan";
import type {
  WarpSyncFile,
  WarpSyncManifestChunkWithFile,
} from "./warpSyncTypes";

export type ImportWarpSyncFileParams = {
  versionIdentifier: VersionIdentifier;
  contractName: ContractName;
  chainId: number;
  url: string;
  chunk: WarpSyncManifestChunkWithFile;
};
export type ImportWarpSyncFileResult = {
  // Undefined when nothing was saved.
  syncStatusContract?: Partial<SyncStatusContract>;
  logCount: number;
};

function getContract(
  versionIdentifier: VersionIdentifier,
  contractName: ContractName,
): Contract {
  const contract: Contract | undefined = TARGET_CHAINS.find(
    (chain) => chain.name === versionIdentifier.chainName,
  )
    ?.projects.find((project) => project.name === versionIdentifier.projectName)
    ?.versions.find((version) => version.name === versionIdentifier.versionName)
    ?.contracts.find((contract) => contract.name === contractName);
  if (!contract) throw new Error(`No contract ${contractName}.`);
  return contract;
}

// Saves the logs after the ones in the DB, and moves fetchedBlockNumber to
// the end of the file, in one transaction, as the sync does. Returns the new
// values of the sync status for the store of the page.
export async function importWarpSyncFile(
  params: ImportWarpSyncFileParams,
): Promise<ImportWarpSyncFileResult> {
  const contract: Contract = getContract(
    params.versionIdentifier,
    params.contractName,
  );
  const dbEventLogs: DbEventLogs = getDbEventLogs(params.versionIdentifier);
  const fetchedBlockNumber: number = await getDbItemSyncStatus(
    dbEventLogs,
    contract.name,
    "fetchedBlockNumber",
  );
  const creationBlock: number = contract.creation.blockNumber;
  // The page planned it with the same DB, while holding the sync lock.
  if (
    getRangeAction(params.chunk, fetchedBlockNumber, creationBlock) !== "import"
  ) {
    return { logCount: 0 };
  }
  const file: WarpSyncFile = await readWarpSyncFile(
    params.url,
    params.chunk,
    params.chainId,
  );
  const nextBlock: number = getNextBlock(fetchedBlockNumber, creationBlock);
  const logs = file.logs.filter(
    (log) => getNumber(log.blockNumber) >= nextBlock,
  );
  const timestamps: Map<number, number> = new Map(
    logs.map((log) => [
      getNumber(log.blockNumber),
      getNumber(log.blockTimestamp),
    ]),
  );
  const ethersEventLogs: EthersEventLog[] = decodeWarpSyncLogs(contract, logs);
  const convertedEventLogs: ConvertedEventLog[] = ethersEventLogs.map(
    (ethersEventLog: EthersEventLog) =>
      convertEthersEventToEventLog(
        ethersEventLog,
        timestamps.get(ethersEventLog.blockNumber)!,
      ),
  );
  const groupedEventLogs: GroupedEventLogs =
    groupEventLogsByEventName(convertedEventLogs);
  const syncStatusContract: Partial<SyncStatusContract> =
    await saveEventLogs_updateFetchedBlockNumber(
      dbEventLogs,
      contract,
      groupedEventLogs,
      file.toBlock,
    );
  return { syncStatusContract, logCount: convertedEventLogs.length };
}
