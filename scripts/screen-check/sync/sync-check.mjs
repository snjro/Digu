// Browser check of the event log sync (steps 6-1..6-9) with a fake JSON-RPC.
// Runs in the compose "test" service: node sync-check.mjs <buildDir> <outDir> [scenarios] (see run.sh).
// Only localhost and the fake RPC URL are answered; the fake RPC is answered
// by the request interceptor (fake-rpc.mjs) and never reaches the network.
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { createRequire } from "node:module";
import {
  handle,
  makeState,
  describeTopic,
  expected,
  CONFIRMATION_BLOCKS,
} from "./fake-rpc.mjs";

const require = createRequire(path.join(process.cwd(), "package.json"));
const puppeteer = require("puppeteer");

const [buildDir, outDir, only] = process.argv.slice(2);
fs.mkdirSync(outDir, { recursive: true });
const want = (s) => !only || only.split(",").includes(s);

const PORT = 4173;
const ORIGIN = `http://localhost:${PORT}`;
// #483: a key-like path, which must not show up in the console.
const FAKE_KEY = "fakekey0123456789abcdef";
const FAKE_RPC = `http://fake-rpc.invalid/v3/${FAKE_KEY}`;
// #498: the Goal is latest - CONF, so every latest below is the value before #498 + CONF.
const CONF = CONFIRMATION_BLOCKS;
const V1_CREATION = 5926229;

const results = {};
const consoleLog = []; // {scenario, page, type, text}
const blocked = [];
let scenario = "";
let lastAction = "";
let rpcState = makeState();

function saveResults() {
  fs.writeFileSync(
    path.join(outDir, "results.json"),
    JSON.stringify(
      { expected, results },
      (k, v) => (typeof v === "bigint" ? `${v}n` : v),
      2,
    ),
  );
  fs.writeFileSync(
    path.join(outDir, "console.json"),
    JSON.stringify(consoleLog, null, 2),
  );
  fs.writeFileSync(
    path.join(outDir, "blocked.json"),
    JSON.stringify(blocked, null, 2),
  );
}
function r() {
  return (results[scenario] ??= { steps: [] });
}
function note(key, value) {
  r()[key] = value;
  console.log(`[${scenario}] ${key}:`, JSON.stringify(value).slice(0, 400));
  saveResults();
}

const TYPES = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".json": "application/json",
  ".woff2": "font/woff2",
};
const server = http.createServer((req, res) => {
  let file = path.join(buildDir, decodeURIComponent(req.url.split("?")[0]));
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) {
    file = path.join(file, "index.html");
  }
  if (!fs.existsSync(file)) {
    res.writeHead(404).end();
    return;
  }
  res.writeHead(200, {
    "content-type": TYPES[path.extname(file)] ?? "application/octet-stream",
  });
  fs.createReadStream(file).pipe(res);
});

async function answerRpc(req) {
  if (req.method() === "OPTIONS") {
    return req.respond({
      status: 204,
      headers: {
        "access-control-allow-origin": "*",
        "access-control-allow-methods": "POST, GET, OPTIONS",
        "access-control-allow-headers": "*",
      },
      body: "",
    });
  }
  let body;
  try {
    body = JSON.parse(req.postData() ?? "null");
  } catch {
    body = null;
  }
  const state = rpcState;
  const methods = Array.isArray(body)
    ? body.map((b) => b.method)
    : [body?.method];
  if (methods.includes("eth_getLogs") && state.delayMs) {
    await new Promise((res) => setTimeout(res, state.delayMs));
  }
  const payload = body ? handle(state, body) : {};
  req.respond({
    status: 200,
    contentType: "application/json",
    headers: { "access-control-allow-origin": "*" },
    body: JSON.stringify(payload),
  });
}

await new Promise((resolve) => server.listen(PORT, "127.0.0.1", resolve));
const browser = await puppeteer.launch({
  args: ["--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE localhost"],
});

