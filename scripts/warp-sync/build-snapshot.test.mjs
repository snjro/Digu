// Runs the script against a fake RPC on localhost, with the contracts of
// Polygon in src/constants/chains.
import fs from "node:fs";
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

// No wait after a failure. Read when the script is imported.
process.env.WARP_SYNC_RETRY_WAIT_MS = "0";
const { buildSnapshot, parsePositiveInteger } =
  await import("./build-snapshot.mjs");
const { loadChain } = await import("./chains.mjs");
const { checkSnapshotFiles } = await import("./check-files.mjs");
const { expectedSnapshotLog, fakeRpcLog } = await import("./fake-logs.mjs");
const { startFakeRpc } = await import("./fake-rpc.mjs");
const { linesOf, readParts } = await import("./partial.mjs");
const { RequestLimitError } = await import("./rpc.mjs");
const { keyOf, writeManifest } = await import("./snapshot-format.mjs");

const chain = loadChain("matic");
const LATEST = 16_200_000;
const toHex = (value) => `0x${value.toString(16)}`;
// Two logs in every block that is a multiple of 20,000. Few logs, since
// decoding them is slow with the coverage of CI.
const STEP = 20_000;
let withoutTimestamp = false;
// { block, answer }: eth_getBlockByNumber of that block returns answer.
let badBlock = undefined;
// { block, answers }: eth_getBlockByNumber of that block returns the answers
// in turn ("HTTP 500", or a result), and then the block.
let blockFaults = undefined;
// With hang, the first eth_getLogs gets no answer until the test answers it;
// with hang "HTTP 500", the later ones get HTTP 500. hung has the request
// held, with closed set when the script closes it; destroyed after each test.
let hang = undefined;
const hung = [];
// The block of each eth_getBlockByNumber.
const blockAsks = [];
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
  rpc = await startFakeRpc(({ method, params }, send, res) => {
    requests.push(method);
    let result;
    if (method === "eth_chainId") result = toHex(chain.chainId);
    if (method === "eth_blockNumber") result = toHex(LATEST);
    if (method === "eth_getLogs") {
      const [{ address, fromBlock, toBlock }] = params;
      if (hang !== undefined && hung.length === 0) {
        const request = { res, params, closed: false };
        res.on("close", () => (request.closed = true));
        return hung.push(request);
      }
      if (hang === "HTTP 500") return send(500, {});
      result = logsOf(address, Number(fromBlock), Number(toBlock));
    }
    if (method === "eth_getBlockByNumber") {
      const block = Number(params[0]);
      blockAsks.push(block);
      if (block === blockFaults?.block && blockFaults.answers.length > 0) {
        const answer = blockFaults.answers.shift();
        if (answer === "HTTP 500") return send(500, {});
        return send(200, { result: answer });
      }
      result =
        block === badBlock?.block
          ? badBlock.answer
          : { timestamp: toHex(block * 2) };
    }
    send(200, { result });
  });
});
afterAll(() => rpc.close());

