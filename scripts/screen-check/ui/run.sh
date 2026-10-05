#!/usr/bin/env bash
# Runs a script of this folder in the test service (Chrome of puppeteer) of <build-dir>.
# Usage: scripts/screen-check/ui/run.sh <build-dir> <out-dir> <script.mjs> [args]
#   <build-dir>: made by ../build.sh (has compose.yaml, node_modules and _build).
#   <out-dir>: where the results go, outside the repository.
#   PROJECT: the Docker Compose project (default: <repo>-sc-ui).
# Example: scripts/screen-check/ui/run.sh ../digu-build ../sc-out/ui sec1.mjs root --only=1-1
# See ../README.md.
set -euo pipefail

if [[ $# -lt 3 ]]; then
  echo "Usage: $0 <build-dir> <out-dir> <script.mjs> [args]" >&2
  exit 2
fi
here=$(cd "$(dirname "$0")" && pwd)
source "$here/../common.sh"
build=$(build_dir "$1")
out=$(out_dir "$2")
shift 2
compose=(docker compose -f "$build/compose.yaml" -p "${PROJECT:-$name-sc-ui}")
trap '"${compose[@]}" down >/dev/null 2>&1 || true' EXIT

mkdir -p "$out/shots"
"${compose[@]}" run --rm -T \
  -v "$repo/scripts:/scripts:ro" -v "$out:/out" test node "/scripts/screen-check/ui/$1" "${@:2}"
