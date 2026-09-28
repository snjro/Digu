#!/usr/bin/env bash
# Runs the checks before a release on one build, a few at a time: ui (all the
# scripts and merge.py), sync (smoke.mjs and sync-check.mjs), upgrade A (old,
# new, grid), upgrade B (new) and real-rpc --fake. No request leaves the
# containers. The build is not made here; run build.sh first.
# Usage: scripts/screen-check/run-all.sh <build-dir> <v1.0.2-build-dir> <out-dir> [--jobs=N] [--upgrade-b=<dir>]
#   <build-dir>, <v1.0.2-build-dir>: made by build.sh.
#   <out-dir>: a new or empty folder outside the repository.
#   --jobs=N: how many checks run at once (default 4). With 1, they run one by
#     one in the order of README.md.
#   --upgrade-b=<dir>: an <out-dir> of upgrade/run.sh to start upgrade B from,
#     such as the Chrome profile of an older version. It is copied to
#     <out-dir>/upgrade-b and the new phase runs on the copy. Without it,
#     upgrade B is skipped.
# Each check goes on after a failure. Every step writes log-<step>.txt; at the
# end, exit-codes.txt and times.txt list the steps. Exits 1 when a step failed.
# See README.md in this folder.
set -uo pipefail

# wait -n needs bash 4.3.
if ((BASH_VERSINFO[0] < 4 || (BASH_VERSINFO[0] == 4 && BASH_VERSINFO[1] < 3))); then
  echo "run-all.sh needs bash 4.3 or later" >&2
  exit 2
fi
if ! command -v flock >/dev/null; then
  echo "run-all.sh needs flock (util-linux)" >&2
  exit 2
fi

usage="Usage: $0 <build-dir> <v1.0.2-build-dir> <out-dir> [--jobs=N] [--upgrade-b=<dir>]"
if [[ $# -lt 3 ]]; then
  echo "$usage" >&2
  exit 2
fi
here=$(cd "$(dirname "$0")" && pwd)
source "$here/common.sh"
build=$(build_dir "$1") || exit 2
old=$(realpath -m "$2")
if [[ ! -d $old/_build ]]; then
  echo "$old has no _build; make it with build.sh" >&2
  exit 2
fi
if [[ -n $(ls -A "$3" 2>/dev/null) ]]; then
  echo "$3 is not empty; give a new folder" >&2
  exit 2
fi
out=$(out_dir "$3") || exit 2
shift 3
jobs=4
upgrade_b=
for arg in "$@"; do
  case $arg in
    --jobs=*) jobs=${arg#--jobs=} ;;
    --upgrade-b=*) upgrade_b=$(realpath -m "${arg#--upgrade-b=}") ;;
    *)
      echo "$usage" >&2
      exit 2
      ;;
  esac
done
if [[ ! $jobs =~ ^[1-9][0-9]*$ ]]; then
  echo "--jobs must be a number above 0" >&2
  exit 2
fi
if [[ -n $upgrade_b && ! -d $upgrade_b ]]; then
  echo "$upgrade_b is not a folder" >&2
  exit 2
fi

# One run at a time: two runs at once load the machine twice.
exec {lock}>"${XDG_RUNTIME_DIR:-/tmp}/digu-screen-check.lock"
if ! flock -n "$lock"; then
  echo "Waiting for another run-all.sh to finish" >&2
  flock "$lock"
fi

# A Docker Compose project for each lane, unique to this run (#493).
prefix=$name-sc-$$
status=$out/status
mkdir -p "$status"

# The checks run in the background ignore Ctrl-C; stop them with the script.
trap 'trap - TERM; kill 0; exit 130' INT TERM

# Runs a step and writes "<step> <exit code> <start> <end>" to status/<step>.
step() {
  local name=$1 start code
  shift
  start=$(date +%s)
  "$@" >"$out/log-$name.txt" 2>&1
  code=$?
  echo "$name $code $start $(date +%s)" >"$status/$name"
}

