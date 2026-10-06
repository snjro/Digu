# Screen check

Scripts to check a build in a browser before a release: the pages and their
actions, the event log sync, the upgrade from the data of v1.0.2, the public
RPC of PublicNode, and the public site after the release.

They are run by hand before a release. `run-all.sh` also runs in CI after
each push to develop (see [CI](#ci-screen-checkyml)).

| Folder         | What it checks                                          | Network                                    |
| -------------- | ------------------------------------------------------- | ------------------------------------------ |
| `ui/`          | Pages, navigation, sync panel, grids, ABI, keyboard     | None; a fake RPC                           |
| `sync/`        | The event log sync                                      | None; a fake RPC                           |
| `upgrade/`     | Data saved by v1.0.2, opened by the new build           | None; a fake RPC                           |
| `real-rpc/`    | Connection, Goal and the stop of a sync with a real RPC | PublicNode (without `--fake`)              |
| `public-site/` | The site on GitHub Pages after the release              | `https://snjro.github.io/Digu` (read only) |

The checks of a local build answer the warp sync files of Ethereum
(`/warp-sync/eth/`) with 404, so Ethereum has no snapshot and syncs from the
RPC as before. Its import asks first, and that dialog would cover the page
(#604). The snapshot of Polygon is still imported, except in the matic runs
of `real-rpc/`, which turn the warp sync off first (#635).

## Before you run

- Pick the commit to release and build it with `build.sh`. Run the checks on
  that build; a build of an earlier commit does not show the later changes.
- The build folder is about 300 MB. Keep it, and every `<out-dir>`, outside
  the repository. The scripts stop when one is in the repository.
- `upgrade/` also needs a build of v1.0.2. It is built with `node:20-slim`,
  because v1.0.2 has no `compose.yaml`.
- `real-rpc/` without `--fake` sends requests to PublicNode, a service of a
  third party. Ask the owner of the repository before you run it, and agree
  which runs (`--only`) to use.
- Steps marked `CHECK` need a person: look at the screenshot or the file the
  step names.
- The host needs bash, Docker with Compose, git and python3. `run-all.sh`
  also needs bash 4.3 or later and `flock` (util-linux); without them it
  stops with an error, so on macOS run the checks one by one with each
  `run.sh`.

## Build

```sh
scripts/screen-check/build.sh <ref> <build-dir>
```

- `<ref>`: the commit to check, such as `develop`, a commit or a tag
  (`v1.0.2` for `upgrade/`).
- `<build-dir>`: a new folder outside the repository.

`build.sh` copies `<ref>` with `git archive` (no checkout, no worktree), runs
`npm ci` and `npm run build` in the `app` service of its `compose.yaml`, and
writes the ref and its commit to `<build-dir>/COMMIT`. It prints the number of
HTML files in `_build`.

Every check runs in the `test` service (image `ghcr.io/puppeteer/puppeteer`)
of `<build-dir>/compose.yaml`, with `/app` as `<build-dir>`, so it uses the
`node_modules` and the source of the build, not of this working tree. The
`scripts` folder of this working tree is mounted at `/scripts` (a check runs
as, for example, `/scripts/screen-check/ui/sec1.mjs`, and imports
`scripts/check-lib/browser.mjs`) and `<out-dir>` at `/out`.
The Docker Compose project is `<repo>-sc-<check>`, or `PROJECT`; each `run.sh`
removes it when it ends.

## All the checks at once (`run-all.sh`)

```sh
scripts/screen-check/run-all.sh <build-dir> <v1.0.2-build-dir> <out-dir>
scripts/screen-check/run-all.sh <build-dir> <v1.0.2-build-dir> <out-dir> --jobs=1
scripts/screen-check/run-all.sh <build-dir> <v1.0.2-build-dir> <out-dir> --upgrade-b=<dir>
```

It runs the checks that need no network on one build: all of `ui/` and
`merge.py`, `smoke.mjs` and `sync-check.mjs` of `sync/`, `old`, `new` and
`grid` of `upgrade/` (A), and `real-rpc/` with `--fake`. It does not build
and does not run `public-site/`.

- `<out-dir>`: a new or empty folder outside the repository. The results of
  each check go to a folder in it: `ui`, `sync-smoke`, `sync`, `upgrade`,
  `upgrade-b` and `real-rpc-fake`.
- `--jobs=N`: how many checks run at once, longest first (default 4). Each
  check is a Chrome in its own container. Lower it when the machine is slow or
  busy: under a heavy load, timing and screenshots can change (#494).
  `--jobs=1` runs them one by one in the order of this README.
- `--upgrade-b=<dir>`: also runs `new` of `upgrade/` (B) on a copy of `<dir>`
  in `<out-dir>/upgrade-b`, such as an `<out-dir>` of `upgrade/` with the data
  of an older version. Without it, B is skipped and `exit-codes.txt` says so.
- Each check has its own Docker Compose project, `<repo>-sc-<pid>-<check>`.
- One `run-all.sh` runs at a time: a second one waits for the lock
  `${XDG_RUNTIME_DIR:-/tmp}/digu-screen-check.lock`. `scripts/visual-compare`
  has another lock, so the two can run at the same time, and the load adds
  up.
- A failed step does not stop the others. At the end, `exit-codes.txt` has
  the exit code of each step and `times.txt` its start, end and seconds, made
  from the files in `status/`; the output of each step is in
  `log-<step>.txt`. It exits 1 when a step failed.
- A new lane needs a branch in `lane()`, its name in both `lanes` lists and
  its steps in `steps` of `run-all.sh`; a new kind of check also needs a
  reader in `judge.py` (see [Judge](#judge-judgepy)). When the two `lanes`
  lists differ, it stops at the start (exit 2); a step that runs but is not
  in `steps` gets `not-in-steps` in `exit-codes.txt` and fails.

## Judge (`judge.py`)

```sh
python3 scripts/screen-check/judge.py <out-dir>
```

The scripts write their judgements to the results; the exit code of a
`run.sh` is not 0 only when a script or Docker failed. `judge.py` reads an
`<out-dir>` of `run-all.sh`, prints each failure and exits 1 when there is
one:

- a step of `exit-codes.txt` that is not 0 (`skipped` is not a failure),
- `NG` or `ERROR` in `ui/`; `CHECK` is left to a person,
- an `ok` that is false, or an exception (`error`), in `sync/`. These
  records have an `ok`: `6-2 reached latest` and `6-2 goal (#498)` in S1,
  `calls in 3 s after stop` in S3 (`reached latest` in `errorOnce`, where the
  sync does not stop), `real contract link`, `real event link` and
  `real version link` in S5 (a link is found and no page error), and
  `fakeKeyInConsole (#483)` in `summary`,
- `[script-error]` in a log of `upgrade/`, or a `[check]` line there that
  has `NG:` (a failed check); its other records have no judgement,
- `1 helper`, `2 goal` or `3 sync` not `ok`, or an exception, in the `http`
  runs of `real-rpc/ --fake`. The `wss` runs end in an error with `--fake`.

A new kind of check (a new folder, or a new kind of record in a script)
needs a reader in `judge.py`, or in `sync/` an `ok` (write it with `check()`).
Without one, it passes.

## CI (`screen-check.yml`)

`.github/workflows/screen-check.yml` runs on each push to develop and by hand
(`workflow_dispatch`), not on pull requests. A newer run on the same ref
cancels the older one.

- It builds the commit with `build.sh`, and v1.0.2 once (it is kept in the
  cache of Actions), runs `run-all.sh --jobs=2` without upgrade B (its data
  is made by hand for a release), and runs `judge.py`. The number of jobs can
  be set when it is run by hand.
- The `<out-dir>` is uploaded as an artifact for 14 days, for the
  screenshots of the `CHECK` steps.
- On a failure it opens an issue with the label `screen-check-failure` and
  the failures of `judge.py`, or comments on the open one. On a pass it
  closes the open one.
- `release.yml` runs `wait-for-pass.sh` first: the release stops unless this
  workflow passed on the commit of the tag. While a run on that commit is
  queued or in progress, it waits up to 30 min. When the commit has no run
  (for example, a newer push cancelled it), run it with
  `gh workflow run screen-check.yml --ref <tag>`, then run the release again.
- The checks by hand before a release (upgrade B, `real-rpc/` without
  `--fake`, the `CHECK` steps and `public-site/` after it) are still needed.

## UI check (`ui/`)

```sh
scripts/screen-check/ui/run.sh <build-dir> <out-dir> sec1.mjs root   # 1-1 to 1-9
scripts/screen-check/ui/run.sh <build-dir> <out-dir> sec1.mjs digu   # 1-10, served under /Digu/
scripts/screen-check/ui/run.sh <build-dir> <out-dir> sec2.mjs
scripts/screen-check/ui/run.sh <build-dir> <out-dir> sec3.mjs
scripts/screen-check/ui/run.sh <build-dir> <out-dir> sec4.mjs
scripts/screen-check/ui/run.sh <build-dir> <out-dir> sec58.mjs
scripts/screen-check/ui/run.sh <build-dir> <out-dir> extra.mjs
python3 scripts/screen-check/ui/merge.py <out-dir> <commit>
```

The scripts serve `_build` inside the container at `/` and, for `sec1.mjs
digu`, under `/Digu/` with nothing at the root, like GitHub Pages. Requests to
other hosts are blocked (DNS and request interception). The RPC URLs
`http://*.invalid/` are answered by the interceptor as a fake RPC of chain 1
(`wrong-chain.invalid` as chain 5).

| Script      | Steps                                                                                                                                                                                                                                                                                                                                     |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sec1.mjs`  | 1: the start page, the sidebar tree, the breadcrumb, the tabs and a reload, the links in tables and grids, Back and Forward, unknown names and the error page, a `/matic/` URL opened directly, another chain in the sidebar. 1-10: the same under `/Digu/`, and that the links and the logo stay under `/Digu/`                          |
| `sec2.mjs`  | 2: the theme switch and the theme after a reload, the sidebar closed and after a reload, its accordions (click, Enter, Space), a narrow window (the sidebar, a click outside it, the nav in one row, the sync panel), the footer links                                                                                                    |
| `sec3.mjs`  | 3: the RPC input (its helper text, invalid URLs, a wrong chain, "Connected." and after a reload, show and hide), the sync panel (no RPC settings, closing it with the progress, Escape or a click outside), the explorer links (Etherscan), the RPC URL seen in another tab, the placeholder, and Enter in the RPC input                  |
| `sec4.mjs`  | 4: on the contracts, events and functions grids: sort, column filter, quick search, Reset all filters, Reload, Show all columns and Hide minor columns, the column widths, full screen and Escape, paging, Copy, the CSV dialog and its file. Also the event log grids with fake logs written to IndexedDB, and 1-5 "View all Event Logs" |
| `sec58.mjs` | 5: the ABI tab (its formats and JSON colors, line wrap, the export and its file, the Components dialog of a tuple). 8: Tab into a grid's Copy button with Enter and Space, the RPC input's label, the versions table, a function URL with a wrong name, an unknown URL, and no horizontal scroll at 390 px                                |
| `extra.mjs` | Back after opening a tabbed page without a hash, page errors on links without a hash, and the keyboard into a grid cell's Copy button                                                                                                                                                                                                     |

- `--only=1-1,3-10` runs only the steps whose id starts with one of them.
  With `sec1.mjs`, write it after `root` or `digu`. Some steps use the page
  that an earlier step left, so a step alone can fail where the whole script
  passes.
- Each step prints `[<id>] OK`, `NG`, `CHECK` or `ERROR` (an exception in the
  script). At the end, `[summary]` counts the console errors and warnings,
  page errors, Content Security Policy violations (`csp`) and 404 responses,
  and prints each violation.

Result in `<out-dir>`:

- `results-<script>.json`: `results` (the steps), `log` (console, page
  errors, CSP violations, 404), `blocked` (requests to other hosts),
  `rpcLog` (the last calls to the fake RPC).
- `results.json`: all of them, from `merge.py`. It also prints each step and
  the log by type.
- `shots/*.png` and `downloads/` (the CSV and ABI files).

## Sync check (`sync/`)

```sh
scripts/screen-check/sync/run.sh <build-dir> <out-dir> smoke.mjs                  # the fake RPC with ethers, no browser
scripts/screen-check/sync/run.sh <build-dir> <out-dir> sync-check.mjs             # S1 to S5
scripts/screen-check/sync/run.sh <build-dir> <out-dir> sync-check.mjs S1,S4       # some of them
S3_MODES=nullBlock scripts/screen-check/sync/run.sh <build-dir> <out-dir> sync-check.mjs S3
```

`fake-rpc.mjs` is a fake Ethereum JSON-RPC. It makes event logs with ethers
from the ABI of Augur in the build, at fixed blocks, and puts its latest block
the confirmation depth of the build (`confirmationBlocks` of
`src/constants/chains/ethereum-mainnet/_index.ts`) above the expected Goal.
`sync-check.mjs` answers the RPC URL with it through request interception, so
nothing leaves the container. The RPC URL has a key-like path, to check that
it does not show in the console (#483).

| Scenario | What it does                                                                                                                                                                                             |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1       | Picks the sync targets, syncs Augur version1 to the Goal (latest − depth, #498), follows the progress on the pages while it syncs, changes the chain during the sync, stops it, reloads, and syncs again |
| S3       | RPC errors, one mode each: `errorGetLogs`, `errorOnce`, `errorAll` (it stops after about 200 s: the latest block is asked once per 20 s), `nullBlock` (`eth_getBlockByNumber` returns null, #519)        |
| S4       | Two tabs: a sync in one, what the other shows, and after the first stops or closes                                                                                                                       |
| S5       | Page errors on in-app navigation with real links                                                                                                                                                         |

Result in `<out-dir>`: `results.json` (each scenario, with a `summary` of the
key in the console, the console by type, CSP violations and blocked
requests), `console.json`, `blocked.json` and the screenshots `<scenario>-*.png`.

## Upgrade check (`upgrade/`)

```sh
scripts/screen-check/build.sh v1.0.2 <v1.0.2-build-dir>
scripts/screen-check/upgrade/run.sh <build-dir> <v1.0.2-build-dir> <out-dir> old    # v1.0.2 makes the data
scripts/screen-check/upgrade/run.sh <build-dir> <v1.0.2-build-dir> <out-dir> new    # the new build opens it
scripts/screen-check/upgrade/run.sh <build-dir> <v1.0.2-build-dir> <out-dir> grid   # the Event Logs grids
python3 scripts/screen-check/upgrade/summarize_db.py <out-dir>/db-new-new-00-home-first-open.json
python3 scripts/screen-check/upgrade/diff_db.py <out-dir>/db-old-old-06-final.json <out-dir>/db-new-new-00-home-first-open.json
```

- Run `old`, then `new`, then `grid`, with the same `<out-dir>`. The phases
  share the Chrome profile `<out-dir>/profile` and the origin, so the new
  build opens the IndexedDB (Dexie 3) that v1.0.2 wrote. `old` deletes the
  profile first.
- `old` uses the settings of v1.0.2 (its names, such as `Try Count`), sets a
  fake RPC and syncs. `new` opens the new build, checks the settings, the
  chain, the sync targets and the sync state, and syncs on from where v1.0.2
  stopped. It also logs a `[check]` line on the Settings database: its
  version after the upgrade, and that the upgrade removed `bulkUnit`,
  `chainExplorerIndex`, `blockIntervalMs`, `tryCount` and
  `abortWatchIntervalMs` from each RPC setting and kept the rest. `grid` opens
  the Event Logs grids on the logs of both. `probe` only opens the new build
  and logs the stack if the page stops answering.
- The checks are `[check]` lines in `log-<phase>.txt`. A failed one ends
  with `NG: <reason>`, and `judge.py` counts it as a failure. The others
  are records for a person.
- `NEW_LATEST` sets the latest block of the fake RPC in the new phases. A
  value below what v1.0.2 fetched checks #498 with Current above the Goal.

Result in `<out-dir>`: `steps-<phase>.json`, `log-<phase>.txt`,
`db-<phase>-<step>.json` (dumps of every IndexedDB database),
`rpc-count-<phase>.json`, `getlogs-<phase>.json` (the ranges of every
`eth_getLogs`) and `shots-<phase>/`.

## Real RPC check (`real-rpc/`)

**Without `--fake`, this sends requests to PublicNode, a third-party
service. Ask the owner of the repository before running it.**

```sh
scripts/screen-check/real-rpc/run.sh <build-dir> <out-dir> --fake                  # no request leaves the container
scripts/screen-check/real-rpc/run.sh <build-dir> <out-dir>                         # PublicNode, all 4 runs
scripts/screen-check/real-rpc/run.sh <build-dir> <out-dir> --only=eth-http
```

- A run is one chain and one protocol, in a new browser profile:
  `eth-http`, `eth-wss`, `matic-http`, `matic-wss` (all by default). The RPC
  is `https://` or `wss://` `ethereum-rpc.publicnode.com` or
  `polygon-bor-rpc.publicnode.com`, without a key. Other hosts are blocked by
  DNS and request interception.
- A run turns off all sync targets but one contract (Augur of Augur version1
  on eth, AMMFactory of Augur turbo on matic), types the RPC URL, waits for
  "Connected." (30 s) and starts the sync. On eth, it waits until the sync
  stops by itself (120 s). On matic, it clicks "stop sync" when the first
  range refused for its width has been fetched in narrower ranges, or after
  60 s, and
  waits for the stop (#694).
- The matic runs first turn off "Warp sync" in the sync panel (its files get
  404 until then), so that the sync starts at old blocks (#635); `warpSync`
  records it. Eth has no snapshot here.
- It records:
  - `1 helper`: "Connected." was shown.
  - `2 goal`: the Goal is a latest block the RPC returned, less the
    confirmation depth of the build (eth 96, matic 128, #498).
  - `3 sync`: on eth, `eth_getLogs` was sent `TRY_COUNT` + 1 times (11;
    `TRY_COUNT` of `src/eventLogs/eventLogsContract.ts` in the build) and
    each was refused with an error (any code), and the sync stopped by
    itself. On matic, the sync did not stop by itself, `fetchedBlockNumber`
    moved on, at least one range refused for its width (`-32701` or "exceed
    maximum block range") was fetched again in narrower ranges (`refusals`:
    after each such refusal, the next request sent is from the same block
    and not wider, and the successes up to the end of the refused range are
    narrower; other errors are only counted in `refusedCodes`), the sync
    stopped after the click, and no `eth_getLogs` was sent in 3 s after the
    stop. On both: the toggle is off, the nav says
    "stopped", the RPC host is not in the console (#483), no contract is left
    syncing or aborting, and the contracts grid shows "stopped" (#515).
  - `4 console by type`, `4 csp`: console errors and warnings, page errors,
    CSP violations.
  - `5 traffic`: the requests, the WebSocket connections, the calls by method
    (and `eth_chainId`), and the errors by code.
- `--fake` answers the https requests in the container: the chain id, a
  latest block, and for `eth_getLogs` `-32602` on eth, and on matic no logs
  or `-32701` for a range over 10,000 blocks. A WebSocket cannot be
  intercepted, so the `wss` runs end in an error with `--fake`.

Limits of PublicNode without a key:

- On eth, it does not return the logs or blocks of old blocks, so this check
  cannot see a real sync of event logs there. It checks the connection, the
  Goal, the stop after the refused requests and what is left after it. It
  refused `eth_getLogs` of old blocks with `-32602`. Over `wss`, it answered
  `eth_getLogs` of old blocks with no logs and refused `eth_getBlockByNumber`
  instead, so `3 sync` of `eth-wss` is not `ok` although the sync stopped
  and left nothing behind. Read the record of that run.
- On matic, since October 2026, it returns the logs of old blocks, but
  refuses a range over 10,000 blocks with
  `-32701 exceed maximum block range: 10000` (#694). The sync does not stop
  by itself, so the script stops it. The run does not check the saved logs.

Result in `<out-dir>`: `results.json` (each run), `console.json`,
`blocked.json`, and `<run>-1-connected.png`, `<run>-3-stopped.png`,
`<run>-3-contracts-grid.png`.

## Public site check (`public-site/`)

```sh
scripts/screen-check/public-site/run.sh <build-dir> <out-dir> <version>   # such as 1.1.0
```

It only reads `https://snjro.github.io/Digu` after the release: it opens
pages, clicks the theme switch and reads the page. It closes the import
dialog of Ethereum with "Not now" on each page, and `1b import dialog`
records it. It does not type an RPC URL or submit anything. Requests to
other hosts are not blocked. The build folder gives only the `node_modules`
with puppeteer.

It checks that `/Digu/` goes to `/Digu/eth/`, the footer shows `v<version>`
and links to its release, the links stay under `/Digu/`, the IndexedDB
databases are made, deep URLs open, an unknown URL gets the 404 of GitHub
Pages, the theme switch works, the grid and the ABI show, and that there is
no CSP violation. Result in `<out-dir>`: `results.json` and screenshots.

## Limits

- The fake RPCs answer at once, so timing (a slow RPC, the number of requests
  at the same time) is not checked.
- Many details are left to a person, with the screenshots and records: the
  looks (hover, focus, dialogs), the contents of the CSV files, the progress
  numbers while a sync runs, and the grids during a sync.
- Some cases have no script: writes to IndexedDB that fail ("Save failed"),
  IndexedDB turned off, a sync started right after a stop, and Ctrl-click in
  the sidebar.
- `ui/` and `sync/` serve the build at `/`, except `sec1.mjs digu`.
