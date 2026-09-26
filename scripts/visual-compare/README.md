# Visual compare

Builds two versions of the app and compares their screenshots, to check that a
change does not change how the pages look (for example, the rewrite to runes).

## Run

```sh
scripts/visual-compare/run.sh <base-ref> <out-dir> [<head-ref>]
```

- `<base-ref>`: the version to compare with, such as `origin/develop`. It must
  have `compose.yaml`, which was added in c5fab75 (2026-09-23). The releases
  up to v1.0.2 do not have it, so they cannot be the base.
- `<out-dir>`: where to write the result. It is deleted first. Keep it outside
  the repository.
  `run.sh` stops without deleting it when it is `/`, `$HOME`, in or around the
  repository, or not empty without the `report.md` of an earlier run.
  `run.sh` puts a `.visual-compare` file in it before taking the screenshots.
  A run that stopped halfway can be run again with the same `<out-dir>` when
  it has only `.visual-compare`, `base/`, `head/` and `diff/`.
- `<head-ref>`: the version to check. Without it, the head is this working
  tree, with its uncommitted changes. Then `run.sh` reinstalls the
  `node_modules` of this working tree with `npm ci`, and overwrites its
  `_build` and `.svelte-kit`.

Examples:

```sh
# This working tree against develop
scripts/visual-compare/run.sh origin/develop ../visual-compare-out

# What a merged pull request changed
scripts/visual-compare/run.sh <merge>^1 ../visual-compare-out <merge>
```

It needs git and Docker (`compose.yaml` of this repository). It takes about
10 minutes.

## What it does

1. Checks out `<base-ref>` (and `<head-ref>`) into temporary git worktrees.
2. Runs `npm ci` and `npm run build` for each, in the `app` service.
3. In the `test` service, `shots.mjs` serves each `_build` inside the container
   (no port is opened) and takes screenshots with the Chrome of puppeteer.
   Requests to other hosts are blocked, so the app does not call an RPC.
4. `compare.mjs` compares the two sets of screenshots.
5. Removes the temporary worktrees and their Docker networks.

## Result

- `<out-dir>/report.md`: `same`, `same pixels`, or `changed` with the number of
  changed pixels and the box around them, for each screen.
- `<out-dir>/diff/<screen>.png`: the head screenshot in pale gray, with the
  changed pixels in red.
- `<out-dir>/base/`, `<out-dir>/head/`: the screenshots, and `log.txt` with the
  console errors and warnings of each run.

`run.sh` exits with 1 when a screen changed.

## Screens

Light and dark theme of:

- the pages: home, chain, version, contracts, contract, events, event,
  functions, function
- the events page after an action:
  - the settings dialog: opened, closed with its close button or Escape,
    after moving a slider, after typing a valid and an invalid value
  - the "Export as CSV" dialog: opened, after choosing "No"
  - a quick search, and after clearing it
  - the sidebar: the accordion of "Augur version2" opened by a click or the
    Enter key, the mouse over an item or an accordion arrow
  - another chain chosen in the sidebar
  - the sync toggle clicked (there is no RPC, so the sync does not start)
  - a narrow window (760 px), its "three dots" menu, and the settings dialog
    opened from that menu
- the version page after unchecking the sync target of a contract
- the error page (404), after a link to an unknown chain
- the ABI tab of the contract, the event and the function page, the
  "Components of ..." dialog of a function with a tuple, and the ABI params
  dialog of the events grid
- the mouse over a grid row, a table row, a tab button, a sidebar link, and a
  button with a tooltip. These are taken in a Chrome that answers
  `(hover: hover)` like one with a mouse. Headless Chrome answers
  `(hover: none)`, so the Tailwind `hover:` classes do not apply without it
- 390 × 844: home, contracts, events and function, with the sidebar open (the
  default) and closed
- with event logs in IndexedDB, as if a sync had run: version, contracts,
  contract, events, and event (its overview and the Event Logs text and hex
  tabs). The logs are made with ethers from the ABI of Augur, with fixed
  values, so every run shows the same rows. Nothing is fetched from an RPC

That is 55 screens for each theme, 110 in all.

Each action starts from a fresh browser profile, so what it saves in the
browser (settings, the chain) does not change the next screen.

To add a screen, edit `PAGES`, `STATES`, `MORE_STATES`, `PHONE_PAGES` or
`DATA_PAGES` in `shots.mjs`.

## Limits

- The only event logs are the fake ones of `DATA_PAGES`. Both builds are shot
  with the `shots.mjs` of this working tree, and the ABI of Augur and Dexie
  for them are read from this working tree too.
- A screenshot shows the screen after it settles. Animations and transitions
  are turned off.
- The same build gives the same screenshots from run to run, with the Chrome
  flags in `shots.mjs`. Without them, a few pixels of the icons can differ.
- `shots.mjs` serves each build at the root (`/`), not at `/Digu/` as GitHub
  Pages does. A problem that happens only under `/Digu/`, such as a link
  without the base path, is not found.
