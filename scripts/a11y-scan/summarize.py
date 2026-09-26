# Summarize axe results: by rule, and by source location (dev run only).
# Usage: python3 summarize.py build.json [dev.json]
# Without dev.json, only the first table is printed. See README.md in this folder.
import json
import sys
from collections import Counter, defaultdict

build = json.load(open(sys.argv[1]))
dev = json.load(open(sys.argv[2])) if len(sys.argv) > 2 else None
pages = list(build["results"].keys())

print("## Problems by page (number of elements)")
rules = sorted({v["id"] for r in build["results"].values() for v in r["violations"]})
impact = {}
for r in build["results"].values():
    for v in r["violations"]:
        impact[v["id"]] = v["impact"]
print("| Rule | Impact | " + " | ".join(pages) + " |")
print("|---|---|" + "---|" * len(pages))
order = {"critical": 0, "serious": 1, "moderate": 2, "minor": 3}
for rule in sorted(rules, key=lambda x: (order[impact[x]], x)):
    row = []
    for p in pages:
        n = sum(len(v["nodes"]) for v in build["results"][p]["violations"] if v["id"] == rule)
        row.append(str(n) if n else "-")
    print(f"| {rule} | {impact[rule]} | " + " | ".join(row) + " |")
totals = [str(sum(len(v["nodes"]) for v in build["results"][p]["violations"])) for p in pages]
print("| Total | | " + " | ".join(totals) + " |")
if dev is None:
    sys.exit()
for r in dev["results"].values():
    for v in r["violations"]:
        impact.setdefault(v["id"], v["impact"])

print()
print("## Rule by source line (dev server; each line once, with the number of elements on all pages)")
by_rule = defaultdict(Counter)
pages_of = defaultdict(set)
for p, r in dev["results"].items():
    for v in r["violations"]:
        for n in v["nodes"]:
            loc = n["loc"] or "(unknown)"
            loc = loc.split("/src/")[-1] if "/src/" in loc else loc
            by_rule[v["id"]][loc] += 1
            pages_of[(v["id"], loc)].add(p)
for rule in sorted(by_rule, key=lambda x: (order[impact[x]], x)):
    print(f"### {rule} ({impact[rule]})")
    for loc, n in by_rule[rule].most_common():
        print(f"- {loc}: {n} ({len(pages_of[(rule, loc)])} pages)")

print()
print("## By file (dev server, all elements)")
by_file = Counter()
rules_of = defaultdict(set)
for p, r in dev["results"].items():
    for v in r["violations"]:
        for n in v["nodes"]:
            loc = n["loc"] or "(unknown)"
            f = loc.split("/src/")[-1].rsplit(":", 1)[0] if "/src/" in loc else loc
            by_file[f] += 1
            rules_of[f].add(v["id"])
for f, n in by_file.most_common():
    print(f"- {f}: {n}（{', '.join(sorted(rules_of[f]))}）")