async function newPage(context, name) {
  const page = await context.newPage();
  await page.setViewport({ width: 1400, height: 900 });
  page.on("console", async (m) => {
    if (["error", "warn", "warning"].includes(m.type())) {
      const entry = {
        scenario,
        lastAction,
        page: name,
        type: m.type(),
        text: m.text().slice(0, 500),
      };
      consoleLog.push(entry);
      // customLogger passes objects, which text() shows as [object Object].
      // Keep them as JSON, with the message and cause of an Error.
      if (entry.text.includes("[object Object]")) {
        const parts = await Promise.all(
          m.args().map((a) =>
            a
              .evaluate((v) => {
                try {
                  return JSON.stringify(v, (k, x) =>
                    x instanceof Error
                      ? { name: x.name, message: x.message, cause: x.cause }
                      : typeof x === "bigint"
                        ? String(x)
                        : x,
                  );
                } catch {
                  return String(v);
                }
              })
              .catch(() => null),
          ),
        );
        entry.detail = parts
          .filter((x) => x && x !== '""')
          .join(" ")
          .slice(0, 2000);
      }
    }
  });
  page.on("pageerror", (e) =>
    consoleLog.push({
      scenario,
      lastAction,
      page: name,
      type: "pageerror",
      text: String(e.message).slice(0, 500),
    }),
  );
  // CSP violations (#504), as in scripts/visual-compare/shots.mjs.
  await page.exposeFunction("__logCspViolation", (text) =>
    consoleLog.push({
      scenario,
      lastAction,
      page: name,
      type: "csp",
      text: String(text).slice(0, 500),
    }),
  );
  await page.evaluateOnNewDocument(() => {
    window.addEventListener("securitypolicyviolation", (e) => {
      window.__logCspViolation(
        `${e.effectiveDirective} ${e.blockedURI} at ${e.sourceFile}:${e.lineNumber}`,
      );
    });
  });
  await page.setRequestInterception(true);
  page.on("request", (req) => {
    const url = new URL(req.url());
    if (url.origin === new URL(FAKE_RPC).origin) {
      answerRpc(req);
    } else if (url.protocol.startsWith("http") && url.origin !== ORIGIN) {
      blocked.push({ scenario, url: req.url() });
      req.abort();
    } else {
      req.continue();
    }
  });
  return page;
}

async function settle(page) {
  await page
    .waitForNetworkIdle({ idleTime: 300, timeout: 5000 })
    .catch(() => {});
  await page.evaluate(() => new Promise((res) => setTimeout(res, 300)));
}
async function waitSpinner(page) {
  await page
    .waitForFunction(
      () => !document.querySelector('[data-testid="loadingSpinner-test"]'),
      { timeout: 20000, polling: 100 },
    )
    .catch(() => {});
}
async function gotoApp(page, p) {
  lastAction = `goto ${p}`;
  await page.goto(ORIGIN + p, { waitUntil: "load" });
  await waitSpinner(page);
  await settle(page);
}
// In-app navigation: a click on an anchor is handled by the SvelteKit router,
// so the page is not unloaded (a page.goto would end the sync).
async function navIn(page, p) {
  lastAction = `navIn ${p}`;
  await page.evaluate((p) => {
    const a = document.createElement("a");
    a.href = p;
    a.textContent = "nav";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }, p);
  await page
    .waitForFunction(
      (p) => location.pathname === p,
      { timeout: 15000, polling: 100 },
      p.split("#")[0],
    )
    .catch(() => {});
  await waitSpinner(page);
  await settle(page);
}

const TOGGLE_TEXTS = [
  "start sync",
  "stop sync",
  "starting sync",
  "syncing in another tab",
];
async function toggleInfo(page) {
  return page.evaluate((texts) => {
    const labels = [...document.querySelectorAll("*")].filter(
      (e) => e.children.length === 0 && texts.includes(e.textContent.trim()),
    );
    for (const label of labels) {
      for (let e = label; e; e = e.parentElement) {
        const b = e.querySelector("button");
        if (b && b.getClientRects().length) {
          return {
            tooltip: label.textContent.trim(),
            disabled: b.disabled,
            pulse: !!b.closest(".animate-pulse"),
          };
        }
      }
    }
    return null;
  }, TOGGLE_TEXTS);
}
async function clickToggle(page) {
  lastAction = "toggle";
  const h = await page.evaluateHandle((texts) => {
    const labels = [...document.querySelectorAll("*")].filter(
      (e) => e.children.length === 0 && texts.includes(e.textContent.trim()),
    );
    for (const label of labels) {
      for (let e = label; e; e = e.parentElement) {
        const b = e.querySelector("button");
        if (b && b.getClientRects().length) return b;
      }
    }
    return null;
  }, TOGGLE_TEXTS);
  await h.click();
}
async function waitTooltip(page, text, timeout = 30000) {
  await page.waitForFunction(
    (text) =>
      [...document.querySelectorAll("*")].some(
        (e) => e.children.length === 0 && e.textContent.trim() === text,
      ),
    { timeout, polling: 100 },
    text,
  );
}
async function navText(page) {
  return page.evaluate(() =>
    (document.querySelector("nav")?.innerText ?? "")
      .replace(/\s+/g, " ")
      .slice(0, 300),
  );
}
async function mainText(page) {
  return page.evaluate(() =>
    (document.querySelector("main")?.innerText ?? document.body.innerText)
      .replace(/\s+/g, " ")
      .slice(0, 3000),
  );
}

