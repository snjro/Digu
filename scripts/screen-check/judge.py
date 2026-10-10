"""Judges an <out-dir> of run-all.sh. Prints each failure and exits 1 when
there is one. CHECK and INFO records do not fail.
Usage: python3 judge.py <out-dir>
"""
import json
import os
import sys

# The values of "result" (scripts/check-lib/results.mjs).
FAILING = ("NG", "ERROR")
PASSING = ("OK", "CHECK", "INFO")

# The results file of each step of run-all.sh. Only these files are read:
# --upgrade-b copies an <out-dir> of an older run into upgrade-b/, with its
# other results files.
RESULTS = {
    "ui-sec1-root": "ui/results-sec1-root.json",
    "ui-sec1-digu": "ui/results-sec1-digu.json",
    "ui-sec2": "ui/results-sec2.json",
    "ui-sec3": "ui/results-sec3.json",
    "ui-sec4": "ui/results-sec4.json",
    "ui-sec58": "ui/results-sec58.json",
    "ui-extra": "ui/results-extra.json",
    "sync-check": "sync/results-sync.json",
    "upgrade-old": "upgrade/results-old.json",
    "upgrade-new": "upgrade/results-new.json",
    "upgrade-grid": "upgrade/results-grid.json",
    "upgrade-b-new": "upgrade-b/results-new.json",
    "real-rpc-fake": "real-rpc-fake/results-real-rpc.json",
}
# The steps that write no results; only their exit code is judged.
NO_RESULTS = {
    # merge.py joins the results of ui into ui/results.json for a person.
    "ui-merge",
    # smoke.mjs prints what the fake RPC answers to ethers, before the browser
    # runs. It exits 1 when the chain id or the number of logs is not what the
    # fake RPC should answer, and ends with an exception when ethers fails.
    "sync-smoke",
}


def judge(out):
    """The failures of <out-dir>, one line each."""
    failures = []
    try:
        with open(os.path.join(out, "exit-codes.txt")) as f:
            lines = f.read().splitlines()
    except OSError as e:
        return [f"exit-codes.txt: cannot read ({e})"]

    for line in lines:
        step, code = line.split(" ", 1)
        # "skipped" is upgrade B without --upgrade-b.
        if code.startswith("skipped"):
            continue
        if code != "0":
            failures.append(f"{step}: exit {code}")
        # A step that did not run, or that run-all.sh does not know: the line
        # above is enough.
        if code in ("missing", "not-in-steps") or step in NO_RESULTS:
            continue
        if step not in RESULTS:
            failures.append(f"{step}: judge.py does not know its results file")
            continue
        failures += judge_file(step, os.path.join(out, RESULTS[step]))
    return failures


def judge_file(step, path):
    try:
        with open(path) as f:
            records = json.load(f).get("results")
    except (OSError, ValueError, AttributeError) as e:
        return [f"{step}: cannot read {os.path.basename(path)} ({e})"]
    if not isinstance(records, list) or not records:
        return [f"{step}: no records in {os.path.basename(path)}"]
    failures = []
    for r in records:
        if not isinstance(r, dict):
            failures.append(f"{step}: a record is not an object: {str(r)[:200]}")
            continue
        result = r.get("result")
        if result in PASSING:
            continue
        if result not in FAILING:
            result = f"unknown result {result!r}"
        note = r.get("note")
        if not isinstance(note, str):
            note = json.dumps(note)
        # The first line: an ERROR has the stack.
        first = (note.splitlines() or [""])[0]
        failures.append(f"{step} {r.get('id')}: {result} {first[:200]}")
    return failures


if __name__ == "__main__":
    failures = judge(sys.argv[1])
    for x in failures:
        print(x)
    print(f"{len(failures)} failures")
    sys.exit(1 if failures else 0)
