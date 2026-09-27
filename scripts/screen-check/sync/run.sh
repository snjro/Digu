#!/usr/bin/env bash
# Runs sync-check.mjs (or smoke.mjs) in the test service of <build-dir>.
# Usage: scripts/screen-check/sync/run.sh <build-dir> <out-dir> sync-check.mjs [S1,S2,S3,S4,S5]
#        scripts/screen-check/sync/run.sh <build-dir> <out-dir> smoke.mjs
#   <build-dir>: made by ../build.sh (has compose.yaml, node_modules and _build).
#   <out-dir>: where the results go, outside the repository.
#   PROJECT: the Docker Compose project (default: <repo>-sc-sync).
#   S3_MODES: only these modes of S3, for example nullBlock,errorOnce.
# See ../README.md.
set -euo pipefail

if [[ $# -lt 3 ]]; then
  echo "Usage: $0 <build-dir> <out-dir> <sync-check.mjs|smoke.mjs> [scenarios]" >&2
  exit 2
fi
here=$(cd "$(dirname "$0")" && pwd)
source "$here/../common.sh"
build=$(build_dir "$1")
out=$(out_dir "$2")
script=$3
shift 3
compose=(docker compose -f "$build/compose.yaml" -p "${PROJECT:-$name-sc-sync}")
trap '"${compose[@]}" down >/dev/null 2>&1 || true' EXIT

env=()
if [[ -n ${S3_MODES:-} ]]; then
  env=(-e "S3_MODES=$S3_MODES")
fi
args=()
if [[ $script == sync-check.mjs ]]; then
  args=(/app/_build /out "$@")
fi
"${compose[@]}" run --rm -T "${env[@]}" \
  -v "$here:/scripts:ro" -v "$out:/out" test node "/scripts/$script" "${args[@]}"
