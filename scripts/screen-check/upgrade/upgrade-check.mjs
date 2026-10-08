// Upgrade check: data made by v1.0.2 (Dexie 3) opened by the new build (Dexie 4).
// Runs in the compose "test" service.
// Usage: node upgrade-check.mjs <old|new|grid|probe> <buildDir> <outDir>
// The same Chrome profile (<outDir>/profile) and the same origin are used by
// all phases. Only localhost and the fake RPC are answered; every other
// request is aborted.
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import {
  handleRequests,
  logPageProblems,
  serveBuild,
} from "../../check-lib/browser.mjs";
import {
  RPC_INPUT,
  clickByTooltip,
  clickToggle,
  inPage,
  openSyncPanel,
  typeInto,
} from "../../check-lib/app.mjs";
import { createResults } from "../../check-lib/results.mjs";

const require = createRequire("/app/package.json");
const puppeteer = require("puppeteer");
const { ethers } = require("ethers");

const [phase, buildDir, outDir] = process.argv.slice(2);
const shotDir = path.join(outDir, `shots-${phase}`);
fs.mkdirSync(shotDir, { recursive: true });
const profileDir = path.join(outDir, "profile");

const PORT = 4173;
const ORIGIN = `http://localhost:${PORT}`;
const FAKE_RPC = "http://fake-rpc.invalid/";
const AUGUR = "0x75228dce4d82566d93068a8d5d49435216551599";
// #498: the develop build syncs only up to latest - confirmationBlocks (eth 96),
// so the new phases add it to reach the same Goal as before #498 (5926679, above
// the third fake log at 5926600). v1.0.2 has no confirmation depth.
const CONFIRMATION_BLOCKS = Number(
  fs
    .readFileSync(
      "/app/src/constants/chains/ethereum-mainnet/_index.ts",
      "utf8",
    )
    .match(/confirmationBlocks:\s*(\d+)/)[1],
);
// The sync toggle of v1.0.2 has no name; only the old phase finds it by its
// tooltips.
const OLD_TEXTS = { oldTexts: phase === "old" };
// NEW_LATEST (env): the latest block of the new phases, for #498 with
// Current > Goal (e.g. 5926479 gives the Goal 5926383, below what v1.0.2 fetched).
const LATEST =
  phase === "old"
    ? 5926479
    : Number(process.env.NEW_LATEST || 5926679 + CONFIRMATION_BLOCKS);
// Settings DB version 2: the upgrade removes these from each RPC setting and
// keeps the rest (v1.0.2 has no warpSync).
const REMOVED_RPC_SETTINGS = [
  "bulkUnit",
  "chainExplorerIndex",
  "blockIntervalMs",
  "tryCount",
  "abortWatchIntervalMs",
];
const SETTINGS_VERSION = Number(
  fs
    .readFileSync("/app/src/db/constants.ts", "utf8")
    .match(/Settings:\s*(\d+)/)[1],
);
const log = [];
const steps = [];
let stepName = "start";
// judge.py reads results-<phase>.json; log-<phase>.txt is for a person.
const results = createResults({
  file: path.join(outDir, `results-${phase}.json`),
});
// Write a record and its [check] line in the log: check() OK or NG, note()
// INFO.
function add(id, result, text) {
  results.add(`${phase} ${id}`, result, text);
  log.push(`[check] ${id}: ${result} ${text}`);
}
const check = (id, ok, text) => add(id, ok ? "OK" : "NG", text);
const note = (id, text) => add(id, "INFO", text);

const server = serveBuild(buildDir, {
  headers: { "cache-control": "no-store" },
});

