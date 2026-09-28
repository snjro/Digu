# Warp sync snapshot

`build-snapshot.mjs` fetches the event logs of the contracts of a chain and
writes them as a snapshot under `static/warp-sync/<chain>/`. The app imports
the snapshot, so that the logs can be seen without an RPC, and the sync goes
on from the end of the snapshot.

The owner runs it before a release, checks the files, and commits them. The
users of the app do not run it.

## Before a release

Update the snapshot on the day of a release: it reaches the users only with a
release. `release.yml` runs `check-snapshot.py` before it deploys. It shows,
for each chain, the last run of `manifest.json` (the last chunk in
formatVersion 1), when it was made (`createdAt`), its `toBlock` and its age in
days, in the summary of the run. It stops the release when the last run was
not made on the day of the release, by the date in UTC, and when it cannot
read a manifest. A chain without a snapshot is not checked.

```sh
python3 scripts/warp-sync/check-snapshot.py [--at <ISO time>]   # the default is now
```

When the snapshot cannot be made on that day (for example, the RPC is down)
or a release does not change the data (an urgent fix), turn the check into a
warning for that release only:

```sh
gh variable set WARP_SYNC_SNAPSHOT_CHECK --body off -R snjro/Digu
gh workflow run release.yml --ref <tag> -R snjro/Digu   # a new run reads the variable
gh variable delete WARP_SYNC_SNAPSHOT_CHECK -R snjro/Digu   # after the release
```

## Run

In the repository root, with the `app` service of `compose.yaml`:

```sh
docker compose run --rm app node scripts/warp-sync/build-snapshot.mjs \
  --chain matic --rpc <url> [--to <block>] [--out static/warp-sync] \
  [--max-requests 3000] [--segments 4]
```

- `--chain`: the `name` of a chain in `src/constants/chains` (`matic`, `eth`).
- `--rpc`: a JSON-RPC URL of the chain. The script sends its requests there.
- `--to`: the last block of the snapshot. Without it, the latest block minus
  the `confirmationBlocks` of the chain, which is the highest block allowed.
- `--out`: where to write. The default is `static/warp-sync`.
- `--max-requests`: the most requests to send, of all the contracts. The
  script stops before it sends one more. The default is 3000.
- `--segments`: the number of segments that the blocks of each contract are
  split into, fetched at the same time. The default is 4. A segment has at
  least 500,000 blocks, so a short range is split into fewer.

When a run stops (at `--max-requests`, or after failures), the logs fetched
so far are in `<chain>/.partial/` (not committed): for each segment, a
`.jsonl` file to which the logs of each range are added, one log per line,
and a `.state.json` file with the next block to fetch. Run it again without
`--to`, with the same `--segments`: it goes on to the same block, from where
each segment stopped, and drops the lines of the blocks that the state does
not count yet (such as a line half written when it stopped). A `.partial/`
of the script before formatVersion 2 stops it: delete the folder and run it
again. The logs are not all kept in memory, so a chain with millions of logs
fits.

The files of the snapshot are written only at the end, one contract at a
time, and then `.partial/` is deleted. The block times fetched for the logs
without `blockTimestamp` (`eth_getBlockByNumber`) are not kept in
`.partial/`: with an RPC that does not return `blockTimestamp`, a run that
stops while it fetches them fetches them again the next time.

The first run fetches from the creation block of each contract. A later run
reads `manifest.json` and fetches only the blocks after the last run, into
new files. It stops when a contract changed its address or creation block,
and when a file that it would write is there already (another run to the
same block would overwrite it). A run that stopped after it moved its files
next to the manifest and before it wrote the manifest leaves files that the
manifest does not list, and the next run stops at them: delete the files that
are not in `manifest.json` (`git status` shows them), and run it again.

A snapshot of formatVersion 1 is converted once, without sending anything,
before the first run of this script on it:

```sh
docker compose run --rm app node scripts/warp-sync/convert-snapshot.mjs \
  --chain matic [--out static/warp-sync]
```

