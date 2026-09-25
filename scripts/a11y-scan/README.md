# Accessibility scan

Builds the app and runs [axe-core](https://github.com/dequelabs/axe-core) on
its main pages, to count the accessibility problems before and after a change.

It is run by hand for each pull request. It is not part of CI yet.

## Run

```sh
scripts/a11y-scan/run.sh <out-dir>
```

- `<out-dir>`: where to write the result. Keep it outside the repository.
  Files of an earlier run in it are overwritten.

It needs git, Docker (`compose.yaml` of this repository) and Python 3. It scans
this working tree, with its uncommitted changes.

## What it does

1. Runs `npm ci` and `npm run build` in the `app` service.
2. In the `test` service (image `ghcr.io/puppeteer/puppeteer:25.11.0`):
   1. Installs axe-core 4.13.0 from npm into a temporary folder in the
      container. The version is fixed so that the numbers of two runs can be
      compared.
   2. `axe-scan.mjs` serves `_build` inside the container (no port is opened),
      opens each page with the Chrome of puppeteer, and runs axe-core.
      Requests to other hosts are blocked, so the app does not call an RPC.
3. `summarize.py` counts the problems by rule and by page.

## Pages

With a window of 1400 × 900, the light theme and no synced data:

- top (`/`), chain, version, contracts, contract, events, event, functions
- the settings dialog, opened from the top page (only the dialog is scanned)

To add a page, edit `pages` in `axe-scan.mjs`.

## Result

- `<out-dir>/summary.md`: a table of the number of elements with a problem,
  for each rule and page.
- `<out-dir>/axe-build.json`: the problems found, with the element of each one.
  It also has the axe-core and Chrome versions, the other hosts the pages tried
  to reach (`nonLocalOrigins`) and the errors in the pages (`pageErrors`).
- `<out-dir>/shot-<page>.png`: a screenshot of each page when it was scanned.

## Find the source of a problem

A dev server (`vite dev`) adds the source file and line to each element. Scan
it too, then pass both results to `summarize.py`, which then also counts the
problems by source line and by file:

```sh
out=$(realpath <out-dir>)   # after run.sh, so that node_modules is installed
docker compose -p "$(basename "$PWD" | tr "[:upper:]" "[:lower:]")-a11y" \
  run --rm -T -v "$PWD/scripts/a11y-scan:/scripts:ro" -v "$out:/out" test sh -c '
    mkdir -p /out/dev /tmp/axe && cd /tmp/axe && echo {} > package.json
    npm i --no-audit --no-fund axe-core@4.13.0 && cd /app
    npx vite dev --host 127.0.0.1 --port 4322 --strictPort > /tmp/vite.log 2>&1 &
    for i in $(seq 60); do
      node -e "fetch(\"http://127.0.0.1:4322/\").then(()=>process.exit(0),()=>process.exit(1))" && break
      sleep 1
    done
    node /scripts/axe-scan.mjs - /tmp/axe/node_modules/axe-core/axe.min.js /out/dev/axe-dev.json http://127.0.0.1:4322'
docker compose -p "$(basename "$PWD" | tr "[:upper:]" "[:lower:]")-a11y" down
python3 scripts/a11y-scan/summarize.py "$out/axe-build.json" "$out/dev/axe-dev.json"
```

Run it from the root of the repository. With a dev server, requests to other
hosts are only recorded, not blocked, because blocking them stops the app from
loading.
