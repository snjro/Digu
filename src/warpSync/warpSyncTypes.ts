import type {
  ContractName,
  ProjectName,
  VersionName,
} from "@constants/chains/types";
import type { HexString } from "@constants/chains/types";

// The snapshot that scripts/warp-sync/build-snapshot.mjs writes. See
// scripts/warp-sync/README.md.
export const WARP_SYNC_FORMAT_VERSION = 1;
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
export type WarpSyncChunkRange = ContractKey & {
  fromBlock: number;
  toBlock: number;
  logCount: number;
};
export type WarpSyncManifestChunk = {
  file: string;
  sha256: string;
  createdAt: string;
  latestBlockNumber: number;
  logCount: number;
  contracts: WarpSyncChunkRange[];
};
export type WarpSyncManifest = {
  formatVersion: number;
  chainName: string;
  chainId: number;
  contracts: WarpSyncManifestContract[];
  chunks: WarpSyncManifestChunk[];
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
export type WarpSyncChunkContract = ContractKey & {
  address: HexString;
  fromBlock: number;
  toBlock: number;
  logs: WarpSyncLog[];
};
export type WarpSyncChunk = {
  formatVersion: number;
  chainId: number;
  contracts: WarpSyncChunkContract[];
};
