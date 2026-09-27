#!/usr/bin/env bash
# Copies <ref> of this repository into <build-dir> with git archive and builds
# it in Docker. The repository is only read: no worktree, no checkout.
# Usage: scripts/screen-check/build.sh <ref> <build-dir>
#   <ref>: a branch, a commit or a tag, such as develop or v1.0.2.
#   <build-dir>: a new folder outside the repository.
#   PROJECT: the Docker Compose project (default: <repo>-sc-build).
# The ref and its commit are written to <build-dir>/COMMIT.
# With compose.yaml, the app service (node:24-slim) builds it. Without it
# (v1.0.2 and older), node:20-slim builds it.
# See README.md in this folder.
set -euo pipefail

if [[ $# -ne 2 ]]; then
  echo "Usage: $0 <ref> <build-dir>" >&2
  exit 2
fi
ref=$1
dir=$(realpath -m "$2")

scripts_dir=$(cd "$(dirname "$0")" && pwd)
repo=$(git -C "$scripts_dir" rev-parse --show-toplevel)
# Docker Compose project names are lowercase.
name=$(basename "$repo" | tr "[:upper:]" "[:lower:]")

if [[ -e $dir ]]; then
  echo "$dir exists; give a new folder" >&2
  exit 2
fi
if [[ $dir == "$repo" || $dir == "$repo"/* ]]; then
  echo "Refusing to use $dir as <build-dir>: it is in the repository" >&2
  exit 2
fi

commit=$(git -C "$repo" rev-parse "$ref^{commit}")
mkdir -p "$dir"
git -C "$repo" archive "$commit" | tar -x -C "$dir"
echo "$ref $commit" >"$dir/COMMIT"

if [[ -f $dir/compose.yaml ]]; then
  project=${PROJECT:-$name-sc-build}
  docker compose -f "$dir/compose.yaml" -p "$project" run --rm -T \
    -e PUPPETEER_SKIP_DOWNLOAD=1 app \
    sh -c "npm ci --no-audit --no-fund && npm run build"
  docker compose -f "$dir/compose.yaml" -p "$project" down
else
  # The same user as in compose.yaml.
  docker run --rm -u 1001:1001 -e HOME=/tmp -e PUPPETEER_SKIP_DOWNLOAD=1 \
    -v "$dir:/app" -w /app node:20-slim \
    sh -c "npm ci --no-audit --no-fund && npm run build"
fi
echo "Built $ref ($commit) in $dir/_build: $(find "$dir/_build" -name '*.html' | wc -l) HTML files"
