// Write fake Augur v1 logs to IndexedDB.
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
const require = createRequire(path.join("/app", "package.json"));
const { Interface, id: keccakId } = require("ethers");

function toPlain(v) {
  if (typeof v === "bigint") return { __bigint: v.toString() };
  if (Array.isArray(v)) return [...v].map(toPlain);
  return v;
}
function fakeLogs(abi, eventName, n, startBlock) {
  const iface = new Interface(abi);
  const ev = iface.getEvent(eventName);
  const logs = [];
  for (let i = 0; i < n; i++) {
    const hex = (k, len) =>
      "0x" + keccakId(`${eventName}-${i}-${k}`).slice(2, 2 + len * 2);
    const gen = (t, name, j) => {
      if (t.endsWith("[]"))
        return [0, 1].map((k) => gen(t.slice(0, -2), name, `${j}_${k}`));
      if (t === "address") return hex(`a${j}`, 20);
      if (t === "string") return `Fake ${name} #${i}`;
      if (t.startsWith("bytes")) return hex(`b${j}`, Number(t.slice(5)) || 32);
      if (t === "bool") return i % 2 === 0;
      if (t === "uint8") return BigInt(i % 3);
      if (t.startsWith("uint")) return BigInt(i) * 10n ** 18n + 1234n;
      if (t.startsWith("int")) return BigInt(i % 2 ? -1 : 1) * 10n ** 18n;
      throw new Error("type " + t);
    };
    const values = ev.inputs.map((p, j) => gen(p.type, p.name, j));
    const { data, topics } = iface.encodeEventLog(ev, values);
    const parsed = iface.parseLog({ data, topics });
    logs.push({
      args: toPlain(parsed.args),
      blockNumber: startBlock + i * 1000,
      jsDate: { __date: (1531036621 + i * 15000) * 1000 },
      logIndex: i % 5,
      removed: false,
      transactionHash: hex("tx", 32),
      transactionIndex: i % 7,
    });
  }
  return logs;
}

export async function seed(page, n = 60) {
  const augur = JSON.parse(
    fs.readFileSync(
      "/app/src/constants/chains/ethereum-mainnet/augur/version1/Augur.json",
      "utf8",
    ),
  );
  const start = augur.creation.blockNumber + 10;
  const rows = {
    Augur_MarketCreated: fakeLogs(augur.abi, "MarketCreated", n, start),
  };
  const fetched = start + n * 1000 + 10;
  // Not addScriptTag: the Content Security Policy of the app (#504) blocks an
  // inline script, but not an evaluate (as in scripts/visual-compare/shots.mjs).
  await page.evaluate(
    fs.readFileSync("/app/node_modules/dexie/dist/dexie.min.js", "utf8"),
  );
  return page.evaluate(
    async (seed, fetched) => {
      const revive = (v) => {
        if (Array.isArray(v)) return v.map(revive);
        if (v && typeof v === "object" && "__bigint" in v)
          return BigInt(v.__bigint);
        return v;
      };
      const report = {};
      const db = new window.Dexie("Digu_EventLog_eth_Augur_version1");
      await db.open();
      for (const [table, rows] of Object.entries(seed)) {
        await db.table(table).bulkAdd(
          rows.map((r) => ({
            ...r,
            args: revive(r.args),
            jsDate: new Date(r.jsDate.__date),
          })),
        );
        report[table] = await db.table(table).count();
      }
      const ss = await db.table("SyncStatus").get("Augur");
      ss.fetchedBlockNumber = fetched;
      ss.events.MarketCreated.recordCount = report.Augur_MarketCreated;
      await db.table("SyncStatus").put(ss);
      db.close();
      const cs = new window.Dexie("Digu_ChainStatus");
      await cs.open();
      await cs
        .table("ChainStatus")
        .update("eth", { latestBlockNumber: fetched + 20000 });
      cs.close();
      return report;
    },
    rows,
    fetched,
  );
}
