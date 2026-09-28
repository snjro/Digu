// A fake Ethereum JSON-RPC (chainId 1) for the sync check. Pure: handle(body)
// returns the JSON-RPC response. Logs are encoded with ethers from the real
// ABI in src/constants, at fixed blocks relative to the creation block.
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(path.join(process.cwd(), "package.json"));
const { Interface, id: keccakId, getAddress } = require("ethers");

const CHAINS_DIR = "/app/src/constants/chains/ethereum-mainnet/augur";

// #498: the sync stops confirmationBlocks (eth 96) below the latest block.
// Read from the build's source, so that the Goal is where the latest block
// was before #498.
export const CONFIRMATION_BLOCKS = Number(
  fs
    .readFileSync(
      "/app/src/constants/chains/ethereum-mainnet/_index.ts",
      "utf8",
    )
    .match(/confirmationBlocks:\s*(\d+)/)[1],
);

// [version, contract, event, offsets from the creation block]
const PLAN = [
  ["version1", "Augur", "MarketCreated", [5, 50, 50, 150, 230]],
  ["version1", "Augur", "UniverseCreated", [5, 120]],
  ["version2", "REPv2", "Transfer", [3, 100]],
  ["version2", "REPv2", "Approval", [60]],
];

export const contracts = {}; // lower-case address -> {version, name, abi, creation, iface}
for (const version of ["version1", "version2"]) {
  for (const f of fs.readdirSync(path.join(CHAINS_DIR, version))) {
    if (!f.endsWith(".json")) continue;
    const d = JSON.parse(
      fs.readFileSync(path.join(CHAINS_DIR, version, f), "utf8"),
    );
    if (!d.abi || !d.address) continue;
    contracts[d.address.toLowerCase()] = {
      version,
      name: f.slice(0, -5),
      address: d.address,
      creation: d.creation.blockNumber,
      iface: new Interface(d.abi),
    };
  }
}
const byName = (version, name) =>
  Object.values(contracts).find(
    (c) => c.version === version && c.name === name,
  );

const hex = (seed, len) => "0x" + keccakId(seed).slice(2, 2 + len * 2);
const q = (n) => "0x" + BigInt(n).toString(16);

function gen(t, name, seed, i) {
  if (t.endsWith("[]"))
    return [0, 1].map((k) => gen(t.slice(0, -2), name, `${seed}_${k}`, i));
  if (t === "address") return getAddress(hex(`a${seed}`, 20));
  if (t === "string") return `Fake ${name} #${i}`;
  if (t.startsWith("bytes")) return hex(`b${seed}`, Number(t.slice(5)) || 32);
  if (t === "bool") return i % 2 === 0;
  if (t === "uint8") return BigInt(i % 3);
  if (t.startsWith("uint")) return BigInt(i) * 10n ** 18n + 1234n;
  if (t.startsWith("int")) return BigInt(i % 2 ? -1 : 1) * 10n ** 18n;
  throw new Error("type " + t);
}

// All logs, generated once. key: address|topic0 -> [log]
export const allLogs = {};
export const expected = []; // for the report
for (const [version, cname, ename, offsets] of PLAN) {
  const c = byName(version, cname);
  const ev = c.iface.getEvent(ename);
  offsets.forEach((off, i) => {
    const blockNumber = c.creation + off;
    const seed = `${cname}-${ename}-${i}`;
    const values = ev.inputs.map((p, j) =>
      gen(p.type, p.name, `${seed}-${j}`, i),
    );
    const { data, topics } = c.iface.encodeEventLog(ev, values);
    const log = {
      address: c.address.toLowerCase(),
      blockHash: blockHash(blockNumber),
      blockNumber: q(blockNumber),
      data,
      logIndex: q(i),
      removed: false,
      topics,
      transactionHash: hex(`tx-${seed}`, 32),
      transactionIndex: q(i % 7),
    };
    const key = `${c.address.toLowerCase()}|${topics[0]}`;
    (allLogs[key] ??= []).push(log);
    expected.push({
      version,
      contract: cname,
      event: ename,
      blockNumber,
      logIndex: i,
      transactionHash: log.transactionHash,
      args: values.map((v) => (typeof v === "bigint" ? v.toString() : v)),
    });
  });
}

