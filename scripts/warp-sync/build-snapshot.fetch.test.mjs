// fetchLogs with a scripted RPC: the widths after each kind of error, and an
// empty result asked again (#576, #580).
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, test } from "vitest";

// No wait after a failure. Read when the script is imported.
process.env.WARP_SYNC_RETRY_WAIT_MS = "0";
const script = await import("./build-snapshot.mjs");

const contract = { name: "C", address: "0xc", topics: ["0x01"] };
const httpError = (status) => new script.RpcError("eth_getLogs", { status });
const rpcError = (message) =>
  new script.RpcError("eth_getLogs", { rpcError: { code: -32000, message } });
const log = (block) => ({
  blockNumber: `0x${block.toString(16)}`,
  logIndex: "0x0",
});

// The rpc answers in turn with the answers given (an Error is thrown), and
// then with no logs. It records the ranges asked.
function scripted(answers) {
  const asked = [];
  const rpc = async (_method, [{ fromBlock, toBlock }]) => {
    asked.push([Number(fromBlock), Number(toBlock)]);
    const answer = answers.shift() ?? [];
    if (answer instanceof Error) throw answer;
    return answer;
  };
  return { rpc, asked };
}
async function run(answers, fromBlock, toBlock, maxWidth = 9_999) {
  const { rpc, asked } = scripted(answers);
  const ranges = [];
  const stats = script.createFetchStats();
  const widths = script.createWidths(maxWidth);
  await script.fetchLogs(rpc, contract, fromBlock, toBlock, {
    onRange: (from, to, logs) => ranges.push([from, to, logs.length]),
    widths,
    stats,
  });
  return { asked, ranges, stats, widths };
}

describe("classifyError", () => {
  test.each([
    [httpError(500), "unrelated"],
    [httpError(504), "unrelated"],
    [httpError(429), "unrelated"],
    [rpcError("historical state is not available"), "unrelated"],
    [
      rpcError("pruned history unavailable: requested 1, earliest available 2"),
      "unrelated",
    ],
    [
      rpcError("old data not available due to pruning: requested block 1"),
      "unrelated",
    ],
    [
      rpcError("query exceeds max results 20000, retry with the range 1-2"),
      "results",
    ],
    [rpcError("query returned more than 10000 results"), "results"],
    [rpcError("query exceeds max block range 10000"), "range"],
    [
      rpcError(
        "query block range exceeds server limit, narrow your filter: 5000",
      ),
      "range",
    ],
    [httpError(408), "range"],
    [new TypeError("fetch failed"), "range"],
  ])("%s is %s", (error, kind) => {
    expect(script.classifyError(error)).toBe(kind);
  });
});

describe("fetchLogs", () => {
  test("starts at the width of the chain, and keeps it", async () => {
    const { asked } = await run([[log(5)], [log(10_005)]], 1, 20_000);
    expect(asked).toEqual([
      [1, 9_999],
      [10_000, 19_998],
      [19_999, 20_000],
      // The last range was empty: asked until three empty answers.
      [19_999, 20_000],
      [19_999, 20_000],
    ]);
  });

  test("tries the same range again after HTTP 500, 504 and a node without old blocks", async () => {
    const { asked, stats, widths } = await run(
      [httpError(500), rpcError("historical state is not available"), [log(5)]],
      1,
      9_999,
    );
    expect(asked).toEqual([
      [1, 9_999],
      [1, 9_999],
      [1, 9_999],
    ]);
    expect(widths.width).toBe(9_999);
    expect(stats.errors).toEqual({ results: 0, unrelated: 2, range: 0 });
  });

  test("halves after three errors in a row of any kind", async () => {
    const { asked } = await run(
      [httpError(504), httpError(500), httpError(504), [log(5)], [log(5_005)]],
      1,
      9_999,
    );
    expect(asked.slice(0, 4)).toEqual([
      [1, 9_999],
      [1, 9_999],
      [1, 9_999],
      [1, 4_999],
    ]);
  });

  test("halves after two range errors in a row", async () => {
    const tooWide = rpcError("query exceeds max block range 5000");
    const { asked, widths } = await run(
      [tooWide, tooWide, [log(5)], [log(5_005)]],
      1,
      9_999,
    );
    expect(asked.slice(0, 3)).toEqual([
      [1, 9_999],
      [1, 9_999],
      [1, 4_999],
    ]);
    expect(widths.maxWidth).toBe(4_999);
  });

  test("halves at once, without counting a failure, when there are too many logs", async () => {
    const tooMany = rpcError("query exceeds max results 20000");
    const answers = Array.from({ length: 12 }, () => tooMany);
    answers.push([log(1)], [log(3)]);
    const { asked, stats } = await run(answers, 1, 4);
    // Twelve in a row would stop the script if they were failures.
    expect(stats.errors.results).toBe(12);
    // 9,999 halved twelve times.
    expect(asked[12]).toEqual([1, 2]);
  });

  test("asks an empty range again, and keeps the logs of the second answer", async () => {
    const { asked, ranges, stats } = await run([[], [log(7)]], 1, 9_999);
    expect(asked).toEqual([
      [1, 9_999],
      [1, 9_999],
    ]);
    expect(ranges).toEqual([[1, 9_999, 1]]);
    expect(stats).toMatchObject({
      emptyRangesAskedAgain: 1,
      emptyRangesWithLogs: 1,
    });
  });

  test("keeps the logs of the third answer after two empty answers", async () => {
    const { asked, ranges, stats } = await run([[], [], [log(7)]], 1, 9_999);
    expect(asked).toHaveLength(3);
    expect(ranges).toEqual([[1, 9_999, 1]]);
    expect(stats).toMatchObject({
      emptyRangesAskedAgain: 1,
      emptyRangesWithLogs: 1,
    });
  });

  test("keeps an empty range that is empty three times", async () => {
    const { asked, ranges, stats } = await run([[], [], []], 1, 9_999);
    expect(asked).toHaveLength(3);
    expect(ranges).toEqual([[1, 9_999, 0]]);
    expect(stats).toMatchObject({
      emptyRangesAskedAgain: 1,
      emptyRangesWithLogs: 0,
    });
  });

  test("asks the same empty range again after an error in between", async () => {
    const { asked } = await run([[], httpError(500), [log(7)]], 1, 9_999);
    expect(asked).toEqual([
      [1, 9_999],
      [1, 9_999],
      [1, 9_999],
    ]);
  });

  test("stops after ten failures in a row", async () => {
    const answers = Array.from({ length: 10 }, () => httpError(500));
    await expect(run(answers, 1, 9_999)).rejects.toThrow("HTTP 500");
  });
});

describe("withKey", () => {
  test("adds the key in the file to the end of the URL", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "warp-key-"));
    try {
      const file = path.join(dir, "key");
      fs.writeFileSync(file, "abc123\n");
      expect(script.withKey("https://rpc.example/v3/", file)).toBe(
        "https://rpc.example/v3/abc123",
      );
      expect(script.withKey("https://rpc.example/", undefined)).toBe(
        "https://rpc.example/",
      );
      fs.writeFileSync(file, "\n");
      expect(() => script.withKey("https://rpc.example/", file)).toThrow(
        "is empty",
      );
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("splitParts", () => {
  test("parts of the given blocks, the last one shorter", () => {
    expect(script.splitParts(1, 12, 5)).toEqual([
      [1, 5],
      [6, 10],
      [11, 12],
    ]);
    expect(script.splitParts(7, 7, 5)).toEqual([[7, 7]]);
  });
});
