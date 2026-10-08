import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, describe, expect, test } from "vitest";
import { readTryCount } from "./build-source.mjs";

const dirs = [];
afterAll(() => {
  for (const dir of dirs) fs.rmSync(dir, { recursive: true, force: true });
});

// A build folder with this eventLogsContract.ts.
function app(source) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "check-lib-build-"));
  dirs.push(dir);
  fs.mkdirSync(path.join(dir, "src/eventLogs"), { recursive: true });
  fs.writeFileSync(
    path.join(dir, "src/eventLogs/eventLogsContract.ts"),
    source,
  );
  return dir;
}

describe("readTryCount", () => {
  test("reads TRY_COUNT with or without its type", () => {
    expect(readTryCount(app("export const TRY_COUNT: number = 7;\n"))).toBe(7);
    expect(readTryCount(app("export const TRY_COUNT = 12;\n"))).toBe(12);
  });

  test("throws when the file has no TRY_COUNT", () => {
    expect(() => readTryCount(app("export const OTHER = 1;\n"))).toThrow(
      "no TRY_COUNT",
    );
  });

  test("reads the TRY_COUNT of this repository", () => {
    const root = fileURLToPath(new URL("../..", import.meta.url));
    expect(readTryCount(root)).toBeGreaterThan(0);
  });
});
