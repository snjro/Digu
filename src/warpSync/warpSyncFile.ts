// Reads a file of the snapshot. It runs in the DB worker, so it imports
// nothing of SvelteKit.
import { getWarpSyncKey } from "./warpSyncPlan";
import {
  WARP_SYNC_FORMAT_VERSION,
  type WarpSyncFile,
  type WarpSyncManifestChunkWithFile,
} from "./warpSyncTypes";

// Fetches a file of the snapshot, checks it and reads its JSON. The file is
// gzip; a server that sends it with Content-Encoding: gzip gives the JSON
// already, so the first bytes tell which one it is.
export async function readWarpSyncFile(
  url: string,
  chunk: WarpSyncManifestChunkWithFile,
  chainId: number,
): Promise<WarpSyncFile> {
  const response: Response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `Get the warp sync file ${chunk.file}: HTTP ${response.status}`,
    );
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  const isGzip: boolean = bytes[0] === 0x1f && bytes[1] === 0x8b;
  const sha256: string | undefined = await getSha256(bytes);
  // Without crypto.subtle (insecure context), import without the check, as
  // the sync works without Web Locks there.
  if (
    sha256 !== undefined &&
    sha256 !== (isGzip ? chunk.sha256 : chunk.rawSha256)
  ) {
    throw new Error(`The sha256 of ${chunk.file} does not match.`);
  }
  const text: string = isGzip
    ? await gunzip(bytes)
    : new TextDecoder().decode(bytes);
  const file: WarpSyncFile = JSON.parse(text);
  checkFormat(chainId, file);
  if (
    getWarpSyncKey(file) !== getWarpSyncKey(chunk) ||
    file.fromBlock !== chunk.fromBlock ||
    file.toBlock !== chunk.toBlock
  ) {
    throw new Error(`${chunk.file} does not have the range of the manifest.`);
  }
  return file;
}

async function gunzip(bytes: Uint8Array<ArrayBuffer>): Promise<string> {
  if (typeof DecompressionStream === "undefined") {
    throw new Error(
      "This browser cannot import the warp sync files: no DecompressionStream.",
    );
  }
  const stream = new Blob([bytes])
    .stream()
    .pipeThrough(new DecompressionStream("gzip"));
  return await new Response(stream).text();
}

export function checkFormat(
  chainId: number,
  value: { formatVersion: number; chainId: number },
): void {
  if (value.formatVersion !== WARP_SYNC_FORMAT_VERSION) {
    throw new Error(`Unknown warp sync format version: ${value.formatVersion}`);
  }
  if (value.chainId !== chainId) {
    throw new Error(`The warp sync file is for chainId ${value.chainId}.`);
  }
}

export async function getSha256(
  bytes: Uint8Array<ArrayBuffer>,
): Promise<string | undefined> {
  if (!globalThis.crypto?.subtle) return undefined;
  const digest: ArrayBuffer = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)]
    .map((byte: number) => byte.toString(16).padStart(2, "0"))
    .join("");
}
