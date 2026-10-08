// Runs the script against a fake RPC on localhost, with the contracts of
// Polygon in src/constants/chains.
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import zlib from "node:zlib";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
  vi,
} from "vitest";
import {
  buildSnapshot,
  KEEP_WRITE_LENGTH,
  keepLogsBefore,
  loadChain,
  RequestLimitError,
} from "./build-snapshot.mjs";
import { fakeEventLog } from "./fake-logs.mjs";

const chain = loadChain("matic");
const LATEST = 16_200_000;
const toHex = (value) => `0x${value.toString(16)}`;
// Two logs in every block that is a multiple of 20,000. Few logs, since
// decoding them is slow with the coverage of CI.
const STEP = 20_000;
let withoutTimestamp = false;
// { block, name, ...fields }: the logs of that block of the contract of that
// name get these fields, so that the script does not take them.
let broken = undefined;
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
        data,
        topics,
        removed: false,
        ...(block === broken?.block && contract.name === broken.name
          ? broken.fields
          : {}),
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
  broken = undefined;
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
    await build({ toBlock: 16_000_000, chunkLogs: 50 });
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
      for (const row of rows) expect(row.logCount).toBeLessThanOrEqual(50);
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
    await build({ toBlock: 16_000_000, chunkLogs: 50 });
    const straight = readManifest().chunks;
    fs.rmSync(dir(), { recursive: true });

    await expect(
      build({ toBlock: 16_000_000, chunkLogs: 50, maxRequests: 12 }),
    ).rejects.toThrow(RequestLimitError);
    const partial = path.join(dir(), ".partial");
    const jsonl = fs
      .readdirSync(partial)
      .filter((file) => file.endsWith(".jsonl"));
    expect(jsonl.length).toBeGreaterThan(0);
    // A line half written when it stopped, and a log after the next block.
    fs.appendFileSync(path.join(partial, jsonl[0]), '{"blockNumber":"0xf4');
    await build({ chunkLogs: 50 });
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

  // The blocks of the logs of FeePot kept in .partial/.
  const partialBlocksOfFeePot = () => {
    const partial = path.join(dir(), ".partial");
    return fs
      .readdirSync(partial)
      .filter(
        (file) =>
          file.startsWith("Augur__turbo__FeePot__") && file.endsWith(".jsonl"),
      )
      .flatMap((file) =>
        fs.readFileSync(path.join(partial, file), "utf8").split("\n"),
      )
      .filter(Boolean)
      .map((line) => Number(JSON.parse(line).blockNumber));
  };

  // 15,300,000 is in the first part of FeePot (500,000 blocks from its
  // creation block 14,853,221). The ranges of a part are fetched one after
  // another, in the order of the blocks, and maxWidth keeps every range at
  // most 100,000 blocks, whatever the other parts do to the shared widths: no
  // range has both 14,860,000 and 15,300,000, so the range of 14,860,000 is
  // always in .partial/ before the range of the log.
  test.each([
    [
      "a log of an unknown topic0",
      { topics: [`0x${"ab".repeat(32)}`] },
      `cannot decode the log of topic0 0x${"ab".repeat(32)} at block 15300000, log index 0: `,
    ],
    [
      // Approval(address indexed, address indexed, uint256): the uint256 is
      // in the data.
      "a log whose data does not fit its event",
      { data: "0x" },
      "cannot decode the log of Approval at block 15300000, log index 0: ",
    ],
    [
      "a removed log",
      { removed: true },
      "a removed log at block 15300000, log index 0.",
    ],
    [
      "a log of another address",
      { address: `0x${"9".repeat(40)}` },
      `a log of another address 0x${"9".repeat(40)} at block 15300000, log index 0.`,
    ],
  ])("stops at %s when its range is fetched", async (_, fields, message) => {
    broken = { block: 15_300_000, name: "FeePot", fields };
    await expect(
      build({ toBlock: 16_000_000, maxWidth: 100_000 }),
    ).rejects.toThrow(`Augur/turbo/FeePot: ${message}`);
    expect(fs.existsSync(path.join(dir(), "manifest.json"))).toBe(false);
    // A range before the log is kept, and the range of the log is not.
    const blocks = partialBlocksOfFeePot();
    expect(blocks).toContain(14_860_000);
    expect(blocks).not.toContain(15_300_000);
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

test("keepLogsBefore keeps the file when its read fails", async () => {
  const file = path.join(outDir, "segment.jsonl");
  const line = (block) => JSON.stringify({ blockNumber: toHex(block) });
  const content = `${line(5)}\n${line(6)}\n`;
  fs.writeFileSync(file, content);
  // The read gives the first line, and then fails.
  const spy = vi.spyOn(fs, "createReadStream").mockImplementationOnce(() => {
    const stream = new Readable({ read() {} });
    stream.push(`${line(5)}\n`);
    setTimeout(() => stream.destroy(new Error("read failed")), 10);
    return stream;
  });
  try {
    await expect(keepLogsBefore(file, 7)).rejects.toThrow("read failed");
  } finally {
    spy.mockRestore();
  }
  expect(fs.readFileSync(file, "utf8")).toBe(content);
  expect(fs.existsSync(`${file}.tmp`)).toBe(false);
});

test("keepLogsBefore throws the error of the read when the close fails too", async () => {
  const file = path.join(outDir, "segment.jsonl");
  const content = `${JSON.stringify({ blockNumber: toHex(5) })}\n`;
  fs.writeFileSync(file, content);
  const read = vi.spyOn(fs, "createReadStream").mockImplementationOnce(() => {
    const stream = new Readable({ read() {} });
    setTimeout(() => stream.destroy(new Error("read failed")), 10);
    return stream;
  });
  const close = vi.spyOn(fs, "closeSync").mockImplementationOnce(() => {
    throw new Error("close failed");
  });
  try {
    await expect(keepLogsBefore(file, 7)).rejects.toThrow("read failed");
  } finally {
    read.mockRestore();
    close.mockRestore();
  }
  expect(fs.readFileSync(file, "utf8")).toBe(content);
});

test("keepLogsBefore keeps a file of more than one piece", async () => {
  const file = path.join(outDir, "segment.jsonl");
  const line = (block) =>
    JSON.stringify({ blockNumber: toHex(block), data: "0".repeat(100) });
  const blocks = Array.from({ length: 30_000 }, (_, i) => i + 1);
  const kept = blocks.slice(0, 25_000).map((block) => `${line(block)}\n`);
  expect(kept.join("").length).toBeGreaterThan(2 * KEEP_WRITE_LENGTH);
  fs.writeFileSync(file, blocks.map((block) => `${line(block)}\n`).join(""));
  await keepLogsBefore(file, 25_001);
  expect(fs.readFileSync(file, "utf8")).toBe(kept.join(""));
});
