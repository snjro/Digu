import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { RESULTS, createChecks, createResults } from "./results.mjs";

let dir;
beforeAll(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "check-lib-results-"));
});
afterAll(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

const read = (file) => JSON.parse(fs.readFileSync(file, "utf8"));

describe("createResults", () => {
  test("writes each record to the file when it is added", () => {
    const file = path.join(dir, "each.json");
    fs.writeFileSync(file, '{"results":[{"id":"old","result":"OK"}]}');
    const r = createResults({ file, extra: () => ({ log: ["a"] }) });
    expect(read(file)).toEqual({ log: ["a"], results: [] });
    r.add("1", "INFO", { n: 1 });
    expect(read(file)).toEqual({
      log: ["a"],
      results: [{ id: "1", result: "INFO", note: { n: 1 } }],
    });
    r.add("2", "CHECK", "look", { shots: ["2.png"] });
    expect(read(file).results[1]).toEqual({
      id: "2",
      result: "CHECK",
      note: "look",
      shots: ["2.png"],
    });
  });

  test.each(RESULTS)("takes %s", (result) => {
    const r = createResults({ file: path.join(dir, `${result}.json`) });
    r.add("x", result, "");
    expect(r.records[0].result).toBe(result);
  });

  test.each([undefined, "ok", "PASS", true])(
    "throws on the result %s and writes no record",
    (result) => {
      const file = path.join(dir, `bad-${String(result)}.json`);
      const r = createResults({ file });
      expect(() => r.add("x", result, "")).toThrow("is not one of");
      expect(r.records).toEqual([]);
      expect(read(file).results).toEqual([]);
    },
  );

  test("check writes OK or NG", () => {
    const r = createResults({ file: path.join(dir, "check.json") });
    r.check("a", true, "fine");
    r.check("b", false, "wrong");
    expect(r.records.map((x) => [x.id, x.result])).toEqual([
      ["a", "OK"],
      ["b", "NG"],
    ]);
  });

  test("a field does not take the place of id, result or note", () => {
    const r = createResults({ file: path.join(dir, "fields.json") });
    r.add("a", "NG", "wrong", { id: "b", result: "OK", note: "x", n: 1 });
    expect(r.records).toEqual([{ id: "a", result: "NG", note: "wrong", n: 1 }]);
  });

  test("without a file, writes nothing until writeTo", () => {
    const file = path.join(dir, "later.json");
    const r = createResults();
    r.add("a", "OK", "");
    expect(fs.existsSync(file)).toBe(false);
    r.writeTo(file);
    expect(read(file).results.map((x) => x.id)).toEqual(["a"]);
    r.add("b", "OK", "");
    expect(read(file).results.map((x) => x.id)).toEqual(["a", "b"]);
  });

  test("writes a bigint as a string", () => {
    const file = path.join(dir, "bigint.json");
    createResults({ file }).add("a", "INFO", { n: 5n });
    expect(read(file).results[0].note).toEqual({ n: "5n" });
  });
});

describe("guard", () => {
  test("writes nothing when the scenario ends", async () => {
    const r = createResults({ file: path.join(dir, "guard-ok.json") });
    await r.guard("S1", async () => r.add("S1 a", "OK", ""));
    expect(r.records.map((x) => x.result)).toEqual(["OK"]);
  });

  test("turns an exception into ERROR with the fields of onError", async () => {
    const r = createResults({ file: path.join(dir, "guard-error.json") });
    await r.guard(
      "S1 error",
      async () => {
        throw new Error("boom");
      },
      { onError: async () => ({ shots: ["S1-error.png"] }) },
    );
    expect(r.records).toHaveLength(1);
    expect(r.records[0]).toMatchObject({
      id: "S1 error",
      result: "ERROR",
      shots: ["S1-error.png"],
    });
    expect(r.records[0].note).toContain("boom");
  });

  test("keeps the ERROR when onError throws", async () => {
    const r = createResults({ file: path.join(dir, "guard-onerror.json") });
    await r.guard(
      "S1 error",
      () => {
        throw new Error("boom");
      },
      {
        onError: () => {
          throw new Error("no screenshot");
        },
      },
    );
    expect(r.records.map((x) => x.result)).toEqual(["ERROR"]);
  });

  test("writes the result it is given", async () => {
    const r = createResults({ file: path.join(dir, "guard-info.json") });
    await r.guard(
      "wss error",
      () => {
        throw new Error("boom");
      },
      { result: "INFO" },
    );
    expect(r.records.map((x) => x.result)).toEqual(["INFO"]);
  });
});

describe("createChecks", () => {
  // A check with its file for a person in `kept`, like sync and real-rpc.
  function setup(name) {
    const file = path.join(dir, `checks-${name}.json`);
    const kept = {};
    const state = { scenario: "S1", judged: true };
    const c = createChecks({
      file,
      prefix: () => state.scenario,
      keep: (key, value) => ((kept[state.scenario] ??= {})[key] = value),
      judged: () => state.judged,
    });
    return { file, kept, state, c };
  }

  test("note writes INFO, and check OK or NG, with the prefix", () => {
    const { file, kept, state, c } = setup("judged");
    c.note("locks", true);
    c.check("reached", true, { n: 1 });
    state.scenario = "S3";
    c.check("reached", false);
    expect(read(file).results).toEqual([
      { id: "S1 locks", result: "INFO", note: true },
      { id: "S1 reached", result: "OK", note: { n: 1 } },
      { id: "S3 reached", result: "NG", note: {} },
    ]);
    expect(kept).toEqual({
      S1: { locks: true, reached: { ok: true, n: 1 } },
      S3: { reached: { ok: false } },
    });
  });

  test("check writes INFO while the run is not judged", () => {
    const { c, state } = setup("not-judged");
    state.judged = false;
    c.check("1 helper", false, { seen: [] });
    state.judged = true;
    c.check("1 helper", false, { seen: [] });
    expect(c.records.map((x) => [x.result, x.note])).toEqual([
      ["INFO", { ok: false, seen: [] }],
      ["NG", { seen: [] }],
    ]);
  });

  test("guard keeps the error and writes ERROR, or INFO when not judged", async () => {
    const { c, kept, state } = setup("guard");
    const shots = [];
    const boom = () => {
      throw new Error("boom");
    };
    await c.guard(boom, () => shots.push(state.scenario));
    state.scenario = "wss";
    state.judged = false;
    await c.guard(boom, () => {
      throw new Error("no screenshot");
    });
    expect(c.records.map((x) => [x.id, x.result])).toEqual([
      ["S1 error", "ERROR"],
      ["wss error", "INFO"],
    ]);
    expect(shots).toEqual(["S1"]);
    expect(kept.S1.error).toContain("boom");
    expect(kept.wss.error).toContain("boom");
  });

  test("guard writes nothing when the scenario ends", async () => {
    const { c } = setup("guard-ok");
    await c.guard(async () => c.note("a", 1));
    expect(c.records.map((x) => x.id)).toEqual(["S1 a"]);
  });
});
