import type {
  ContractName,
  ProjectName,
  VersionName,
} from "#constants/chains/types.js";
import type { HexString } from "#constants/chains/types.js";

export { WARP_SYNC_DIR, WARP_SYNC_FORMAT_VERSION } from "./warpSyncShared.mjs";

type ContractKey = {
  project: ProjectName;
  version: VersionName;
  name: ContractName;
};
// The app imports a contract only when its address and creation block are the
// same as in the app (matchWarpSyncContracts of warpSyncPlan.ts).
export type WarpSyncManifestContract = ContractKey & {
  address: HexString;
  creationBlock: number;
};
// One per run. check-snapshot.py reads the last one. A run of the script may
// also have requests and checks, which the app does not read
// (scripts/warp-sync/README.md).
export type WarpSyncRun = {
  createdAt: string;
  // The latest block when it was made.
  latestBlockNumber: number;
  toBlock: number;
  // The logs added by the run.
  logCount: number;
};
// All the logs of one contract from fromBlock to toBlock: in a file, or none.
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
        // bytes and sha256 are of the gzip file, rawBytes and rawSha256 of
        // its JSON.
        bytes: number;
        rawBytes: number;
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
  // One per file, and one per range without logs (no file). A run adds its
  // rows after those of the runs before it. For each contract, the rows are in
  // the order of the blocks: the fromBlock of a row is the toBlock of the row
  // before it + 1, or the creation block in the first row.
  chunks: WarpSyncManifestChunk[];
  // The sums of the chunks.
  totals: { logCount: number; bytes: number; rawBytes: number };
};

// The numbers and the hash as the RPC returned them (hex strings), and the
// event and its args, decoded by build-snapshot.mjs.
export type WarpSyncLog = {
  blockNumber: HexString;
  // From the block when the RPC did not return it.
  blockTimestamp: HexString;
  transactionHash: HexString;
  transactionIndex: HexString;
  logIndex: HexString;
  // The name of the event.
  event: string;
  // Decoded with the ABI, by position without names, as the sync saves them.
  // An integer (also uint8) is a decimal string, an address is checksummed, a
  // bytes32 is a hex string, and an array or a tuple is an array. The app gives
  // back a bigint for each integer by the types of the ABI, so that the rows of
  // the import and of the sync are the same.
  args: unknown[];
};
// The JSON of a file of the snapshot (gzip).
export type WarpSyncFile = ContractKey & {
  formatVersion: number;
  chainId: number;
  address: HexString;
  fromBlock: number;
  toBlock: number;
  // Sorted by blockNumber and logIndex.
  logs: WarpSyncLog[];
};
