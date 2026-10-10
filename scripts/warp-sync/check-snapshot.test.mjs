import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { checkSnapshots } from "./check-snapshot.mjs";

const AT = "2026-10-08T12:00:00Z";
const run = (createdAt, toBlock = 26138967) => ({ createdAt, toBlock });

let tmp;
let dir;
let env;
const manifestPath = (chain) => path.join(dir, chain, "manifest.json");
function writeManifest(chain, runs, formatVersion = 3) {
  fs.mkdirSync(path.join(dir, chain), { recursive: true });
  fs.writeFileSync(
    manifestPath(chain),
    JSON.stringify({ formatVersion, runs }),
  );
}
const check = (at = AT, chainNames = ["eth", "matic"]) => {
  const result = checkSnapshots({ args: ["--at", at], env, dir, chainNames });
  return { ...result, stdout: result.stdout.join("\n") };
};
const annotations = (stdout) =>
  stdout.split("\n").filter((line) => line.startsWith("::"));

beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), "warp-check-"));
  dir = path.join(tmp, "static/warp-sync");
  env = {};
  writeManifest("eth", [
    run("2026-10-01T00:00:00Z"),
    run("2026-10-08T00:30:00Z"),
  ]);
  writeManifest("matic", [run("2026-10-08T11:00:00Z", 77000000)]);
});

afterEach(() => {
  fs.rmSync(tmp, { recursive: true, force: true });
});

test("snapshots of the day pass", () => {
  const p = check();
  expect(p.exitCode, p.stdout).toBe(0);
  expect(p.stdout).not.toContain("::");
  expect(p.stdout).toContain(
    "| eth | run 2 | 2026-10-08 00:30 UTC | 26,138,967 | 0.5 |",
  );
  expect(p.stdout).toContain(
    "| matic | run 1 | 2026-10-08 11:00 UTC | 77,000,000 | 0.0 |",
  );
});

test("a snapshot of another day fails", () => {
  writeManifest("eth", [run("2026-10-07T23:59:00Z")]);
  const p = check();
  expect(p.exitCode).toBe(1);
  const errors = annotations(p.stdout);
  expect(errors, p.stdout).toHaveLength(1);
  expect(errors[0]).toMatch(
    /^::error::The warp sync snapshot of eth was made on 2026-10-07,/,
  );
});

test("the day is in UTC", () => {
  let p = check("2026-10-09T08:00:00+09:00");
  expect(p.exitCode, p.stdout).toBe(0);
  expect(p.stdout).toContain("release on 2026-10-08");
  p = check("2026-10-09T09:00:00+09:00");
  expect(p.exitCode).toBe(1);
  expect(p.stdout).toContain("release on 2026-10-09");
});

test("a snapshot made after the release time on its day passes", () => {
  // Only the day counts: a run made later that day passes, with a negative
  // age.
  writeManifest("eth", [run("2026-10-08T23:00:00Z")]);
  const p = check();
  expect(p.exitCode, p.stdout).toBe(0);
  expect(p.stdout).not.toContain("::");
  expect(p.stdout).toContain(
    "| eth | run 1 | 2026-10-08 23:00 UTC | 26,138,967 | -0.5 |",
  );
});

test("off warns instead of failing", () => {
  writeManifest("eth", [run("2026-10-07T00:00:00Z")]);
  env.WARP_SYNC_SNAPSHOT_CHECK = "off";
  const p = check();
  expect(p.exitCode).toBe(0);
  expect(p.stdout).toContain("::warning::The warp sync snapshot of eth");
  expect(p.stdout).not.toContain("::error::");
  expect(p.stdout).toContain("WARP_SYNC_SNAPSHOT_CHECK is off");
});

test("a chain without a snapshot is not checked", () => {
  fs.rmSync(manifestPath("matic"));
  const p = check();
  expect(p.exitCode, p.stdout).toBe(0);
  expect(p.stdout).toContain("| matic | No snapshot |  |  |  |");
});

test("no chain fails", () => {
  const p = check(AT, []);
  expect(p.exitCode).toBe(1);
  expect(p.stdout).toContain("::error::No chain to check.");
});

describe("a manifest that cannot be read fails", () => {
  test.each([
    [
      "formatVersion 2",
      () => writeManifest("eth", [run("2026-10-08T00:00:00Z")], 2),
    ],
    ["no run", () => writeManifest("eth", [])],
    ["no createdAt", () => writeManifest("eth", [{ toBlock: 1 }])],
    [
      "a createdAt without a time zone",
      () => writeManifest("eth", [run("2026-10-08T00:00:00")]),
    ],
    // #755
    [
      "a toBlock that is not a number",
      () => writeManifest("eth", [run(AT, "x")]),
    ],
    ["a toBlock of null", () => writeManifest("eth", [run(AT, null)])],
    ["not JSON", () => fs.writeFileSync(manifestPath("eth"), "")],
  ])("%s", (_, write) => {
    write();
    const p = check();
    expect(p.exitCode, p.stdout).toBe(1);
    expect(p.stdout).toContain(
      "::error::Warp sync snapshot of eth: cannot read static/warp-sync/eth/manifest.json",
    );
    expect(p.stdout).toContain("| eth | Cannot read the manifest |");
  });

  test("with off, it warns", () => {
    writeManifest("eth", [run(AT, "x")]);
    env.WARP_SYNC_SNAPSHOT_CHECK = "off";
    const p = check();
    expect(p.exitCode).toBe(0);
    expect(p.stdout).toContain("::warning::Warp sync snapshot of eth");
  });
});

test("the table goes to the summary of the step", () => {
  const summary = path.join(tmp, "summary.md");
  env.GITHUB_STEP_SUMMARY = summary;
  const p = check();
  expect(p.exitCode).toBe(0);
  expect(p.stdout).toBe("");
  expect(fs.readFileSync(summary, "utf8")).toContain("| eth | run 2 |");
});

// #755
describe("a wrong --at fails, also with off", () => {
  test.each([
    "2026-10-08T12:00:00",
    "2026-10-08",
    "today",
    "2026-13-08T12:00:00Z",
  ])("%s", (at) => {
    env.WARP_SYNC_SNAPSHOT_CHECK = "off";
    const p = check(at);
    expect(p.exitCode).toBe(1);
    expect(p.stdout).toBe("");
    expect(p.stderr).toEqual([
      `--at ${at} is not an ISO time with a time zone, such as 2026-10-08T12:00:00Z.`,
    ]);
  });

  test("an unknown option", () => {
    const p = checkSnapshots({ args: ["--on", AT], env, dir, chainNames: [] });
    expect(p.exitCode).toBe(1);
    expect(p.stderr[0]).toContain("--on");
  });
});

test("the command prints the problems and sets the exit code", () => {
  const p = spawnSync(
    process.execPath,
    [path.join(import.meta.dirname, "check-snapshot.mjs"), "--at", "today"],
    { encoding: "utf8", env: { PATH: process.env.PATH } },
  );
  expect(p.status).toBe(1);
  expect(p.stderr).toContain("--at today is not an ISO time");
});