async function checkboxes(page) {
  return page.evaluate(() =>
    [...document.querySelectorAll('input[aria-label^="Sync target:"]')]
      .filter((i) => i.getClientRects().length)
      .map((i) => ({
        label: i.getAttribute("aria-label"),
        checked: i.checked,
        indeterminate: i.indeterminate,
        disabled: i.disabled,
        x: Math.round(i.getBoundingClientRect().x),
        text: (i.parentElement?.innerText ?? "").trim().slice(0, 30),
      })),
  );
}
// index: which of the visible checkboxes with this label (sidebar is first).
async function clickCheckbox(page, label, index = -1) {
  lastAction = `checkbox ${label}`;
  const all = (await page.$$(`input[aria-label="${label}"]`)).filter(Boolean);
  const visible = [];
  for (const h of all)
    if (await h.evaluate((e) => e.getClientRects().length > 0)) visible.push(h);
  if (!visible.length) throw new Error(`no checkbox ${label}`);
  const h = visible.at(index);
  await h.click();
  await settle(page);
  return visible.length;
}

async function typeInto(page, selector, text) {
  await page.focus(selector);
  await page.keyboard.down("Control");
  await page.keyboard.press("a");
  await page.keyboard.up("Control");
  await page.keyboard.type(text);
  await page.keyboard.press("Tab");
}
async function clickByTooltip(page, text) {
  const ok = await page.evaluate((text) => {
    const labels = [...document.querySelectorAll("*")].filter(
      (e) => e.children.length === 0 && e.textContent.trim() === text,
    );
    for (const label of labels) {
      for (let e = label; e; e = e.parentElement) {
        const b = e.querySelector("button");
        if (b) {
          if (!b.getClientRects().length) break;
          b.click();
          return true;
        }
      }
    }
    return false;
  }, text);
  if (!ok) throw new Error(`no button ${text}`);
}

// Fake RPC in the nav, then Bulk Unit / Retry Count / Block Interval.
// The RPC input has no placeholder while focused (BaseInput.svelte); use its aria-label (#394).
async function setupRpc(
  page,
  { bulkUnit = "50", tryCount = "10", interval = "500" } = {},
) {
  await typeInto(page, 'input[aria-label="RPC URL"]', FAKE_RPC);
  await settle(page);
  await clickByTooltip(page, "Settings");
  await settle(page);
  await typeInto(
    page,
    'dialog[open] input[aria-label="Block Interval [ms]"]',
    interval,
  );
  await settle(page);
  await typeInto(page, 'dialog[open] input[aria-label="Bulk Unit"]', bulkUnit);
  await settle(page);
  await typeInto(
    page,
    'dialog[open] input[aria-label="Retry Count"]',
    tryCount,
  );
  await settle(page);
  const helper = await page.evaluate(() =>
    [...document.querySelectorAll("dialog[open] *")]
      .filter((e) => e.children.length === 0)
      .map((e) => e.textContent.trim())
      .filter((t) => /Error\.|Updated\.|Checking/.test(t)),
  );
  await page.keyboard.press("Escape");
  await settle(page);
  return helper;
}

async function dbDump(page, contractNames = null) {
  return page.evaluate(async (contractNames) => {
    const plain = (v) =>
      JSON.parse(
        JSON.stringify(v, (k, x) =>
          typeof x === "bigint"
            ? `${x}n`
            : x instanceof Date
              ? x.toISOString()
              : x,
        ),
      );
    const open = (name) =>
      new Promise((res, rej) => {
        const o = indexedDB.open(name);
        o.onsuccess = () => res(o.result);
        o.onerror = () => rej(o.error);
      });
    const req = (r) =>
      new Promise(
        (res, rej) => (
          (r.onsuccess = () => res(r.result)),
          (r.onerror = () => rej(r.error))
        ),
      );
    const out = {};
    for (const { name } of await indexedDB.databases()) {
      if (!/^Digu_/.test(name)) continue;
      if (/matic/.test(name)) continue;
      const db = await open(name);
      const o = {};
      for (const s of db.objectStoreNames) {
        const store = db.transaction(s, "readonly").objectStore(s);
        const count = await req(store.count());
        if (s === "SyncStatus") {
          const rows = await req(store.getAll());
          o[s] = rows
            .filter((row) => !contractNames || contractNames.includes(row.name))
            .map((row) => {
              const { events, ...rest } = row;
              const ev = {};
              for (const [k, v] of Object.entries(events ?? {}))
                if (v.recordCount) ev[k] = v.recordCount;
              return { ...rest, events: ev };
            });
          o.SyncStatus_all = rows
            .map(
              (x) =>
                `${x.name}:${x.isSyncTarget ? "T" : "f"}${x.isSyncing ? "S" : ""}${x.isAbort ? "A" : ""}`,
            )
            .join(" ");
        } else if (["ChainStatus", "RpcSettings", "UserSettings"].includes(s)) {
          o[s] = plain(
            (await req(store.getAll())).filter(
              (x) => !x.chainName || x.chainName === "eth",
            ),
          );
        } else if (count > 0) {
          o[s] = count;
        }
      }
      if (name === "Digu_BlockTimes")
        o.BlockTimes = plain(
          await req(
            db
              .transaction(db.objectStoreNames[0], "readonly")
              .objectStore(db.objectStoreNames[0])
              .getAll(),
          ),
        );
      db.close();
      out[name] = o;
    }
    return out;
  }, contractNames);
}

