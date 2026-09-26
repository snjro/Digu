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
# run.sh puts this file in <out-dir>, so a run that stopped halfway can be run again.
marker=.visual-compare
# True when <out-dir> has only the marker and what shots.mjs and compare.mjs write.
has_only_run_files() {
  local name
  while IFS= read -r name; do
    case $name in
      "$marker" | report.md | base | head | diff) ;;
      *) return 1 ;;
    esac
  done < <(ls -A "$out_dir")
}
if [[ -d $out_dir && -n $(ls -A "$out_dir") && ! -f $out_dir/report.md ]]; then
  if [[ ! -f $out_dir/$marker ]]; then
    refuse "it is not empty and has no report.md or $marker of an earlier run"
  fi
  if ! has_only_run_files; then
    refuse "it has $marker but also files that run.sh does not make"
  fi
fi

tmp=$(mktemp -d)
# Makes the Docker Compose projects unique for each run, so that runs from the
# same checkout do not share them. Project names have no uppercase letters or ".".
run_id=$(basename "$tmp" | tr "[:upper:]" "[:lower:]" | tr -cd "a-z0-9")
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

# The screenshots use the Chrome of the test image. The app image has no unzip,
# so the Chrome that puppeteer downloads there cannot be extracted anyway.
build() {
  docker compose -f "$1/compose.yaml" -p "$2" run --rm -T -e PUPPETEER_SKIP_DOWNLOAD=1 app \
    sh -c "npm ci --no-audit --no-fund && npm run build"
}

checkout base "$base_ref"
base_dir=$tmp/base
projects+=("$name-vc-$run_id-base")
build "$base_dir" "$name-vc-$run_id-base"

if [[ -n $head_ref ]]; then
  checkout head "$head_ref"
  head_dir=$tmp/head
else
  head_dir=$repo
fi
head_project="$name-vc-$run_id-head"
projects+=("$head_project")
build "$head_dir" "$head_project"

rm -rf "$out_dir"
mkdir -p "$out_dir"
touch "$out_dir/$marker"
# Runs <command...> in the test service of the head, with the scripts of this
# working tree, the base build at /base and <out-dir> at /out.
run_test() {
  docker compose -f "$head_dir/compose.yaml" -p "$head_project" run --rm -T \
    -v "$scripts_dir:/scripts:ro" \
    -v "$base_dir/_build:/base:ro" \
    -v "$out_dir:/out" \
    test "$@"
}

# One run at a time on this machine takes the screenshots. With more Chromes at
# once, some screenshots were blank or timed out.
exec {lock}>"${XDG_RUNTIME_DIR:-/tmp}/digu-visual-compare.lock"
if ! flock -n "$lock"; then
  echo "Waiting for another visual-compare to finish its screenshots" >&2
  flock "$lock"
fi
run_test node /scripts/shots.mjs /base /out/base &
base_pid=$!
run_test node /scripts/shots.mjs _build /out/head &
head_pid=$!
shots_status=0
wait "$base_pid" || shots_status=$?
wait "$head_pid" || shots_status=$?
flock -u "$lock"
if [[ $shots_status -ne 0 ]]; then
  exit "$shots_status"
fi
run_test node /scripts/compare.mjs /out/base /out/head /out