// Fake logs: Augur.TimestampSet at 5926300 and Augur.UniverseForked at 5926350
// (in the old phase range), and TimestampSet at 5926600 (new phase only).
const augurAbi = JSON.parse(
  fs.readFileSync(
    "/app/src/constants/chains/ethereum-mainnet/augur/version1/Augur.json",
    "utf8",
  ),
).abi;
const iface = new ethers.Interface(augurAbi);
const hex = (n) => "0x" + n.toString(16);
const hash32 = (s) => ethers.id(s);
function makeLog(eventName, values, blockNumber, logIndex) {
  const { data, topics } = iface.encodeEventLog(eventName, values);
  return {
    address: AUGUR,
    topics,
    data,
    blockNumber: hex(blockNumber),
    blockHash: hash32(`block${blockNumber}`),
    transactionHash: hash32(`tx${blockNumber}-${logIndex}`),
    transactionIndex: "0x0",
    logIndex: hex(logIndex),
    removed: false,
  };
}
const FAKE_LOGS = [
  makeLog("TimestampSet", [1530000000n], 5926300, 0),
  makeLog(
    "UniverseForked",
    ["0x1111111111111111111111111111111111111111"],
    5926350,
    1,
  ),
  makeLog("TimestampSet", [1530009999n], 5926600, 2),
];
function getLogs(filter) {
  const from = parseInt(filter.fromBlock, 16);
  const to = parseInt(filter.toBlock, 16);
  const t0 = filter.topics?.[0];
  return FAKE_LOGS.filter(
    (l) =>
      (filter.address ?? "").toLowerCase() === AUGUR &&
      // The app sends the events of a range as an OR list on topic 0.
      (Array.isArray(t0) ? t0.includes(l.topics[0]) : l.topics[0] === t0) &&
      parseInt(l.blockNumber, 16) >= from &&
      parseInt(l.blockNumber, 16) <= to,
  );
}
function getBlock(tag) {
  const n = parseInt(tag, 16);
  return {
    number: hex(n),
    hash: hash32(`block${n}`),
    parentHash: hash32(`block${n - 1}`),
    timestamp: hex(1530000000 + (n - 5926000) * 15),
    nonce: "0x0000000000000000",
    difficulty: "0x1",
    gasLimit: "0x7a1200",
    gasUsed: "0x0",
    miner: "0x0000000000000000000000000000000000000000",
    extraData: "0x",
    transactions: [],
  };
}
function rpcResult(method, params) {
  switch (method) {
    case "eth_chainId":
      return "0x1";
    case "net_version":
      return "1";
    case "eth_blockNumber":
      return hex(LATEST);
    case "eth_getLogs":
      return getLogs(params[0]);
    case "eth_getBlockByNumber":
      return getBlock(params[0]);
    default:
      return null;
  }
}
const rpcCount = {};
const getLogsCalls = [];
function answerRpc(req) {
  if (req.method() === "OPTIONS") {
    req.respond({
      status: 204,
      headers: {
        "access-control-allow-origin": "*",
        "access-control-allow-methods": "POST, GET, OPTIONS",
        "access-control-allow-headers": "*",
      },
      body: "",
    });
    return;
  }
  let body;
  try {
    body = JSON.parse(req.postData() ?? "null");
  } catch {
    body = null;
  }
  const one = (p) => {
    rpcCount[p.method] = (rpcCount[p.method] ?? 0) + 1;
    const result = rpcResult(p.method, p.params ?? []);
    if (p.method === "eth_getLogs") {
      const from = parseInt(p.params[0].fromBlock, 16);
      const to = parseInt(p.params[0].toBlock, 16);
      getLogsCalls.push({
        step: stepName,
        from,
        to,
        topic0: Array.isArray(p.params[0].topics?.[0])
          ? p.params[0].topics[0].map((t) => t.slice(0, 10))
          : p.params[0].topics?.[0]?.slice(0, 10),
        n: result.length,
      });
      if (from > to)
        log.push(
          `[fake-rpc] ${stepName} eth_getLogs inverted range ${from} > ${to}`,
        );
    }
    if (p.method === "eth_getLogs" && result.length) {
      log.push(
        `[fake-rpc] ${stepName} eth_getLogs ${JSON.stringify(p.params)} -> ${result.length} log(s)`,
      );
    }
    return { jsonrpc: "2.0", id: p.id, result };
  };
  const payload = Array.isArray(body) ? body.map(one) : body ? one(body) : {};
  req.respond({
    status: 200,
    contentType: "application/json",
    headers: { "access-control-allow-origin": "*" },
    body: JSON.stringify(payload),
  });
}

async function settle(page, ms = 300) {
  await page
    .waitForNetworkIdle({ idleTime: 500, timeout: 15000 })
    .catch(() => {});
  await page.evaluate((ms) => new Promise((r) => setTimeout(r, ms)), ms);
}

