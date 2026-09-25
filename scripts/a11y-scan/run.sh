#!/usr/bin/env bash
# Builds this working tree and runs axe-core on its main pages.
# Usage: scripts/a11y-scan/run.sh <out-dir>
# See README.md in this folder.
set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "Usage: $0 <out-dir>" >&2
  exit 2
fi
out_dir=$(realpath -m "$1")
axe_version=4.13.0

scripts_dir=$(cd "$(dirname "$0")" && pwd)
repo=$(git -C "$scripts_dir" rev-parse --show-toplevel)
# Docker Compose project names are lowercase.
project=$(basename "$repo" | tr "[:upper:]" "[:lower:]")-a11y
compose=(docker compose -f "$repo/compose.yaml" -p "$project")

trap '"${compose[@]}" down >/dev/null 2>&1 || true' EXIT

mkdir -p "$out_dir"
"${compose[@]}" run --rm -T app \
  sh -c "npm ci --no-audit --no-fund && npm run build"
"${compose[@]}" run --rm -T \
  -v "$scripts_dir:/scripts:ro" \
  -v "$out_dir:/out" \
  test sh -c "mkdir -p /tmp/axe && cd /tmp/axe && echo {} > package.json \
    && npm i --no-audit --no-fund axe-core@$axe_version \
    && cd /app \
    && node /scripts/axe-scan.mjs _build /tmp/axe/node_modules/axe-core/axe.min.js /out/axe-build.json"
python3 "$scripts_dir/summarize.py" "$out_dir/axe-build.json" >"$out_dir/summary.md"
echo "Wrote $out_dir/summary.md"
