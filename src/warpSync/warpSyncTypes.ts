import type {
  ContractName,
  ProjectName,
  VersionName,
} from "@constants/chains/types";
import type { HexString } from "@constants/chains/types";

// The snapshot that scripts/warp-sync/build-snapshot.mjs writes. See
// scripts/warp-sync/README.md.
export const WARP_SYNC_FORMAT_VERSION = 2;
// Under static/.
export const WARP_SYNC_DIR = "warp-sync";

type ContractKey = {
  project: ProjectName;
  version: VersionName;
  name: ContractName;
};
export type WarpSyncManifestContract = ContractKey & {
  address: HexString;
  creationBlock: number;
};
export type WarpSyncRun = {
  createdAt: string;
  latestBlockNumber: number;
  toBlock: number;
  logCount: number;
};
// The logs of one contract from fromBlock to toBlock: in a file, or none.
export type WarpSyncChunkRange = ContractKey & {
  fromBlock: number;
  toBlock: number;
  logCount: number;
};
export type WarpSyncManifestChunk = WarpSyncChunkRange &
  (
    | { file: null }
    | {
        file: string;
        bytes: number;
        rawBytes: number;
        // Of the gzip file, and of its JSON.
        sha256: string;
        rawSha256: string;
      }
  );
export type WarpSyncManifestChunkWithFile = Extract<
  WarpSyncManifestChunk,
  { file: string }
>;
export type WarpSyncManifest = {
  formatVersion: number;
  chainName: string;
  chainId: number;
  contracts: WarpSyncManifestContract[];
  runs: WarpSyncRun[];
  chunks: WarpSyncManifestChunk[];
  totals: { logCount: number; bytes: number; rawBytes: number };
};

// As the RPC returned it: hex strings.
export type WarpSyncLog = {
  blockNumber: HexString;
  blockHash: HexString;
  blockTimestamp: HexString;
  transactionHash: HexString;
  transactionIndex: HexString;
  logIndex: HexString;
  address: HexString;
  data: HexString;
  topics: HexString[];
};
// The JSON of a file of the snapshot (gzip).
export type WarpSyncFile = ContractKey & {
  formatVersion: number;
  chainId: number;
  address: HexString;
  fromBlock: number;
  toBlock: number;
  logs: WarpSyncLog[];
};
