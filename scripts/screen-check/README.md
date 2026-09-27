# Screen check

Scripts to check a build in a browser before a release: the pages and their
actions, the event log sync, the upgrade from the data of v1.0.2, the public
RPC of PublicNode, and the public site after the release.

They are run by hand. They are not part of CI.

| Folder         | What it checks                                          | Network                                    |
| -------------- | ------------------------------------------------------- | ------------------------------------------ |
| `ui/`          | Pages, navigation, settings, grids, ABI, keyboard       | None; a fake RPC                           |
| `sync/`        | The event log sync                                      | None; a fake RPC                           |
| `upgrade/`     | Data saved by v1.0.2, opened by the new build           | None; a fake RPC                           |
| `real-rpc/`    | Connection, Goal and the stop of a sync with a real RPC | PublicNode (without `--fake`)              |
| `public-site/` | The site on GitHub Pages after the release              | `https://snjro.github.io/Digu` (read only) |

## Before you run

- Pick the commit to release and build it with `build.sh`. Run the checks on
  that build; a build of an earlier commit does not show the later changes.
- The build folder is about 300 MB. Keep it, and every `<out-dir>`, outside
  the repository. The scripts stop when one is in the repository.
- `upgrade/` also needs a build of v1.0.2. It is built with `node:20-slim`,
  because v1.0.2 has no `compose.yaml`.
- `real-rpc/` without `--fake` sends requests to PublicNode, a service of a
  third party. Ask the owner of the repository before you run it, and agree
  which runs (`--only`) and which Retry Count (`--retry`) to use.
- Steps marked `CHECK` need a person: look at the screenshot or the file the
  step names.

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
scripts of this folder are mounted at `/scripts` and `<out-dir>` at `/out`.
The Docker Compose project is `<repo>-sc-<check>`, or `PROJECT`; each `run.sh`
removes it when it ends.

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
| `sec2.mjs`  | 2: the theme switch and the theme after a reload, the sidebar closed and after a reload, its accordions (click, Enter, Space), a narrow window (the sidebar, a click outside it, the three-dots menu), the footer links                                                                                                                   |
| `sec3.mjs`  | 3: the RPC input (its helper text, invalid URLs, a wrong chain, "Connected." and after a reload, show and hide), the settings dialog (its values and sliders, closing it with X, Escape or the backdrop), the explorer and its links, a change seen in another tab, the placeholder, Enter in the RPC input, and invalid settings         |
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
| S2       | Anonymous events of the version2 `Cash` contract are not fetched                                                                                                                                         |
| S3       | RPC errors, one mode each: `errorGetLogs` and `errorGetLogs10` (Retry Count 2 and 10), `errorOnce`, `errorAll`, `nullBlock` (`eth_getBlockByNumber` returns null, #519)                                  |
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
  stopped. `grid` opens the Event Logs grids on the logs of both. `probe`
  only opens the new build and logs the stack if the page stops answering.
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
scripts/screen-check/real-rpc/run.sh <build-dir> <out-dir> --only=eth-http --retry=2
```

- A run is one chain and one protocol, in a new browser profile:
  `eth-http`, `eth-wss`, `matic-http`, `matic-wss` (all by default). The RPC
  is `https://` or `wss://` `ethereum-rpc.publicnode.com` or
  `polygon-bor-rpc.publicnode.com`, without a key. Other hosts are blocked by
  DNS and request interception.
- A run sets Retry Count to `--retry` (default 2) so that few requests are
  sent, turns off all sync targets but one contract (Augur of Augur version1
  on eth, AMMFactory of Augur turbo on matic), types the RPC URL, waits for
  "Connected." (30 s), starts the sync and waits until it stops by itself
  (120 s).
- It records:
  - `1 helper`: "Connected." was shown.
  - `2 goal`: the Goal is a latest block the RPC returned, less the
    confirmation depth of the build (eth 96, matic 128, #498).
  - `3 sync`: `eth_getLogs` was sent Retry Count + 1 times and each was
    refused with an error (any code), the toggle is off, the nav says
    "stopped", the RPC host is not in the console (#483), no contract is left
    syncing or aborting, and the contracts grid shows "stopped" (#515).
  - `4 console by type`, `4 csp`: console errors and warnings, page errors,
    CSP violations.
  - `5 traffic`: the requests, the WebSocket connections, the calls by method
    (and `eth_chainId`), and the errors by code.
- `--fake` answers the https requests in the container: the chain id, a
  latest block, and `-32602` for `eth_getLogs`. A WebSocket cannot be
  intercepted, so the `wss` runs end in an error with `--fake`.

Limits of PublicNode without a key:

- It does not return the logs or blocks of old blocks, so this check cannot
  see a real sync of event logs. It checks the connection, the Goal, the stop
  after the refused requests and what is left after it. A real sync needs an
  RPC with a key.
- It refused `eth_getLogs` of old blocks with `-32602` on eth and `-32701` on
  matic. Over `wss` on eth, it answered `eth_getLogs` of old blocks with no
  logs and refused `eth_getBlockByNumber` instead, so `3 sync` of `eth-wss`
  is not `ok` although the sync stopped and left nothing behind. Read the
  record of that run.

Result in `<out-dir>`: `results.json` (each run), `console.json`,
`blocked.json`, and `<run>-1-connected.png`, `<run>-3-stopped.png`,
`<run>-3-contracts-grid.png`.

## Public site check (`public-site/`)

```sh
scripts/screen-check/public-site/run.sh <build-dir> <out-dir> <version>   # such as 1.1.0
```

It only reads `https://snjro.github.io/Digu` after the release: it opens
pages, clicks the theme switch and reads the page. It does not type an RPC
URL or submit anything. Requests to other hosts are not blocked. The
build folder gives only the `node_modules` with puppeteer.

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