async function snap(
  page,
  name,
  extra = {},
  contractNames = ["Augur", "REPv2"],
) {
  lastAction = `snap ${name}`;
  await page.screenshot({ path: path.join(outDir, `${name}.png`) });
  const step = {
    step: name,
    url: page.url(),
    toggle: await toggleInfo(page),
    nav: await navText(page),
    main: await mainText(page),
    db: await dbDump(page, contractNames),
    ...extra,
  };
  r().steps.push(step);
  console.log(
    `[${scenario}] ${name}`,
    JSON.stringify(step.toggle),
    step.nav.slice(0, 120),
  );
  saveResults();
  return step;
}

function rpcSummary(state) {
  const counts = {};
  const topics = {};
  for (const c of state.calls) {
    counts[c.method] = (counts[c.method] ?? 0) + 1;
    if (c.method === "eth_getLogs") {
      const f = c.params[0];
      const k = describeTopic(
        f.address,
        Array.isArray(f.topics?.[0]) ? f.topics[0][0] : f.topics?.[0],
      );
      topics[k] = (topics[k] ?? 0) + 1;
    }
  }
  return { counts, getLogsTargets: topics };
}

async function syncStateOf(page, dbName, contract) {
  return page.evaluate(
    async (dbName, contract) => {
      const o = await new Promise((res) => {
        const x = indexedDB.open(dbName);
        x.onsuccess = () => res(x.result);
      });
      const row = await new Promise((res) => {
        const q = o
          .transaction("SyncStatus")
          .objectStore("SyncStatus")
          .get(contract);
        q.onsuccess = () => res(q.result);
      });
      o.close();
      return (
        row && {
          fetched: row.fetchedBlockNumber,
          text: row.syncStateText,
          isSyncing: row.isSyncing,
          isAbort: row.isAbort,
        }
      );
    },
    dbName,
    contract,
  );
}

// Poll the toggle and the DB for state transitions.
// The syncStateText of a contract row stays "-" (also in earlier runs), so the stop
// conditions wait for isSyncing === false instead of "stopped".
async function watchTransitions(
  page,
  dbName,
  contract,
  until,
  timeout = 30000,
) {
  const seen = [];
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    const t = await toggleInfo(page);
    const s = await syncStateOf(page, dbName, contract);
    const key = JSON.stringify({
      tooltip: t?.tooltip,
      disabled: t?.disabled,
      pulse: t?.pulse,
      db: s?.text,
      isSyncing: s?.isSyncing,
      isAbort: s?.isAbort,
    });
    if (seen.at(-1)?.key !== key) seen.push({ ms: Date.now() - t0, key });
    if (until(t, s)) break;
    await new Promise((res) => setTimeout(res, 50));
  }
  return seen.map((x) => `${x.ms}ms ${x.key}`);
}

// #498: the Goal in ChainStatus is the latest block of the RPC minus CONF.
async function goalCheck(page) {
  const goal = await page.evaluate(
    () =>
      new Promise((res) => {
        const o = indexedDB.open("Digu_ChainStatus");
        o.onsuccess = () => {
          const q = o.result
            .transaction("ChainStatus")
            .objectStore("ChainStatus")
            .get("eth");
          q.onsuccess = () => {
            o.result.close();
            res(q.result?.latestBlockNumber);
          };
        };
        o.onerror = () => res(null);
      }),
  );
  return {
    goal,
    rpcLatest: rpcState.latest,
    expected: rpcState.latest - CONF,
    ok: goal === rpcState.latest - CONF,
  };
}

const V1 = "Digu_EventLog_eth_Augur_version1";
const EV = "/eth/Augur-version1/contracts/Augur/events/MarketCreated/";

