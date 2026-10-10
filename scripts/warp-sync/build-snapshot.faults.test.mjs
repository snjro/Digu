// The script against a fake RPC on localhost that fails like the public RPC
// of pocket: empty results for ranges that have logs (#576), nodes that
// refuse more than 5,000 blocks, too many results, HTTP 500 and 504, and a
// node without old blocks (#580); and like Infura: HTTP 429, 15 times in a
// row, mixed with HTTP 500, and for eth_blockNumber (#632). The snapshot must
// have every log.
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import zlib from "node:zlib";
import { afterAll, beforeAll, expect, test } from "vitest";

// No wait after a failure. Read when the script is imported.
process.env.WARP_SYNC_RETRY_WAIT_MS = "0";
const { buildSnapshot } = await import("./build-snapshot.mjs");
const { loadChain } = await import("./chains.mjs");
const { expectedSnapshotLog, fakeRpcLog } = await import("./fake-logs.mjs");
const { startFakeRpc } = await import("./fake-rpc.mjs");

const chain = loadChain("matic");
const TO = 15_600_000;
const toHex = (value) => `0x${value.toString(16)}`;
const MAX_RESULTS = 40;
// Logs: 2 in every block that is a multiple of 10,000, and a dense part (2 in
// every 40th block) of 102 logs in 2,000 blocks. Few logs, since decoding them
// is slow with the coverage of CI.
const DENSE = [15_400_000, 15_402_000];
function blocksWithLogs(from, to) {
  const blocks = [];
  for (let block = Math.ceil(from / 40) * 40; block <= to; block += 40) {
    const dense = block >= DENSE[0] && block <= DENSE[1];
    if (dense || block % 10_000 === 0) blocks.push(block);
  }
  return blocks;
}
function logsOf(contract, from, to) {
  return blocksWithLogs(Math.max(from, contract.creationBlock), to).flatMap(
    (block) => [0, 1].map((index) => fakeRpcLog(contract, block, index)),
  );
}

// The faults depend on the range alone, not on the order in which the
// requests of the workers come (#623). The script asks the same first block
// until a range from it works, so the faults are chosen for each first block
// and by the count of the requests from it.
const requestsFrom = new Map();
const hashOf = (text) =>
  createHash("sha256").update(text).digest().readUInt32BE(0);
// The empty answers given for each range with logs.
const empties = new Map();
const faults = {
  empty: 0,
  tooWide: 0,
  tooMany: 0,
  http500: 0,
  http504: 0,
  noOldBlocks: 0,
  http429: 0,
  http429With500: 0,
  blockNumber429: 0,
};
let rpc;
beforeAll(async () => {
  rpc = await startFakeRpc(({ method, params }, send) => {
    // Retry-After: 0 is read but does not make the wait longer; the test
    // does not wait because of WARP_SYNC_RETRY_WAIT_MS=0.
    const tooManyRequests = () => send(429, {}, { "retry-after": "0" });
    if (method === "eth_chainId") return send(200, { result: toHex(137) });
    if (method === "eth_blockNumber") {
      if (faults.blockNumber429 === 0) {
        faults.blockNumber429++;
        return tooManyRequests();
      }
      return send(200, { result: toHex(TO + 1_000) });
    }
    const [{ address, fromBlock, toBlock }] = params;
    const from = Number(fromBlock);
    const to = Number(toBlock);
    const contract = chain.contracts.find(
      (c) => c.address.toLowerCase() === address.toLowerCase(),
    );
    const start = `${address.toLowerCase()}/${from}`;
    const n = (requestsFrom.get(start) ?? 0) + 1;
    requestsFrom.set(start, n);
    // At most 2 failures in a row from any first block (MAX_FAILURES is 10).
    const fault = hashOf(start) % 8;
    if (n === 1 && fault === 0) return (faults.http500++, send(500, {}));
    if (n === 1 && fault === 1) return (faults.http504++, send(504, {}));
    // HTTP 429 15 times in a row, which are not failures.
    if (n <= 15 && fault === 4) return (faults.http429++, tooManyRequests());
    // HTTP 500 and 429 in turn: two failures in a row.
    if (n <= 4 && fault === 5) {
      if (n % 2 === 1) return (faults.http429With500++, tooManyRequests());
      return (faults.http500++, send(500, {}));
    }
    if (n === 1 && fault === 2) {
      faults.noOldBlocks++;
      return send(200, {
        error: { code: -32000, message: "historical state is not available" },
      });
    }
    // A node that refuses more than 5,000 blocks, twice, so that the
    // script halves the range.
    if (n <= 2 && fault === 3 && to - from + 1 > 5_000) {
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
    // The first two answers for a range with logs are empty, one range in
    // four (pocket was empty twice in a row).
    const key = `${start}-${to}`;
    if (logs.length > 0 && empties.get(key) === 1) {
      empties.set(key, 2);
      return send(200, { result: [] });
    }
    if (logs.length > 0 && !empties.has(key) && hashOf(key) % 4 === 0) {
      empties.set(key, 1);
      faults.empty++;
      return send(200, { result: [] });
    }
    send(200, { result: logs });
  });
});
afterAll(() => rpc.close());

// 30 seconds: several runs at once make this test wait for the CPU for
// longer than the 5 seconds of Vitest (#618).
test("has every log despite the faults of the RPC", async () => {
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "warp-faults-"));
  try {
    const manifest = await buildSnapshot({
      chainName: "matic",
      rpcUrl: rpc.url,
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
      const expected = logsOf(contract, contract.creationBlock, TO).map((log) =>
        expectedSnapshotLog(contract, log),
      );
      expect(logs).toEqual(expected);
    }
    // Every kind of fault happened, and the empty answers were asked again.
    for (const count of Object.values(faults)) expect(count).toBeGreaterThan(0);
    const { checks } = manifest.runs[0];
    // The errors from a first block come before its empty answers, so every
    // range answered empty is asked again until its logs come.
    expect(checks.emptyRangesWithLogs).toBe(faults.empty);
    expect(checks.errors).toEqual({
      rate: faults.http429 + faults.http429With500 + faults.blockNumber429,
      results: faults.tooMany,
      unrelated: faults.http500 + faults.http504 + faults.noOldBlocks,
      range: faults.tooWide,
    });
  } finally {
    fs.rmSync(outDir, { recursive: true, force: true });
  }
}, 30_000);
