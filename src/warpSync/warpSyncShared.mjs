// The values of the warp sync snapshot that the app and scripts/warp-sync
// share. Without node: and svelte, so that both can import it.

// The snapshot that scripts/warp-sync/build-snapshot.mjs writes. See
// scripts/warp-sync/README.md.
export const WARP_SYNC_FORMAT_VERSION = 3;
// Under static/.
export const WARP_SYNC_DIR = "warp-sync";

// The chains that have a snapshot under static/warp-sync.
/** @type {readonly import("#constants/chains/types.js").ChainName[]} */
export const WARP_SYNC_CHAIN_NAMES = ["matic", "eth"];

/**
 * The key of a contract in the snapshot.
 * @param {{ project: string, version: string, name: string }} key
 * @returns {string}
 */
export function getWarpSyncKey(key) {
  return `${key.project}/${key.version}/${key.name}`;
}
