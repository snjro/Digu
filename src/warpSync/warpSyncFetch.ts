import { base } from "$app/paths";
import type { Chain } from "@constants/chains/types";
import {
  WARP_SYNC_DIR,
  WARP_SYNC_FORMAT_VERSION,
  type WarpSyncChunk,
  type WarpSyncManifest,
  type WarpSyncManifestChunk,
} from "./warpSyncTypes";

function getUrl(targetChain: Chain, file: string): string {
  return `${base}/${WARP_SYNC_DIR}/${targetChain.name}/${file}`;
}

// undefined when the chain has no snapshot.
export async function fetchWarpSyncManifest(
  targetChain: Chain,
): Promise<WarpSyncManifest | undefined> {
  const response: Response = await fetch(getUrl(targetChain, "manifest.json"));
  if (response.status === 404) return undefined;
  if (!response.ok) {
    throw new Error(`Get the warp sync manifest: HTTP ${response.status}`);
  }
  const manifest: WarpSyncManifest = await response.json();
  checkFormat(targetChain, manifest);
  return manifest;
}

export async function fetchWarpSyncChunk(
  targetChain: Chain,
  manifestChunk: WarpSyncManifestChunk,
): Promise<WarpSyncChunk> {
  const response: Response = await fetch(
    getUrl(targetChain, manifestChunk.file),
  );
  if (!response.ok) {
    throw new Error(
      `Get the warp sync file ${manifestChunk.file}: HTTP ${response.status}`,
    );
  }
  const text: string = await response.text();
  const sha256: string | undefined = await getSha256(text);
  // Without crypto.subtle (insecure context), import without the check, as
  // the sync works without Web Locks there.
  if (sha256 !== undefined && sha256 !== manifestChunk.sha256) {
    throw new Error(`The sha256 of ${manifestChunk.file} does not match.`);
  }
  const chunk: WarpSyncChunk = JSON.parse(text);
  checkFormat(targetChain, chunk);
  return chunk;
}

function checkFormat(
  targetChain: Chain,
  value: { formatVersion: number; chainId: number },
): void {
  if (value.formatVersion !== WARP_SYNC_FORMAT_VERSION) {
    throw new Error(`Unknown warp sync format version: ${value.formatVersion}`);
  }
  if (value.chainId !== targetChain.chainId) {
    throw new Error(`The warp sync file is for chainId ${value.chainId}.`);
  }
}

export async function getSha256(text: string): Promise<string | undefined> {
  if (!globalThis.crypto?.subtle) return undefined;
  const digest: ArrayBuffer = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(text),
  );
  return [...new Uint8Array(digest)]
    .map((byte: number) => byte.toString(16).padStart(2, "0"))
    .join("");
}
