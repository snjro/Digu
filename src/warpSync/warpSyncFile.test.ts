import { gzipSync } from "node:zlib";
import { afterEach, describe, expect, test, vi } from "vitest";
import { getSha256, readWarpSyncFile } from "./warpSyncFile";
import type {
  WarpSyncFile,
  WarpSyncManifestChunkWithFile,
} from "./warpSyncTypes";

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);
afterEach(() => {
  fetchMock.mockReset();
  vi.unstubAllGlobals();
  vi.stubGlobal("fetch", fetchMock);
});

const file: WarpSyncFile = {
  formatVersion: 3,
  chainId: 137,
  project: "Augur",
  version: "turbo",
  name: "FeePot",
  address: "0x7E9614DF620da5351b36465a7C5D06263a2e1716",
  fromBlock: 100,
  toBlock: 200,
  logs: [],
};
const text: string = JSON.stringify(file);
const gzip = new Uint8Array(gzipSync(text));
const raw = new TextEncoder().encode(text);
async function chunkOf(
  change: Partial<WarpSyncManifestChunkWithFile> = {},
): Promise<WarpSyncManifestChunkWithFile> {
  return {
    project: "Augur",
    version: "turbo",
    name: "FeePot",
    fromBlock: 100,
    toBlock: 200,
    logCount: 0,
    file: "Augur-turbo-FeePot-200.json.gz",
    bytes: gzip.length,
    rawBytes: raw.length,
    sha256: (await getSha256(gzip))!,
    rawSha256: (await getSha256(raw))!,
    ...change,
  };
}
const reply = (body: Uint8Array | string, status = 200) =>
  new Response(body as BodyInit, { status });
const read = async (change: Partial<WarpSyncManifestChunkWithFile> = {}) =>
  await readWarpSyncFile("https://x/a.json.gz", await chunkOf(change), 137);

describe("readWarpSyncFile", () => {
  test("decompresses the gzip file when its sha256 matches", async () => {
    fetchMock.mockResolvedValueOnce(reply(gzip));
    expect(await read()).toEqual(file);
    expect(fetchMock).toHaveBeenCalledWith("https://x/a.json.gz");
  });
  test("reads a file that the server decompressed, by the sha256 of the JSON", async () => {
    fetchMock.mockResolvedValueOnce(reply(raw));
    expect(await read()).toEqual(file);
  });
  test.each([
    ["the gzip file", gzip, { sha256: "0".repeat(64) }],
    ["the decompressed file", raw, { rawSha256: "0".repeat(64) }],
  ])("throws when the sha256 of %s does not match", async (_, body, change) => {
    fetchMock.mockResolvedValueOnce(reply(body));
    await expect(read(change)).rejects.toThrow("sha256");
  });
  test("reads it without the check when crypto.subtle is missing (insecure context)", async () => {
    const chunk = await chunkOf({ sha256: "0".repeat(64) });
    vi.stubGlobal("crypto", {});
    fetchMock.mockResolvedValueOnce(reply(gzip));
    expect(await readWarpSyncFile("https://x/a", chunk, 137)).toEqual(file);
  });
  test("throws without DecompressionStream", async () => {
    vi.stubGlobal("DecompressionStream", undefined);
    fetchMock.mockResolvedValueOnce(reply(gzip));
    await expect(read()).rejects.toThrow("no DecompressionStream");
  });
  test.each([
    ["another range", { toBlock: 300 }, "does not have the range"],
    ["another contract", { name: "AMMFactory" }, "does not have the range"],
  ])("throws for %s than the manifest", async (_, change, message) => {
    fetchMock.mockResolvedValueOnce(reply(gzip));
    // The sha256 of the file still matches: only the range differs.
    await expect(read(change)).rejects.toThrow(message);
  });
  test("throws for another chain", async () => {
    fetchMock.mockResolvedValueOnce(reply(gzip));
    await expect(
      readWarpSyncFile("https://x/a", await chunkOf(), 1),
    ).rejects.toThrow("chainId 137");
  });
  test("throws on an HTTP error", async () => {
    fetchMock.mockResolvedValueOnce(reply("Not Found", 404));
    await expect(read()).rejects.toThrow("HTTP 404");
  });
});

describe("getSha256", () => {
  test("is the hex SHA-256 of the bytes", async () => {
    expect(await getSha256(new TextEncoder().encode("abc"))).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });
});