let outDir;
beforeEach(() => {
  outDir = fs.mkdtempSync(path.join(os.tmpdir(), "warp-build-"));
  withoutTimestamp = false;
  badBlock = undefined;
  blockFaults = undefined;
  hang = undefined;
  broken = undefined;
  requests.length = 0;
  blockAsks.length = 0;
});
afterEach(() => {
  for (const { res } of hung.splice(0)) res.destroy();
  fs.rmSync(outDir, { recursive: true, force: true });
});

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

  test("drops what was added to .partial/ after the state when it goes on", async () => {
    await expect(
      build({ toBlock: 16_000_000, maxRequests: 12 }),
    ).rejects.toThrow(RequestLimitError);
    const partial = path.join(dir(), ".partial");
    const file = fs
      .readdirSync(partial)
      .map((name) => path.join(partial, name))
      .find((name) => name.endsWith(".jsonl") && fs.statSync(name).size > 0);
    expect(file).toBeDefined();
    // A log of a block before the next block, as a range added after the
    // state, and a line half written.
    const [first] = fs.readFileSync(file, "utf8").split("\n");
    fs.appendFileSync(file, `${first}\n{"blockNumber":"0xf4`);
    await build({});
    expect(logsInFiles(readManifest())).toEqual(expectedLogs(16_000_000));
  });

  test.each([
    [
      "its state has no size",
      (_file, state) => ({ ...state, size: undefined }),
    ],
    [
      "its state is from another block",
      (_file, state) => ({ ...state, fromBlock: state.fromBlock - 1 }),
    ],
    [
      "its .jsonl file is missing",
      (file, state) => {
        fs.rmSync(file);
        return state;
      },
    ],
    [
      "its .jsonl file is shorter than its state",
      (file, state) => {
        fs.truncateSync(file, state.size - 1);
        return state;
      },
    ],
  ])("starts a part over when %s", async (_, change) => {
    await expect(
      build({ toBlock: 16_000_000, maxRequests: 12 }),
    ).rejects.toThrow(RequestLimitError);
    const partial = path.join(dir(), ".partial");
    const file = fs
      .readdirSync(partial)
      .map((name) => path.join(partial, name))
      .find((name) => name.endsWith(".jsonl") && fs.statSync(name).size > 0);
    expect(file).toBeDefined();
    const stateFile = file.replace(/\.jsonl$/, ".state.json");
    const state = JSON.parse(fs.readFileSync(stateFile, "utf8"));
    fs.writeFileSync(stateFile, JSON.stringify(change(file, state)));
    const messages = [];
    await build({ log: (message) => messages.push(message) });
    expect(logsInFiles(readManifest())).toEqual(expectedLogs(16_000_000));
    const label = `${state.project}/${state.version}/${state.name} ${state.partFrom}-${state.partTo}`;
    expect(messages).toContainEqual(
      expect.stringMatching(`^${label}: start over, since `),
    );
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

  const ammFactory = chain.contracts.find((c) => c.name === "AMMFactory");
  const manifestFile = () => path.join(dir(), "manifest.json");

  test("a run with a range to fetch drops a contract that the chain does not have, with its files", async () => {
    await build({ toBlock: 16_000_000, chunkLogs: 50 });
    // A copy of AMMFactory, with its chunks and files, named Other.
    const manifest = readManifest();
    const other = {
      ...manifest.contracts.find((c) => c.name === "AMMFactory"),
    };
    other.name = "Other";
    manifest.contracts.push(other);
    for (const row of manifest.chunks.filter((r) => r.name === "AMMFactory")) {
      const copy = { ...row, name: "Other" };
      if (row.file) {
        copy.file = row.file.replace("-AMMFactory-", "-Other-");
        fs.copyFileSync(
          path.join(dir(), row.file),
          path.join(dir(), copy.file),
        );
      }
      manifest.chunks.push(copy);
    }
    writeManifest(manifestFile(), manifest);
    const otherFiles = manifest.chunks
      .filter((r) => r.name === "Other" && r.file)
      .map((r) => r.file);
    expect(otherFiles.length).toBeGreaterThan(0);

    const messages = [];
    await build({ toBlock: 16_100_000, log: (m) => messages.push(m) });
    const after = readManifest();
    expect(after.contracts.map(keyOf).sort()).toEqual(
      chain.contracts.map(keyOf).sort(),
    );
    expect(after.chunks.some((r) => r.name === "Other")).toBe(false);
    for (const file of otherFiles) {
      expect(fs.existsSync(path.join(dir(), file))).toBe(false);
    }
    expect(checkSnapshotFiles(outDir, ["matic"])).toEqual([]);
    expect(logsInFiles(after)).toEqual(expectedLogs(16_100_000));
    expect(messages).toContainEqual(
      `Dropped from the snapshot: ${keyOf(other)} is not a contract with events of the chain.`,
    );
  });

  // AMMFactory in the manifest with another creation block (and its first
  // range from there) or another address, as if the app changed it.
  test.each([
    [
      "creation block",
      (contract, chunks) => {
        contract.creationBlock -= 10_000;
        chunks[0].fromBlock = contract.creationBlock;
        return `has creationBlock ${contract.creationBlock}, not ${ammFactory.creationBlock}.`;
      },
    ],
    [
      "address",
      (contract) => {
        contract.address = chain.contracts.find(
          (c) => c.name === "FeePot",
        ).address;
        return `has address ${contract.address}, not ${ammFactory.address}.`;
      },
    ],
  ])(
    "a run fetches a contract with another %s again from its creation block",
    async (_, change) => {
      await build({ toBlock: 16_000_000, chunkLogs: 50 });
      const manifest = readManifest();
      const contract = manifest.contracts.find((c) => c.name === "AMMFactory");
      const chunks = manifest.chunks.filter((r) => r.name === "AMMFactory");
      expect(chunks.filter((r) => r.file).length).toBeGreaterThan(1);
      const text = change(contract, chunks);
      writeManifest(manifestFile(), manifest);

      // To the same block: its last file has the name of the one to write.
      const messages = [];
      await build({
        toBlock: 16_000_000,
        chunkLogs: 50,
        log: (m) => messages.push(m),
      });
      const after = readManifest();
      expect(after.contracts.find((c) => c.name === "AMMFactory")).toEqual({
        project: ammFactory.project,
        version: ammFactory.version,
        name: ammFactory.name,
        address: ammFactory.address,
        creationBlock: ammFactory.creationBlock,
      });
      expect(checkSnapshotFiles(outDir, ["matic"])).toEqual([]);
      expect(logsInFiles(after)).toEqual(expectedLogs(16_000_000));
      expect(messages).toContainEqual(
        `Dropped from the snapshot: ${keyOf(ammFactory)} ${text}`,
      );
    },
  );

  test("a run that fetches a changed contract again goes on after a stop", async () => {
    await build({ toBlock: 16_000_000 });
    const manifest = readManifest();
    const contract = manifest.contracts.find((c) => c.name === "AMMFactory");
    contract.creationBlock -= 10_000;
    manifest.chunks.find((r) => r.name === "AMMFactory").fromBlock =
      contract.creationBlock;
    writeManifest(manifestFile(), manifest);
    const before = fs.readFileSync(manifestFile(), "utf8");

    await expect(
      build({ toBlock: 16_000_000, maxRequests: 4 }),
    ).rejects.toThrow(RequestLimitError);
    // The stop keeps the manifest and the files of the contract.
    expect(fs.readFileSync(manifestFile(), "utf8")).toBe(before);
    for (const row of manifest.chunks.filter((r) => r.file)) {
      expect(fs.existsSync(path.join(dir(), row.file))).toBe(true);
    }
    const messages = [];
    await build({ log: (m) => messages.push(m) });
    expect(messages).toContainEqual(
      expect.stringMatching(`^${keyOf(ammFactory)} .*: go on from `),
    );
    expect(checkSnapshotFiles(outDir, ["matic"])).toEqual([]);
    expect(logsInFiles(readManifest())).toEqual(expectedLogs(16_000_000));
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

  // The first block of the first contract whose logs have no blockTimestamp:
  // the logs are at the multiples of STEP, and withoutTimestamp takes it from
  // those at the multiples of 3,000.
  const firstBlockWithoutTimestamp = () =>
    Math.ceil(chain.contracts[0].creationBlock / 60_000) * 60_000;
  const asksOfBlock = (block) => blockAsks.filter((b) => b === block).length;
  // Each contract with logs in the block asks it once.
  const contractsAt = (block) =>
    chain.contracts.filter((c) => c.creationBlock <= block).length;

  test.each([
    ["HTTP 500", ["HTTP 500"]],
    ["null", [null]],
    [
      "HTTP 500 and null, nine in all",
      [...Array(5).fill("HTTP 500"), ...Array(4).fill(null)],
    ],
  ])("asks the block again after %s for blockTimestamp", async (_, answers) => {
    withoutTimestamp = true;
    const block = firstBlockWithoutTimestamp();
    blockFaults = { block, answers: [...answers] };
    await build({ toBlock: 16_000_000 });
    expect(logsInFiles(readManifest())).toEqual(expectedLogs(16_000_000));
    expect(asksOfBlock(block)).toBe(answers.length + contractsAt(block));
  });

  test.each([
    // Asked until MAX_FAILURES (10) answers in a row.
    ["null (the node does not have the block)", null, 10],
    ["no result", undefined, 1],
    ["a block without a timestamp", {}, 1],
    ["a timestamp that is not a hex string", { timestamp: 1_700_000_000 }, 1],
  ])(
    "stops with the contract and the block when the RPC returns %s for blockTimestamp",
    async (_, answer, asks) => {
      withoutTimestamp = true;
      const [contract] = chain.contracts;
      const block = firstBlockWithoutTimestamp();
      badBlock = { block, answer };
      await expect(build({ toBlock: 16_000_000 })).rejects.toThrow(
        `${keyOf(contract)}: the RPC returned no block with a hex timestamp for block ${block}, for the blockTimestamp of its logs.`,
      );
      expect(fs.existsSync(path.join(dir(), "manifest.json"))).toBe(false);
      expect(asksOfBlock(block)).toBe(asks);
    },
  );

  test("stops the HTTP 500 of a block after ten in a row", async () => {
    withoutTimestamp = true;
    const block = firstBlockWithoutTimestamp();
    blockFaults = { block, answers: Array(10).fill("HTTP 500") };
    await expect(build({ toBlock: 16_000_000 })).rejects.toThrow("HTTP 500");
    expect(asksOfBlock(block)).toBe(10);
  });

  test("cuts the requests in flight when a part stops on a failure, and throws its error", async () => {
    // One part waits for the first eth_getLogs; the other gets HTTP 500 until
    // it stops.
    hang = "HTTP 500";
    await expect(
      build({ toBlock: 16_000_000, concurrency: 2 }),
    ).rejects.toThrow("HTTP 500");
    expect(hung).toHaveLength(1);
    await vi.waitFor(() => expect(hung[0].closed).toBe(true));
  });

  test("keeps the answers of the requests in flight when a part stops at the limit", async () => {
    // One part waits for the first eth_getLogs, which is answered after the
    // other part stopped at the limit.
    hang = "until the limit";
    let answered = 0;
    const log = (message) => {
      if (!message.startsWith("Stopped at the limit")) return;
      const [{ res, params }] = hung;
      const [{ address, fromBlock, toBlock }] = params;
      const logs = logsOf(address, Number(fromBlock), Number(toBlock));
      answered = logs.length;
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ jsonrpc: "2.0", id: 0, result: logs }));
    };
    await expect(
      build({ toBlock: 16_000_000, maxRequests: 10, concurrency: 2, log }),
    ).rejects.toThrow(
      new RequestLimitError("Stopped at the limit of 10 requests."),
    );
    expect(answered).toBeGreaterThan(0);
    const [{ params }] = hung;
    const lines = fs
      .readdirSync(path.join(dir(), ".partial"))
      .filter((file) => file.endsWith(".jsonl"))
      .flatMap((file) =>
        fs.readFileSync(path.join(dir(), ".partial", file), "utf8").split("\n"),
      )
      .filter(Boolean)
      .map((line) => JSON.parse(line));
    const kept = lines.filter(
      (raw) =>
        raw.address.toLowerCase() === params[0].address.toLowerCase() &&
        Number(raw.blockNumber) >= Number(params[0].fromBlock) &&
        Number(raw.blockNumber) <= Number(params[0].toBlock),
    );
    expect(kept).toHaveLength(answered);
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

test("readParts reads a file of many chunks of the read", async () => {
  const file = path.join(outDir, "segment.jsonl");
  const logs = Array.from({ length: 30_000 }, (_, i) => ({
    blockNumber: toHex(i + 1),
    data: "0".repeat(100),
  }));
  const content = logs.map((log) => `${JSON.stringify(log)}\n`).join("");
  // Far more than one chunk of a read stream (64 KiB), so lines are cut
  // between chunks.
  expect(content.length).toBeGreaterThan(1 << 20);
  fs.writeFileSync(file, content);
  const read = [];
  for await (const log of readParts([file])) read.push(log);
  expect(read).toEqual(logs);
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
