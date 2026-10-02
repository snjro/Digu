// The script against a fake RPC on localhost that fails like the public RPC
// of pocket: empty results for ranges that have logs (#576), nodes that
// refuse more than 5,000 blocks, too many results, HTTP 500 and 504, and a
// node without old blocks (#580). The snapshot must have every log.
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import zlib from "node:zlib";
import { afterAll, beforeAll, expect, test } from "vitest";

// No wait after a failure. Read when the script is imported.
process.env.WARP_SYNC_RETRY_WAIT_MS = "0";
const { buildSnapshot, loadChain } = await import("./build-snapshot.mjs");

const chain = loadChain("matic");
const TO = 15_600_000;
const toHex = (value) => `0x${value.toString(16)}`;
const MAX_RESULTS = 200;
// Logs: 2 in every block that is a multiple of 1,000, and a dense part (2 in
// every 10th block) where a range of 5,000 blocks has 1,000 logs.
const DENSE = [15_400_000, 15_410_000];
function blocksWithLogs(from, to) {
  const blocks = [];
  for (let block = Math.ceil(from / 10) * 10; block <= to; block += 10) {
    const dense = block >= DENSE[0] && block <= DENSE[1];
    if (dense || block % 1000 === 0) blocks.push(block);
  }
  return blocks;
}
function logsOf(contract, from, to) {
  return blocksWithLogs(Math.max(from, contract.creationBlock), to).flatMap(
    (block) =>
      [0, 1].map((index) => ({
        blockNumber: toHex(block),
        blockHash: `0x${block.toString(16).padStart(64, "0")}`,
        blockTimestamp: toHex(block * 2),
        transactionHash: `0x${(block * 10 + index).toString(16).padStart(64, "0")}`,
        transactionIndex: "0x0",
        logIndex: toHex(index),
        address: contract.address.toLowerCase(),
        data: "0x",
        topics: [contract.topics[0]],
        removed: false,
      })),
  );
}

let request = 0;
// The empty answers given for each range with logs.
const empties = new Map();
const faults = {
  empty: 0,
  tooWide: 0,
  tooMany: 0,
  http500: 0,
  http504: 0,
  noOldBlocks: 0,
};
let server;
let url;
beforeAll(async () => {
  server = http.createServer((req, res) => {
    let body = "";
    req.on("data", (data) => (body += data));
    req.on("end", () => {
      const { id, method, params } = JSON.parse(body);
      const n = ++request;
      const send = (status, value) => {
        res.writeHead(status, { "content-type": "application/json" });
        res.end(JSON.stringify({ jsonrpc: "2.0", id, ...value }));
      };
      if (method === "eth_chainId") return send(200, { result: toHex(137) });
      if (method === "eth_blockNumber")
        return send(200, { result: toHex(TO + 1_000) });
      const [{ address, fromBlock, toBlock }] = params;
      const from = Number(fromBlock);
      const to = Number(toBlock);
      const contract = chain.contracts.find(
        (c) => c.address.toLowerCase() === address.toLowerCase(),
      );
      if (n % 17 === 0) return (faults.http500++, send(500, {}));
      if (n % 19 === 0) return (faults.http504++, send(504, {}));
      if (n % 23 === 0) {
        faults.noOldBlocks++;
        return send(200, {
          error: { code: -32000, message: "historical state is not available" },
        });
      }
      // One node in three refuses more than 5,000 blocks.
      if (to - from + 1 > 5_000 && n % 3 === 0) {
        faults.tooWide++;
        return send(200, {
          error: {
            code: -32602,
            message:
              "query block range exceeds server limit, narrow your filter: 5000",
          },
        });
      }
      const logs = logsOf(contract, from, to);
      if (logs.length > MAX_RESULTS) {
        faults.tooMany++;
        return send(200, {
          error: {
            code: -32602,
            message: `query exceeds max results ${MAX_RESULTS}, retry with the range ${from}-${from + 1}`,
          },
        });
      }
      // The first two answers for a range with logs are empty, one time in
      // four (pocket was empty twice in a row).
      const key = `${address}/${from}-${to}`;
      if (logs.length > 0 && empties.get(key) === 1) {
        empties.set(key, 2);
        return send(200, { result: [] });
      }
      if (logs.length > 0 && !empties.has(key) && n % 4 === 0) {
        empties.set(key, 1);
        faults.empty++;
        return send(200, { result: [] });
      }
      send(200, { result: logs });
    });
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  url = `http://127.0.0.1:${server.address().port}`;
});
afterAll(() => server.close());

// 30 seconds: several runs at once make this test wait for the CPU for
// longer than the 5 seconds of Vitest (#618).
test("has every log despite the faults of the RPC", async () => {
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "warp-faults-"));
  try {
    const manifest = await buildSnapshot({
      chainName: "matic",
      rpcUrl: url,
      outDir,
      toBlock: TO,
      maxRequests: 100_000,
      concurrency: 8,
      partBlocks: 100_000,
      maxWidth: 9_999,
      log: () => {},
    });
    for (const contract of chain.contracts) {
      const logs = manifest.chunks
        .filter((row) => row.name === contract.name && row.file)
        .flatMap(
          (row) =>
            JSON.parse(
              zlib.gunzipSync(
                fs.readFileSync(path.join(outDir, "matic", row.file)),
              ),
            ).logs,
        );
      // The snapshot does not keep "removed".
      const expected = logsOf(contract, contract.creationBlock, TO).map((log) =>
        Object.fromEntries(
          Object.entries(log).filter(([field]) => field !== "removed"),
        ),
      );
      expect(logs).toEqual(expected);
    }
    // Every kind of fault happened, and the empty answers were asked again.
    for (const count of Object.values(faults)) expect(count).toBeGreaterThan(0);
    const { checks } = manifest.runs[0];
    // An empty range is asked again as such unless an error in between
    // halved the width; then its logs come in the narrower ranges.
    expect(checks.emptyRangesWithLogs).toBeGreaterThan(0);
    expect(checks.emptyRangesWithLogs).toBeLessThanOrEqual(faults.empty);
    expect(checks.errors).toEqual({
      results: faults.tooMany,
      unrelated: faults.http500 + faults.http504 + faults.noOldBlocks,
      range: faults.tooWide,
    });
  } finally {
    fs.rmSync(outDir, { recursive: true, force: true });
  }
}, 30_000);
