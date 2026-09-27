#!/usr/bin/env bash
# Runs public-site-check.mjs in the test service of <build-dir>. It only reads
# the public site; <build-dir> gives the node_modules with puppeteer.
# Usage: scripts/screen-check/public-site/run.sh <build-dir> <out-dir> <version>
#   <build-dir>: made by ../build.sh (has compose.yaml and node_modules).
#   <out-dir>: where the results go, outside the repository.
#   <version>: the version expected in the footer, such as 1.1.0.
#   PROJECT: the Docker Compose project (default: <repo>-sc-public-site).
# See ../README.md.
set -euo pipefail

if [[ $# -ne 3 ]]; then
  echo "Usage: $0 <build-dir> <out-dir> <version>" >&2
  exit 2
fi
here=$(cd "$(dirname "$0")" && pwd)
source "$here/../common.sh"
build=$(build_dir "$1")
out=$(out_dir "$2")
compose=(docker compose -f "$build/compose.yaml" -p "${PROJECT:-$name-sc-public-site}")
trap '"${compose[@]}" down >/dev/null 2>&1 || true' EXIT

"${compose[@]}" run --rm -T \
  -v "$here:/scripts:ro" -v "$out:/out" test node /scripts/public-site-check.mjs /out "$3"
