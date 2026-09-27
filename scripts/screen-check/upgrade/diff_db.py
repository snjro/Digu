"""Lists the differences between two DB dumps made by upgrade-check.mjs.
Usage: python3 diff_db.py <before.json> <after.json>
"""
import json
import sys

a = json.load(open(sys.argv[1]))
b = json.load(open(sys.argv[2]))


def walk(x, y, p):
    if isinstance(x, dict) and isinstance(y, dict):
        for k in sorted(set(x) | set(y)):
            if k not in x:
                print("+", p + "/" + k, json.dumps(y[k])[:200])
            elif k not in y:
                print("-", p + "/" + k, json.dumps(x[k])[:200])
            else:
                walk(x[k], y[k], p + "/" + k)
    elif isinstance(x, list) and isinstance(y, list) and len(x) == len(y):
        for i, (u, v) in enumerate(zip(x, y)):
            walk(u, v, f"{p}[{i}]")
    elif x != y:
        print("~", p, json.dumps(x)[:200], "->", json.dumps(y)[:200])


walk(a, b, "")