async function dumpDb(page) {
  return page.evaluate(async () => {
    const out = {};
    const dbs = await indexedDB.databases();
    for (const { name, version } of dbs.sort((a, b) =>
      a.name.localeCompare(b.name),
    )) {
      const db = await new Promise((resolve, reject) => {
        const r = indexedDB.open(name);
        r.onsuccess = () => resolve(r.result);
        r.onerror = () => reject(r.error);
      });
      const entry = { version: db.version, listedVersion: version, stores: {} };
      for (const storeName of [...db.objectStoreNames]) {
        const tx = db.transaction(storeName, "readonly");
        const store = tx.objectStore(storeName);
        const rows = await new Promise((resolve) => {
          const g = store.getAll();
          g.onsuccess = () => resolve(g.result);
        });
        entry.stores[storeName] = {
          keyPath: store.keyPath,
          autoIncrement: store.autoIncrement,
          indexes: [...store.indexNames],
          count: rows.length,
          rows,
        };
      }
      db.close();
      out[name] = entry;
    }
    return JSON.stringify(
      out,
      (k, v) =>
        typeof v === "bigint"
          ? { bigint: v.toString() }
          : v instanceof ArrayBuffer || ArrayBuffer.isView(v)
            ? { binary: v.byteLength }
            : v,
      2,
    );
  });
}

// The toggle is read in the same evaluate as the rest.
async function pageInfo(page) {
  return inPage(
    page,
    (lib, oldTexts, rpcInput) => {
      const text = document.body.innerText;
      return {
        url: location.href,
        title: document.title,
        htmlClass: document.documentElement.className,
        bodyBg: getComputedStyle(document.body).backgroundColor,
        text: text.slice(0, 1500),
        navRpc: (() => {
          // develop: aria-label "RPC URL" (#394); v1.0.2: the placeholder.
          const i =
            document.querySelector(rpcInput) ??
            [
              ...document.querySelectorAll("nav input, header input, input"),
            ].find(
              (e) =>
                e.placeholder === "https://localhost:8545" ||
                /fake-rpc|polygon|http/.test(e.value),
            );
          return i ? { value: i.value, disabled: i.disabled } : null;
        })(),
        gridRows: document.querySelectorAll(
          ".ag-center-cols-container [role=row]",
        ).length,
        toggle: lib.findToggle(oldTexts),
      };
    },
    OLD_TEXTS.oldTexts,
    RPC_INPUT,
  );
}

async function record(page, name, { dump = false } = {}) {
  stepName = name;
  await settle(page);
  await page.screenshot({ path: path.join(shotDir, `${name}.png`) });
  const info = await pageInfo(page);
  const entry = { step: name, ...info };
  if (dump) {
    const db = await dumpDb(page);
    fs.writeFileSync(path.join(outDir, `db-${phase}-${name}.json`), db);
    entry.dbFile = `db-${phase}-${name}.json`;
  }
  steps.push(entry);
  console.log(
    "STEP",
    name,
    info.url,
    JSON.stringify(info.toggle),
    info.gridRows,
  );
  flush();
}

function flush() {
  fs.writeFileSync(
    path.join(outDir, `steps-${phase}.json`),
    JSON.stringify(steps, null, 2),
  );
  fs.writeFileSync(path.join(outDir, `log-${phase}.txt`), log.join("\n"));
  fs.writeFileSync(
    path.join(outDir, `rpc-count-${phase}.json`),
    JSON.stringify(rpcCount, null, 2),
  );
  fs.writeFileSync(
    path.join(outDir, `getlogs-${phase}.json`),
    JSON.stringify(getLogsCalls),
  );
}

// Returns the input found nearest to a leaf element with the given text.
async function inputNearLabel(page, scope, label, selector) {
  const h = await page.evaluateHandle(
    (scope, label, selector) => {
      const root = document.querySelector(scope);
      if (!root) return null;
      const labels = [...root.querySelectorAll("*")].filter(
        (e) => e.children.length === 0 && e.textContent.trim() === label,
      );
      for (const l of labels) {
        for (let e = l; e && e !== root.parentElement; e = e.parentElement) {
          const i = e.querySelector(selector);
          if (i && i.getClientRects().length) return i;
        }
      }
      return null;
    },
    scope,
    label,
    selector,
  );
  const el = h.asElement();
  if (!el) throw new Error(`No ${selector} near "${label}" in ${scope}`);
  return el;
}

