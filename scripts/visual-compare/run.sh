#!/usr/bin/env bash
# Builds two versions of the app and compares their screenshots.
# Usage: scripts/visual-compare/run.sh <base-ref> <out-dir> [<head-ref>]
# Without <head-ref>, the head is this working tree, with its uncommitted changes.
# See README.md in this folder.
set -euo pipefail

if [[ $# -lt 2 ]]; then
  echo "Usage: $0 <base-ref> <out-dir> [<head-ref>]" >&2
  exit 2
fi
base_ref=$1
out_dir=$(realpath -m "$2")
head_ref=${3:-}

scripts_dir=$(cd "$(dirname "$0")" && pwd)
repo=$(git -C "$scripts_dir" rev-parse --show-toplevel)
# Docker Compose project names are lowercase.
name=$(basename "$repo" | tr "[:upper:]" "[:lower:]")

# <out-dir> is deleted later, so refuse a path that looks like a mistake.
refuse() {
  echo "Refusing to use $out_dir as <out-dir>: $1" >&2
  exit 2
}
home=$(realpath -m "$HOME")
if [[ $out_dir == / || $out_dir == "$home" ]]; then
  refuse "it is / or \$HOME"
fi
if [[ $out_dir == "$repo" || $out_dir == "$repo"/* ]]; then
  refuse "it is in the repository"
fi
if [[ $repo == "$out_dir"/* ]]; then
  refuse "it contains the repository"
fi
if [[ -e $out_dir && ! -d $out_dir ]]; then
  refuse "it is not a folder"
fi
if [[ -d $out_dir && -n $(ls -A "$out_dir") && ! -f $out_dir/report.md ]]; then
  refuse "it is not empty and has no report.md of an earlier run"
fi

tmp=$(mktemp -d)
worktrees=()
projects=()

cleanup() {
  for project in "${projects[@]}"; do
    docker compose -p "$project" down >/dev/null 2>&1 || true
  done
  for worktree in "${worktrees[@]}"; do
    git -C "$repo" worktree remove --force "$worktree" || true
  done
  rm -rf "$tmp"
}
trap cleanup EXIT

# Checks out <ref> into the temporary worktree $tmp/<name>.
checkout() {
  git -C "$repo" worktree add --detach "$tmp/$1" "$2"
  worktrees+=("$tmp/$1")
}

build() {
  docker compose -f "$1/compose.yaml" -p "$2" run --rm -T app \
    sh -c "npm ci --no-audit --no-fund && npm run build"
}

checkout base "$base_ref"
base_dir=$tmp/base
projects+=("$name-vc-base")
build "$base_dir" "$name-vc-base"

if [[ -n $head_ref ]]; then
  checkout head "$head_ref"
  head_dir=$tmp/head
else
  head_dir=$repo
fi
head_project="$name-vc-head"
projects+=("$head_project")
build "$head_dir" "$head_project"

rm -rf "$out_dir"
mkdir -p "$out_dir"
docker compose -f "$head_dir/compose.yaml" -p "$head_project" run --rm -T \
  -v "$scripts_dir:/scripts:ro" \
  -v "$base_dir/_build:/base:ro" \
  -v "$out_dir:/out" \
  test sh -c "node /scripts/shots.mjs /base /out/base \
    && node /scripts/shots.mjs _build /out/head \
    && node /scripts/compare.mjs /out/base /out/head /out"
