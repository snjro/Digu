"""Prints a short summary of a DB dump made by upgrade-check.mjs.
Usage: python3 summarize_db.py <dump.json>
"""
import json
import sys

d = json.load(open(sys.argv[1]))
for n, e in d.items():
    nonempty = {k: v["count"] for k, v in e["stores"].items() if v["count"]}
    print(n, "version", e["version"], "listed", e["listedVersion"],
          "stores", len(e["stores"]), "nonempty", nonempty)
s = d["Digu_Settings"]["stores"]
print("RpcSettings", json.dumps(s["RpcSettings"]["rows"]))
print("UserSettings", s["UserSettings"]["rows"])
print("ChainStatus", d["Digu_ChainStatus"]["stores"]["ChainStatus"]["rows"])
bt = d["Digu_BlockTimes"]["stores"]
print("BlockTimes", {k: v["rows"] for k, v in bt.items()})
for db in ["Digu_EventLog_eth_Augur_version1", "Digu_EventLog_eth_Augur_version2"]:
    st = d.get(db, {}).get("stores", {})
    print("==", db)
    for r in st.get("SyncStatus", {}).get("rows", []):
        ev = {k: v["recordCount"] for k, v in r["events"].items() if v["recordCount"]}
        print(" ", r["name"], "target", r["isSyncTarget"], "fetched",
              r["fetchedBlockNumber"], "creation", r["creationBlockNumber"],
              "state", r["syncStateText"], "syncing", r["isSyncing"],
              "abort", r["isAbort"], "nEvents", len(r["events"]),
              "counts", ev, "keys", sorted(r.keys()) if r["name"] == "Augur" else "")
    for k, v in st.items():
        if k != "SyncStatus" and v["count"]:
            print("  rows", k, json.dumps(v["rows"])[:600])
    print("  Cash tables", [k for k in st if k.startswith("Cash_")])
