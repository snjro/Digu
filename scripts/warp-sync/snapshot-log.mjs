// A log of the warp sync snapshot (formatVersion 3), shared by
// build-snapshot.mjs and convert-snapshot.mjs. The tests of the app import it
// too, so it has the types of svelte-check. See README.md.

/**
 * @typedef {object} DecodingContract
 * @property {string} project
 * @property {string} version
 * @property {string} name
 * @property {import("ethers").Interface} iface The Interface of its ABI.
 * @property {Map<string, import("ethers").EventFragment>} events By topic0.
 */

/**
 * A log of the snapshot from a log as the RPC returned it, with the event and
 * its args decoded as the sync decodes them (ethers' EventLog). Throws at a
 * log that cannot be decoded.
 * @param {DecodingContract} contract
 * @param {{ blockNumber: string, transactionHash: string, transactionIndex: string, logIndex: string, data: string, topics: string[] }} raw
 * @param {string} blockTimestamp
 */
export function toSnapshotLog(contract, raw, blockTimestamp) {
  const fragment = contract.events.get(raw.topics[0]?.toLowerCase());
  let args;
  try {
    if (!fragment) throw new Error("no event of the ABI has its topic0");
    args = toJsonValue(
      contract.iface.decodeEventLog(fragment, raw.data, raw.topics),
    );
  } catch (error) {
    throw new Error(
      `${contract.project}/${contract.version}/${contract.name}: cannot decode the log of ${fragment?.name ?? `topic0 ${raw.topics[0]}`} at block ${Number(raw.blockNumber)}, log index ${Number(raw.logIndex)}: ${error instanceof Error ? error.message : error}`,
      { cause: error },
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