ui() {
  step "$1" env PROJECT="$prefix-$1" "$here/ui/run.sh" "$build" "$out/ui" "${@:2}"
}

# A lane is steps that run one after another.
lane() {
  case $1 in
    ui-sec1-root) ui "$1" sec1.mjs root ;;
    ui-sec1-digu) ui "$1" sec1.mjs digu ;;
    ui-sec2 | ui-sec3 | ui-sec4 | ui-sec58 | ui-extra) ui "$1" "${1#ui-}.mjs" ;;
    sync)
      step sync-smoke env PROJECT="$prefix-sync" "$here/sync/run.sh" "$build" "$out/sync-smoke" smoke.mjs
      step sync-check env PROJECT="$prefix-sync" "$here/sync/run.sh" "$build" "$out/sync" sync-check.mjs
      ;;
    # The phases share the Chrome profile in <out-dir>/upgrade.
    upgrade-a)
      for phase in old new grid; do
        step "upgrade-$phase" env PROJECT="$prefix-upgrade-a" \
          "$here/upgrade/run.sh" "$build" "$old" "$out/upgrade" "$phase"
      done
      ;;
    upgrade-b)
      cp -a "$upgrade_b" "$out/upgrade-b"
      step upgrade-b-new env PROJECT="$prefix-upgrade-b" \
        "$here/upgrade/run.sh" "$build" "$old" "$out/upgrade-b" new
      ;;
    real-rpc-fake)
      step "$1" env PROJECT="$prefix-real-rpc" "$here/real-rpc/run.sh" "$build" "$out/real-rpc-fake" --fake
      ;;
  esac
}

lanes=(ui-sec1-root ui-sec1-digu ui-sec2 ui-sec3 ui-sec4 ui-sec58 ui-extra sync upgrade-a upgrade-b real-rpc-fake)
if [[ $jobs -gt 1 ]]; then
  # The longest first, by the times of a run before v1.2.0.
  lanes=(ui-sec58 sync ui-sec4 upgrade-a real-rpc-fake ui-sec1-digu ui-sec1-root upgrade-b ui-sec3 ui-sec2 ui-extra)
fi

begin=$(date +%s)
running=0
for l in "${lanes[@]}"; do
  if [[ $l == upgrade-b && -z $upgrade_b ]]; then
    continue
  fi
  if [[ $running -ge $jobs ]]; then
    wait -n
    running=$((running - 1))
  fi
  lane "$l" &
  running=$((running + 1))
done
wait
step ui-merge python3 "$here/ui/merge.py" "$out/ui" "$(cat "$build/COMMIT")"
end=$(date +%s)

steps=(ui-sec1-root ui-sec1-digu ui-sec2 ui-sec3 ui-sec4 ui-sec58 ui-extra ui-merge
  sync-smoke sync-check upgrade-old upgrade-new upgrade-grid upgrade-b-new real-rpc-fake)
failed=0
: >"$out/exit-codes.txt"
echo "step exit start end seconds" >"$out/times.txt"
for s in "${steps[@]}"; do
  if [[ $s == upgrade-b-new && -z $upgrade_b ]]; then
    echo "$s skipped (no --upgrade-b)" >>"$out/exit-codes.txt"
    continue
  fi
  if [[ ! -f $status/$s ]]; then
    echo "$s missing" >>"$out/exit-codes.txt"
    failed=1
    continue
  fi
  read -r n code start stop <"$status/$s"
  echo "$n $code" >>"$out/exit-codes.txt"
  echo "$n $code $start $stop $((stop - start))" >>"$out/times.txt"
  [[ $code -eq 0 ]] || failed=1
done
echo "all $failed $begin $end $((end - begin)) jobs=$jobs" >>"$out/times.txt"
cat "$out/exit-codes.txt"
echo "Took $((end - begin)) s with --jobs=$jobs. Results in $out"
exit "$failed"
