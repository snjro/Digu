// Runs the script against a fake RPC on localhost, with the contracts of
// Polygon in src/constants/chains.
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import zlib from "node:zlib";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from "vitest";
import {
  buildSnapshot,
  keepLogsBefore,
  loadChain,
  RequestLimitError,
} from "./build-snapshot.mjs";
import { fakeEventLog } from "./fake-logs.mjs";

const chain = loadChain("matic");
const LATEST = 16_200_000;
const toHex = (value) => `0x${value.toString(16)}`;
// Two logs in every block that is a multiple of 1,000.
const STEP = 1000;
let withoutTimestamp = false;
// A block whose logs cannot be decoded.
let brokenBlock = undefined;
const requests = [];

function logsOf(address, from, to) {
  const contract = chain.contracts.find(
    (c) => c.address.toLowerCase() === address.toLowerCase(),
  );
  const logs = [];
  for (let block = Math.ceil(from / STEP) * STEP; block <= to; block += STEP) {
    if (block < contract.creationBlock) continue;
    for (const index of [1, 0]) {
      const { data, topics } = fakeEventLog(contract, block * 10 + index);
      // Out of order, so that the script sorts them.
      logs.push({
        blockNumber: toHex(block),
        blockHash: `0x${block.toString(16).padStart(64, "0")}`,
        ...(withoutTimestamp && block % 3000 === 0
          ? {}
          : { blockTimestamp: toHex(block * 2) }),
        transactionHash: `0x${(block * 10 + index).toString(16).padStart(64, "0")}`,
        transactionIndex: "0x0",
        logIndex: toHex(index),
        address: address.toLowerCase(),
        data: block === brokenBlock ? "0x" : data,
        topics,
        removed: false,
      });
    }
  }
  return logs;
}

let server;
let url;
beforeAll(async () => {
  server = http.createServer((req, res) => {
    let body = "";
    req.on("data", (data) => (body += data));
    req.on("end", () => {
      const { id, method, params } = JSON.parse(body);
      requests.push(method);
      let result;
      if (method === "eth_chainId") result = toHex(chain.chainId);
      if (method === "eth_blockNumber") result = toHex(LATEST);
      if (method === "eth_getLogs") {
        const [{ address, fromBlock, toBlock }] = params;
        result = logsOf(address, Number(fromBlock), Number(toBlock));
      }
      if (method === "eth_getBlockByNumber") {
        result = { timestamp: toHex(Number(params[0]) * 2) };
      }
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ jsonrpc: "2.0", id, result }));
    });
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  url = `http://127.0.0.1:${server.address().port}`;
});
afterAll(() => server.close());

let outDir;
beforeEach(() => {
  outDir = fs.mkdtempSync(path.join(os.tmpdir(), "warp-build-"));
  withoutTimestamp = false;
  brokenBlock = undefined;
  requests.length = 0;
});
afterEach(() => fs.rmSync(outDir, { recursive: true, force: true }));

const build = (options) =>
  buildSnapshot({
    chainName: "matic",
    rpcUrl: url,
    outDir,
    maxRequests: 10_000,
    log: () => {},
    ...options,
  });
const dir = () => path.join(outDir, "matic");
const readManifest = () =>
  JSON.parse(fs.readFileSync(path.join(dir(), "manifest.json"), "utf8"));
const readChunk = (file) =>
  JSON.parse(
    zlib.gunzipSync(fs.readFileSync(path.join(dir(), file))).toString(),
  );

// The logs of each contract in the files, in the order of the manifest.
function logsInFiles(manifest) {
  const logs = new Map();
  for (const row of manifest.chunks) {
    const key = `${row.project}/${row.version}/${row.name}`;
    const list = logs.get(key) ?? [];
    if (row.file) list.push(...readChunk(row.file).logs);
    logs.set(key, list);
  }
  return logs;
}
function expectedLogs(to) {
  const logs = new Map();
  for (const contract of chain.contracts) {
    const key = `${contract.project}/${contract.version}/${contract.name}`;
    const list = logsOf(contract.address, contract.creationBlock, to)
      .map((log) => ({
        ...log,
        blockTimestamp: toHex(Number(log.blockNumber) * 2),
      }))
      .sort(
        (a, b) =>
          Number(a.blockNumber) - Number(b.blockNumber) ||
          Number(a.logIndex) - Number(b.logIndex),
      );
    logs.set(
      key,
      list.map(
        ({
          blockNumber,
          blockTimestamp,
          transactionHash,
          transactionIndex,
          logIndex,
        }) => {
          const { event, args } = fakeEventLog(
            contract,
            Number(transactionHash),
          );
          return {
            blockNumber,
            blockTimestamp,
            transactionHash,
            transactionIndex,
            logIndex,
            event,
            args,
          };
        },
      ),
    );
  }
  return logs;
}

