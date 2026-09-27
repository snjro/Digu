#!/usr/bin/env bash
# Runs real-rpc-check.mjs in the test service of <build-dir>.
# Without --fake, it sends requests to the public RPC of PublicNode.
# Usage: scripts/screen-check/real-rpc/run.sh <build-dir> <out-dir> [--fake] [--only=eth-http,...] [--retry=2]
#   <build-dir>: made by ../build.sh (has compose.yaml, node_modules and _build).
#   <out-dir>: where the results go, outside the repository.
#   PROJECT: the Docker Compose project (default: <repo>-sc-real-rpc).
# See ../README.md.
set -euo pipefail

if [[ $# -lt 2 ]]; then
  echo "Usage: $0 <build-dir> <out-dir> [--fake] [--only=eth-http,...] [--retry=2]" >&2
  exit 2
fi
here=$(cd "$(dirname "$0")" && pwd)
source "$here/../common.sh"
build=$(build_dir "$1")
out=$(out_dir "$2")
shift 2
compose=(docker compose -f "$build/compose.yaml" -p "${PROJECT:-$name-sc-real-rpc}")
trap '"${compose[@]}" down >/dev/null 2>&1 || true' EXIT

"${compose[@]}" run --rm -T \
  -v "$here:/scripts:ro" -v "$out:/out" test node /scripts/real-rpc-check.mjs /app/_build /out "$@"
