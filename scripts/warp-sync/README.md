# Warp sync snapshot

`build-snapshot.mjs` fetches the event logs of the contracts of a chain,
decodes them with the ABIs of the contracts, and writes them as a snapshot
under `static/warp-sync/<chain>/`. The app imports
the snapshot, so that the logs can be seen without an RPC, and the sync goes
on from the end of the snapshot.

The owner runs it before a release, checks the files, and commits them. The
users of the app do not run it.

It uses `chains.mjs` (reads the chain from `src/constants/chains`),
`rpc.mjs` (the requests, the kinds of their errors, and the waits after
them), `fetch-logs.mjs` (the ranges of `eth_getLogs`), `partial.mjs`
(`.partial/`), and `snapshot-format.mjs` and `snapshot-log.mjs` (the files of
the snapshot). The values that the app reads too (the format version, the
chains with a snapshot, the key of a contract, and the folder under
`static/`) are in `src/warpSync/warpSyncShared.mjs`, which both import.

## The snapshots

- `matic`: made by this script with the public RPC of pocket.
- `eth`: its first run (2,640,510 logs of 16 contracts to block 26,075,462)
  was not made by this script: pocket dropped logs (#576), so the logs were
  fetched from Infura with all the contracts in one `eth_getLogs` for each
  range of 10,000 blocks (2,293 requests, the `requests` of the run), and
  written with `writeContractChunks` of `snapshot-format.mjs`. They were
  checked against two runs of this script with pocket (every log of both is in
  the snapshot, with the same fields) and the sample of 539 ranges of the
  estimate (the same counts). Later runs are made by this script. The logs and
  bytes it has now are the `totals` of `eth/manifest.json`, and its last block
  is the `toBlock` of the last run there.

## Before a release

Update the snapshot on the day of a release: it reaches the users only with a
release. `release.yml` runs `check-snapshot.py` before it deploys. It shows,
for each chain, the last run of `manifest.json`, when it was made
(`createdAt`), its `toBlock` and its age in days, in the summary of the run.
It stops the release when the last run was not made on the day of the
release, by the date in UTC, and when it cannot
read a manifest or finds no chain. A chain without a snapshot is not checked.

`check-files.mjs` (a step of `test.yml`, apart from vitest) checks the files
of each chain of `WARP_SYNC_CHAIN_NAMES` against its `manifest.json` on every
PR and in the release: sizes, sha256, the content of each file (format, chain, contract,
address, range, number of logs, every log in the range, and the logs in
the range in the order of their blocks and log indexes), the ranges of
each contract without gaps and not ending at its creation block, `totals`,
and no file outside the manifest. It also checks the contracts of the
manifest against those with events in `src/constants/chains` (the same
contracts, addresses and creation blocks), and that no other folder has a
`manifest.json`. So a contract with events added to the app needs a run of
`build-snapshot.mjs` for its chain before its pull request passes. A contract with events
removed from the app, or with another address or creation block, fails the
check too, and a run cannot fix all of these yet (#761): the script keeps a
removed contract and stops at a changed one. A run that has some range to
fetch adds every contract of the chain to `manifest.contracts`, also one
created after its end. A run with no range to fetch ends at "Nothing to add"
and does not change the manifest, so it cannot add a missing contract
(#761).
`WARP_SYNC_SNAPSHOT_CHECK=off` does not turn this check off.

```sh
docker compose run --rm app node scripts/warp-sync/check-files.mjs
python3 scripts/warp-sync/check-snapshot.py [--at <ISO time>]   # the default is now
```

Tests of `check-snapshot.py` (`test.yml` runs them on every PR):

```sh
python3 -B -m unittest discover -s scripts/warp-sync -p "*_test.py"
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
  --chain matic --rpc <url> [--rpc-key-file <path>] [--to <block>] \
  [--out static/warp-sync] \
  [--max-requests 3000] [--concurrency 24] [--part-blocks 500000] \
  [--max-width <blocks>]
```

The numbers (`--to`, `--max-requests`, `--concurrency`, `--part-blocks`,
`--max-width`) are positive integers in decimal digits only, such as
`26100000` (not `26,100,000`, `0x18e4120` or `2.61e7`).

- `--chain`: the `name` of a chain in `src/constants/chains` (`matic`, `eth`).
- `--rpc`: a JSON-RPC URL of the chain. The script sends its requests there.
- `--rpc-key-file`: a file with the key of the RPC, which is added to the end
  of `--rpc`, so that the key is not in the command line. With it, `--rpc`
  must be an http(s) URL without a user name or password that ends with `/` or
  `=`, so that the key goes at the end of its path or query (for example
  `https://mainnet.infura.io/v3/` or `https://host/?apikey=`).
- `--to`: the last block of the snapshot. Without it, the latest block minus
  the `confirmationBlocks` of the chain, which is the highest block allowed.
- `--out`: where to write. The default is `static/warp-sync`.
- `--max-requests`: the most requests to send, of all the contracts. The
  script stops before it sends one more. The default is 3000.
- `--concurrency`: the requests sent at the same time. The default is 24.
- `--part-blocks`: the blocks of each contract are split into parts of this
  many blocks, which wait in a queue. The default is 500,000.
- `--max-width`: the widest range of one request. The default is 9,999 for
  `eth` and 500,000 for the others.

### Which RPC

Use an RPC with a key for Ethereum. The public RPC of pocket (no key) returned
no logs, without an error, for ranges that have logs, even three times in a
row (#576): two runs for Ethereum on 2026-09-28 each missed thousands of logs,
not the same ones. The first snapshot of Ethereum was made from Infura (free
plan: 3 million credits a day, 255 for each `eth_getLogs`, at most 10,000
blocks and 10,000 logs for one request), whose logs included every log of the
two runs. Blockscout was not a check either: its API returned some logs twice
with another `logIndex`.

With Infura, give the key file to the container, read only, and send one
request at a time (`--concurrency 1`). The free plan allows about one
`eth_getLogs` a second, and `--concurrency` limits only the requests sent at
the same time, not the requests of a second: a request over the limit gets
HTTP 429 and is sent again after a wait (**Failures** below):

```sh
docker compose run --rm -v <key file>:/run/secrets/rpc-key:ro \
  app node scripts/warp-sync/build-snapshot.mjs --chain eth \
  --rpc https://mainnet.infura.io/v3/ --rpc-key-file /run/secrets/rpc-key \
  --concurrency 1
```

A run for a release adds only the blocks after the last run, so it needs few
requests. A run of a whole chain asks each contract for its blocks from its
creation block, in ranges that start at 100,000 blocks (or `--max-width`, if
narrower) and widen up to `--max-width` (**Widths** below). It may need more
than the credits of a day.

When a run stops (at `--max-requests`, or after failures), the logs fetched
so far are in `<chain>/.partial/` (not committed): for each part, a
`.jsonl` file to which the logs of each range are added, one log per line,
and a `.state.json` file with the next block to fetch. Run it again without
`--to`, with the same `--part-blocks`: it goes on to the same block, from
where each part stopped, and drops the lines of the blocks that the state does
not count yet (such as a line half written when it stopped). The lines are
the logs as the RPC returned them; they are decoded when the files are
written. The logs are not all kept in memory, so a chain with millions of
logs fits.

The files of the snapshot are written only at the end, one contract at a
time, and then `.partial/` is deleted. The block times fetched for the logs
without `blockTimestamp` (`eth_getBlockByNumber`) are not kept in
`.partial/`: with an RPC that does not return `blockTimestamp`, a run that
stops while it fetches them fetches them again the next time. A run stops when
the RPC returns no block with a hex `timestamp` for such a log; `.partial/`
keeps the logs fetched so far, so run it again with another `--rpc` that has
the block.

The first run fetches from the creation block of each contract. A later run
reads `manifest.json` and fetches only the blocks after the last run, into
new files. It stops when a contract changed its address or creation block,
and when a file that it would write is there already (another run to the
same block would overwrite it). A run that stopped after it moved its files
next to the manifest and before it wrote the manifest leaves files that the
manifest does not list, and the next run stops at them: delete the files that
are not in `manifest.json` (`git status` shows them), and run it again.

It fetches like the sync: one `eth_getLogs` per range with the address and
the topic 0 of the events that are not anonymous. It decodes each log with
the ABI of its contract in `src/constants/chains`, as the sync decodes it
(ethers' `EventLog`), when its range is fetched, before it is added to
`.partial/`, and checks that it is not removed and is of the address of the
contract. A log that fails stops the run at once, with the contract and the
block of the log. A log that cannot be decoded also shows the event (or the
topic 0): the ABI does not fit the log. The snapshot has only the args
decoded with the ABI of the time it was made, so after a fix to the ABI of a
contract that has events, fetch that contract's snapshot again from an RPC.

- **Widths:** the ranges start at 100,000 blocks (`FIRST_WIDTH`; or
  `--max-width`, if narrower) and are doubled after each full range that
  works, up to `--max-width`. The parts of a contract share their widths, so
  that what one part learns, the others use. A part whose range is halved
  keeps its own widths too, the half of the range that failed (#601). It asks
  the narrower of its own width and the shared one: the other parts may
  narrow it, but their successes do not raise it. A full range that works
  raises, by the same rules, its own widths when it had their width, and the
  shared widths when they still have its width after the answer (another part
  may have changed them meanwhile). When its own width is raised to the
  shared one, the part uses the shared widths again.
- **Failures** (like #549, #554 and #591 in the sync: the RPC may pass each
  request to another node). The script waits a second (`RETRY_WAIT_MS`) and
  tries again:
  - HTTP 429 (`rate`; Infura answers it for a while, even to one request at
    a time): the same range, after the wait of `rateWaitMs` (`rpc.mjs`). The
    wait ends early when another part stops (Parts, below). Any other answer
    makes the wait a second again. A 429 is not a failure: it does not halve
    the range and does not count toward the 10 failures below, and the
    failures before it stay counted. After 30 429s in a row
    (`MAX_RATE_ERRORS`; of one part, or of one other request), the script
    stops. The requests other than `eth_getLogs` (`eth_chainId`,
    `eth_blockNumber`, `eth_getBlockByNumber`) are asked again after a 429 in
    the same way (`retryRate`), but their wait does not end early.
  - HTTP 500 or 504, and the errors of a node without old blocks
    (`unrelated`; `ERRORS_UNRELATED_TO_RANGE`): the same range, since they
    come for any width.
  - Any other error (`range`): the range is halved after two in a row, and
    the half becomes the widest range until 10 ranges in a row work
    (`SUCCESSES_TO_RAISE_LIMIT`); then it is doubled again.
  - After three errors in a row of any kind but 429
    (`ERRORS_TO_HALVE_ANYWAY`), the range is halved too, in case a node
    answers a range that is too wide with HTTP 500.
  - Too many logs for one answer (`results`; the messages are in
    `classifyError`): the range is halved at once, without a wait and without
    counting a failure.
  - A request that does not answer in time (`REQUEST_TIMEOUT_MS`) is a
    failure. After 10 failures in a row of one part (`MAX_FAILURES`), the
    script stops.
- **Empty results (#576):** an RPC may return no logs, without an error, for a
  range that has some, even twice in a row. Every range that returns no logs
  is asked again until it returns logs or three empty answers in a row
  (`EMPTY_ANSWERS_TO_KEEP`). This almost triples the requests where the logs
  are sparse. It makes a lost range less likely, not impossible: check the
  snapshot with another source.
- **Parts (#586):** the blocks of each contract are split into parts of
  `--part-blocks`, which wait in a queue, the first part of each contract
  first. `--concurrency` workers take the next part when they finish one, so
  that the requests at a time stay the same until the end. When one part
  stops, the others stop before their next request, even in the middle of
  a wait after HTTP 429. A part stops after 30 429s in a row too.

The logs of each range are sorted by block and log index, and the parts of a
contract are read in the order of the blocks. The run in the manifest has
`checks`: the empty ranges asked again, those that had logs the second time,
and the errors of each kind (Format, below).

## Format (formatVersion 3)

The types and their comments are in `src/warpSync/warpSyncTypes.ts`:
`WarpSyncManifest` for `<chain>/manifest.json`, and `WarpSyncFile` and
`WarpSyncLog` for each `<chain>/<project>-<version>-<name>-<toBlock>.json.gz`.
A file has the logs of one contract from `fromBlock` to `toBlock`: at most
20,000 logs, cut between blocks (a block with more logs is in one file). It is
gzip of JSON with no spaces.

Each run of the manifest also has what only the script writes:

```jsonc
{
  // By method, of the invocation that finished the run (not those that
  // stopped before it).
  "requests": { "eth_getLogs": 21000 },
  // What the fetching met, of the invocation that finished the run, like
  // requests.
  "checks": {
    "emptyRangesAskedAgain": 18000,
    "emptyRangesWithLogs": 3,
    // rate: HTTP 429, of any method.
    "errors": { "rate": 50, "results": 40, "unrelated": 900, "range": 30 },
  },
}
```

Runs 0 and 1 of `matic` have neither: they were converted from
formatVersion 1. Run 0 of `eth` has `requests` but not `checks`: it was not
made by this script (The snapshots, above). The runs made before #632 (run 2
of `matic` and run 1 of `eth`) have no `rate`.
