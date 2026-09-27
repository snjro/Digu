#!/usr/bin/env bash
# Runs upgrade-check.mjs in the test service of the new build.
# Usage: scripts/screen-check/upgrade/run.sh <build-dir> <v1.0.2-build-dir> <out-dir> <old|new|grid|probe>
#   Both build folders are made by ../build.sh (the version to check and v1.0.2).
#   <out-dir>: where the results go, outside the repository. Give the same
#   one to every phase: the Chrome profile is <out-dir>/profile.
#   "old" opens the v1.0.2 build, the others the new build, in the same
#   Chrome profile and on the same origin.
#   Run old first, then new, then grid.
#   PROJECT: the Docker Compose project (default: <repo>-sc-upgrade).
#   NEW_LATEST: the fake RPC's latest block in the new phases (#498, optional).
# See ../README.md.
set -euo pipefail

if [[ $# -ne 4 ]]; then
  echo "Usage: $0 <build-dir> <v1.0.2-build-dir> <out-dir> <old|new|grid|probe>" >&2
  exit 2
fi
here=$(cd "$(dirname "$0")" && pwd)
source "$here/../common.sh"
build=$(build_dir "$1")
# v1.0.2 has no compose.yaml.
old=$(realpath -m "$2")
if [[ ! -d $old/_build ]]; then
  echo "$old has no _build; make it with build.sh" >&2
  exit 2
fi
out=$(out_dir "$3")
phase=$4
compose=(docker compose -f "$build/compose.yaml" -p "${PROJECT:-$name-sc-upgrade}")
trap '"${compose[@]}" down >/dev/null 2>&1 || true' EXIT

if [[ $phase == old ]]; then
  app=/old
else
  app=/app/_build
fi
"${compose[@]}" run --rm -T \
  -v "$here:/scripts:ro" -v "$old/_build:/old:ro" -v "$out:/out" -e NEW_LATEST="${NEW_LATEST:-}" \
  test node /scripts/upgrade-check.mjs "$phase" "$app" /out
