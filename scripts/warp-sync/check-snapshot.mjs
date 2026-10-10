// Checks that the warp sync snapshot of each chain was made on the day of the
// release, by the date in UTC, for release.yml.
// Usage: node scripts/warp-sync/check-snapshot.mjs [--at <ISO time>]
//   --at: the time of the release, with a time zone (default: now).
//   WARP_SYNC_SNAPSHOT_CHECK=off: warn instead of failing.
// Fails (exit 1) when the last run of a manifest.json was made on another day,
// a manifest cannot be read, no chain is given, or --at is wrong. A chain
// without a snapshot is not checked. Writes a table to $GITHUB_STEP_SUMMARY
// (or to stdout without it). It only reads the files of the repository, and
// imports no package, so that it runs without npm ci.
import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import {
  WARP_SYNC_CHAIN_NAMES,
  WARP_SYNC_DIR,
  WARP_SYNC_FORMAT_VERSION,
} from "../../src/warpSync/warpSyncShared.mjs";

const ISO_TIME =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/;

// Returns undefined for a text that is not an ISO time with a time zone: a
// Date would take one without a zone in the local time.
function parseTime(text) {
  if (typeof text !== "string" || !ISO_TIME.test(text)) return undefined;
  const time = new Date(text);
  return Number.isNaN(time.getTime()) ? undefined : time;
}

const dayOf = (time) => time.toISOString().slice(0, 10);
const formatBlock = (block) => block.toLocaleString("en-US");

// Returns the reason that a manifest cannot be read, or its last run.
function readLastRun(file) {
  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (e) {
    return { error: e.message };
  }
  if (manifest?.formatVersion !== WARP_SYNC_FORMAT_VERSION) {
    return { error: `formatVersion ${manifest?.formatVersion}` };
  }
  const runs = manifest.runs;
  if (!Array.isArray(runs) || runs.length === 0) return { error: "no run" };
  const last = runs.at(-1);
  if (!Number.isSafeInteger(last?.toBlock)) {
    return { error: `toBlock ${JSON.stringify(last?.toBlock)}` };
  }
  const created = parseTime(last.createdAt);
  if (!created) {
    return { error: `createdAt ${JSON.stringify(last.createdAt)}` };
  }
  return { label: `run ${runs.length}`, toBlock: last.toBlock, created };
}

// args: the arguments of the command; env: its environment; dir: the folder
// with a folder of each chain. Returns the lines for stdout and stderr, and
// the exit code. Writes the table to env.GITHUB_STEP_SUMMARY when it is set.
export function checkSnapshots({ args, env, dir, chainNames }) {
  let at;
  try {
    const { values } = parseArgs({ args, options: { at: { type: "string" } } });
    at = values.at === undefined ? new Date() : parseTime(values.at);
    if (!at) {
      throw new Error(
        `--at ${values.at} is not an ISO time with a time zone, such as 2026-10-08T12:00:00Z.`,
      );
    }
  } catch (e) {
    return { stdout: [], stderr: [e.message], exitCode: 1 };
  }
  const check = env.WARP_SYNC_SNAPSHOT_CHECK !== "off";
  const stdout = [];
  let problems = 0;
  const problem = (text) => {
    problems += 1;
    stdout.push(`::${check ? "error" : "warning"}::${text}`);
  };

  if (chainNames.length === 0) problem("No chain to check.");
  const releaseDay = dayOf(at);
  const rows = [];
  for (const chain of chainNames) {
    const file = path.join(dir, chain, "manifest.json");
    if (!fs.existsSync(file)) {
      rows.push([chain, "No snapshot", "", "", ""]);
      continue;
    }
    const run = readLastRun(file);
    if (run.error) {
      problem(
        `Warp sync snapshot of ${chain}: cannot read ${path.join("static", WARP_SYNC_DIR, chain, "manifest.json")} (${run.error})`,
      );
      rows.push([chain, "Cannot read the manifest", "", "", ""]);
      continue;
    }
    const createdDay = dayOf(run.created);
    const days = (at - run.created) / 86_400_000;
    rows.push([
      chain,
      run.label,
      `${run.created.toISOString().slice(0, 16).replace("T", " ")} UTC`,
      formatBlock(run.toBlock),
      days.toFixed(1),
    ]);
    if (createdDay !== releaseDay) {
      problem(
        `The warp sync snapshot of ${chain} was made on ${createdDay}, not on the day` +
          ` of the release (${releaseDay}, in UTC); up to block ${formatBlock(run.toBlock)}.` +
          " Update it with scripts/warp-sync/build-snapshot.mjs, or see scripts/warp-sync/README.md.",
      );
    }
  }

  const lines = [
    `### Warp sync snapshots (release on ${releaseDay}, in UTC)`,
    "",
  ];
  if (!check) {
    lines.push("WARP_SYNC_SNAPSHOT_CHECK is off: warnings only.", "");
  }
  lines.push(
    "| Chain | Last run | Created | toBlock | Days |",
    "| --- | --- | --- | --- | --- |",
    ...rows.map((row) => `| ${row.join(" | ")} |`),
  );
  if (env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(env.GITHUB_STEP_SUMMARY, `${lines.join("\n")}\n`);
  } else {
    stdout.push(...lines);
  }
  return { stdout, stderr: [], exitCode: problems > 0 && check ? 1 : 0 };
}

if (import.meta.main) {
  const { stdout, stderr, exitCode } = checkSnapshots({
    args: process.argv.slice(2),
    env: process.env,
    dir: path.join(import.meta.dirname, "../../static", WARP_SYNC_DIR),
    chainNames: WARP_SYNC_CHAIN_NAMES,
  });
  for (const line of stdout) console.log(line);
  for (const line of stderr) console.error(line);
  process.exitCode = exitCode;
}
