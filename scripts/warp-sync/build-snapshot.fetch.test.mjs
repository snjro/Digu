// fetchLogs with a scripted RPC: the widths after each kind of error, and an
// empty result asked again (#576, #580).
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, test, vi } from "vitest";

// No wait after a failure. Read when the script is imported.
process.env.WARP_SYNC_RETRY_WAIT_MS = "0";
const script = await import("./build-snapshot.mjs");
const { startFakeRpc } = await import("./fake-rpc.mjs");

const contract = { name: "C", address: "0xc", topics: ["0x01"] };
const httpError = (status) => new script.RpcError("eth_getLogs", { status });
const tooManyRequests = (retryAfter) =>
  new script.RpcError("eth_getLogs", { status: 429, retryAfter });
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
    [httpError(429), "rate"],
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

  test("halves at once, without counting a failure, when there are too many logs", async () => {
    const tooMany = rpcError("query exceeds max results 20000");
    const answers = Array.from({ length: 12 }, () => tooMany);
    answers.push([log(1)], [log(3)]);
    const { asked, stats } = await run(answers, 1, 9_999);
    // Twelve in a row would stop the script if they were failures.
    expect(stats.errors.results).toBe(12);
    // 9,999 halved twelve times.
    expect(asked[12]).toEqual([1, 2]);
  });

  test("halves the range that was asked, not the width", async () => {
    const tooWide = rpcError("query exceeds max block range 1000");
    const { asked } = await run([tooWide, tooWide, [log(1)]], 1, 3_000);
    expect(asked.slice(0, 3)).toEqual([
      [1, 3_000],
      [1, 3_000],
      [1, 1_500],
    ]);
  });

  test("raises the limit after ten full ranges, with one part", async () => {
    const tooWide = rpcError("query exceeds max block range 5000");
    const answers = [tooWide, tooWide];
    for (let i = 0; i < 11; i++) answers.push([log(1 + i * 4_999)]);
    const { asked } = await run(answers, 1, 10 * 4_999 + 9_998);
    expect(asked.map(([from, to]) => to - from + 1)).toEqual([
      9_999,
      9_999,
      ...Array(10).fill(4_999),
      9_998,
    ]);
  });

  // The same range is asked once for each answer.
  test.each([
    [
      "asks an empty range again, and keeps the logs of the second answer",
      [[], [log(7)]],
      1,
    ],
    [
      "keeps the logs of the third answer after two empty answers",
      [[], [], [log(7)]],
      1,
    ],
    ["keeps an empty range that is empty three times", [[], [], []], 0],
  ])("%s", async (_name, answers, logs) => {
    const { asked, ranges, stats } = await run([...answers], 1, 9_999);
    expect(asked).toEqual(answers.map(() => [1, 9_999]));
    expect(ranges).toEqual([[1, 9_999, logs]]);
    expect(stats).toMatchObject({
      emptyRangesAskedAgain: 1,
      emptyRangesWithLogs: logs,
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

  test("asks the half, not the empty range, after two range errors in between", async () => {
    const tooWide = rpcError("query exceeds max block range 5000");
    const { asked, ranges, stats } = await run(
      [[], tooWide, tooWide, [], [], [log(7)]],
      1,
      9_999,
    );
    expect(asked.slice(0, 6)).toEqual([
      [1, 9_999],
      [1, 9_999],
      [1, 9_999],
      [1, 4_999],
      [1, 4_999],
      [1, 4_999],
    ]);
    // The empty answers of the wide range do not count for the half.
    expect(ranges[0]).toEqual([1, 4_999, 1]);
    expect(stats.emptyRangesWithLogs).toBe(1);
  });

  test("asks the half, not the empty range, after too many logs in between", async () => {
    const tooMany = rpcError("query exceeds max results 20000");
    const { asked, ranges, stats } = await run(
      [[], tooMany, [], [], [log(7)]],
      1,
      9_999,
    );
    expect(asked.slice(0, 5)).toEqual([
      [1, 9_999],
      [1, 9_999],
      [1, 4_999],
      [1, 4_999],
      [1, 4_999],
    ]);
    expect(ranges[0]).toEqual([1, 4_999, 1]);
    expect(stats.errors).toEqual({
      rate: 0,
      results: 1,
      unrelated: 0,
      range: 0,
    });
  });

  // The same range is asked again after HTTP 500, 504 and a node without old
  // blocks. Range errors halve after two in a row and errors of any kind after
  // three; an unrelated error in between counts only for the second.
  const rangeError = rpcError("query exceeds max block range 5000");
  test.each([
    [
      "500, a node without old blocks",
      [httpError(500), rpcError("historical state is not available")],
      [9_999, 9_999, 9_999],
      { width: 9_999 },
    ],
    [
      "504, 500, 504",
      [httpError(504), httpError(500), httpError(504)],
      [9_999, 9_999, 9_999, 4_999],
      {},
    ],
    [
      "range, range",
      [rangeError, rangeError],
      [9_999, 9_999, 4_999],
      { maxWidth: 4_999 },
    ],
    ["500, range", [httpError(500), rangeError], [9_999, 9_999, 9_999], {}],
    [
      "range, 500, range",
      [rangeError, httpError(500), rangeError],
      [9_999, 9_999, 9_999, 4_999],
      {},
    ],
    [
      "500, range, 500",
      [httpError(500), rangeError, httpError(500)],
      [9_999, 9_999, 9_999, 4_999],
      {},
    ],
  ])("counts the failures of %s", async (_name, errors, asks, sharedWidths) => {
    const { asked, ranges, stats, widths } = await run(
      [...errors, [log(5)]],
      1,
      9_999,
    );
    // Each from block 1 until the range of the last one works.
    expect(asked.slice(0, asks.length)).toEqual(
      asks.map((width) => [1, width]),
    );
    expect(ranges[0]).toEqual([1, asks.at(-1), 1]);
    expect(widths).toMatchObject(sharedWidths);
    const range = errors.filter((error) => error === rangeError).length;
    expect(stats.errors).toEqual({
      rate: 0,
      results: 0,
      unrelated: errors.length - range,
      range,
    });
  });

  test.each([
    [
      "stops after ten failures in a row",
      Array.from({ length: 10 }, () => httpError(500)),
    ],
    [
      "stops after ten HTTP 500 in a row, with HTTP 429 in between",
      Array.from({ length: 10 }, () => [
        tooManyRequests(),
        httpError(500),
      ]).flat(),
    ],
  ])("%s", async (_name, answers) => {
    await expect(run(answers, 1, 9_999)).rejects.toThrow("HTTP 500");
  });
});

// HTTP 429 (#632).
describe("fetchLogs after HTTP 429", () => {
  afterEach(() => vi.useRealTimers());

  test("tries the same range again after 15 in a row, without halving or stopping", async () => {
    const answers = Array.from({ length: 15 }, () => tooManyRequests());
    const { asked, ranges, stats, widths } = await run(
      [...answers, [log(5)]],
      1,
      9_999,
    );
    expect(asked).toEqual(Array.from({ length: 16 }, () => [1, 9_999]));
    expect(ranges).toEqual([[1, 9_999, 1]]);
    expect(widths.width).toBe(9_999);
    expect(stats.errors).toEqual({
      rate: 15,
      results: 0,
      unrelated: 0,
      range: 0,
    });
  });

  test("does not reset the failures of HTTP 500 in between: halves at the third", async () => {
    const { asked, stats } = await run(
      [
        httpError(500),
        tooManyRequests(),
        httpError(500),
        tooManyRequests(),
        httpError(500),
        [log(5)],
        [log(5_005)],
      ],
      1,
      9_999,
    );
    expect(asked.slice(0, 6).map(([from, to]) => to - from + 1)).toEqual([
      9_999, 9_999, 9_999, 9_999, 9_999, 4_999,
    ]);
    expect(stats.errors).toEqual({
      rate: 2,
      results: 0,
      unrelated: 3,
      range: 0,
    });
  });

  test("stops at 30 in a row, not after 29", async () => {
    const http429 = (n) => Array.from({ length: n }, () => tooManyRequests());
    await expect(run(http429(30), 1, 9_999)).rejects.toThrow("HTTP 429");
    const { ranges, stats } = await run([...http429(29), [log(5)]], 1, 9_999);
    expect(ranges).toEqual([[1, 9_999, 1]]);
    expect(stats.errors.rate).toBe(29);
  });

  test("stops in the wait when another part stops", async () => {
    vi.useFakeTimers();
    const { rpc, asked } = scripted([tooManyRequests(60), [log(5)]]);
    const controller = new AbortController();
    const done = script.fetchLogs(rpc, contract, 1, 9_999, {
      widths: script.createWidths(9_999),
      signal: controller.signal,
    });
    await vi.advanceTimersByTimeAsync(1_000);
    controller.abort(new Error("another part stopped"));
    await expect(done).rejects.toThrow("another part stopped");
    expect(asked).toHaveLength(1);
  });

  test("waits for Retry-After", async () => {
    vi.useFakeTimers();
    const { rpc, asked } = scripted([tooManyRequests(3), [log(5)]]);
    const done = script.fetchLogs(rpc, contract, 1, 9_999, {
      widths: script.createWidths(9_999),
    });
    await vi.advanceTimersByTimeAsync(2_999);
    expect(asked).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(asked).toHaveLength(2);
    await expect(done).resolves.toBe(1);
  });
});

describe("rateWaitMs", () => {
  test.each([
    // Doubled from the wait after a failure, up to 30 seconds.
    [1, undefined, 1_000],
    [2, undefined, 2_000],
    [5, undefined, 16_000],
    [6, undefined, 30_000],
    [15, undefined, 30_000],
    // Retry-After when it is longer, up to 60 seconds.
    [1, 5, 5_000],
    [5, 5, 16_000],
    [1, 0, 1_000],
    [15, 45, 45_000],
    [1, 120, 60_000],
  ])("after %s in a row with Retry-After %s: %s ms", (n, retryAfter, ms) => {
    expect(script.rateWaitMs(n, retryAfter, 1_000)).toBe(ms);
  });
});

describe("retryRate", () => {
  test("asks again after HTTP 429, and throws any other error", async () => {
    const answers = [
      new script.RpcError("eth_blockNumber", { status: 429 }),
      new script.RpcError("eth_blockNumber", { status: 429 }),
      "0x10",
      new script.RpcError("eth_blockNumber", { status: 500 }),
    ];
    const asked = [];
    const rpc = async (method) => {
      asked.push(method);
      const answer = answers.shift();
      if (answer instanceof Error) throw answer;
      return answer;
    };
    const stats = script.createFetchStats();
    const ask = script.retryRate(rpc, { stats });
    await expect(ask("eth_blockNumber")).resolves.toBe("0x10");
    expect(asked).toHaveLength(3);
    expect(stats.errors.rate).toBe(2);
    await expect(ask("eth_blockNumber")).rejects.toThrow("HTTP 500");
    expect(stats.errors.rate).toBe(2);
  });

  test("stops at 30 in a row, not after 29", async () => {
    const answers = (n) => [
      ...Array.from(
        { length: n },
        () => new script.RpcError("eth_blockNumber", { status: 429 }),
      ),
      "0x10",
    ];
    const rpcOf = (list) => async () => {
      const answer = list.shift();
      if (answer instanceof Error) throw answer;
      return answer;
    };
    await expect(
      script.retryRate(rpcOf(answers(30)))("eth_blockNumber"),
    ).rejects.toThrow("HTTP 429");
    await expect(
      script.retryRate(rpcOf(answers(29)))("eth_blockNumber"),
    ).resolves.toBe("0x10");
  });

  test("does not ask again over the limit of requests", async () => {
    const rpc = async () => {
      throw new script.RequestLimitError("Stopped at the limit of 1 requests.");
    };
    const ask = script.retryRate(rpc, {});
    await expect(ask("eth_chainId")).rejects.toThrow("limit");
  });
});

// A part in a dense range (below block 10,000) that fails above 1,249 blocks,
// while another part of the same contract works and doubles the widths that
// they share (#601).
describe("fetchLogs with the widths of another part", () => {
  // With afterWorks, the other part starts only after the first range of the
  // dense part that works.
  async function runDense(toBlock, { afterWorks = false } = {}) {
    const widths = script.createWidths(9_999);
    let otherFrom = 1_000_000;
    let worked = false;
    // Before each answer to the dense part, the other part fetches 20 ranges
    // that work, which raises the shared widths back to 9,999.
    const other = async () => {
      if (afterWorks && !worked) return;
      const from = otherFrom;
      otherFrom += 20 * 9_999;
      const works = async () => [log(0)];
      await script.fetchLogs(works, contract, from, otherFrom - 1, { widths });
    };
    const asked = [];
    const rpc = async (_method, [{ fromBlock, toBlock: to }]) => {
      await other();
      const width = Number(to) - Number(fromBlock) + 1;
      asked.push(width);
      if (Number(fromBlock) < 10_000 && width > 1_249) {
        throw new TypeError("fetch failed");
      }
      worked = true;
      return [log(Number(fromBlock))];
    };
    await script.fetchLogs(rpc, contract, 1, toBlock, { widths });
    return { asked, widths };
  }

  test("keeps its own narrowed width while it fails", async () => {
    const { asked } = await runDense(20_000);
    expect(asked.slice(0, 5)).toEqual([9_999, 9_999, 4_999, 2_499, 1_249]);
  });

  test("widens from its own width after it works", async () => {
    const { asked, widths } = await runDense(10 * 1_249 + 2 * 2_498);
    // Ten full ranges of 1,249 blocks before it doubles, like after a
    // halving of the shared widths, though they are 9,999 again.
    expect(asked.slice(4)).toEqual([...Array(10).fill(1_249), 2_498, 2_498]);
    expect(widths.width).toBe(9_999);
  });

  test("keeps its own width when it equals the shared one at the first range that works", async () => {
    // The shared widths are halved with the own ones, to 1,249, and are
    // raised only after that.
    const { asked } = await runDense(10 * 1_249 + 2 * 2_498, {
      afterWorks: true,
    });
    expect(asked.slice(0, 5)).toEqual([9_999, 9_999, 4_999, 2_499, 1_249]);
    expect(asked.slice(4)).toEqual([...Array(10).fill(1_249), 2_498, 2_498]);
  });

  test("counts a range at the shared width, when it is the narrower, in the shared widths", async () => {
    const tooWide = rpcError("query exceeds max block range 5000");
    const widths = script.createWidths(9_999);
    const answers = [tooWide, tooWide];
    for (let i = 0; i < 11; i++) answers.push([log(1 + i * 1_000)]);
    const asked = [];
    const rpc = async (_method, [{ fromBlock, toBlock }]) => {
      asked.push(Number(toBlock) - Number(fromBlock) + 1);
      // Meanwhile, another part narrowed the shared widths to 2,000, which
      // this halving narrows to 1,000. The own width is 4,999.
      if (asked.length === 2) {
        Object.assign(widths, { width: 2_000, maxWidth: 2_000, successes: 0 });
      }
      const answer = answers.shift() ?? [];
      if (answer instanceof Error) throw answer;
      return answer;
    };
    await script.fetchLogs(rpc, contract, 1, 10 * 1_000 + 2_000, { widths });
    expect(asked).toEqual([9_999, 9_999, ...Array(10).fill(1_000), 2_000]);
  });

  test("uses the shared widths again when its own width is raised to them", async () => {
    const tooWide = rpcError("query exceeds max block range 5000");
    const widths = script.createWidths(9_999);
    const answers = [tooWide, tooWide];
    const asked = [];
    const rpc = async (_method, [{ fromBlock, toBlock }]) => {
      asked.push(Number(toBlock) - Number(fromBlock) + 1);
      // Meanwhile, the other parts raised the shared widths to 8,000.
      if (asked.length === 3) {
        Object.assign(widths, { width: 8_000, maxWidth: 8_000, successes: 0 });
      }
      const answer = answers.shift() ?? [log(Number(fromBlock))];
      if (answer instanceof Error) throw answer;
      return answer;
    };
    await script.fetchLogs(rpc, contract, 1, 10 * 4_999 + 10 * 8_000 + 9_999, {
      widths,
    });
    // Ten ranges raise the own width to 9,998, which is not narrower than the
    // shared 8,000, and the part follows the shared widths up to 9,999.
    expect(asked).toEqual([
      9_999,
      9_999,
      ...Array(10).fill(4_999),
      ...Array(10).fill(8_000),
      9_999,
    ]);
  });

  // Another part halves or raises the shared widths while the request waits.
  test.each([
    ["halved", { width: 9_999, maxWidth: 9_999 }, 4_999],
    ["raised", { width: 4_999, maxWidth: 9_999 }, 9_999],
  ])(
    "does not count a range in shared widths %s while it waits",
    async (_name, before, after) => {
      const widths = script.createWidths(9_999);
      Object.assign(widths, before);
      const rpc = async () => {
        Object.assign(widths, { width: after, maxWidth: after, successes: 0 });
        return [log(1)];
      };
      await script.fetchLogs(rpc, contract, 1, before.width, { widths });
      expect(widths).toMatchObject({ width: after, successes: 0 });
    },
  );
});

describe("createRpc", () => {
  test.each([
    ["7", 7],
    [undefined, undefined],
    ["Wed, 21 Oct 2026 07:28:00 GMT", undefined],
  ])("reads Retry-After %s of HTTP 429 as %s", async (header, seconds) => {
    const server = await startFakeRpc((_request, _send, res) => {
      res.writeHead(429, header === undefined ? {} : { "retry-after": header });
      res.end();
    });
    try {
      const rpc = script.createRpc(server.url);
      const error = await rpc("eth_blockNumber").catch((error) => error);
      expect(error).toBeInstanceOf(script.RpcError);
      expect(error.status).toBe(429);
      expect(error.retryAfter).toBe(seconds);
    } finally {
      server.close();
    }
  });

  test("throws the HTTP 429 even when closing the body fails", async () => {
    vi.stubGlobal("fetch", async () => ({
      ok: false,
      status: 429,
      headers: new Headers({ "retry-after": "7" }),
      body: { cancel: () => Promise.reject(new Error("cancel failed")) },
    }));
    try {
      const rpc = script.createRpc("http://127.0.0.1:1");
      const error = await rpc("eth_blockNumber").catch((error) => error);
      expect(error).toBeInstanceOf(script.RpcError);
      expect(error.status).toBe(429);
      expect(error.retryAfter).toBe(7);
      expect(script.classifyError(error)).toBe("rate");
    } finally {
      vi.unstubAllGlobals();
    }
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

  test("checks the URL before it reads the key file", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "warp-key-"));
    try {
      expect(() =>
        script.withKey("rpc.example/v3/", path.join(dir, "missing")),
      ).toThrow("--rpc");
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  test("a URL that the key cannot be added to throws without the key", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "warp-key-"));
    try {
      const file = path.join(dir, "key");
      fs.writeFileSync(file, "abc123\n");
      for (const url of [
        "https://rpc.example",
        "https://rpc.example:",
        "ftp://rpc.example/",
        "https://rpc.example/v3",
        "https://rpc.example/v3/#/",
        "https://user@rpc.example/v3/",
        "https://user:pw-zq7x@rpc.example/v3/",
      ]) {
        let error;
        try {
          script.withKey(url, file);
        } catch (thrown) {
          error = thrown;
        }
        expect(error, url).toBeInstanceOf(Error);
        expect(error.message, url).toContain("--rpc");
        expect(error.message, url).not.toContain("abc123");
        expect(error.message, url).not.toContain("pw-zq7x");
      }
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  test("adds the key to the end of the query", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "warp-key-"));
    try {
      const file = path.join(dir, "key");
      fs.writeFileSync(file, "abc123\n");
      expect(script.withKey("https://rpc.example/?apikey=", file)).toBe(
        "https://rpc.example/?apikey=abc123",
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