async function waitLabel(page, label, timeout = 60000) {
  await page.waitForFunction(
    (label) =>
      [...document.querySelectorAll("*")].some(
        (e) => e.children.length === 0 && e.textContent.trim() === label,
      ),
    { timeout },
    label,
  );
}
async function countTable(page, dbName, table) {
  return page.evaluate(
    async (dbName, table) =>
      new Promise((resolve) => {
        const r = indexedDB.open(dbName);
        r.onsuccess = () => {
          const db = r.result;
          if (![...db.objectStoreNames].includes(table)) {
            db.close();
            resolve(-1);
            return;
          }
          const c = db.transaction(table).objectStore(table).count();
          c.onsuccess = () => {
            db.close();
            resolve(c.result);
          };
        };
        r.onerror = () => resolve(-2);
      }),
    dbName,
    table,
  );
}
async function readSettingsDb(page) {
  return page.evaluate(
    () =>
      new Promise((resolve) => {
        const r = indexedDB.open("Digu_Settings");
        r.onsuccess = () => {
          const db = r.result;
          const version = db.version;
          if (![...db.objectStoreNames].includes("RpcSettings")) {
            db.close();
            resolve({ version, rows: null });
            return;
          }
          const g = db
            .transaction("RpcSettings")
            .objectStore("RpcSettings")
            .getAll();
          g.onsuccess = () => {
            db.close();
            resolve({ version, rows: g.result });
          };
        };
        r.onerror = () => resolve(null);
      }),
  );
}
function checkSettingsUpgrade(before, after) {
  const ng = [];
  // Dexie opens version n as IndexedDB version n * 10.
  if (after?.version !== SETTINGS_VERSION * 10)
    ng.push(`version ${after?.version}, expected ${SETTINGS_VERSION * 10}`);
  if (!before?.rows?.length) ng.push("no RPC settings before the upgrade");
  for (const b of before?.rows ?? []) {
    const a = after?.rows?.find((r) => r.chainName === b.chainName);
    if (!a) {
      ng.push(`${b.chainName}: no row after the upgrade`);
      continue;
    }
    const left = REMOVED_RPC_SETTINGS.filter((k) => k in a);
    if (left.length) ng.push(`${b.chainName}: still has ${left.join(",")}`);
    const changed = Object.keys(b).filter(
      (k) =>
        !REMOVED_RPC_SETTINGS.includes(k) &&
        JSON.stringify(a[k]) !== JSON.stringify(b[k]),
    );
    if (changed.length) ng.push(`${b.chainName}: changed ${changed.join(",")}`);
  }
  check(
    "Settings DB upgrade",
    ng.length === 0,
    `${ng.length ? `${ng.join("; ")}; ` : ""}version ${before?.version} -> ${after?.version}; before ${JSON.stringify(before?.rows)}; after ${JSON.stringify(after?.rows)}`,
  );
}
async function syncUntil(page, prefix, target) {
  await clickToggle(page, OLD_TEXTS);
  await waitLabel(page, "stop sync", 20000).catch(() => {});
  await record(page, `${prefix}-sync-started`);
  const t0 = Date.now();
  let n = 0;
  while (Date.now() - t0 < 40000) {
    n = await countTable(
      page,
      "Digu_EventLog_eth_Augur_version1",
      "Augur_TimestampSet",
    );
    if (n >= target) break;
    await new Promise((r) => setTimeout(r, 1000));
  }
  check(
    `${prefix} Augur_TimestampSet count`,
    n >= target,
    `${n} after ${Date.now() - t0}ms, expected ${target}`,
  );
  // Let the remaining loop settle a little, then stop.
  await new Promise((r) => setTimeout(r, 4000));
  await clickToggle(page, OLD_TEXTS);
  await waitLabel(page, "start sync", 60000).then(
    () => check(`${prefix} stop wait`, true, "start sync"),
    (e) => check(`${prefix} stop wait`, false, e.message),
  );
  await record(page, `${prefix}-sync-stopped`);
}

