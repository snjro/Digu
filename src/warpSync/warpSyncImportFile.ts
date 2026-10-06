// Imports one file of the snapshot. It runs in the DB worker, so that the
// page does not stop while the logs are read and saved.
import { TARGET_CHAINS } from "#constants/chains/_index.js";
import type { Contract, ContractName } from "#constants/chains/types.js";
import { getDbEventLogs, type DbEventLogs } from "#db/dbEventLogs.js";
import { saveEventLogs_updateFetchedBlockNumber } from "#db/dbEventLogsDataHandlersEventLog.js";
import { getDbItemSyncStatus } from "#db/dbEventLogsDataHandlersSyncStatusGetters.js";
import type {
  GroupedEventLogs,
  NamedEventLog,
  SyncStatusContract,
  VersionIdentifier,
} from "#db/dbTypes.js";
import { groupEventLogsByEventName } from "#eventLogs/eventLogsContractUpdateTables.js";
import { getNumber } from "ethers";
import { makeWarpSyncEventLogs } from "./warpSyncEventLogs";
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
  const namedEventLogs: NamedEventLog[] = makeWarpSyncEventLogs(contract, logs);
  const groupedEventLogs: GroupedEventLogs =
    groupEventLogsByEventName(namedEventLogs);
  const syncStatusContract: Partial<SyncStatusContract> =
    await saveEventLogs_updateFetchedBlockNumber(
      dbEventLogs,
      contract,
      groupedEventLogs,
      file.toBlock,
    );
  return { syncStatusContract, logCount: namedEventLogs.length };
}
