#!/usr/bin/env bash
# Used by release.yml: passes when the screen check workflow (screen-check.yml)
# succeeded on <sha>. While a run of it on <sha> is queued or in progress, it
# waits, up to WAIT_SECONDS (default 1800), and looks again every 30 s.
# Usage: scripts/screen-check/wait-for-pass.sh <sha>
#   Needs gh with a token that can read Actions, and GITHUB_REPOSITORY.
set -euo pipefail

sha=$1
deadline=$((SECONDS + ${WAIT_SECONDS:-1800}))
url=${GITHUB_SERVER_URL:-https://github.com}/$GITHUB_REPOSITORY/actions/workflows/screen-check.yml
while true; do
  runs=$(gh api "repos/$GITHUB_REPOSITORY/actions/workflows/screen-check.yml/runs?head_sha=$sha" \
    --jq '[.workflow_runs[] | {status, conclusion}]')
  if jq -e 'any(.[]; .conclusion == "success")' <<<"$runs" >/dev/null; then
    echo "The screen check passed on $sha"
    exit 0
  fi
  if ! jq -e 'any(.[]; .status != "completed")' <<<"$runs" >/dev/null; then
    if jq -e 'length == 0' <<<"$runs" >/dev/null; then
      echo "::error::The screen check has not run on $sha. Run it with 'gh workflow run screen-check.yml --ref <tag>', then run this release again."
    else
      echo "::error::The screen check failed on $sha ($url). Fix it, or run it again, then run this release again."
    fi
    exit 1
  fi
  if [[ $SECONDS -ge $deadline ]]; then
    echo "::error::The screen check on $sha did not end in time. Run this release again after it ends."
    exit 1
  fi
  echo "Waiting for the screen check on $sha"
  sleep 30
done
