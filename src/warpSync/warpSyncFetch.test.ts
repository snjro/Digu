import { afterEach, describe, expect, test, vi } from "vitest";
import type { Chain } from "@constants/chains/types";
import {
  fetchWarpSyncChunk,
  fetchWarpSyncManifest,
  getSha256,
} from "./warpSyncFetch";
import type { WarpSyncManifestChunk } from "./warpSyncTypes";

vi.mock("$app/paths", () => ({ base: "/Digu" }));

const chain = { name: "matic", chainId: 137 } as Chain;
const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

function reply(status: number, body: unknown): Response {
  return new Response(typeof body === "string" ? body : JSON.stringify(body), {
    status,
  });
}
const manifest = {
  formatVersion: 1,
  chainName: "matic",
  chainId: 137,
  contracts: [],
  chunks: [],
};

afterEach(() => {
  fetchMock.mockReset();
});

describe("fetchWarpSyncManifest", () => {
  test("reads the manifest of the chain under the base path", async () => {
    fetchMock.mockResolvedValueOnce(reply(200, manifest));
    expect(await fetchWarpSyncManifest(chain)).toEqual(manifest);
    expect(fetchMock).toHaveBeenCalledWith(
      "/Digu/warp-sync/matic/manifest.json",
    );
  });
  test("is undefined when the chain has no snapshot", async () => {
    fetchMock.mockResolvedValueOnce(reply(404, "Not Found"));
    expect(await fetchWarpSyncManifest(chain)).toBeUndefined();
  });
  test("throws on another error", async () => {
    fetchMock.mockResolvedValueOnce(reply(500, "error"));
    await expect(fetchWarpSyncManifest(chain)).rejects.toThrow("HTTP 500");
  });
  test.each([
    ["another format version", { formatVersion: 2 }, "format version: 2"],
    ["another chain", { chainId: 1 }, "chainId 1"],
  ])("throws for %s", async (_, change, message) => {
    fetchMock.mockResolvedValueOnce(reply(200, { ...manifest, ...change }));
    await expect(fetchWarpSyncManifest(chain)).rejects.toThrow(message);
  });
});

describe("fetchWarpSyncChunk", () => {
  const text = JSON.stringify({
    formatVersion: 1,
    chainId: 137,
    contracts: [],
  });
  async function manifestChunk(): Promise<WarpSyncManifestChunk> {
    return {
      file: "logs-100.json",
      sha256: (await getSha256(text))!,
      createdAt: "",
      latestBlockNumber: 0,
      logCount: 0,
      contracts: [],
    };
  }
  test("reads the file when its sha256 matches", async () => {
    fetchMock.mockResolvedValueOnce(reply(200, text));
    expect(await fetchWarpSyncChunk(chain, await manifestChunk())).toEqual(
      JSON.parse(text),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/Digu/warp-sync/matic/logs-100.json",
    );
  });
  test("throws when its sha256 does not match", async () => {
    fetchMock.mockResolvedValueOnce(reply(200, `${text} `));
    await expect(
      fetchWarpSyncChunk(chain, await manifestChunk()),
    ).rejects.toThrow("sha256");
  });
  test("reads it without the check when crypto.subtle is missing (insecure context)", async () => {
    const chunk = await manifestChunk();
    vi.stubGlobal("crypto", {});
    fetchMock.mockResolvedValueOnce(reply(200, `${text} `));
    try {
      expect(await fetchWarpSyncChunk(chain, chunk)).toEqual(JSON.parse(text));
    } finally {
      vi.unstubAllGlobals();
      vi.stubGlobal("fetch", fetchMock);
    }
  });
  test("throws on an HTTP error", async () => {
    fetchMock.mockResolvedValueOnce(reply(404, "Not Found"));
    await expect(
      fetchWarpSyncChunk(chain, await manifestChunk()),
    ).rejects.toThrow("HTTP 404");
  });
});

describe("getSha256", () => {
  test("is the hex SHA-256 of the text", async () => {
    expect(await getSha256("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });
});
