// For the tests of the scripts: the data and topics of a log of the first
// event of a contract of loadChain, encoded with its ABI, and its event and
// args as the snapshot writes them; the logs of the fake RPCs, and the logs
// of the snapshot for them.
import { getAddress } from "ethers";

// A value of the type made from n, and the same value in the JSON of the
// snapshot.
function fakeValue(param, n) {
  if (param.isArray()) {
    const child = fakeValue(param.arrayChildren, n);
    return { value: [child.value], json: [child.json] };
  }
  if (param.isTuple()) {
    const parts = param.components.map((component) => fakeValue(component, n));
    return {
      value: parts.map((part) => part.value),
      json: parts.map((part) => part.json),
    };
  }
  const { baseType } = param;
  if (baseType === "address") {
    const address = getAddress(`0x${n.toString(16).padStart(40, "0")}`);
    return { value: address, json: address };
  }
  if (/^u?int\d*$/.test(baseType)) return { value: BigInt(n), json: String(n) };
  if (baseType === "bool") return { value: n % 2 === 0, json: n % 2 === 0 };
  if (baseType === "string") return { value: `s${n}`, json: `s${n}` };
  const size = Number(baseType.match(/^bytes(\d+)$/)?.[1] ?? 1);
  const bytes = `0x${n
    .toString(16)
    .padStart(size * 2, "0")
    .slice(-size * 2)}`;
  return { value: bytes, json: bytes };
}

// Encoded once for each contract and n: the fake RPCs ask the same logs again
// and again, and encoding all of them each time made the tests slow.
const cache = new Map();
export function fakeEventLog(contract, n) {
  const key = `${contract.project}/${contract.version}/${contract.name}/${n}`;
  if (!cache.has(key)) cache.set(key, encode(contract, n));
  return cache.get(key);
}
function encode(contract, n) {
  const [topic0] = contract.topics;
  const fragment = contract.events.get(topic0);
  const parts = fragment.inputs.map((input) => fakeValue(input, n));
  const { data, topics } = contract.iface.encodeEventLog(
    fragment,
    parts.map((part) => part.value),
  );
  return {
    data,
    topics,
    event: fragment.name,
    args: parts.map((part) => part.json),
  };
}

const toHex = (value) => `0x${value.toString(16)}`;

// The log of contract at index in block, as the fake RPCs return it. Its
// transactionHash is the n of its fakeEventLog: block * 10 + index.
export function fakeRpcLog(contract, block, index) {
  const n = block * 10 + index;
  const { data, topics } = fakeEventLog(contract, n);
  return {
    blockNumber: toHex(block),
    blockHash: `0x${block.toString(16).padStart(64, "0")}`,
    blockTimestamp: toHex(block * 2),
    transactionHash: `0x${n.toString(16).padStart(64, "0")}`,
    transactionIndex: "0x0",
    logIndex: toHex(index),
    address: contract.address.toLowerCase(),
    data,
    topics,
    removed: false,
  };
}

// The log that the snapshot should have for a log of fakeRpcLog. Made by hand,
// not with toSnapshotLog, so that the tests check it.
export function expectedSnapshotLog(
  contract,
  { blockNumber, blockTimestamp, transactionHash, transactionIndex, logIndex },
) {
  const { event, args } = fakeEventLog(contract, Number(transactionHash));
  return {
    blockNumber,
    blockTimestamp,
    transactionHash,
    transactionIndex,
    logIndex,
    event,
    args,
  };
}