await new Promise((resolve) => server.listen(PORT, "127.0.0.1", resolve));
if (phase === "old") fs.rmSync(profileDir, { recursive: true, force: true });
const browser = await puppeteer.launch({
  userDataDir: profileDir,
  protocolTimeout: 60000,
  args: ["--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE localhost"],
});
// The phase before left a blank tab (see the end of this file).
const openPages = (await browser.pages()).map((p) => p.url());
check(
  "open pages at launch",
  openPages.length > 0 && openPages.every((url) => url === "about:blank"),
  openPages.join(", "),
);
const page = (await browser.pages())[0] ?? (await browser.newPage());
await page.bringToFront();
await page.setViewport({ width: 1400, height: 900 });
await page.setCacheEnabled(false);
// Console errors and warnings, page errors and CSP violations (#504). v1.0.2
// has no CSP.
await logPageProblems(page, ({ type, text, message }) =>
  log.push(`[${type}] ${stepName}: ${message ? text.slice(0, 500) : text}`),
);
await handleRequests(page, {
  isLocal: (url) => url.origin === ORIGIN,
  answer: (req, url) => {
    if (url.origin !== new URL(FAKE_RPC).origin) return false;
    answerRpc(req);
    return true;
  },
  onBlocked: (url) => log.push(`[blocked] ${stepName}: ${url}`),
});

