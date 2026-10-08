// The blocks of the current map when it becomes the previous one. The maps
// hold only the blocks with logs. A block is expected to be read right after
// the eth_getLogs answer that has it, while only the answers of the other
// contracts of the chain, which share the provider, can come in between: far
// fewer than 100,000 blocks with logs. A block dropped before it is read is
// read from the DB or the RPC instead, with one more request.
export const MAX_BLOCK_TIMESTAMPS: number = 100000;
// The timestamps by block number, in two maps, so that old blocks are dropped
// without deleting them one by one: at most twice maxSize blocks.
export class BlockTimestamps {
  #current: Map<number, number> = new Map();
  #previous: Map<number, number> = new Map();
  constructor(private readonly maxSize: number = MAX_BLOCK_TIMESTAMPS) {}
  set(blockNumber: number, timestamp: number): void {
    this.#current.set(blockNumber, timestamp);
    if (this.#current.size >= this.maxSize) {
      this.#previous = this.#current;
      this.#current = new Map();
    }
  }
  get(blockNumber: number): number | undefined {
    return this.#current.get(blockNumber) ?? this.#previous.get(blockNumber);
  }
}
