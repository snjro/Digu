// Checks the build with the public RPC of PublicNode (no key): connection,
// latest block (Goal), the refused eth_getLogs of old blocks, and the stop.
// Runs in the compose "test" service (see run.sh):
//   node real-rpc-check.mjs <buildDir> <outDir> [--fake] [--only=eth-http,...]
// - Without --fake, the page talks to the real PublicNode hosts over http(s)
//   and wss. Every other host is blocked (DNS and request interception).
// - With --fake, nothing leaves the container: the http requests to the same
//   URLs are answered by the request interceptor like PublicNode answered in
//   September 2026 on eth (chainId, a latest block, -32602 for eth_getLogs). wss is not
//   answered (a WebSocket cannot be intercepted), so it ends in an error.
// One run per chain and protocol, each in a new browser profile. The matic
// runs turn off the warp sync first, so that the sync starts at old blocks
// (#635); eth has no snapshot here (see the request interception).
//   1. "Connected." for the RPC. 2. The Goal (ChainStatus.latestBlockNumber)
//   is a seen eth_blockNumber minus confirmationBlocks (#498).
//   3. Sync one contract: eth_getLogs is refused with an error (any code;
//   PublicNode used -32602 on eth and -32701 on matic), the sync stops
//   after TRY_COUNT + 1 tries, the toggle is off, the RPC URL is not in the
//   console (#483), and no contract is left isAbort/isSyncing (#515).
//   4. Console errors and warnings, page errors, CSP violations (#504).
//   5. The number of requests to the RPC, by method.
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import {
  handleRequests,
  logPageProblems,
  serveBuild,
} from "../../check-lib/browser.mjs";

const require = createRequire(path.join(process.cwd(), "package.json"));
const puppeteer = require("puppeteer");

const [buildDir, outDir] = process.argv.slice(2);
if (!buildDir || !outDir) {
  console.error(
    "Usage: node real-rpc-check.mjs <buildDir> <outDir> [--fake] [--only=eth-http,...]",
  );
  process.exit(2);
}
const FAKE = process.argv.includes("--fake");
const ONLY = process.argv
  .find((a) => a.startsWith("--only="))
  ?.slice(7)
  .split(",");
fs.mkdirSync(outDir, { recursive: true });

const PORT = 4173;
const ORIGIN = `http://localhost:${PORT}`;
const HOSTS = {
  eth: "ethereum-rpc.publicnode.com",
  matic: "polygon-bor-rpc.publicnode.com",
};
const CHAIN_ID = { eth: "0x1", matic: "0x89" };
// confirmationBlocks of the build (#498): eth 96, matic 128.
const conf = (dir) =>
  Number(
    fs
      .readFileSync(`/app/src/constants/chains/${dir}/_index.ts`, "utf8")
      .match(/confirmationBlocks:\s*(\d+)/)[1],
  );
const CONFIRMATION = { eth: conf("ethereum-mainnet"), matic: conf("matic") };
// The errors after which the sync stops (TRY_COUNT of the build).
const TRY_COUNT = Number(
  fs
    .readFileSync("/app/src/eventLogs/eventLogsContract.ts", "utf8")
    .match(/export const TRY_COUNT\b[^=]*=\s*(\d+)/)[1],
);
// One contract to sync. The versions are turned off first.
const TARGET = {
  eth: {
    versions: ["Augur version1", "Augur version2"],
    contractPage: "/eth/Augur-version1/contracts/Augur/",
    contract: "Augur",
    db: "Digu_EventLog_eth_Augur_version1",
  },
  matic: {
    versions: ["Augur turbo"],
    contractPage: "/matic/Augur-turbo/contracts/AMMFactory/",
    contract: "AMMFactory",
    db: "Digu_EventLog_matic_Augur_turbo",
  },
};
// The chains whose warp sync is turned off in the sync panel before the sync.
// The import starts when the chain is opened, so its files are answered with
// 404 until then.
const WARP_SYNC_OFF = new Set(["matic"]);
let holdWarpSync = null;
let warpSyncRequests = 0;
const RUNS = [
  ["eth-http", "eth", `https://${HOSTS.eth}`],
  ["eth-wss", "eth", `wss://${HOSTS.eth}`],
  ["matic-http", "matic", `https://${HOSTS.matic}`],
  ["matic-wss", "matic", `wss://${HOSTS.matic}`],
].filter(([id]) => !ONLY || ONLY.includes(id));