await results.guard(
  `${phase} error`,
  async () => {
    if (phase === "old") {
      stepName = "old-00";
      await page.goto(`${ORIGIN}/`, { waitUntil: "load" });
      await settle(page, 1500);
      await record(page, "old-00-home-initial", { dump: true });

      // Sync targets: version2 off, LegacyReputationToken off.
      await page.goto(`${ORIGIN}/eth/Augur-version2`, { waitUntil: "load" });
      await settle(page, 1000);
      await (
        await inputNearLabel(page, "body", "Target", 'input[type="checkbox"]')
      ).click();
      await record(page, "old-01-v2-target-off");
      await page.goto(
        `${ORIGIN}/eth/Augur-version1/contracts/LegacyReputationToken`,
        { waitUntil: "load" },
      );
      await settle(page, 1000);
      await (
        await inputNearLabel(page, "body", "Target", 'input[type="checkbox"]')
      ).click();
      await record(page, "old-02-lrt-target-off");

      // RPC and settings (eth). v1.0.2: the placeholder https://localhost:8545,
      // "Try Count" and "Abort Watch Interval [ms]" (not the develop names).
      await page.goto(`${ORIGIN}/eth/Augur-version1`, { waitUntil: "load" });
      await settle(page, 1000);
      await typeInto(
        page,
        await page.$('input[placeholder="https://localhost:8545"]'),
        FAKE_RPC,
      );
      await waitLabel(page, "start sync", 20000);
      await clickByTooltip(page, "Settings");
      await settle(page);
      const values = {
        "Bulk Unit": "200",
        "Try Count": "5",
        "Block Interval [ms]": "3000",
        "Abort Watch Interval [ms]": "7000",
      };
      for (const [label, v] of Object.entries(values)) {
        await typeInto(
          page,
          await inputNearLabel(
            page,
            "dialog[open]",
            label,
            'input[type="number"]',
          ),
          v,
        );
        await settle(page, 200);
      }
      const sel = await inputNearLabel(
        page,
        "dialog[open]",
        "Chain Explorer",
        "select",
      );
      await sel.select("2");
      await settle(page);
      await record(page, "old-03-settings-dialog");
      await page.keyboard.press("Escape");
      await settle(page);

      // Sync a little.
      await syncUntil(page, "old-04", 1);

      // Theme dark, selected chain matic, sidebar closed.
      await clickByTooltip(page, "Change theme");
      await settle(page);
      const chainSelect = await page.$("aside select, select");
      await chainSelect.select("matic");
      await settle(page, 1500);
      await record(page, "old-05-dark-matic");
      // Close button of the sidebar: the first button in the sidebar header
      // that is not a tooltip button of the accordion handlers.
      const closed = await page.evaluate(() => {
        // The close button (X) is the first visible button, at the top left.
        const b = [...document.querySelectorAll("button")].find(
          (b) => b.getClientRects().length,
        );
        b.click();
        return b.outerHTML.slice(0, 200);
      });
      note("sidebar close clicked", closed);
      await settle(page, 1000);
      await record(page, "old-06-final", { dump: true });
    } else if (phase === "probe") {
      // Opens the new build again and checks whether the page stays responsive.
      // If an evaluate does not return, pause the debugger and log the stack.
      const cdp = await page.createCDPSession();
      await cdp.send("Debugger.enable");
      let pausedFrames = null;
      cdp.on("Debugger.paused", (ev) => {
        pausedFrames = ev.callFrames
          .slice(0, 25)
          .map(
            (f) =>
              `${f.functionName || "(anon)"} ${f.url.split("/").pop()}:${f.location.lineNumber + 1}:${f.location.columnNumber + 1}`,
          );
        cdp.send("Debugger.resume").catch(() => {});
      });
      stepName = "probe-00";
      const t0 = Date.now();
      await page
        .goto(`${ORIGIN}/`, { waitUntil: "domcontentloaded", timeout: 60000 })
        .catch((e) => log.push(`[probe] goto: ${e.message}`));
      for (let i = 0; i < 20; i++) {
        const r = await Promise.race([
          page.evaluate(() => ({
            now: performance.now(),
            url: location.href,
            toggle: [...document.querySelectorAll("*")]
              .filter(
                (e) =>
                  e.children.length === 0 &&
                  /sync/.test(e.textContent) &&
                  e.textContent.length < 30,
              )
              .map((e) => e.textContent.trim()),
          })),
          new Promise((r) => setTimeout(() => r("TIMEOUT"), 5000)),
        ]);
        log.push(
          `[probe] t=${Date.now() - t0}ms ${JSON.stringify(r)} rpc=${JSON.stringify(rpcCount)}`,
        );
        if (r === "TIMEOUT") {
          await cdp
            .send("Debugger.pause")
            .catch((e) => log.push(`[probe] pause: ${e.message}`));
          await new Promise((r) => setTimeout(r, 3000));
          log.push(
            `[probe] paused stack: ${JSON.stringify(pausedFrames, null, 1)}`,
          );
          break;
        }
        await new Promise((r) => setTimeout(r, 2000));
      }
      await page
        .screenshot({ path: path.join(shotDir, "probe-end.png") })
        .catch(() => {});
    } else if (phase === "grid") {
      // Event log grids of the new build, on logs saved by v1.0.2 and by the new build.
      for (const [ev, tab] of [
        ["TimestampSet", "Event Logs"],
        ["UniverseForked", "Event Logs"],
      ]) {
        await page.goto(
          `${ORIGIN}/eth/Augur-version1/contracts/Augur/events/${ev}`,
          { waitUntil: "load" },
        );
        await settle(page, 1500);
        await page.evaluate((tab) => {
          const l = [...document.querySelectorAll("*")].find(
            (e) => e.children.length === 0 && e.textContent.trim() === tab,
          );
          (l.closest("a,button") ?? l).click();
        }, tab);
        await settle(page, 3000);
        const name = `grid-${ev}`;
        await record(page, name);
        const rows = await page.evaluate(() =>
          [...document.querySelectorAll(".ag-row")].map((r) =>
            r.innerText.replace(/\s+/g, " ").slice(0, 400),
          ),
        );
        // The fake logs: TimestampSet of v1.0.2 and of the new build, and
        // UniverseForked of v1.0.2.
        check(
          `${name} ag-row count`,
          rows.length === { TimestampSet: 2, UniverseForked: 1 }[ev],
          `${rows.length}: ${JSON.stringify(rows)}`,
        );
        // #509: sort by the datetime column (the Date), ascending then descending.
        if (name === "grid-TimestampSet") {
          for (const n of [1, 2]) {
            const label = await page.$(
              '.ag-header-cell[col-id="jsDate"] .ag-header-cell-label',
            );
            check(
              `${name} datetime header ${n}`,
              !!label,
              label ? "found" : "not found",
            );
            if (!label) break;
            await label.click();
            await settle(page, 1000);
            const sorted = await page.evaluate(() => ({
              ariaSort: document
                .querySelector('.ag-header-cell[col-id="jsDate"]')
                ?.getAttribute("aria-sort"),
              rows: [
                ...document.querySelectorAll(
                  '.ag-row .ag-cell[col-id="jsDate"]',
                ),
              ]
                .sort(
                  (a, b) =>
                    a.getBoundingClientRect().top -
                    b.getBoundingClientRect().top,
                )
                .map((c) => c.innerText.trim()),
            }));
            // Ascending, then descending.
            const order = n === 1 ? "ascending" : "descending";
            const want = [...sorted.rows].sort();
            if (n === 2) want.reverse();
            check(
              `${name} datetime sort click ${n}`,
              sorted.ariaSort === order &&
                sorted.rows.length === 2 &&
                // Two equal values pass in any order.
                sorted.rows[0] !== sorted.rows[1] &&
                JSON.stringify(sorted.rows) === JSON.stringify(want),
              JSON.stringify(sorted),
            );
            await page.screenshot({
              path: path.join(shotDir, `${name}-sort${n}.png`),
            });
          }
        }
      }
      // #509: v1.0.2 and the new build save jsDate as a Date.
      const jsDateTypes = await page.evaluate(
        () =>
          new Promise((resolve) => {
            const r = indexedDB.open("Digu_EventLog_eth_Augur_version1");
            r.onsuccess = () => {
              const g = r.result
                .transaction("Augur_TimestampSet")
                .objectStore("Augur_TimestampSet")
                .getAll();
              g.onsuccess = () => {
                r.result.close();
                resolve(
                  g.result.map((l) => ({
                    blockNumber: l.blockNumber,
                    isDate: l.jsDate instanceof Date,
                  })),
                );
              };
            };
          }),
      );
      check(
        "Augur_TimestampSet jsDate types",
        jsDateTypes.length === 2 && jsDateTypes.every((l) => l.isDate),
        JSON.stringify(jsDateTypes),
      );
    } else {
      stepName = "new-00";
      // The Settings DB before the new build opens it, from a file of the
      // origin that does not run the app.
      await page.goto(`${ORIGIN}/favicon.png`, { waitUntil: "load" });
      const settingsBefore = await readSettingsDb(page);
      await page.goto(`${ORIGIN}/`, { waitUntil: "load" });
      await settle(page, 3000);
      await record(page, "new-00-home-first-open", { dump: true });
      checkSettingsUpgrade(settingsBefore, await readSettingsDb(page));
      for (const [name, p] of [
        ["new-01-matic", "/matic"],
        ["new-02-eth", "/eth"],
        ["new-03-eth-v1", "/eth/Augur-version1"],
        ["new-04-eth-v2", "/eth/Augur-version2"],
        [
          "new-05-eth-v2-repv2-yes-1",
          "/eth/Augur-version2/contracts/REPv2_Yes_1",
        ],
        ["new-06-v1-augur", "/eth/Augur-version1/contracts/Augur"],
        [
          "new-07-v1-lrt",
          "/eth/Augur-version1/contracts/LegacyReputationToken",
        ],
        [
          "new-08-events-TimestampSet",
          "/eth/Augur-version1/contracts/Augur/events/TimestampSet",
        ],
        [
          "new-09-events-UniverseForked",
          "/eth/Augur-version1/contracts/Augur/events/UniverseForked",
        ],
      ]) {
        await page.goto(`${ORIGIN}${p}`, { waitUntil: "load" });
        await settle(page, 2000);
        await record(page, name);
      }
      // The sync panel (#596), which took the place of the settings dialog.
      await openSyncPanel(page);
      await settle(page);
      const dialogValues = await page.evaluate(() => {
        const d = document.getElementById("sync-panel");
        return {
          checkboxes: [...d.querySelectorAll('input[type="checkbox"]')].map(
            (i) => ({
              label: i.getAttribute("aria-label"),
              checked: i.checked,
            }),
          ),
          text: d.innerText.slice(0, 800),
        };
      });
      // The 2 fake logs below the latest block of the old phase, and the
      // warp sync on: v1.0.2 had no such setting, so it is the default.
      check(
        "sync panel (eth page)",
        /\b2 logs\b/.test(dialogValues.text) &&
          dialogValues.checkboxes.some(
            (c) => c.label === "Warp sync" && c.checked,
          ),
        JSON.stringify(dialogValues),
      );
      await record(page, "new-10-sync-panel");
      await page.keyboard.press("Escape");
      await settle(page);
      await syncUntil(page, "new-11", 2);
      await page.goto(
        `${ORIGIN}/eth/Augur-version1/contracts/Augur/events/TimestampSet`,
        { waitUntil: "load" },
      );
      await settle(page, 2000);
      await record(page, "new-12-events-after-sync", { dump: true });
    }
  },
  {
    onError: async (e) => {
      log.push(`[script-error] ${stepName}: ${e.stack}`);
      console.log("SCRIPT ERROR", e.message);
      await page
        .screenshot({ path: path.join(shotDir, `error-${stepName}.png`) })
        .catch(() => {});
      return { step: stepName };
    },
  },
);
flush();
// Chrome restores the open tab at the next launch and runs the app before
// the listeners of the next phase are attached. Leave a blank tab instead.
await page.goto("about:blank").catch(() => {});
await browser.close();
server.close();
