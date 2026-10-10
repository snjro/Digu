import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import zlib from "node:zlib";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import {
  FORMAT_VERSION,
  lastBlocks,
  moveChunkFiles,
  readManifest,
  totalsOf,
  writeContractChunks,
  writeWhole,
  writeWholeAsync,
} from "./snapshot-format.mjs";

const contract = {
  project: "Augur",
  version: "v",
  name: "C",
  address: "0xAbC",
};
const logOf = (block, index) => ({
  blockNumber: `0x${block.toString(16)}`,
  logIndex: `0x${index.toString(16)}`,
  data: "0x",
  topics: ["0x01"],
});
const readChunk = (dir, file) =>
  JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(dir, file))).toString());
const sha256 = (data) => crypto.createHash("sha256").update(data).digest("hex");

let dir;
beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "warp-format-"));
});
afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

describe("writeContractChunks", () => {
  test("cuts the logs between blocks after maxLogs", async () => {
    const logs = [
      logOf(1, 0),
      logOf(1, 1),
      logOf(2, 0),
      logOf(2, 1),
      logOf(2, 2),
      logOf(3, 0),
      logOf(4, 0),
    ];
    const rows = await writeContractChunks({
      chainId: 1,
      contract,
      fromBlock: 1,
      toBlock: 10,
      logs,
      outDir: dir,
      maxLogs: 3,
    });
    // Block 2 goes into the first file whole, beyond maxLogs.
    expect(
      rows.map((r) => [r.fromBlock, r.toBlock, r.logCount, r.file]),
    ).toEqual([
      [1, 2, 5, "Augur-v-C-2.json.gz"],
      [3, 10, 2, "Augur-v-C-10.json.gz"],
    ]);
    const first = readChunk(dir, rows[0].file);
    expect(first).toEqual({
      formatVersion: FORMAT_VERSION,
      chainId: 1,
      project: "Augur",
      version: "v",
      name: "C",
      address: "0xAbC",
      fromBlock: 1,
      toBlock: 2,
      logs: logs.slice(0, 5),
    });
    const gzip = fs.readFileSync(path.join(dir, rows[0].file));
    const text = zlib.gunzipSync(gzip).toString();
    expect(rows[0]).toMatchObject({
      bytes: gzip.length,
      rawBytes: Buffer.byteLength(text),
      sha256: sha256(gzip),
      rawSha256: sha256(text),
    });
    expect(readChunk(dir, rows[1].file).logs).toEqual(logs.slice(5));
  });

  test("writes no file for a range without logs", async () => {
    const rows = await writeContractChunks({
      chainId: 1,
      contract,
      fromBlock: 5,
      toBlock: 9,
      logs: [],
      outDir: dir,
    });
    expect(rows).toEqual([
      {
        project: "Augur",
        version: "v",
        name: "C",
        fromBlock: 5,
        toBlock: 9,
        logCount: 0,
        file: null,
      },
    ]);
    expect(fs.readdirSync(dir)).toEqual([]);
  });

  test("reads an async iterable", async () => {
    async function* logs() {
      yield logOf(7, 0);
      yield logOf(8, 3);
    }
    const rows = await writeContractChunks({
      chainId: 1,
      contract,
      fromBlock: 5,
      toBlock: 9,
      logs: logs(),
      outDir: dir,
    });
    expect(rows).toHaveLength(1);
    expect(readChunk(dir, rows[0].file).logs).toEqual([
      logOf(7, 0),
      logOf(8, 3),
    ]);
  });

  test("stops at logs out of order or out of the range", async () => {
    const write = (logs) =>
      writeContractChunks({
        chainId: 1,
        contract,
        fromBlock: 5,
        toBlock: 9,
        logs,
        outDir: dir,
      });
    await expect(write([logOf(6, 1), logOf(6, 1)])).rejects.toThrow(
      "not in order",
    );
    await expect(write([logOf(7, 0), logOf(6, 0)])).rejects.toThrow(
      "not in order",
    );
    await expect(write([logOf(4, 0)])).rejects.toThrow("out of 5-9");
    await expect(write([logOf(10, 0)])).rejects.toThrow("out of 5-9");
  });
});

