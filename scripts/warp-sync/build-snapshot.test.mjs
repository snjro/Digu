// Runs the script against a fake RPC on localhost, with the contracts of
// Polygon in src/constants/chains.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Readable, Writable } from "node:stream";
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
import { buildSnapshot, parsePositiveInteger } from "./build-snapshot.mjs";
import { loadChain } from "./chains.mjs";
import { checkSnapshotFiles } from "./check-files.mjs";
import { expectedSnapshotLog, fakeRpcLog } from "./fake-logs.mjs";
import { startFakeRpc } from "./fake-rpc.mjs";
import { keepLogsBefore, linesOf } from "./partial.mjs";
import { RequestLimitError } from "./rpc.mjs";
import { keyOf, writeManifest } from "./snapshot-format.mjs";

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
    // Out of order, so that the script sorts them.
    for (const index of [1, 0]) {
      const log = fakeRpcLog(contract, block, index);
      if (withoutTimestamp && block % 3000 === 0) delete log.blockTimestamp;
      if (block === broken?.block && contract.name === broken.name) {
        Object.assign(log, broken.fields);
      }
      logs.push(log);
    }
  }
  return logs;
}

let rpc;
beforeAll(async () => {
  rpc = await startFakeRpc(({ method, params }, send) => {
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
    send(200, { result });
  });
});
afterAll(() => rpc.close());

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
    rpcUrl: rpc.url,
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
      list.map((log) => expectedSnapshotLog(contract, log)),
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
    // The ranges from the creation block, the files and the totals.
    expect(checkSnapshotFiles(outDir, ["matic"])).toEqual([]);
    for (const contract of chain.contracts) {
      const rows = manifest.chunks.filter((row) => row.name === contract.name);
      expect(rows.at(-1).toBlock).toBe(16_000_000);
      for (const row of rows) expect(row.logCount).toBeLessThanOrEqual(50);
    }
    // No .partial/ and no other file than the .json.gz files.
    expect(
      fs.readdirSync(dir()).filter((file) => !file.endsWith(".json.gz")),
    ).toEqual(["manifest.json"]);
    expect(manifest.totals.logCount).toBe(manifest.runs[0].logCount);
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

  // The contracts of matic created after block 15,000,000, taken out of the
  // manifest of a run to that block, as if they were added to the app later.
  const withoutLaterContracts = async () => {
    await build({ toBlock: 15_000_000 });
    const later = chain.contracts
      .filter((contract) => contract.creationBlock > 15_000_000)
      .map(keyOf);
    expect(later.length).toBeGreaterThan(0);
    const manifest = readManifest();
    manifest.contracts = manifest.contracts.filter(
      (contract) => !later.includes(keyOf(contract)),
    );
    writeManifest(path.join(dir(), "manifest.json"), manifest);
    return later;
  };

  test("a run with a range to fetch adds the contracts created after its end", async () => {
    const later = await withoutLaterContracts();
    await build({ toBlock: 15_100_000 });
    const keys = readManifest().contracts.map(keyOf);
    for (const key of later) expect(keys).toContain(key);
    expect(keys.sort()).toEqual(chain.contracts.map(keyOf).sort());
  });

  test("a run with no range to fetch keeps the manifest without the missing contracts", async () => {
    await withoutLaterContracts();
    const file = path.join(dir(), "manifest.json");
    const before = fs.readFileSync(file, "utf8");
    await expect(build({ toBlock: 15_000_000 })).resolves.toBeUndefined();
    expect(fs.readFileSync(file, "utf8")).toBe(before);
  });

  test("a run with no range to fetch keeps a contract that the chain does not have", async () => {
    await build({ toBlock: 15_000_000 });
    const manifest = readManifest();
    manifest.contracts.push({ ...manifest.contracts[0], name: "Other" });
    const file = path.join(dir(), "manifest.json");
    writeManifest(file, manifest);
    const before = fs.readFileSync(file, "utf8");
    await expect(build({ toBlock: 15_000_000 })).resolves.toBeUndefined();
    expect(fs.readFileSync(file, "utf8")).toBe(before);
  });

  test("a run before every contract of a chain without a snapshot writes no manifest", async () => {
    const first = Math.min(...chain.contracts.map((c) => c.creationBlock));
    await expect(build({ toBlock: first - 1 })).resolves.toBeUndefined();
    expect(fs.existsSync(path.join(dir(), "manifest.json"))).toBe(false);
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
});

