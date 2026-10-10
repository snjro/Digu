// A log of the warp sync snapshot (formatVersion 3), of build-snapshot.mjs.
// The tests of the app import it too, so it has the types of svelte-check. See
// README.md.

/**
 * @typedef {object} DecodingContract
 * @property {string} project
 * @property {string} version
 * @property {string} name
 * @property {string} address
 * @property {import("ethers").Interface} iface The Interface of its ABI.
 * @property {Map<string, import("ethers").EventFragment>} events By topic0.
 */

/**
 * The events of an ABI by topic0. Like convertJsonToABI.ts: anonymous events
 * are not synced.
 * @param {import("ethers").Interface} iface
 * @returns {Map<string, import("ethers").EventFragment>}
 */
export function eventsByTopic0(iface) {
  /** @type {Map<string, import("ethers").EventFragment>} */
  const events = new Map();
  iface.forEachEvent((fragment) => {
    if (!fragment.anonymous) events.set(fragment.topicHash, fragment);
  });
  return events;
}

/**
 * A log of the snapshot from a log as the RPC returned it, with the event and
 * its args decoded as the sync decodes them (ethers' EventLog). Throws at a
 * removed log, a log of another address, and a log that cannot be decoded.
 * @param {DecodingContract} contract
 * @param {{ blockNumber: string, transactionHash: string, transactionIndex: string, logIndex: string, address: string, data: string, topics: string[], removed?: boolean }} raw
 * @param {string} blockTimestamp
 */
export function toSnapshotLog(contract, raw, blockTimestamp) {
  if (raw.removed) throw failOf(contract, raw, "a removed log");
  if (raw.address.toLowerCase() !== contract.address.toLowerCase()) {
    throw failOf(contract, raw, `a log of another address ${raw.address}`);
  }
  const fragment = contract.events.get(raw.topics[0]?.toLowerCase());
  let args;
  try {
    if (!fragment) throw new Error("no event of the ABI has its topic0");
    args = toJsonValue(
      contract.iface.decodeEventLog(fragment, raw.data, raw.topics),
    );
  } catch (error) {
    throw failOf(
      contract,
      raw,
      `cannot decode the log of ${fragment?.name ?? `topic0 ${raw.topics[0]}`}`,
      error,
    );
  }
  return {
    blockNumber: raw.blockNumber,
    blockTimestamp,
    transactionHash: raw.transactionHash,
    transactionIndex: raw.transactionIndex,
    logIndex: raw.logIndex,
    event: fragment.name,
    args,
  };
}

/**
 * The error of a log that toSnapshotLog does not take, with the contract and
 * the block of the log. Its text is made only when a log fails: the build
 * and the conversion check millions of logs.
 * @param {DecodingContract} contract
 * @param {{ blockNumber: string, logIndex: string }} raw
 * @param {string} text
 * @param {unknown} [cause]
 */
function failOf(contract, raw, text, cause) {
  return new Error(
    `${contract.project}/${contract.version}/${contract.name}: ${text} at block ${Number(raw.blockNumber)}, log index ${Number(raw.logIndex)}${cause === undefined ? "." : `: ${cause instanceof Error ? cause.message : cause}`}`,
    cause === undefined ? undefined : { cause },
  );
}

/**
 * By position (an input may be named "values"), with integers as decimal
 * strings. Reading a value that ethers could not decode throws.
 * @param {unknown} value
 * @returns {unknown}
 */
function toJsonValue(value) {
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "string" || typeof value === "boolean") return value;
  if (Array.isArray(value)) {
    const values = [];
    for (let i = 0; i < value.length; i++) values.push(toJsonValue(value[i]));
    return values;
  }
  throw new Error(`a value of type ${typeof value}`);
}