It checks the `sha256` of each file of formatVersion 1, writes the same logs
into the files of formatVersion 2 (one run of formatVersion 1 becomes one
run), writes `manifest.json` and deletes the files of formatVersion 1. It
stops when a contract of a file is not in the contracts of the manifest. If it
stops after it moved the new files, delete them (`git status`) and run it
again.

It fetches like the sync: one `eth_getLogs` per range with the address and
the topic 0 of the events that are not anonymous. The ranges start at
100,000 blocks and are doubled after each one that works, up to 500,000. A
failed range is tried again once, then halved, and the half becomes the
widest range until 10 ranges in a row work; then it is doubled again (like
#549 and #554 in the sync: the RPC may pass each request to another node). The
contracts are fetched at the same time, like the sync, and the blocks of each
contract in `--segments` segments at the same time: one request at a time for
each segment (6 contracts × 4 segments = 24 at a time). Each segment has its
own widths. The script waits a second after a failure, and stops after 10
failures in a row of one segment. When one segment stops, the others stop
before their next request. The logs of each range are sorted by block and
log index, and the segments of a contract are read in the order of the blocks.

## Format (formatVersion 2)

`<chain>/manifest.json`:

```jsonc
{
  "formatVersion": 2,
  "chainName": "eth",
  "chainId": 1,
  // The contracts that the snapshot has. The app imports a contract only when
  // its address and creation block are the same as in the app.
  "contracts": [
    {
      "project": "Augur",
      "version": "version2",
      "name": "Augur",
      "address": "0x…",
      "creationBlock": 10543755,
    },
  ],
  // One per run. check-snapshot.py reads the last one.
  "runs": [
    {
      "createdAt": "2026-10-01T00:00:00.000Z",
      "latestBlockNumber": 26074024, // the latest block when it was made
      "toBlock": 26073960,
      "logCount": 2328259, // the logs added by the run
      // By method, of the invocation that finished the run (not those that
      // stopped before it). Not in a run converted from formatVersion 1.
      "requests": { "eth_getLogs": 21000 },
    },
  ],
  // One per file, and one per range without logs (no file). A run adds its
  // rows after those of the runs before it; for each contract, the rows are
  // in the order of the blocks.
  "chunks": [
    {
      "project": "Augur",
      "version": "version2",
      "name": "Augur",
      "fromBlock": 10543755,
      "toBlock": 10890000,
      "logCount": 20000,
      "file": "Augur-version2-Augur-10890000.json.gz", // null without logs
      "bytes": 1712345, // of the gzip file
      "rawBytes": 15600000, // of its JSON
      "sha256": "…", // of the gzip file
      "rawSha256": "…", // of its JSON
    },
  ],
  // The sums of the chunks.
  "totals": { "logCount": 2328259, "bytes": 194000000, "rawBytes": 1816000000 },
}
```

`<chain>/<project>-<version>-<name>-<toBlock>.json.gz` has the logs of one
contract from `fromBlock` to `toBlock`: at most 20,000 logs, cut between
blocks (a block with more logs is in one file). It is gzip of JSON with no
spaces:

```jsonc
{
  "formatVersion": 2,
  "chainId": 1,
  "project": "Augur",
  "version": "version2",
  "name": "Augur",
  "address": "0x…",
  "fromBlock": 10543755,
  "toBlock": 10890000,
  // Sorted by blockNumber and logIndex. The fields are as the RPC returned
  // them (hex strings). blockTimestamp comes from the block when the RPC did
  // not return it.
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
}
```

A row has all the logs of its contract from `fromBlock` to `toBlock`. The
`fromBlock` of a row is the `toBlock` of the row before it of the same
contract + 1, or the creation block in the first row.

## Format (formatVersion 1)

The app until formatVersion 2 reads this format, and `check-snapshot.py`
still reads it. A manifest has one chunk for each run, with `file`,
`sha256` (of the file), `createdAt`, `latestBlockNumber`, `logCount` and
the range and `logCount` of each contract. `logs-<toBlock>.json` has the logs
of all the contracts of one run, in one JSON file:
`{ "formatVersion": 1, "chainId", "contracts": [{ "project", "version",
"name", "address", "fromBlock", "toBlock", "logs" }] }`.
`convert-snapshot.mjs` converts it to formatVersion 2.