// ---------- S1: 6-1, 6-2, 6-3, 6-5, 6-6, 6-9 ----------
if (want("S1")) {
  scenario = "S1";
  rpcState = makeState({ latest: V1_CREATION + 250 + CONF, delayMs: 100 });
  const context = await browser.createBrowserContext();
  const page = await newPage(context, "A");
  try {
    await gotoApp(page, "/eth/");
    note("locks", await page.evaluate(() => !!navigator.locks));
    note("settingsHelper", await setupRpc(page));
    // 6-1: sync targets
    await snap(page, "S1-6-1-a-chain-initial", {
      checkboxes: await checkboxes(page),
    });
    note("chainCheckboxes", await checkboxes(page));
    // chain page: the version groups. Turn off Augur version2.
    note("click v2", await clickCheckbox(page, "Sync target: Augur version2"));
    await snap(page, "S1-6-1-b-v2-off", { checkboxes: await checkboxes(page) });
    // version1: all off, then Augur on (contract page, Target).
    note("click v1", await clickCheckbox(page, "Sync target: Augur version1"));
    await snap(page, "S1-6-1-c-v1-off", { checkboxes: await checkboxes(page) });
    await navIn(page, "/eth/Augur-version1/contracts/Augur/");
    note("contractPageCheckboxes", await checkboxes(page));
    await clickCheckbox(page, "Sync target: Augur", -1);
    await snap(page, "S1-6-1-d-augur-on", {
      checkboxes: await checkboxes(page),
    });
    await navIn(page, "/eth/Augur-version1/");
    await snap(page, "S1-6-1-e-version-page", {
      checkboxes: await checkboxes(page),
    });
    await navIn(page, "/eth/");
    await snap(page, "S1-6-1-f-chain-page", {
      checkboxes: await checkboxes(page),
    });
    // saved: reload
    await page.reload({ waitUntil: "load" });
    await waitSpinner(page);
    await settle(page);
    await snap(page, "S1-6-1-g-after-reload", {
      checkboxes: await checkboxes(page),
    });

    // 6-2: start
    rpcState.calls.length = 0;
    await navIn(page, EV);
    await clickToggle(page);
    const tr = await watchTransitions(
      page,
      V1,
      "Augur",
      (t, s) => s?.fetched > V1_CREATION,
      20000,
    );
    note("6-2 start transitions", tr);
    await snap(page, "S1-6-2-a-syncing-early", {
      checkboxes: await checkboxes(page),
    });
    // 6-3 mid-sync event overview
    await page
      .waitForFunction(() => /MarketCreated/.test(document.body.innerText), {
        timeout: 5000,
      })
      .catch(() => {});
    const t1 = Date.now();
    await page
      .waitForFunction(
        async (db, target) => {
          const o = await new Promise((res) => {
            const x = indexedDB.open(db);
            x.onsuccess = () => res(x.result);
          });
          const row = await new Promise((res) => {
            const q = o
              .transaction("SyncStatus")
              .objectStore("SyncStatus")
              .get("Augur");
            q.onsuccess = () => res(q.result);
          });
          o.close();
          return row.fetchedBlockNumber >= target;
        },
        { timeout: 60000, polling: 300 },
        V1,
        V1_CREATION + 100,
      )
      .catch((e) => note("waitMid error", String(e)));
    await snap(page, "S1-6-3-a-event-overview-mid", {
      sinceStartMs: Date.now() - t1,
    });
    await page
      .waitForFunction(
        async (db, target) => {
          const o = await new Promise((res) => {
            const x = indexedDB.open(db);
            x.onsuccess = () => res(x.result);
          });
          const row = await new Promise((res) => {
            const q = o
              .transaction("SyncStatus")
              .objectStore("SyncStatus")
              .get("Augur");
            q.onsuccess = () => res(q.result);
          });
          o.close();
          return row.fetchedBlockNumber >= target;
        },
        { timeout: 90000, polling: 300 },
        V1,
        V1_CREATION + 250,
      )
      .catch((e) => note("waitLatest error", String(e)));
    note("rpc until latest", rpcSummary(rpcState));
    note("6-2 goal (#498)", await goalCheck(page));
    await snap(page, "S1-6-3-b-event-overview-latest");
    await page.evaluate(() => (location.hash = "#event-logs-text"));
    await settle(page);
    await new Promise((res) => setTimeout(res, 1500));
    const gridText = async () =>
      page.evaluate(() =>
        [
          ...document.querySelectorAll(
            ".ag-center-cols-container .ag-row, .ag-row",
          ),
        ]
          .slice(0, 20)
          .map((row) => row.innerText.replace(/\s+/g, " | ").slice(0, 900)),
      );
    const headers = async () =>
      page.evaluate(() =>
        [...document.querySelectorAll(".ag-header-cell-text")].map((e) =>
          e.textContent.trim(),
        ),
      );
    await snap(page, "S1-6-3-c-event-logs-text", {
      grid: await gridText(),
      headers: await headers(),
    });
    await page.evaluate(() => (location.hash = "#event-logs-hex"));
    await settle(page);
    await new Promise((res) => setTimeout(res, 1500));
    await snap(page, "S1-6-3-d-event-logs-hex", {
      grid: await gridText(),
      headers: await headers(),
    });
    await navIn(
      page,
      "/eth/Augur-version1/contracts/Augur/events/UniverseCreated/",
    );
    await page.evaluate(() => (location.hash = "#event-logs-text"));
    await settle(page);
    await new Promise((res) => setTimeout(res, 1500));
    await snap(page, "S1-6-3-e-universe-logs-text", {
      grid: await gridText(),
      headers: await headers(),
    });
    await navIn(page, "/eth/Augur-version1/contracts/");
    await new Promise((res) => setTimeout(res, 1000));
    await snap(page, "S1-6-3-f-contracts-grid", {
      grid: await gridText(),
      headers: await headers(),
    });
    await navIn(page, "/eth/Augur-version1/contracts/Augur/");
    await snap(page, "S1-6-3-g-contract-overview");

    // 6-5: move between pages and chains while syncing
    await navIn(page, "/eth/Augur-version1/");
    await snap(page, "S1-6-5-a-version-page-syncing");
    await page.select('select[aria-label="Chain"]', "matic");
    await page
      .waitForFunction(() => location.pathname.startsWith("/matic"), {
        timeout: 15000,
      })
      .catch(() => {});
    await waitSpinner(page);
    await settle(page);
    await new Promise((res) => setTimeout(res, 1500));
    await snap(page, "S1-6-5-b-matic-while-eth-syncing");
    const ethStillSyncing = await syncStateOf(page, V1, "Augur");
    note("6-5 eth while on matic", ethStillSyncing);
    await page.select('select[aria-label="Chain"]', "eth");
    await page
      .waitForFunction(() => location.pathname.startsWith("/eth"), {
        timeout: 15000,
      })
      .catch(() => {});
    await waitSpinner(page);
    await settle(page);
    await new Promise((res) => setTimeout(res, 1000));
    await snap(page, "S1-6-5-c-back-to-eth");

    // 6-6: stop
    await navIn(page, EV);
    await clickToggle(page);
    const stopTr = await watchTransitions(
      page,
      V1,
      "Augur",
      (t, s) => t?.tooltip === "start sync" && s?.isSyncing === false,
      30000,
    );
    note("6-6 stop transitions", stopTr);
    await snap(page, "S1-6-6-stopped");
    note("rpc S1 total", rpcSummary(rpcState));

    // 6-9: reload after stop
    const before = await dbDump(page, ["Augur"]);
    await page.reload({ waitUntil: "load" });
    await waitSpinner(page);
    await settle(page);
    await snap(page, "S1-6-9-a-reload-after-stop", { before });
    await navIn(page, "/eth/Augur-version1/contracts/Augur/");
    await snap(page, "S1-6-9-b-contract-after-reload");
    // 6-9 (extra): reload while syncing
    rpcState.latest = V1_CREATION + 400 + CONF;
    await navIn(page, EV);
    await clickToggle(page);
    await waitTooltip(page, "stop sync", 15000).catch(() => {});
    await new Promise((res) => setTimeout(res, 1500));
    await snap(page, "S1-6-9-c-syncing-again");
    await page.reload({ waitUntil: "load" });
    await waitSpinner(page);
    await settle(page);
    await new Promise((res) => setTimeout(res, 1500));
    await snap(page, "S1-6-9-d-reload-while-syncing");
    // can it start again?
    const tInfo = await toggleInfo(page);
    if (tInfo && !tInfo.disabled && tInfo.tooltip === "start sync") {
      await clickToggle(page);
      await watchTransitions(
        page,
        V1,
        "Augur",
        (t, s) => s?.fetched >= V1_CREATION + 400,
        60000,
      );
      await snap(page, "S1-6-9-e-restarted-to-latest");
      await clickToggle(page);
      note(
        "6-9 restart stop",
        await watchTransitions(
          page,
          V1,
          "Augur",
          (t, s) => s?.isSyncing === false,
          30000,
        ),
      );
      await snap(page, "S1-6-9-f-stopped");
    }
  } catch (e) {
    note("error", String(e.stack ?? e));
    await page
      .screenshot({ path: path.join(outDir, "S1-error.png") })
      .catch(() => {});
  }
  note("rpc S1 all", rpcSummary(rpcState));
  await context.close();
}

