// Builds the warp sync snapshot of a chain: the raw event logs of its
// contracts, fetched with eth_getLogs under the same conditions as the sync.
// Run it again to add the logs after the last snapshot. See README.md.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { Interface } from "ethers";

export const FORMAT_VERSION = 1;
const CHAINS_DIR = "src/constants/chains";
// The widths of the eth_getLogs ranges, in blocks.
const FIRST_WIDTH = 100_000;
const MAX_WIDTH = 1_000_000;
// Failures in a row before the script gives up.
const MAX_FAILURES = 10;

// ---------- the constants of the app ----------

function read(file) {
  return fs.readFileSync(file, "utf8");
}
function match(text, regex, what) {
  const found = text.match(regex);
  if (!found) throw new Error(`Cannot find ${what}.`);
  return found[1];
}
function matchAll(text, regex) {
  return [...text.matchAll(regex)].map((found) => found[1]);
}

// Reads the chain like fake-rpc.mjs of screen-check: from the _index.ts files
// and the JSON files they import.
export function loadChain(chainName, chainsDir = CHAINS_DIR) {
  const chainDirs = matchAll(
    read(path.join(chainsDir, "_index.ts")),
    /import \{ chain as \w+ \} from "\.\/([^"]+)\/_index";/g,
  );
  for (const chainDir of chainDirs) {
    const dir = path.join(chainsDir, chainDir);
    const index = read(path.join(dir, "_index.ts"));
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
  for (const projectDir of matchAll(
    chainIndex,
    /import \{ project as \w+ \} from "\.\/([^"]+)\/_index";/g,
  )) {
    const dir = path.join(chainDir, projectDir);
    const index = read(path.join(dir, "_index.ts"));
    const project = match(
      index,
      /export const project: Project = \{\s*name: "([^"]+)"/,
      `the name of ${dir}`,
    );
    for (const versionDir of matchAll(
      index,
      /import \{ version as \w+ \} from "\.\/([^"]+)\/_index";/g,
    )) {
      const vDir = path.join(dir, versionDir);
      const vIndex = read(path.join(vDir, "_index.ts"));
      const version = match(
        vIndex,
        /export const version: Version = \{\s*name: "([^"]+)"/,
        `the name of ${vDir}`,
      );
      for (const file of matchAll(
        vIndex,
        /import \w+ from "\.\/([^"]+\.json)";/g,
      )) {
        const json = JSON.parse(read(path.join(vDir, file)));
        // Like convertJsonToABI.ts: anonymous events are not synced.
        const iface = new Interface(json.abi);
        const topics = [];
        iface.forEachEvent((fragment) => {
          if (!fragment.anonymous) topics.push(fragment.topicHash);
        });
        if (topics.length === 0) continue;
        contracts.push({
          project,
          version,
          name: json.name,
          address: json.address,
          creationBlock: json.creation.blockNumber,
          topics,
        });
      }
    }
  }
  return contracts;
}

// ---------- JSON-RPC ----------