const shortLine = (block) => JSON.stringify({ blockNumber: toHex(block) });
test.each([
  [
    "drops the lines from the next block on",
    `${shortLine(5)}\n${shortLine(6)}\n${shortLine(7)}\n${shortLine(8)}\n{"blockNumber":"0x`,
  ],
  ["keeps a last line without a newline", `${shortLine(5)}\n${shortLine(6)}`],
])("keepLogsBefore %s", async (_name, content) => {
  const file = path.join(outDir, "segment.jsonl");
  fs.writeFileSync(file, content);
  await keepLogsBefore(file, 7);
  expect(fs.readFileSync(file, "utf8")).toBe(
    `${shortLine(5)}\n${shortLine(6)}\n`,
  );
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

test("keepLogsBefore keeps the file when its write fails", async () => {
  const file = path.join(outDir, "segment.jsonl");
  // More than a piece of the write. The read stream must not be left open,
  // and vitest fails the run on an uncaught error of it.
  const line = JSON.stringify({ blockNumber: toHex(5), data: "0".repeat(100) });
  const content = `${line}\n`.repeat(20_000);
  fs.writeFileSync(file, content);
  const createReadStream = fs.createReadStream.bind(fs);
  let input;
  const read = vi
    .spyOn(fs, "createReadStream")
    .mockImplementationOnce((...args) => {
      input = createReadStream(...args);
      return input;
    });
  // The write makes the .tmp file, and then fails.
  const write = vi
    .spyOn(fs, "createWriteStream")
    .mockImplementationOnce((tmp) => {
      fs.writeFileSync(tmp, "partial");
      return new Writable({
        write(_chunk, _encoding, callback) {
          callback(new Error("write failed"));
        },
      });
    });
  try {
    await expect(keepLogsBefore(file, 7)).rejects.toThrow("write failed");
  } finally {
    read.mockRestore();
    write.mockRestore();
  }
  expect(input).toBeDefined();
  expect(input.destroyed).toBe(true);
  expect(fs.readFileSync(file, "utf8")).toBe(content);
  expect(fs.existsSync(`${file}.tmp`)).toBe(false);
});

test("keepLogsBefore keeps a file of many chunks of the read", async () => {
  const file = path.join(outDir, "segment.jsonl");
  const line = (block) =>
    JSON.stringify({ blockNumber: toHex(block), data: "0".repeat(100) });
  const blocks = Array.from({ length: 30_000 }, (_, i) => i + 1);
  const kept = blocks.slice(0, 25_000).map((block) => `${line(block)}\n`);
  // Far more than one chunk of a read stream (64 KiB), so lines are cut
  // between chunks.
  expect(kept.join("").length).toBeGreaterThan(1 << 20);
  fs.writeFileSync(file, blocks.map((block) => `${line(block)}\n`).join(""));
  await keepLogsBefore(file, 25_001);
  expect(fs.readFileSync(file, "utf8")).toBe(kept.join(""));
});

test("linesOf closes its input when the loop ends early", async () => {
  // A stream that does not end on its own.
  const input = new Readable({ read() {} });
  input.push("a\nb\n");
  for await (const line of linesOf(input)) {
    expect(line).toBe("a");
    break;
  }
  expect(input.destroyed).toBe(true);
});

describe("parsePositiveInteger", () => {
  test.each([
    ["1", 1],
    ["26100000", 26_100_000],
    ["9007199254740991", Number.MAX_SAFE_INTEGER],
  ])("takes %s", (text, value) => {
    expect(parsePositiveInteger(text)).toBe(value);
  });
  test.each([
    "0x18e4120",
    "2.61e7",
    "26,100,000",
    "26_100_000",
    " 5",
    "5 ",
    "+5",
    "0",
    "007",
    "-1",
    "1.0",
    "",
    "9007199254740993",
    undefined,
  ])("does not take %j", (text) => {
    expect(parsePositiveInteger(text)).toBeUndefined();
  });
});

describe("loadChain", () => {
  let chainsDir;
  beforeEach(() => {
    chainsDir = fs.mkdtempSync(path.join(os.tmpdir(), "warp-chains-"));
  });
  afterEach(() => fs.rmSync(chainsDir, { recursive: true, force: true }));

  // A chain "c" with one version, whose _index.ts has versionImports.
  function writeChain(versionImports, eol = "\n") {
    const files = {
      "_index.ts": [
        'import type { Chain } from "./types";',
        'import { chain as c } from "./c/_index";',
      ],
      "c/_index.ts": [
        'import type { Chain } from "#constants/chains/types.js";',
        'import { project as p } from "./p/_index";',
        "export const chain: Chain = {",
        '  name: "c",',
        "  chainId: 1,",
        "  confirmationBlocks: 2,",
      ],
      "c/p/_index.ts": [
        'import { version as v } from "./v/_index";',
        "export const project: Project = {",
        '  name: "p",',
      ],
      "c/p/v/_index.ts": [
        ...versionImports,
        "export const version: Version = {",
        '  name: "v",',
      ],
    };
    for (const [file, lines] of Object.entries(files)) {
      fs.mkdirSync(path.dirname(path.join(chainsDir, file)), {
        recursive: true,
      });
      fs.writeFileSync(path.join(chainsDir, file), `${lines.join(eol)}${eol}`);
    }
    for (const name of ["A", "B"]) {
      fs.writeFileSync(
        path.join(chainsDir, "c/p/v", `${name}.json`),
        JSON.stringify({
          name,
          address: `0x${name.repeat(40)}`,
          creation: { blockNumber: 5 },
          abi: [
            {
              type: "event",
              name: "E",
              anonymous: false,
              inputs: [{ type: "uint256", name: "x", indexed: false }],
            },
          ],
        }),
      );
    }
  }

  test("reads the JSON files that a version imports", () => {
    writeChain([
      'import type { Contract, Version } from "#constants/chains/types.js";',
      'import { convertJsonFilesContractToContracts } from "#constants/chains/convertJsonToABI.js";',
      'import A from "./A.json";',
      'import B from "./B.json";',
    ]);
    const chain = loadChain("c", chainsDir);
    expect(chain.contracts.map((contract) => contract.name)).toEqual([
      "A",
      "B",
    ]);
  });

  test("reads an _index.ts and a JSON file that start with a byte order mark", () => {
    writeChain(['import A from "./A.json";']);
    for (const file of ["c/p/v/_index.ts", "c/p/v/A.json"]) {
      const full = path.join(chainsDir, file);
      fs.writeFileSync(full, `\uFEFF${fs.readFileSync(full, "utf8")}`);
    }
    const chain = loadChain("c", chainsDir);
    expect(chain.contracts.map((contract) => contract.name)).toEqual(["A"]);
  });

  test("reads files with CRLF", () => {
    writeChain(['import A from "./A.json";'], "\r\n");
    const chain = loadChain("c", chainsDir);
    expect(chain.contracts.map((contract) => contract.name)).toEqual(["A"]);
  });

  test.each([
    [
      "a JSON file of a module that is not relative",
      'import C from "#constants/chains/C.json";',
    ],
    [
      "an import of another form",
      'import B from "./B.json" with { type: "json" };',
    ],
    ["an import on more than one line", "import {"],
  ])("stops at %s next to the imports it reads", (_, line) => {
    writeChain(['import A from "./A.json";', line]);
    expect(() => loadChain("c", chainsDir)).toThrow(
      `Cannot read an import of the JSON files of ${path.join(chainsDir, "c/p/v")}: ${line}`,
    );
  });
});