// ---------- S3: 6-7 RPC errors ----------
const S3_MODES = [
  ["errorGetLogs", "2"],
  ["errorGetLogs10", "10"],
  ["errorOnce", "10"],
  ["errorAll", "2"],
  ["nullBlock", "2"],
].filter(
  ([m]) => !process.env.S3_MODES || process.env.S3_MODES.split(",").includes(m),
);
for (const [mode, tryCount] of S3_MODES) {
  if (!want("S3")) break;
  scenario = `S3-${mode}`;
  rpcState = makeState({ latest: V1_CREATION + 250 + CONF });
  const context = await browser.createBrowserContext();
  const page = await newPage(context, "A");
  try {
    await gotoApp(page, "/eth/");
    note("settingsHelper", await setupRpc(page, { tryCount, interval: "500" }));
    await clickCheckbox(page, "Sync target: Augur version1");
    await clickCheckbox(page, "Sync target: Augur version2");
    await navIn(page, "/eth/Augur-version1/contracts/Augur/");
    await clickCheckbox(page, "Sync target: Augur", -1);
    rpcState.mode = mode;
    rpcState.calls.length = 0;
    await clickToggle(page);
    // Retry Count 10 with a 1 s wait (RETRY_WAIT_MS, eventLogsContract.ts) takes more than 11 s.
    const tr = await watchTransitions(
      page,
      V1,
      "Augur",
      (t, s) =>
        (t?.tooltip === "start sync" && s?.isSyncing === false) ||
        s?.fetched >= V1_CREATION + 250,
      60000,
    );
    note("transitions", tr);
    note("rpc", rpcSummary(rpcState));
    await snap(page, `S3-6-7-${mode}`);
    // wait a bit more: does anything keep calling the RPC?
    const n0 = rpcState.calls.length;
    await new Promise((res) => setTimeout(res, 3000));
    note(
      "calls in 3 s after stop",
      rpcState.calls.slice(n0).map((c) => c.method),
    );
    // #519/#520: one failure log with "returned no block".
    if (mode === "nullBlock") {
      note(
        "noBlockMessages",
        consoleLog
          .filter(
            (x) =>
              x.scenario === scenario &&
              `${x.text} ${x.detail ?? ""}`.includes("returned no block"),
          )
          .map((x) => `${x.type} ${(x.detail ?? x.text).slice(0, 300)}`),
      );
    }
  } catch (e) {
    note("error", String(e.stack ?? e));
    await page
      .screenshot({ path: path.join(outDir, `S3-${mode}-error.png`) })
      .catch(() => {});
  }
  await context.close();
}

