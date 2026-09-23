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
- the events page after an action: the settings dialog, the "Export as CSV"
  dialog, a quick search, the sidebar accordion of "Augur version2", and a
  narrow window (760 px)
- the error page (404), after a link to an unknown chain

To add a screen, edit `PAGES` or `STATES` in `shots.mjs`.

## Limits

- The build has no synced data, so the event logs and the sync progress are
  not shown.
- A screenshot shows the screen after it settles. Animations and transitions
  are turned off.
- The same build gives the same screenshots from run to run, with the Chrome
  flags in `shots.mjs`. Without them, a few pixels of the icons can differ.
