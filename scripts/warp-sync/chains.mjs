// Reads a chain and its contracts with events from the _index.ts files of
// src/constants/chains and the JSON files that they import.
import path from "node:path";
import { Interface } from "ethers";
import { readText } from "./snapshot-format.mjs";
import { eventsByTopic0 } from "./snapshot-log.mjs";

const CHAINS_DIR = "src/constants/chains";

function match(text, regex, what) {
  const found = text.match(regex);
  if (!found) throw new Error(`Cannot find ${what}.`);
  return found[1];
}
// The paths of the imports of the text of an _index.ts, read with readText
// (without a byte order mark). Every import must have the form of
// regex, so that an import of another form does not leave its contracts out
// without a word. Imports of types, and of modules that are not relative (#…)
// and not a JSON file, are not data and are skipped.
function importsOf(text, regex, what) {
  const paths = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line.startsWith("import ") || line.startsWith("import type "))
      continue;
    if (/ from "[^."][^"]*(?<!\.json)";$/.test(line)) continue;
    const found = line.match(regex);
    if (!found) throw new Error(`Cannot read an import of ${what}: ${line}`);
    paths.push(found[1]);
  }
  if (paths.length === 0) throw new Error(`Cannot find ${what}.`);
  return paths;
}

// Reads the chain from the import lines of the _index.ts files and the JSON
// files that they import.
export function loadChain(chainName, chainsDir = CHAINS_DIR) {
  const chainDirs = importsOf(
    readText(path.join(chainsDir, "_index.ts")),
    /^import \{ chain as \w+ \} from "\.\/([^"]+)\/_index";$/,
    `the chains of ${chainsDir}`,
  );
  for (const chainDir of chainDirs) {
    const dir = path.join(chainsDir, chainDir);
    const index = readText(path.join(dir, "_index.ts"));
    const name = match(
      index,
      /export const chain: Chain = \{\s*name: "([^"]+)"/,
      `the name of ${dir}`,
    );
    if (name !== chainName) continue;
    return {
      name,
      chainId: Number(match(index, /chainId: (\d+)/, "chainId")),
      confirmationBlocks: Number(
        match(index, /confirmationBlocks: (\d+)/, "confirmationBlocks"),
      ),
      contracts: loadContracts(dir, index),
    };
  }
  throw new Error(`No chain named "${chainName}" in ${chainsDir}.`);
}
function loadContracts(chainDir, chainIndex) {
  const contracts = [];
  for (const projectDir of importsOf(
    chainIndex,
    /^import \{ project as \w+ \} from "\.\/([^"]+)\/_index";$/,
    `the projects of ${chainDir}`,
  )) {
    const dir = path.join(chainDir, projectDir);
    const index = readText(path.join(dir, "_index.ts"));
    const project = match(
      index,
      /export const project: Project = \{\s*name: "([^"]+)"/,
      `the name of ${dir}`,
    );
    for (const versionDir of importsOf(
      index,
      /^import \{ version as \w+ \} from "\.\/([^"]+)\/_index";$/,
      `the versions of ${dir}`,
    )) {
      const vDir = path.join(dir, versionDir);
      const vIndex = readText(path.join(vDir, "_index.ts"));
      const version = match(
        vIndex,
        /export const version: Version = \{\s*name: "([^"]+)"/,
        `the name of ${vDir}`,
      );
      for (const file of importsOf(
        vIndex,
        /^import \w+ from "\.\/([^"]+\.json)";$/,
        `the JSON files of ${vDir}`,
      )) {
        const json = JSON.parse(readText(path.join(vDir, file)));
        const iface = new Interface(json.abi);
        const events = eventsByTopic0(iface);
        if (events.size === 0) continue;
        contracts.push({
          project,
          version,
          name: json.name,
          address: json.address,
          creationBlock: json.creation.blockNumber,
          topics: [...events.keys()],
          // To decode the logs.
          iface,
          events,
        });
      }
    }
  }
  return contracts;
}
