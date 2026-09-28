import type { Chain, Contract } from "@constants/chains/types";
import type { VersionIdentifier } from "@db/dbTypes";
import { hasSyncTargetEvents } from "@utils/utilsEthers";
import type {
  WarpSyncChunkRange,
  WarpSyncManifest,
  WarpSyncManifestContract,
} from "./warpSyncTypes";

export type WarpSyncTarget = {
  versionIdentifier: VersionIdentifier;
  contract: Contract;
};

export function getWarpSyncKey(key: {
  project: string;
  version: string;
  name: string;
}): string {
  return `${key.project}/${key.version}/${key.name}`;
}

// The contracts of the snapshot that the app has, with the same address and
// creation block. The others are skipped, so that a contract added to the app
// or to the snapshot does not stop the rest.
export function matchWarpSyncContracts(
  targetChain: Chain,
  manifest: WarpSyncManifest,
): Map<string, WarpSyncTarget> {
  const targets: Map<string, WarpSyncTarget> = new Map();
  for (const manifestContract of manifest.contracts) {
    const target: WarpSyncTarget | undefined = findTarget(
      targetChain,
      manifestContract,
    );
    if (target) targets.set(getWarpSyncKey(manifestContract), target);
  }
  return targets;
}
function findTarget(
  targetChain: Chain,
  manifestContract: WarpSyncManifestContract,
): WarpSyncTarget | undefined {
  const project = targetChain.projects.find(
    (project) => project.name === manifestContract.project,
  );
  const version = project?.versions.find(
    (version) => version.name === manifestContract.version,
  );
  const contract = version?.contracts.find(
    (contract) => contract.name === manifestContract.name,
  );
  if (
    !project ||
    !version ||
    !contract ||
    !hasSyncTargetEvents(contract) ||
    contract.address.toLowerCase() !== manifestContract.address.toLowerCase() ||
    contract.creation.blockNumber !== manifestContract.creationBlock
  ) {
    return undefined;
  }
  return {
    versionIdentifier: {
      chainName: targetChain.name,
      projectName: project.name,
      versionName: version.name,
    },
    contract,
  };
}

// The first block that the DB does not have. fetchedBlockNumber is the
// creation block until something is fetched, and the sync then fetches from
// the creation block itself (eventLogsContract.ts).
export function getNextBlock(
  fetchedBlockNumber: number,
  creationBlock: number,
): number {
  return fetchedBlockNumber === creationBlock
    ? creationBlock
    : fetchedBlockNumber + 1;
}

// "import": the range has blocks that the DB does not have, right after the
// ones it has. "skip": the DB has the whole range. "gap": the range starts
// after the next block, so the logs in between would be missing.
export function getRangeAction(
  range: Pick<WarpSyncChunkRange, "fromBlock" | "toBlock">,
  fetchedBlockNumber: number,
  creationBlock: number,
): "import" | "skip" | "gap" {
  const nextBlock: number = getNextBlock(fetchedBlockNumber, creationBlock);
  if (range.toBlock < nextBlock) return "skip";
  if (range.fromBlock > nextBlock) return "gap";
  return "import";
}

// The last block of the snapshot among the contracts of the app.
export function getWarpSyncEnd(
  manifest: WarpSyncManifest,
  targets: Map<string, WarpSyncTarget>,
): number | undefined {
  let end: number | undefined = undefined;
  for (const chunk of manifest.chunks) {
    if (!targets.has(getWarpSyncKey(chunk))) continue;
    end = Math.max(end ?? chunk.toBlock, chunk.toBlock);
  }
  return end;
}