const results = {};
const consoleLog = [];
const blocked = [];
let run = "";
function save() {
  fs.writeFileSync(
    path.join(outDir, "results.json"),
    JSON.stringify(
      { fake: FAKE, tryCount: TRY_COUNT, confirmation: CONFIRMATION, results },
      null,
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
function note(key, value) {
  (results[run] ??= {})[key] = value;
  console.log(`[${run}] ${key}: ${JSON.stringify(value).slice(0, 500)}`);
  save();
}

// ---- the build, served like GitHub Pages ----
const server = serveBuild(buildDir);

// ---- the RPC traffic of one run ----
// calls: every JSON-RPC call sent, {transport, method, id}. answers: the
// results and errors that came back, by method.
let traffic;
function newTraffic() {
  return {
    httpRequests: 0,
    wsConnections: [],
    calls: [],
    answers: [],
    pendingWs: new Map(),
  };
}
function recordSent(transport, body) {
  const list = Array.isArray(body) ? body : body ? [body] : [];
  for (const p of list) {
    traffic.calls.push({
      transport,
      method: p.method,
      id: p.id,
      params: p.method === "eth_getLogs" ? p.params : undefined,
    });
    if (transport === "ws") traffic.pendingWs.set(p.id, p.method);
  }
}
function recordAnswer(method, a) {
  traffic.answers.push({
    method,
    result: a.error
      ? undefined
      : method === "eth_getLogs"
        ? `(${a.result?.length} logs)`
        : a.result,
    error: a.error
      ? { code: a.error.code, message: String(a.error.message).slice(0, 200) }
      : undefined,
  });
}
function summary() {
  const byMethod = {};
  for (const c of traffic.calls)
    byMethod[`${c.transport} ${c.method}`] =
      (byMethod[`${c.transport} ${c.method}`] ?? 0) + 1;
  const errors = {};
  for (const a of traffic.answers.filter((a) => a.error)) {
    const k = `${a.method} ${a.error.code} ${a.error.message}`;
    errors[k] = (errors[k] ?? 0) + 1;
  }
  return {
    httpRequests: traffic.httpRequests,
    wsConnections: traffic.wsConnections,
    calls: traffic.calls.length,
    byMethod,
    errors,
  };
}

// --fake: answers like PublicNode did in September 2026.
// Keep each chain above the end of its warp sync snapshot
// (static/warp-sync/<chain>/), or the sync has no range to ask for after the
// import.
const FAKE_LATEST = { eth: 27_000_000, matic: 100_000_000 };
function fakeAnswer(chain, p) {
  const q = (n) => "0x" + n.toString(16);
  switch (p.method) {
    case "eth_chainId":
      return { jsonrpc: "2.0", id: p.id, result: CHAIN_ID[chain] };
    case "net_version":
      return {
        jsonrpc: "2.0",
        id: p.id,
        result: String(Number(CHAIN_ID[chain])),
      };
    case "eth_blockNumber":
      return { jsonrpc: "2.0", id: p.id, result: q(FAKE_LATEST[chain]) };
    case "eth_getLogs":
      return {
        jsonrpc: "2.0",
        id: p.id,
        error: {
          code: -32602,
          message: "Archive requests require a personal token.",
        },
      };
    default:
      return { jsonrpc: "2.0", id: p.id, result: null };
  }
}

async function newPage(context) {
  const page = await context.newPage();
  await page.setViewport({ width: 1400, height: 900 });
  // Console errors and warnings, page errors and CSP violations (#504).
  await logPageProblems(page, async ({ type, text, message }) => {
    const entry = { run, type, text: text.slice(0, 500) };
    consoleLog.push(entry);
    // customLogger passes objects; keep them as JSON (with Error message and cause).
    if (message && entry.text.includes("[object Object]")) {
      const parts = await Promise.all(
        message.args().map((a) =>
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
  });
  // http: request interception. Only localhost and the PublicNode hosts.
  await handleRequests(page, {
    isLocal: (url) => url.origin === ORIGIN,
    answer: (req, url) => {
      if (url.pathname.includes("/warp-sync/")) {
        warpSyncRequests += 1;
        if (
          holdWarpSync &&
          url.pathname.includes(`/warp-sync/${holdWarpSync}/`)
        ) {
          req.respond({ status: 404, body: "" });
          return true;
        }
      }
      const chain = Object.keys(HOSTS).find((c) => HOSTS[c] === url.hostname);
      if (!chain || url.protocol !== "https:") return false;
      let body = null;
      try {
        body = JSON.parse(req.postData() ?? "null");
      } catch {
        // not JSON
      }
      if (req.method() === "POST") {
        traffic.httpRequests += 1;
        recordSent("http", body);
      }
      if (!FAKE) {
        req.continue();
      } else if (req.method() === "OPTIONS") {
        req.respond({
          status: 204,
          headers: {
            "access-control-allow-origin": "*",
            "access-control-allow-methods": "POST, GET, OPTIONS",
            "access-control-allow-headers": "*",
          },
          body: "",
        });
      } else {
        const payload = Array.isArray(body)
          ? body.map((p) => fakeAnswer(chain, p))
          : body
            ? fakeAnswer(chain, body)
            : {};
        req.respond({
          status: 200,
          contentType: "application/json",
          headers: { "access-control-allow-origin": "*" },
          body: JSON.stringify(payload),
        });
      }
      return true;
    },
    onBlocked: (url) => blocked.push({ run, url }),
  });
  page.on("response", async (res) => {
    const url = new URL(res.url());
    if (
      !Object.values(HOSTS).includes(url.hostname) ||
      res.request().method() !== "POST"
    )
      return;
    let sent = null;
    try {
      sent = JSON.parse(res.request().postData() ?? "null");
    } catch {
      // not JSON
    }
    const body = await res.json().catch(() => null);
    const sentList = Array.isArray(sent) ? sent : sent ? [sent] : [];
    const got = Array.isArray(body) ? body : body ? [body] : [];
    for (const a of got)
      recordAnswer(sentList.find((p) => p.id === a.id)?.method ?? "?", a);
  });
  // wss: the frames, through the DevTools protocol (not intercepted).
  const cdp = await page.createCDPSession();
  await cdp.send("Network.enable");
  cdp.on("Network.webSocketCreated", (e) => traffic.wsConnections.push(e.url));
  cdp.on("Network.webSocketFrameSent", (e) => {
    try {
      recordSent("ws", JSON.parse(e.response.payloadData));
    } catch {
      // not JSON
    }
  });
  cdp.on("Network.webSocketFrameReceived", (e) => {
    let a;
    try {
      a = JSON.parse(e.response.payloadData);
    } catch {
      return;
    }
    for (const x of Array.isArray(a) ? a : [a]) {
      if (x.id === undefined) continue;
      recordAnswer(traffic.pendingWs.get(x.id) ?? "?", x);
    }
  });
  return page;
}

// ---- helpers (as in ../sync/sync-check.mjs and ../ui/sec3.mjs) ----
async function settle(page) {
  await page
    .waitForNetworkIdle({ idleTime: 300, timeout: 5000 })
    .catch(() => {});
  await page.evaluate(() => new Promise((r) => setTimeout(r, 300)));
}
async function gotoApp(page, p) {
  await page.goto(ORIGIN + p, { waitUntil: "load" });
  await page
    .waitForFunction(
      () => !document.querySelector('[data-testid="loadingSpinner-test"]'),
      { timeout: 20000, polling: 100 },
    )
    .catch(() => {});
  await settle(page);
}
// In-app navigation keeps the page (a page.goto would end the sync).
async function navIn(page, p) {
  await page.evaluate((p) => {
    const a = document.createElement("a");
    a.href = p;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }, p);
  await page
    .waitForFunction(
      (p) => location.pathname === p,
      { timeout: 15000, polling: 100 },
      p,
    )
    .catch(() => {});
  await settle(page);
}
async function typeInto(page, selector, text) {
  await page.focus(selector);
  await page.keyboard.down("Control");
  await page.keyboard.press("a");
  await page.keyboard.up("Control");
  await page.keyboard.type(text);
  await page.keyboard.press("Tab");
}
const TOGGLE_TEXTS = [
  "start sync",
  "stop sync",
  "starting sync",
  "stopping sync",
  "syncing in another tab",
  // SYNC_WAITS_FOR_IMPORT of src/warpSync/warpSyncTexts.ts.
  "Importing the published logs. Stop it to sync from your RPC now.",
];
async function toggleButton(page) {
  return page.evaluateHandle((texts) => {
    for (const label of [...document.querySelectorAll("*")].filter(
      (e) => e.children.length === 0 && texts.includes(e.textContent.trim()),
    )) {
      for (let e = label; e; e = e.parentElement) {
        const b = e.querySelector("button");
        if (b && b.getClientRects().length) return b;
      }
    }
    return null;
  }, TOGGLE_TEXTS);
}
async function toggleInfo(page) {
  const h = await toggleButton(page);
  const el = h.asElement();
  if (!el) return null;
  return el.evaluate((b, texts) => {
    const text = [...b.parentElement.parentElement.querySelectorAll("*")]
      .map((e) => e.textContent.trim())
      .find((t) => texts.includes(t));
    return { tooltip: text, disabled: b.disabled };
  }, TOGGLE_TEXTS);
}
// The helper text under the RPC input.
async function helper(page) {
  return page.evaluate(() =>
    // The own text of an element; the link to the guide after it (#402) is left out.
    [...(document.querySelector("nav") ?? document.body).querySelectorAll("*")]
      .filter(
        (e) =>
          [...e.children].every((c) => c.tagName === "A") &&
          e.getClientRects().length,
      )
      .map((e) =>
        [...e.childNodes]
          .filter((c) => c.nodeType === Node.TEXT_NODE)
          .map((c) => c.textContent)
          .join("")
          .trim(),
      )
      .filter((t) => /^(Enter URL|Connecting|Connected|Error\.)/.test(t))
      .join(" / "),
  );
}
async function navText(page) {
  return page.evaluate(() =>
    (document.querySelector("nav")?.innerText ?? "")
      .replace(/\s+/g, " ")
      .slice(0, 300),
  );
}
async function clickCheckbox(page, label) {
  const all = await page.$$(`input[aria-label="${label}"]`);
  const visible = [];
  for (const h of all)
    if (await h.evaluate((e) => e.getClientRects().length > 0)) visible.push(h);
  if (!visible.length) throw new Error(`no checkbox ${label}`);
  // The sidebar is first; the one in the page is last.
  await visible.at(-1).click();
  await settle(page);
  return visible.at(-1).evaluate((e) => e.checked);
}
// Unchecks "Warp sync" in the sync panel, and reads the saved setting.
async function turnOffWarpSync(page, chain) {
  await page.click('nav button[aria-controls="sync-panel"]');
  await page.waitForSelector("#sync-panel:not(.hidden)", { timeout: 5000 });
  await settle(page);
  const checkedAfterClick = await clickCheckbox(page, "Warp sync");
  const OFF = "Off: the logs are fetched only from your RPC.";
  const helperShown = await page
    .waitForFunction(
      (t) => document.getElementById("sync-panel")?.innerText.includes(t),
      { timeout: 5000, polling: 100 },
      OFF,
    )
    .then(() => true)
    .catch(() => false);
  const saved = await page.evaluate(
    (chain) =>
      new Promise((res, rej) => {
        const o = indexedDB.open("Digu_Settings");
        o.onerror = () => rej(o.error);
        o.onsuccess = () => {
          const q = o.result
            .transaction("RpcSettings")
            .objectStore("RpcSettings")
            .get(chain);
          q.onsuccess = () => {
            o.result.close();
            res(q.result?.warpSync);
          };
        };
      }),
    chain,
  );
  await page.keyboard.press("Escape");
  await settle(page);
  return { warpSync: saved, checkedAfterClick, helperShown };
}
async function readDb(page, chain, db, contract) {
  return page.evaluate(
    async (chain, db, contract) => {
      const open = (name) =>
        new Promise((res, rej) => {
          const o = indexedDB.open(name);
          o.onsuccess = () => res(o.result);
          o.onerror = () => rej(o.error);
        });
      const all = (d, s) =>
        new Promise((res) => {
          const q = d.transaction(s).objectStore(s).getAll();
          q.onsuccess = () => res(q.result);
        });
      const cs = await open("Digu_ChainStatus");
      const chainStatus = (await all(cs, "ChainStatus")).find(
        (r) => r.chainName === chain,
      );
      cs.close();
      // #515: no contract of the chain is left isAbort or isSyncing.
      const leftFlags = [];
      let row = null;
      for (const { name } of await indexedDB.databases()) {
        if (!name.startsWith(`Digu_EventLog_${chain}_`)) continue;
        const d = await open(name);
        for (const r of await all(d, "SyncStatus")) {
          if (r.isAbort || r.isSyncing)
            leftFlags.push(
              `${name}/${r.name} isSyncing=${r.isSyncing} isAbort=${r.isAbort}`,
            );
          if (name === db && r.name === contract)
            row = {
              fetchedBlockNumber: r.fetchedBlockNumber,
              isSyncing: r.isSyncing,
              isAbort: r.isAbort,
              syncStateText: r.syncStateText,
            };
        }
        d.close();
      }
      return { chainStatus, row, leftFlags };
    },
    chain,
    db,
    contract,
  );
}

// ---- runs ----
await new Promise((r) => server.listen(PORT, "127.0.0.1", r));
const allowed = FAKE ? [] : Object.values(HOSTS).map((h) => `, EXCLUDE ${h}`);
const browser = await puppeteer.launch({
  args: [
    `--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE localhost${allowed.join("")}`,
  ],
});

for (const [id, chain, rpc] of RUNS) {
  run = id;
  traffic = newTraffic();
  const t = TARGET[chain];
  const context = await browser.createBrowserContext();
  const page = await newPage(context);
  try {
    note("rpc", {
      url: rpc,
      fake: FAKE,
      tryCount: TRY_COUNT,
      confirmationBlocks: CONFIRMATION[chain],
    });
    holdWarpSync = WARP_SYNC_OFF.has(chain) ? chain : null;
    warpSyncRequests = 0;
    await gotoApp(page, `/${chain}/`);
    if (holdWarpSync) {
      const off = await turnOffWarpSync(page, chain);
      note("warpSync", {
        ...off,
        ok: off.warpSync === false && off.checkedAfterClick === false,
        requestsWhileHeld: warpSyncRequests,
      });
      holdWarpSync = null;
      warpSyncRequests = 0;
      if (off.warpSync !== false)
        throw new Error("the warp sync is not off; the sync is not started");
    }
    // One contract as the sync target.
    const targets = {};
    for (const v of t.versions)
      targets[v] = await clickCheckbox(page, `Sync target: ${v}`);
    await navIn(page, t.contractPage);
    targets[t.contract] = await clickCheckbox(
      page,
      `Sync target: ${t.contract}`,
    );
    note("syncTargets (checked after the click)", targets);

    // 1. Connected.
    const seen = [];
    await typeInto(page, 'input[aria-label="RPC URL"]', rpc);
    const t0 = Date.now();
    // Right after Tab, the helper can show "Error. Invalid URL." for a moment:
    // the new URL is saved before the node status leaves INVALID_URL (#573).
    // So stop at "Connected." or at an error that stays for 1 s.
    let since = t0;
    while (Date.now() - t0 < 30000) {
      const h = await helper(page);
      if (seen.at(-1) !== h) {
        seen.push(h);
        since = Date.now();
      }
      if (h.startsWith("Connected.")) break;
      if (h.startsWith("Error.") && Date.now() - since >= 1000) break;
      await new Promise((r) => setTimeout(r, 100));
    }
    const connected = seen.at(-1) === "Connected.";
    note("1 helper", { ok: connected, seen, ms: Date.now() - t0 });
    await page.screenshot({ path: path.join(outDir, `${id}-1-connected.png`) });
    note("traffic after connect", summary());
    if (!connected) throw new Error("not connected; the sync is not started");

    // 2 and 3. Start the sync and wait until it stops by itself.
    const before = await readDb(page, chain, t.db, t.contract);
    const n0 = traffic.calls.length;
    await (await toggleButton(page)).click();
    const transitions = [];
    const t1 = Date.now();
    let stopped = false;
    while (Date.now() - t1 < 120000) {
      const ti = await toggleInfo(page);
      const d = await readDb(page, chain, t.db, t.contract);
      const key = JSON.stringify({ toggle: ti, row: d.row });
      if (transitions.at(-1)?.key !== key)
        transitions.push({ ms: Date.now() - t1, key });
      if (
        Date.now() - t1 > 1000 &&
        ti?.tooltip === "start sync" &&
        d.row?.isSyncing === false
      ) {
        stopped = true;
        break;
      }
      await new Promise((r) => setTimeout(r, 200));
    }
    note(
      "3 transitions",
      transitions.map((x) => `${x.ms}ms ${x.key}`),
    );
    // Anything that keeps calling after the stop.
    const n1 = traffic.calls.length;
    await new Promise((r) => setTimeout(r, 3000));
    note(
      "calls in 3 s after the stop",
      traffic.calls.slice(n1).map((c) => `${c.transport} ${c.method}`),
    );
    const after = await readDb(page, chain, t.db, t.contract);
    const nav = await navText(page);
    await page.screenshot({ path: path.join(outDir, `${id}-3-stopped.png`) });
    // #515: the contracts grid shows "stopped", not "-", for the contract.
    await navIn(page, t.contractPage.replace(/[^/]+\/$/, ""));
    await page.waitForSelector(".ag-row", { timeout: 15000 }).catch(() => {});
    await settle(page);
    const gridRow = await page.evaluate((name) => {
      const byIdx = {};
      for (const r of document.querySelectorAll(".ag-row"))
        (byIdx[r.getAttribute("row-index")] ??= []).push(
          ...[...r.querySelectorAll(".ag-cell")].map((c) => c.innerText.trim()),
        );
      return Object.values(byIdx).find((cells) => cells.includes(name)) ?? null;
    }, t.contract);
    await page.screenshot({
      path: path.join(outDir, `${id}-3-contracts-grid.png`),
    });

    // 2. Goal = a seen eth_blockNumber - confirmationBlocks (#498).
    const latestSeen = [
      ...new Set(
        traffic.answers
          .filter((a) => a.method === "eth_blockNumber" && a.result)
          .map((a) => Number(BigInt(a.result))),
      ),
    ];
    const goal = after.chainStatus?.latestBlockNumber;
    note("2 goal", {
      ok: latestSeen.includes(goal + CONFIRMATION[chain]),
      goal,
      goalBeforeSync: before.chainStatus?.latestBlockNumber,
      latestSeen: latestSeen.slice(-5),
      confirmationBlocks: CONFIRMATION[chain],
    });

    // 3. Refused eth_getLogs, TRY_COUNT + 1 tries, toggle off, #483, #515.
    const syncCalls = traffic.calls.slice(n0);
    const getLogs = syncCalls.filter((c) => c.method === "eth_getLogs");
    // Any error code: PublicNode refused with -32602 on eth and -32701 on matic.
    const refused = traffic.answers.filter(
      (a) => a.method === "eth_getLogs" && a.error,
    );
    const refusedCodes = {};
    for (const a of refused)
      refusedCodes[a.error.code] = (refusedCodes[a.error.code] ?? 0) + 1;
    const host = new URL(rpc).host;
    const urlInConsole = consoleLog
      .filter(
        (x) => x.run === id && `${x.text} ${x.detail ?? ""}`.includes(host),
      )
      .map((x) => `${x.type} ${(x.detail ?? x.text).slice(0, 200)}`);
    note("3 sync", {
      ok:
        stopped &&
        getLogs.length === TRY_COUNT + 1 &&
        refused.length === getLogs.length &&
        urlInConsole.length === 0 &&
        after.leftFlags.length === 0 &&
        / stopped /.test(` ${nav} `) &&
        !!gridRow?.includes("stopped"),
      stopped,
      eth_getLogs: getLogs.length,
      expected: TRY_COUNT + 1,
      refused: refused.length,
      refusedCodes,
      firstGetLogs: getLogs[0]?.params,
      warpSyncRequestsAfterOff: WARP_SYNC_OFF.has(chain)
        ? warpSyncRequests
        : undefined,
      rpcUrlInConsole: urlInConsole,
      leftFlags: after.leftFlags,
      row: after.row,
      nav,
      contractsGridRow: gridRow,
    });
  } catch (e) {
    note("error", String(e.stack ?? e));
    await page
      .screenshot({ path: path.join(outDir, `${id}-error.png`) })
      .catch(() => {});
  }
  // 4 and 5.
  const own = consoleLog.filter((x) => x.run === id);
  const byType = {};
  for (const x of own) byType[x.type] = (byType[x.type] ?? 0) + 1;
  note("4 console by type", byType);
  note(
    "4 csp",
    own.filter((x) => x.type === "csp").map((x) => x.text),
  );
  const s = summary();
  note("5 traffic", {
    ...s,
    eth_chainId: Object.entries(s.byMethod)
      .filter(([k]) => k.endsWith(" eth_chainId"))
      .reduce((n, [, v]) => n + v, 0),
  });
  await context.close();
}

run = "all";
note("blocked", blocked.length);
save();
await browser.close();
server.close();
console.log("done");