// 30 seconds: several runs at once make these tests wait for the CPU for
// longer than the 5 seconds of Vitest (#618).
describe("buildSnapshot", { timeout: 30_000 }, () => {
  test("writes the files of formatVersion 3 and the manifest", async () => {
    await build({ toBlock: 16_000_000, chunkLogs: 500 });
    const manifest = readManifest();
    expect(manifest).toMatchObject({
      formatVersion: 3,
      chainName: "matic",
      chainId: 137,
    });
    expect(manifest.contracts).toHaveLength(chain.contracts.length);
    expect(manifest.runs).toEqual([
      expect.objectContaining({
        latestBlockNumber: LATEST,
        toBlock: 16_000_000,
      }),
    ]);
    expect(logsInFiles(manifest)).toEqual(expectedLogs(16_000_000));
    // The ranges of each contract follow each other from the creation block.
    for (const contract of chain.contracts) {
      const rows = manifest.chunks.filter((row) => row.name === contract.name);
      expect(rows[0].fromBlock).toBe(contract.creationBlock);
      expect(rows.at(-1).toBlock).toBe(16_000_000);
      for (let i = 1; i < rows.length; i++)
        expect(rows[i].fromBlock).toBe(rows[i - 1].toBlock + 1);
      for (const row of rows) expect(row.logCount).toBeLessThanOrEqual(500);
    }
    const files = manifest.chunks
      .filter((row) => row.file)
      .map((row) => row.file);
    expect(fs.readdirSync(dir()).sort()).toEqual(
      [...files, "manifest.json"].sort(),
    );
    expect(manifest.totals.logCount).toBe(manifest.runs[0].logCount);
    expect(manifest.totals.logCount).toBe(
      [...expectedLogs(16_000_000).values()].reduce(
        (sum, list) => sum + list.length,
        0,
      ),
    );
  });

  test("goes on after a stop, with the same files", async () => {
    await build({ toBlock: 16_000_000, chunkLogs: 500 });
    const straight = readManifest().chunks;
    fs.rmSync(dir(), { recursive: true });

    await expect(
      build({ toBlock: 16_000_000, chunkLogs: 500, maxRequests: 12 }),
    ).rejects.toThrow(RequestLimitError);
    const partial = path.join(dir(), ".partial");
    const jsonl = fs
      .readdirSync(partial)
      .filter((file) => file.endsWith(".jsonl"));
    expect(jsonl.length).toBeGreaterThan(0);
    // A line half written when it stopped, and a log after the next block.
    fs.appendFileSync(path.join(partial, jsonl[0]), '{"blockNumber":"0xf4');
    await build({ chunkLogs: 500 });
    expect(readManifest().chunks).toEqual(straight);
    expect(fs.existsSync(partial)).toBe(false);
  });

  test("a later run adds only the blocks after the last run", async () => {
    await build({ toBlock: 16_000_000 });
    const first = readManifest();
    await build({ toBlock: 16_100_000 });
    const manifest = readManifest();
    expect(manifest.runs.map((run) => run.toBlock)).toEqual([
      16_000_000, 16_100_000,
    ]);
    expect(manifest.chunks.slice(0, first.chunks.length)).toEqual(first.chunks);
    for (const row of manifest.chunks.slice(first.chunks.length)) {
      expect(row.fromBlock).toBe(16_000_001);
      expect(row.toBlock).toBe(16_100_000);
    }
    expect(logsInFiles(manifest)).toEqual(expectedLogs(16_100_000));
    await expect(build({ toBlock: 16_100_000 })).resolves.toBeUndefined();
  });

  test("gets blockTimestamp from the block when the RPC does not return it", async () => {
    withoutTimestamp = true;
    await build({ toBlock: 16_000_000 });
    expect(logsInFiles(readManifest())).toEqual(expectedLogs(16_000_000));
    expect(requests).toContain("eth_getBlockByNumber");
  });

  test("stops at a log that cannot be decoded, and writes no file", async () => {
    brokenBlock = 15_000_000;
    await expect(build({ toBlock: 16_000_000 })).rejects.toThrow(
      /: cannot decode the log of \w+ at block 15000000, log index 0: /,
    );
    expect(fs.existsSync(path.join(dir(), "manifest.json"))).toBe(false);
  });

  test("stops at a .partial/ of the script before formatVersion 2", async () => {
    fs.mkdirSync(path.join(dir(), ".partial"), { recursive: true });
    fs.writeFileSync(
      path.join(dir(), ".partial", "Augur__turbo__AMMFactory__1.json"),
      "{}",
    );
    await expect(build({ toBlock: 16_000_000 })).rejects.toThrow(
      "older version",
    );
  });
});

test("keepLogsBefore drops the lines from the next block on", async () => {
  const file = path.join(outDir, "segment.jsonl");
  const line = (block) => JSON.stringify({ blockNumber: toHex(block) });
  fs.writeFileSync(
    file,
    `${line(5)}\n${line(6)}\n${line(7)}\n${line(8)}\n{"blockNumber":"0x`,
  );
  await keepLogsBefore(file, 7);
  expect(fs.readFileSync(file, "utf8")).toBe(`${line(5)}\n${line(6)}\n`);
});