export function blockHash(n) {
  return hex(`block-${n}`, 32);
}
export function timestampOf(n) {
  // Around 2018-07 for v1; linear, 15 s per block.
  return 1531036621 + (n - 5926229) * 15;
}

export function makeState(over = {}) {
  return {
    latest: 5926229 + 250 + CONFIRMATION_BLOCKS,
    // "ok" | "errorGetLogs*" | "errorOnce" (first eth_getLogs only) | "errorAll" (all but eth_chainId)
    // | "nullBlock" (eth_getBlockByNumber returns null, #519/#520)
    mode: "ok",
    calls: [], // {t, method, params}
    ...over,
  };
}

function block(n) {
  return {
    hash: blockHash(n),
    parentHash: blockHash(n - 1),
    number: q(n),
    timestamp: q(timestampOf(n)),
    nonce: "0x0000000000000000",
    difficulty: "0x0",
    gasLimit: "0x7a1200",
    gasUsed: "0x0",
    miner: "0x0000000000000000000000000000000000000000",
    extraData: "0x",
    baseFeePerGas: null,
    stateRoot: hex(`sr-${n}`, 32),
    receiptsRoot: hex(`rr-${n}`, 32),
    transactionsRoot: hex(`tr-${n}`, 32),
    transactions: [],
  };
}

function one(state, p) {
  state.calls.push({ t: Date.now(), method: p.method, params: p.params });
  const err = (message) => ({
    jsonrpc: "2.0",
    id: p.id,
    error: { code: -32000, message },
  });
  if (p.method !== "eth_chainId" && state.mode === "errorAll") {
    return err("fake error (errorAll)");
  }
  switch (p.method) {
    case "eth_chainId":
      return { jsonrpc: "2.0", id: p.id, result: "0x1" };
    case "net_version":
      return { jsonrpc: "2.0", id: p.id, result: "1" };
    case "eth_blockNumber":
      return { jsonrpc: "2.0", id: p.id, result: q(state.latest) };
    case "eth_getBlockByNumber": {
      if (state.mode === "nullBlock")
        return { jsonrpc: "2.0", id: p.id, result: null };
      const n = Number(BigInt(p.params[0]));
      if (n > state.latest) return { jsonrpc: "2.0", id: p.id, result: null };
      return { jsonrpc: "2.0", id: p.id, result: block(n) };
    }
    case "eth_getLogs": {
      if (state.mode.startsWith("errorGetLogs"))
        return err("fake error (errorGetLogs)");
      if (state.mode === "errorOnce" && !state.erroredOnce) {
        state.erroredOnce = true;
        return err("fake error (errorOnce)");
      }
      const f = p.params[0];
      const from = Number(BigInt(f.fromBlock));
      const to = Number(BigInt(f.toBlock));
      const t0 = Array.isArray(f.topics?.[0]) ? f.topics[0] : [f.topics?.[0]];
      const addrs = Array.isArray(f.address) ? f.address : [f.address];
      const out = [];
      for (const a of addrs) {
        for (const t of t0) {
          for (const log of allLogs[`${String(a).toLowerCase()}|${t}`] ?? []) {
            const b = Number(BigInt(log.blockNumber));
            if (b >= from && b <= to && b <= state.latest) out.push(log);
          }
        }
      }
      return { jsonrpc: "2.0", id: p.id, result: out };
    }
    default:
      return err(`fake: method not supported: ${p.method}`);
  }
}

export function handle(state, body) {
  if (Array.isArray(body)) return body.map((p) => one(state, p));
  return one(state, body);
}

// Topic hash -> "Contract.Event" for the report.
export function describeTopic(address, topic) {
  const c = contracts[String(address).toLowerCase()];
  if (!c) return `${address}:${topic}`;
  try {
    return `${c.version}.${c.name}.${c.iface.getEvent(topic).name}`;
  } catch {
    return `${c.version}.${c.name}.?${topic.slice(0, 10)}`;
  }
}
