# Visual compare

Builds two versions of the app and compares their screenshots, to check that a
change does not change how the pages look (for example, the rewrite to runes).

## Run

```sh
scripts/visual-compare/run.sh <base-ref> <out-dir> [<head-ref>]
```

- `<base-ref>`: the version to compare with, such as `origin/develop`.
- `<out-dir>`: where to write the result. It is deleted first. Keep it outside
  the repository.
  `run.sh` stops without deleting it when it is `/`, `$HOME`, in or around the
  repository, or not empty without the `report.md` of an earlier run.
- `<head-ref>`: the version to check. Without it, the head is this working
  tree, with its uncommitted changes.

Examples:

```sh
# This working tree against develop
scripts/visual-compare/run.sh origin/develop ../visual-compare-out

# What a merged pull request changed
scripts/visual-compare/run.sh <merge>^1 ../visual-compare-out <merge>
```

It needs git and Docker (`compose.yaml` of this repository). It takes about
3 minutes.

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

Each action starts from a fresh browser profile, so what it saves in the
browser (settings, the chain) does not change the next screen.

To add a screen, edit `PAGES` or `STATES` in `shots.mjs`.

## Limits

- The build has no synced data, so the event logs and the sync progress are
  not shown.
- A screenshot shows the screen after it settles. Animations and transitions
  are turned off.
- The same build gives the same screenshots from run to run, with the Chrome
  flags in `shots.mjs`. Without them, a few pixels of the icons can differ.
