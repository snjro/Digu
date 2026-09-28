# Warp sync snapshot

`build-snapshot.mjs` fetches the event logs of the contracts of a chain and
writes them as a snapshot under `static/warp-sync/<chain>/`. The app imports
the snapshot, so that the logs can be seen without an RPC, and the sync goes
on from the end of the snapshot.

The owner runs it before a release, checks the files, and commits them. The
users of the app do not run it.

## Before a release

Update the snapshot on the day of a release: it reaches the users only with a
release. `release.yml` runs `check-age.py`, which shows, for each chain, the
last chunk of `manifest.json`, when it was made (`createdAt`), its `toBlock`
and its age in days, in the summary of the run. It prints a warning when the
last chunk was not made on the day of the release, by the date in Japan
(Asia/Tokyo), and when it cannot read a manifest. A chain without a snapshot
shows "No snapshot". It only reads the files and never stops the release.

```sh
python3 scripts/warp-sync/check-age.py [--at <ISO time>]   # the default is now
```

## Run

In the repository root, with the `app` service of `compose.yaml`:

```sh
docker compose run --rm app node scripts/warp-sync/build-snapshot.mjs \
  --chain matic --rpc <url> [--to <block>] [--out static/warp-sync] \
  [--max-requests 3000]
```

- `--chain`: the `name` of a chain in `src/constants/chains` (`matic`, `eth`).
- `--rpc`: a JSON-RPC URL of the chain. The script sends its requests there.
- `--to`: the last block of the snapshot. Without it, the latest block minus
  the `confirmationBlocks` of the chain, which is the highest block allowed.
- `--out`: where to write. The default is `static/warp-sync`.
- `--max-requests`: the most requests to send, of all the contracts. The
  script stops before it sends one more. The default is 3000.

When a run stops (at `--max-requests`, or after failures), the logs fetched
so far are in `<chain>/.partial/`, one file per contract (not committed).
Run it again without `--to`: it goes on to the same block, from where it
stopped. The files of the snapshot are written only at the end, and then
`.partial/` is deleted. The block times fetched for the logs without
`blockTimestamp` (`eth_getBlockByNumber`) are not kept in `.partial/`: with
an RPC that does not return `blockTimestamp`, a run that stops while it
fetches them fetches them again the next time.

The first run fetches from the creation block of each contract. A later run
reads `manifest.json` and fetches only the blocks after the last run, into a
new file. It stops when a contract changed its address or creation block,
and when the file of the last block is there already (another run to the
same block would overwrite it).

It fetches like the sync: one `eth_getLogs` per range with the address and
the topic 0 of the events that are not anonymous. The ranges start at
100,000 blocks and are doubled after each one that works, up to 500,000. A
failed range is tried again once, then halved, and the half becomes the
widest range until 10 ranges in a row work; then it is doubled again (like
#549 and #554 in the sync: the RPC may pass each request to another node). The
contracts are fetched at the same time, like the sync: one request at a time
for each contract. The script waits a second after a failure, and stops
after 10 failures in a row of one contract. When one contract stops, the
others stop before their next request.

## Format (formatVersion 1)

`<chain>/manifest.json`:

```jsonc
{
  "formatVersion": 1,
  "chainName": "matic",
  "chainId": 137,
  // The contracts that the snapshot has. The app imports a contract only when
  // its address and creation block are the same as in the app.
  "contracts": [
    {
      "project": "Augur",
      "version": "turbo",
      "name": "AMMFactory",
      "address": "0x…",
      "creationBlock": 15336699,
    },
  ],
  // One per run, in the order of the blocks.
  "chunks": [
    {
      "file": "logs-83000000.json",
      "sha256": "…", // of the file
      "createdAt": "2026-09-28T00:00:00.000Z",
      "latestBlockNumber": 83000128, // the latest block when it was made
      "logCount": 4140,
      "contracts": [
        {
          "project": "Augur",
          "version": "turbo",
          "name": "AMMFactory",
          "fromBlock": 15336699,
          "toBlock": 83000000,
          "logCount": 361,
        },
      ],
    },
  ],
}
```

`<chain>/logs-<toBlock>.json` has the logs of one run, with no spaces:

```jsonc
{
  "formatVersion": 1,
  "chainId": 137,
  "contracts": [
    {
      "project": "Augur",
      "version": "turbo",
      "name": "AMMFactory",
      "address": "0x…",
      "fromBlock": 15336699,
      "toBlock": 83000000,
      // Sorted by blockNumber and logIndex. The fields are as the RPC returned
      // them (hex strings). blockTimestamp comes from the block when the RPC
      // did not return it.
      "logs": [
        {
          "blockNumber": "0x…",
          "blockHash": "0x…",
          "blockTimestamp": "0x…",
          "transactionHash": "0x…",
          "transactionIndex": "0x…",
          "logIndex": "0x…",
          "address": "0x…",
          "data": "0x…",
          "topics": ["0x…"],
        },
      ],
    },
  ],
}
```

A contract in a chunk has all its logs of `fromBlock` to `toBlock`. The
`fromBlock` of a contract is the `toBlock` of its previous chunk + 1, or its
creation block in its first chunk.
