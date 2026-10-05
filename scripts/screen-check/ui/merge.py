# Usage: python3 merge.py <outDir> <commit>
# Merges the results-*.json that the sec*.mjs wrote into <outDir>/results.json.
import json, collections, glob, os, sys
os.chdir(sys.argv[1])
out = {"commit": sys.argv[2], "files": {}}
allres = []
logs = []
blocked = set()
for f in sorted(glob.glob("results-*.json")):
    d = json.load(open(f))
    out["files"][f] = d
    for r in d["results"]:
        if "result" in r:
            allres.append((f, r["id"], r["result"]))
    logs += [(f, l["step"], l["type"], l["text"][:90].replace("\n", " ")) for l in d["log"]]
    blocked |= set(d["blocked"])
# Write the judgements by hand here after a run.
out["judgement_by_hand"] = {}
json.dump(out, open("results.json", "w"), indent=1)
for x in allres:
    print(x)
print("blocked", blocked)
c = collections.Counter((l[2], l[3]) for l in logs)
for k, v in c.items():
    print(v, k)