export function createRpc(url) {
  let id = 0;
  return async function rpc(method, params = []) {
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: ++id, method, params }),
    });
    if (!response.ok) {
      throw new Error(`${method}: HTTP ${response.status}`);
    }
    const body = await response.json();
    if (body.error) {
      throw new Error(`${method}: ${JSON.stringify(body.error)}`);
    }
    return body.result;
  };
}
const toHex = (value) => `0x${value.toString(16)}`;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Fetches the logs of [fromBlock, toBlock] in ranges. Like the sync (#554),
// a failed range is tried again once, then halved, and the half becomes the
// widest range. A range that works doubles the next one.
export async function fetchLogs(rpc, contract, fromBlock, toBlock, log) {
  const logs = [];
  let width = FIRST_WIDTH;
  let maxWidth = MAX_WIDTH;
  let from = fromBlock;
  let failures = 0;
  while (from <= toBlock) {
    const to = Math.min(from + width - 1, toBlock);
    try {
      const result = await rpc("eth_getLogs", [
        {
          address: contract.address,
          topics: [contract.topics],
          fromBlock: toHex(from),
          toBlock: toHex(to),
        },
      ]);
      logs.push(...result);
      log(`${contract.name}: ${from}-${to} ${result.length} logs`);
      from = to + 1;
      failures = 0;
      width = Math.min(width * 2, maxWidth);
    } catch (error) {
      failures++;
      log(`${contract.name}: ${from}-${to} failed: ${error.message}`);
      if (failures >= MAX_FAILURES) throw error;
      if (failures >= 2) {
        width = Math.max(1, Math.floor(width / 2));
        maxWidth = width;
      }
      await sleep(1000);
    }
  }
  return logs;
}

// Keeps the fields that the app reads, as the RPC returned them. A log
// without blockTimestamp gets it from its block.
export async function toSnapshotLogs(rpc, contract, rawLogs) {
  const timestamps = new Map();
  const logs = [];
  for (const raw of rawLogs) {
    if (raw.removed) throw new Error(`A removed log: ${JSON.stringify(raw)}`);
    if (raw.address.toLowerCase() !== contract.address.toLowerCase()) {
      throw new Error(`A log of another address: ${raw.address}`);
    }
    let blockTimestamp = raw.blockTimestamp;
    if (!blockTimestamp) {
      if (!timestamps.has(raw.blockNumber)) {
        const block = await rpc("eth_getBlockByNumber", [
          raw.blockNumber,
          false,
        ]);
        timestamps.set(raw.blockNumber, block.timestamp);
      }
      blockTimestamp = timestamps.get(raw.blockNumber);
    }
    logs.push({
      blockNumber: raw.blockNumber,
      blockHash: raw.blockHash,
      blockTimestamp,
      transactionHash: raw.transactionHash,
      transactionIndex: raw.transactionIndex,
      logIndex: raw.logIndex,
      address: raw.address,
      data: raw.data,
      topics: raw.topics,
    });
  }
  return logs.sort(
    (a, b) =>
      Number(a.blockNumber) - Number(b.blockNumber) ||
      Number(a.logIndex) - Number(b.logIndex),
  );
}

// ---------- the snapshot ----------

const keyOf = (contract) =>
  `${contract.project}/${contract.version}/${contract.name}`;

function readManifest(file, chain) {
  if (!fs.existsSync(file)) {
    return {
      formatVersion: FORMAT_VERSION,
      chainName: chain.name,
      chainId: chain.chainId,
      contracts: [],
      chunks: [],
    };
  }
  const manifest = JSON.parse(read(file));
  if (manifest.formatVersion !== FORMAT_VERSION) {
    throw new Error(`${file} has formatVersion ${manifest.formatVersion}.`);
  }
  if (manifest.chainId !== chain.chainId) {
    throw new Error(`${file} is for chainId ${manifest.chainId}.`);
  }
  return manifest;
}

// The last block in the snapshot for each contract.
function lastBlocks(manifest) {
  const last = new Map();
  for (const chunk of manifest.chunks) {
    for (const contract of chunk.contracts) {
      last.set(keyOf(contract), contract.toBlock);
    }
  }
  return last;
}

export async function buildSnapshot({
  chainName,
  rpcUrl,
  outDir,
  toBlock,
  log,
}) {
  const chain = loadChain(chainName);
  const rpc = createRpc(rpcUrl);
  const chainId = Number(await rpc("eth_chainId"));
  if (chainId !== chain.chainId) {
    throw new Error(`The RPC is for chainId ${chainId}, not ${chain.chainId}.`);
  }
  const latest = Number(await rpc("eth_blockNumber"));
  const goal = latest - chain.confirmationBlocks;
  const end = toBlock ?? goal;
  if (end > goal) {
    throw new Error(
      `--to ${end} is above latest - confirmationBlocks (${goal}).`,
    );
  }

  const dir = path.join(outDir, chain.name);
  const manifestFile = path.join(dir, "manifest.json");
  const manifest = readManifest(manifestFile, chain);
  const known = new Map(manifest.contracts.map((c) => [keyOf(c), c]));
  for (const contract of chain.contracts) {
    const before = known.get(keyOf(contract));
    if (
      before &&
      (before.address.toLowerCase() !== contract.address.toLowerCase() ||
        before.creationBlock !== contract.creationBlock)
    ) {
      throw new Error(
        `${keyOf(contract)} changed its address or creation block.`,
      );
    }
  }
  const last = lastBlocks(manifest);

  const chunkContracts = [];
  for (const contract of chain.contracts) {
    const lastBlock = last.get(keyOf(contract));
    const from =
      lastBlock === undefined ? contract.creationBlock : lastBlock + 1;
    if (from > end) continue;
    const rawLogs = await fetchLogs(rpc, contract, from, end, log);
    chunkContracts.push({
      project: contract.project,
      version: contract.version,
      name: contract.name,
      address: contract.address,
      fromBlock: from,
      toBlock: end,
      logs: await toSnapshotLogs(rpc, contract, rawLogs),
    });
  }
  if (chunkContracts.length === 0) {
    log(`Nothing to add: the snapshot already reaches block ${end}.`);
    return undefined;
  }

  const file = `logs-${end}.json`;
  const text = JSON.stringify({
    formatVersion: FORMAT_VERSION,
    chainId: chain.chainId,
    contracts: chunkContracts,
  });
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, file), text);

  for (const contract of chain.contracts) {
    known.set(keyOf(contract), {
      project: contract.project,
      version: contract.version,
      name: contract.name,
      address: contract.address,
      creationBlock: contract.creationBlock,
    });
  }
  manifest.contracts = [...known.values()];
  manifest.chunks.push({
    file,
    sha256: crypto.createHash("sha256").update(text).digest("hex"),
    createdAt: new Date().toISOString(),
    latestBlockNumber: latest,
    logCount: chunkContracts.reduce((sum, c) => sum + c.logs.length, 0),
    contracts: chunkContracts.map((c) => ({
      project: c.project,
      version: c.version,
      name: c.name,
      fromBlock: c.fromBlock,
      toBlock: c.toBlock,
      logCount: c.logs.length,
    })),
  });
  fs.writeFileSync(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`);
  log(`Wrote ${path.join(dir, file)} and ${manifestFile}.`);
  return manifest;
}

// ---------- command line ----------

if (import.meta.url === `file://${process.argv[1]}`) {
  const { values } = parseArgs({
    options: {
      chain: { type: "string" },
      rpc: { type: "string" },
      out: { type: "string", default: "static/warp-sync" },
      to: { type: "string" },
    },
  });
  if (!values.chain || !values.rpc) {
    console.error(
      "Usage: node scripts/warp-sync/build-snapshot.mjs --chain <name> --rpc <url> [--to <block>] [--out <dir>]",
    );
    process.exit(2);
  }
  await buildSnapshot({
    chainName: values.chain,
    rpcUrl: values.rpc,
    outDir: values.out,
    toBlock: values.to === undefined ? undefined : Number(values.to),
    log: (message) => console.log(message),
  });
}