// ---------- S4: 6-8 two tabs ----------
if (want("S4")) {
  scenario = "S4";
  rpcState = makeState({ latest: V1_CREATION + 250 + CONF, delayMs: 50 });
  const context = await browser.createBrowserContext();
  const a = await newPage(context, "A");
  const front = async (p) => p.bringToFront().catch(() => {});
  let b;
  try {
    await (await front(a), gotoApp)(a, "/eth/");
    note("locks", await a.evaluate(() => !!navigator.locks));
    note("settingsHelper", await (await front(a), setupRpc)(a));
    await (await front(a), clickCheckbox)(a, "Sync target: Augur version1");
    await (await front(a), clickCheckbox)(a, "Sync target: Augur version2");
    await (await front(a), navIn)(a, "/eth/Augur-version1/contracts/Augur/");
    await (await front(a), clickCheckbox)(a, "Sync target: Augur", -1);
    // B is open before A starts.
    b = await newPage(context, "B");
    await (await front(b), gotoApp)(b, EV);
    await (await front(b), snap)(b, "S4-6-8-a-B-before");
    await (await front(a), navIn)(a, EV);
    await (await front(a), clickToggle)(a);
    await (await front(a), waitTooltip)(a, "stop sync", 15000);
    await (await front(a), snap)(a, "S4-6-8-b-A-syncing");
    await new Promise((res) => setTimeout(res, 500));
    await (await front(b), snap)(b, "S4-6-8-c-B-while-A-syncing-no-click");
    // B tries to start.
    const bInfo = await (await front(b), toggleInfo)(b);
    note("B toggle before click", bInfo);
    if (bInfo && !bInfo.disabled) {
      await (await front(b), clickToggle)(b);
      note(
        "B after click",
        await (await front(b), watchTransitions)(
          b,
          V1,
          "Augur",
          (t) => t?.tooltip === "syncing in another tab",
          5000,
        ),
      );
    }
    await (await front(b), snap)(b, "S4-6-8-d-B-after-click");
    // C opens while A syncs.
    const c = await newPage(context, "C");
    await (await front(c), gotoApp)(c, EV);
    await new Promise((res) => setTimeout(res, 1000));
    await (await front(c), snap)(c, "S4-6-8-e-C-opened-while-A-syncing");
    // A stops.
    await (await front(a), clickToggle)(a);
    note(
      "A stop",
      await (await front(a), watchTransitions)(
        a,
        V1,
        "Augur",
        (t, s) => s?.isSyncing === false && t?.tooltip === "start sync",
        30000,
      ),
    );
    await new Promise((res) => setTimeout(res, 1500));
    await (await front(b), snap)(b, "S4-6-8-f-B-after-A-stopped");
    await (await front(c), snap)(c, "S4-6-8-g-C-after-A-stopped");
    // B starts now.
    const b2 = await (await front(b), toggleInfo)(b);
    note("B toggle after A stopped", b2);
    if (b2 && !b2.disabled && b2.tooltip === "start sync") {
      await (await front(b), clickToggle)(b);
      await (await front(b), waitTooltip)(b, "stop sync", 15000).catch(
        () => {},
      );
      await new Promise((res) => setTimeout(res, 1000));
      await (await front(b), snap)(b, "S4-6-8-h-B-syncing");
      await (await front(a), snap)(a, "S4-6-8-i-A-while-B-syncing");
      await (await front(b), clickToggle)(b);
      note(
        "B stop",
        await (await front(b), watchTransitions)(
          b,
          V1,
          "Augur",
          (t, s) => s?.isSyncing === false,
          30000,
        ),
      );
    }
    // A closes while syncing: B should take over.
    await (await front(a), clickToggle)(a);
    await (await front(a), waitTooltip)(a, "stop sync", 15000).catch(() => {});
    await new Promise((res) => setTimeout(res, 500));
    await a.close();
    await new Promise((res) => setTimeout(res, 2000));
    await (await front(b), snap)(b, "S4-6-8-j-B-after-A-closed-while-syncing");
  } catch (e) {
    note("error", String(e.stack ?? e));
    await b
      ?.screenshot({ path: path.join(outDir, "S4-error.png") })
      .catch(() => {});
  }
  note("rpc", rpcSummary(rpcState));
  await context.close();
}

