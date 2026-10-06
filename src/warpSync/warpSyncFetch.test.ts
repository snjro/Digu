import { afterEach, describe, expect, test, vi } from "vitest";
import type { Chain } from "#constants/chains/types.js";
import { fetchWarpSyncManifest, getWarpSyncFileUrl } from "./warpSyncFetch";

vi.mock("#lib/common/basePath.js", () => ({ basePath: "/Digu" }));

const chain = { name: "matic", chainId: 137 } as Chain;
const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

function reply(status: number, body: unknown): Response {
  return new Response(typeof body === "string" ? body : JSON.stringify(body), {
    status,
  });
}
const manifest = {
  formatVersion: 3,
  chainName: "matic",
  chainId: 137,
  contracts: [],
  runs: [],
  chunks: [],
  totals: { logCount: 0, bytes: 0, rawBytes: 0 },
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
    ["formatVersion 2", { formatVersion: 2 }, "format version: 2"],
    ["another chain", { chainId: 1 }, "chainId 1"],
  ])("throws for %s", async (_, change, message) => {
    fetchMock.mockResolvedValueOnce(reply(200, { ...manifest, ...change }));
    await expect(fetchWarpSyncManifest(chain)).rejects.toThrow(message);
  });
});

describe("getWarpSyncFileUrl", () => {
  test("is absolute, for the DB worker", () => {
    expect(getWarpSyncFileUrl(chain, "a.json.gz")).toBe(
      new URL("/Digu/warp-sync/matic/a.json.gz", location.href).href,
    );
    expect(getWarpSyncFileUrl(chain, "a.json.gz")).toMatch(/^https?:\/\//);
  });
});