describe("the manifest", () => {
  const chain = { name: "eth", chainId: 1 };

  test("an empty one when there is none", () => {
    expect(readManifest(path.join(dir, "manifest.json"), chain)).toEqual({
      formatVersion: 3,
      chainName: "eth",
      chainId: 1,
      contracts: [],
      runs: [],
      chunks: [],
      totals: { logCount: 0, bytes: 0, rawBytes: 0 },
    });
  });

  test("another formatVersion stops it", () => {
    const file = path.join(dir, "manifest.json");
    fs.writeFileSync(file, JSON.stringify({ formatVersion: 2, chainId: 1 }));
    expect(() => readManifest(file, chain)).toThrow(
      `${file} has formatVersion 2.`,
    );
  });

  test("one with a byte order mark is read", () => {
    const file = path.join(dir, "manifest.json");
    const manifest = { formatVersion: 3, chainId: 1, chunks: [] };
    fs.writeFileSync(file, `\uFEFF${JSON.stringify(manifest)}`);
    expect(readManifest(file, chain)).toEqual(manifest);
  });

  test("another chain stops it", () => {
    const file = path.join(dir, "manifest.json");
    fs.writeFileSync(file, JSON.stringify({ formatVersion: 3, chainId: 137 }));
    expect(() => readManifest(file, chain)).toThrow("chainId 137");
  });

  test("lastBlocks and totalsOf", () => {
    const chunks = [
      { ...contract, toBlock: 10, logCount: 2, bytes: 5, rawBytes: 50 },
      { ...contract, name: "D", toBlock: 20, logCount: 0, file: null },
      { ...contract, toBlock: 30, logCount: 1, bytes: 3, rawBytes: 30 },
    ];
    expect(lastBlocks({ chunks })).toEqual(
      new Map([
        ["Augur/v/C", 30],
        ["Augur/v/D", 20],
      ]),
    );
    expect(totalsOf(chunks)).toEqual({ logCount: 3, bytes: 8, rawBytes: 80 });
  });

  test("moveChunkFiles does not overwrite a file", () => {
    const from = path.join(dir, "from");
    fs.mkdirSync(from);
    fs.writeFileSync(path.join(from, "a.json.gz"), "new");
    fs.writeFileSync(path.join(dir, "a.json.gz"), "old");
    const rows = [{ file: "a.json.gz" }, { file: null }];
    expect(() => moveChunkFiles(rows, from, dir, { chunks: [] })).toThrow(
      "is there already",
    );
    expect(fs.readFileSync(path.join(dir, "a.json.gz"), "utf8")).toBe("old");
    fs.rmSync(path.join(dir, "a.json.gz"));
    expect(() =>
      moveChunkFiles(rows, from, dir, { chunks: [{ file: "a.json.gz" }] }),
    ).toThrow("is there already");
    moveChunkFiles(rows, from, dir, { chunks: [] });
    expect(fs.readFileSync(path.join(dir, "a.json.gz"), "utf8")).toBe("new");
  });
});

describe("writeWhole", () => {
  const read = (file) => fs.readFileSync(file, "utf8");

  test("replaces the file only after the write ends", () => {
    const file = path.join(dir, "a.json");
    fs.writeFileSync(file, "old");
    writeWhole(file, (tmp) => {
      fs.writeFileSync(tmp, "new");
      expect(read(file)).toBe("old");
    });
    expect(read(file)).toBe("new");
    expect(fs.readdirSync(dir)).toEqual(["a.json"]);
  });

  test("keeps the file and removes the .tmp file when the write fails", () => {
    const file = path.join(dir, "a.json");
    fs.writeFileSync(file, "old");
    expect(() =>
      writeWhole(file, (tmp) => {
        fs.writeFileSync(tmp, "ne");
        throw new Error("boom");
      }),
    ).toThrow("boom");
    expect(read(file)).toBe("old");
    expect(fs.readdirSync(dir)).toEqual(["a.json"]);
  });

  test.each([
    ["writeWhole", (file, write) => writeWhole(file, write)],
    ["writeWholeAsync", async (file, write) => writeWholeAsync(file, write)],
  ])(
    "%s throws the error of the write when the .tmp file cannot be removed",
    async (_, writeOf) => {
      const file = path.join(dir, "a.json");
      fs.writeFileSync(file, "old");
      // rmSync without recursive does not remove a folder.
      await expect(async () =>
        writeOf(file, (tmp) => {
          fs.mkdirSync(path.join(tmp, "child"), { recursive: true });
          throw new Error("boom");
        }),
      ).rejects.toThrow("boom");
      expect(read(file)).toBe("old");
    },
  );

  test.each([
    ["writeWhole", (file, write) => writeWhole(file, write)],
    ["writeWholeAsync", async (file, write) => writeWholeAsync(file, write)],
  ])("%s removes the .tmp file when the rename fails", async (_, writeOf) => {
    // A folder with a file in it cannot be replaced by a file.
    const file = path.join(dir, "a");
    fs.mkdirSync(path.join(file, "child"), { recursive: true });
    await expect(async () =>
      writeOf(file, (tmp) => fs.writeFileSync(tmp, "new")),
    ).rejects.toThrow();
    expect(fs.readdirSync(dir)).toEqual(["a"]);
  });

  test("writeWholeAsync replaces the file only after the write ends", async () => {
    const file = path.join(dir, "a.json");
    fs.writeFileSync(file, "old");
    await writeWholeAsync(file, async (tmp) => {
      fs.writeFileSync(tmp, "ne");
      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(read(file)).toBe("old");
      fs.appendFileSync(tmp, "w");
    });
    expect(read(file)).toBe("new");
    expect(fs.readdirSync(dir)).toEqual(["a.json"]);
  });

  test("writeWholeAsync keeps the file and removes the .tmp file when the write fails", async () => {
    const file = path.join(dir, "a.json");
    fs.writeFileSync(file, "old");
    await expect(
      writeWholeAsync(file, async (tmp) => {
        fs.writeFileSync(tmp, "ne");
        await new Promise((resolve) => setTimeout(resolve, 10));
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");
    expect(read(file)).toBe("old");
    expect(fs.readdirSync(dir)).toEqual(["a.json"]);
  });
});
