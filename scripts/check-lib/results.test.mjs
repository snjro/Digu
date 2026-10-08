import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { RESULTS, createResults } from "./results.mjs";

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
      async () => ({ shots: ["S1-error.png"] }),
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
      () => {
        throw new Error("no screenshot");
      },
    );
    expect(r.records.map((x) => x.result)).toEqual(["ERROR"]);
  });
});
