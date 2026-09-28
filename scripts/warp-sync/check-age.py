"""Shows how old the warp sync snapshot of each chain is, for release.yml.
Usage: python3 scripts/warp-sync/check-age.py --at <ISO time> [--max-days 30]
  --at: the time to count the days to, such as the time of the tagged commit.
  --max-days: prints a warning for a chain whose last chunk is older.
Writes a table to $GITHUB_STEP_SUMMARY (or to stdout without it) and prints
::warning:: lines. It only reads the files of the repository, and always
exits 0.
"""
import argparse
import datetime
import glob
import json
import os
import re
import sys

parser = argparse.ArgumentParser()
parser.add_argument("--at", required=True)
parser.add_argument("--max-days", type=float, default=30)
args = parser.parse_args()

root = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..")


def parse_time(text):
    return datetime.datetime.fromisoformat(text.replace("Z", "+00:00"))


def warn(text):
    print(f"::warning::{text}")


# The name of each chain in src/constants/chains/<folder>/_index.ts.
chains = []
for index in sorted(glob.glob(os.path.join(root, "src/constants/chains/*/_index.ts"))):
    with open(index) as f:
        match = re.search(r'^\s*name:\s*"([^"]+)"', f.read(), re.M)
    if match:
        chains.append(match.group(1))

rows = []
try:
    at = parse_time(args.at)
except ValueError as e:
    warn(f"Warp sync snapshot: cannot read --at {args.at!r} ({e})")
    at = None
for chain in chains:
    path = os.path.join(root, "static/warp-sync", chain, "manifest.json")
    if not os.path.exists(path):
        rows.append([chain, "No snapshot", "", "", ""])
        continue
    try:
        with open(path) as f:
            last = json.load(f)["chunks"][-1]
        created = parse_time(last["createdAt"])
        to_block = max(c["toBlock"] for c in last["contracts"])
    except (OSError, ValueError, KeyError, IndexError, TypeError) as e:
        warn(f"Warp sync snapshot of {chain}: cannot read {os.path.relpath(path, root)} ({e!r})")
        rows.append([chain, "Cannot read the manifest", "", "", ""])
        continue
    days = "" if at is None else f"{(at - created).total_seconds() / 86400:.1f}"
    rows.append([chain, last["file"], last["createdAt"], f"{to_block:,}", days])
    if days and float(days) > args.max_days:
        warn(
            f"The warp sync snapshot of {chain} is {days} days old (created {last['createdAt']},"
            f" up to block {to_block:,}); more than {args.max_days:g} days."
            " Update it with scripts/warp-sync/build-snapshot.mjs before a release."
        )

lines = [
    f"### Warp sync snapshots (at {args.at}, warning after {args.max_days:g} days)",
    "",
    "| Chain | Last chunk | createdAt | toBlock | Days |",
    "| --- | --- | --- | --- | --- |",
] + ["| " + " | ".join(r) + " |" for r in rows]
summary = os.environ.get("GITHUB_STEP_SUMMARY")
if summary:
    with open(summary, "a") as f:
        f.write("\n".join(lines) + "\n")
else:
    print("\n".join(lines))
sys.exit(0)
