import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { keyOf, readText, writeWhole } from "./snapshot-format.mjs";

// The logs fetched so far of each part, so that a run that stopped (at
// --max-requests, or after failures) goes on where it stopped. Each part
// has a .jsonl file, to which the logs of each range are added, one log per
// line, and a .state.json file with the address and the topics of the
// contract, the block its run started from (fromBlock), the next block to
// fetch and the size of the .jsonl file. When a run goes on, startOver in
// build-snapshot.mjs decides from them whether a part is fetched again from
// its first block. The logs are added before the state is written, so a run
// that goes on cuts the .jsonl file back to that size: the logs added after
// the state, and a line half written, are dropped.
export const PARTIAL_DIR = ".partial";
export const partKeyOf = (part) =>
  `${keyOf(part)}/${part.partFrom}-${part.partTo}`;
export function partFiles(partialDir, part) {
  const base = path.join(
    partialDir,
    `${part.project}__${part.version}__${part.name}__${part.partFrom}`,
  );
  return { logs: `${base}.jsonl`, state: `${base}.state.json` };
}
export function readStates(partialDir) {
  const states = new Map();
  if (!fs.existsSync(partialDir)) return states;
  for (const file of fs.readdirSync(partialDir)) {
    if (file.endsWith(".state.json")) {
      const state = JSON.parse(readText(path.join(partialDir, file)));
      states.set(partKeyOf(state), state);
    }
  }
  return states;
}
export function writeState(file, state) {
  writeWhole(file, (tmp) => fs.writeFileSync(tmp, JSON.stringify(state)));
}
// The lines of a stream. When the loop ends, also early or by an error, the
// interface is closed (it would otherwise give the error of its input again,
// with no listener: an uncaught error) and the input is destroyed (closing
// the interface takes its listener off the input).
export async function* linesOf(input) {
  const lines = readline.createInterface({ input, crlfDelay: Infinity });
  try {
    yield* lines;
  } finally {
    lines.close();
    input.destroy();
  }
}
async function* readLogs(file) {
  if (!fs.existsSync(file)) return;
  for await (const line of linesOf(fs.createReadStream(file))) {
    if (line) yield JSON.parse(line);
  }
}
export async function* readParts(files) {
  for (const file of files) yield* readLogs(file);
}
