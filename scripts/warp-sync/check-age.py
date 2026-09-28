"""Shows how old the warp sync snapshot of each chain is, for release.yml.
Usage: python3 scripts/warp-sync/check-age.py [--at <ISO time>]
  --at: the time of the release (default: now).
Prints a warning for a chain whose last chunk was not made on the day of the
release, by the date in Japan. Writes a table to $GITHUB_STEP_SUMMARY (or to
stdout without it). It only reads the files of the repository, and always
exits 0.
"""
import argparse
import datetime
import glob
import json
import os
import re
import sys

# Asia/Tokyo, which has no daylight saving time.
JST = datetime.timezone(datetime.timedelta(hours=9), "JST")

parser = argparse.ArgumentParser()
parser.add_argument("--at")
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

at = datetime.datetime.now(datetime.timezone.utc)
if args.at:
    try:
        at = parse_time(args.at)
    except ValueError as e:
        warn(f"Warp sync snapshot: cannot read --at {args.at!r} ({e}); the time now is used")
release_day = at.astimezone(JST).date()

rows = []
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
    created_jst = created.astimezone(JST)
    days = (at - created).total_seconds() / 86400
    rows.append(
        [chain, last["file"], created_jst.strftime("%Y-%m-%d %H:%M JST"), f"{to_block:,}", f"{days:.1f}"]
    )
    if created_jst.date() != release_day:
        warn(
            f"The warp sync snapshot of {chain} was made on {created_jst:%Y-%m-%d}, not on the day"
            f" of the release ({release_day}, in Japan); up to block {to_block:,}."
            " Update it with scripts/warp-sync/build-snapshot.mjs before a release."
        )

lines = [
    f"### Warp sync snapshots (release on {release_day}, in Japan)",
    "",
    "| Chain | Last chunk | Created | toBlock | Days |",
    "| --- | --- | --- | --- | --- |",
] + ["| " + " | ".join(r) + " |" for r in rows]
summary = os.environ.get("GITHUB_STEP_SUMMARY")
if summary:
    with open(summary, "a") as f:
        f.write("\n".join(lines) + "\n")
else:
    print("\n".join(lines))
sys.exit(0)