// ---------- S5: 8-1 the pageerrors on in-app navigation, with real links ----------
if (want("S5")) {
  scenario = "S5";
  rpcState = makeState();
  const context = await browser.createBrowserContext();
  const page = await newPage(context, "A");
  try {
    await gotoApp(page, "/eth/Augur-version1/");
    for (const [label, suffix] of [
      ["contract link", "/contracts/Augur"],
      ["event link", "/events/MarketCreated"],
      ["version link", "/eth/Augur-version1"],
    ]) {
      const n0 = consoleLog.filter(
        (x) => x.scenario === "S5" && x.type === "pageerror",
      ).length;
      const hrefs = await page.evaluate(
        (suffix) =>
          [...document.querySelectorAll("a[href]")]
            .filter(
              (a) =>
                a.getClientRects().length &&
                a
                  .getAttribute("href")
                  .replace(/#.*$/, "")
                  .replace(/\/$/, "")
                  .endsWith(suffix),
            )
            .map((a) => a.getAttribute("href")),
        suffix,
      );
      lastAction = `real click ${label} ${hrefs[0]}`;
      const h = await page.evaluateHandle(
        (suffix) =>
          [...document.querySelectorAll("a[href]")].find(
            (a) =>
              a.getClientRects().length &&
              a
                .getAttribute("href")
                .replace(/#.*$/, "")
                .replace(/\/$/, "")
                .endsWith(suffix),
          ),
        suffix,
      );
      if (h.asElement()) await h.asElement().click();
      await waitSpinner(page);
      await settle(page);
      await new Promise((res) => setTimeout(res, 800));
      const n1 = consoleLog.filter(
        (x) => x.scenario === "S5" && x.type === "pageerror",
      ).length;
      note(`real ${label}`, {
        hrefs: hrefs.slice(0, 3),
        url: page.url(),
        newPageErrors: n1 - n0,
      });
    }
  } catch (e) {
    note("error", String(e.stack ?? e));
  }
  await context.close();
}

// #483: the key-like path of the RPC URL must not be in the console.
scenario = "summary";
note(
  "fakeKeyInConsole (#483)",
  consoleLog
    .filter((x) => `${x.text} ${x.detail ?? ""}`.includes(FAKE_KEY))
    .map((x) => `${x.scenario} ${x.type} ${x.text.slice(0, 120)}`),
);
const byType = {};
for (const x of consoleLog) byType[x.type] = (byType[x.type] ?? 0) + 1;
note("console by type", byType);
note(
  "csp",
  consoleLog
    .filter((x) => x.type === "csp")
    .map((x) => `${x.scenario} ${x.text}`),
);
note("blocked", blocked.length);
saveResults();
await browser.close();
server.close();
console.log("done");
