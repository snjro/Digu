"""Judges an <out-dir> of run-all.sh. Prints each failure and exits 1 when
there is one. CHECK steps are left to a person and do not fail.
Usage: python3 judge.py <out-dir>
"""
import glob
import json
import os
import sys

out = sys.argv[1]
failures = []


def load(p):
    try:
        with open(p) as f:
            return json.load(f)
    except (OSError, ValueError) as e:
        failures.append(f"{os.path.relpath(p, out)}: cannot read ({e})")
        return None


def false_oks(x, path=""):
    """The paths of every "ok": false under x."""
    if isinstance(x, dict):
        for k, v in x.items():
            if k == "ok" and v is False:
                yield path
            else:
                yield from false_oks(v, f"{path}/{k}")
    elif isinstance(x, list):
        for i, v in enumerate(x):
            yield from false_oks(v, f"{path}[{i}]")


# A step that did not end with 0. "skipped" is upgrade B without --upgrade-b.
with open(os.path.join(out, "exit-codes.txt")) as f:
    for line in f.read().splitlines():
        step, code = line.split(" ", 1)
        if code != "0" and not code.startswith("skipped"):
            failures.append(f"{step}: exit {code}")

# ui: NG and ERROR (an exception in the script).
for p in sorted(glob.glob(os.path.join(out, "ui", "results-*.json"))):
    for r in (load(p) or {}).get("results", []):
        if r.get("result") in ("NG", "ERROR"):
            failures.append(f"ui {r['id']}: {r['result']} {str(r.get('note', ''))[:200]}")

# sync: a false "ok", and an exception in a scenario.
sync = load(os.path.join(out, "sync", "results.json"))
if sync:
    for scenario, v in sync["results"].items():
        for p in false_oks(v):
            failures.append(f"sync {scenario}{p}: ok is false")
        if "error" in v:
            failures.append(f"sync {scenario}: {v['error'].splitlines()[0][:200]}")

# upgrade: an exception, and a [check] line with " NG:" (a failed check).
for p in sorted(glob.glob(os.path.join(out, "upgrade*", "log-*.txt"))):
    with open(p) as f:
        for line in f:
            if line.startswith("[script-error]"):
                failures.append(f"{os.path.relpath(p, out)}: {line.strip()[:200]}")
            elif line.startswith("[check]") and " NG:" in line:
                # The record before " NG:" can be long; keep the name and the reason.
                i = line.index(" NG:")
                name = line[:i].split(":", 1)[0]
                failures.append(f"{os.path.relpath(p, out)}: {(name + line[i:]).strip()[:200]}")

# real-rpc --fake: 1, 2 and 3 ok in the http runs. A WebSocket cannot be
# faked, so the wss runs end at "1 helper" with an error.
rpc = load(os.path.join(out, "real-rpc-fake", "results.json"))
if rpc:
    for run, v in rpc["results"].items():
        if not run.endswith("-http"):
            continue
        for key in ("1 helper", "2 goal", "3 sync"):
            if not (v.get(key) or {}).get("ok"):
                failures.append(f"real-rpc {run} {key}: not ok")
        if "error" in v:
            failures.append(f"real-rpc {run}: {v['error'].splitlines()[0][:200]}")

for x in failures:
    print(x)
print(f"{len(failures)} failures")
sys.exit(1 if failures else 0)
