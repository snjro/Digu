import { basePath } from "#lib/common/basePath.js";
import type { Chain } from "#constants/chains/types.js";
import { checkFormat } from "./warpSyncFile";
import { WARP_SYNC_DIR, type WarpSyncManifest } from "./warpSyncTypes";

function getUrl(targetChain: Chain, file: string): string {
  return `${basePath}/${WARP_SYNC_DIR}/${targetChain.name}/${file}`;
}
// Absolute, for the DB worker, whose URL is not the page's.
export function getWarpSyncFileUrl(targetChain: Chain, file: string): string {
  return new URL(getUrl(targetChain, file), location.href).href;
}

// The manifest is a small file of the same origin.
export const MANIFEST_TIMEOUT_MS = 30_000;
// undefined when the chain has no snapshot.
export async function fetchWarpSyncManifest(
  targetChain: Chain,
  signal: AbortSignal,
): Promise<WarpSyncManifest | undefined> {
  const response: Response = await fetch(getUrl(targetChain, "manifest.json"), {
    signal,
  });
  if (response.status === 404) return undefined;
  if (!response.ok) {
    throw new Error(`Get the warp sync manifest: HTTP ${response.status}`);
  }
  const manifest: WarpSyncManifest = await response.json();
  checkFormat(targetChain.chainId, manifest);
  return manifest;
}
