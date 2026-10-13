// Checks the build with the public RPC of PublicNode (no key): connection,
// latest block (Goal), the sync of old blocks, and the stop.
// Runs in the compose "test" service (see run.sh):
//   node real-rpc-check.mjs <buildDir> <outDir> [--fake] [--only=eth-http,...]
// - Without --fake, the page talks to the real PublicNode hosts over http(s)
//   and wss. Every other host is blocked (DNS and request interception).
// - With --fake, nothing leaves the container: the http requests to the same
//   URLs are answered by the request interceptor like PublicNode answered in
//   October 2026 (chainId, a latest block, and -32602 for eth_getLogs). wss
//   is not answered (a WebSocket cannot be intercepted), so it ends in an
//   error.
// One run per protocol, each in a new browser profile. eth has no snapshot
// here (see the request interception).
//   1. "Connected." for the RPC. 2. The Goal (ChainStatus.latestBlockNumber)
//   is a seen eth_blockNumber minus confirmationBlocks (#498).
//   3. Sync one contract. The answers to eth_getLogs in the run choose the
//   check (#811):
//   - "refused": every eth_getLogs is refused with an error (any code;
//   PublicNode used -32602 over http), and the sync stops after
//   TRY_COUNT + 1 tries.
//   - "logs": logs or an empty result come back (PublicNode over wss, #811).
//   The sync moves on, each refusal for the range is followed by a range from
//   the same block that is not wider, and the refused range is then fetched
//   in narrower ranges or in the same range again. Other errors are only
//   recorded. The script stops the sync after that, and no eth_getLogs is
//   sent after the stop.
//   - Both: the toggle is off, the RPC URL is not in the console (#483), and
//   no contract is left isAbort/isSyncing (#515).
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
import { readTryCount } from "../../check-lib/build-source.mjs";
import {
  RPC_INPUT,
  clickCheckbox,
  clickToggle,
  clickToggleIf,
  findToggle,
  typeInto,
} from "../../check-lib/app.mjs";
import { createChecks } from "../../check-lib/results.mjs";

const require = createRequire(path.join(process.cwd(), "package.json"));
const puppeteer = require("puppeteer");

const USAGE =
  "Usage: node real-rpc-check.mjs <buildDir> <outDir> [--fake] [--only=eth-http,...]";
// An unknown argument stops the script before anything is sent, so that a
// typo does not send all the runs to PublicNode.
const [buildDir, outDir, ...flags] = process.argv.slice(2);
if (
  [buildDir, outDir].some((a) => !a || a.startsWith("--")) ||
  flags.some((a) => a !== "--fake" && !a.startsWith("--only=")) ||
  flags.filter((a) => a.startsWith("--only=")).length > 1
) {
  console.error(USAGE);
  process.exit(2);
}
const FAKE = flags.includes("--fake");
const ONLY = flags
  .find((a) => a.startsWith("--only="))
  ?.slice(7)
  .split(",");

const PORT = 4173;
const ORIGIN = `http://localhost:${PORT}`;
const HOSTS = {
  eth: "ethereum-rpc.publicnode.com",
};
const CHAIN_ID = { eth: "0x1" };
// confirmationBlocks of the build (#498): eth 96.
const conf = (dir) =>
  Number(
    fs
      .readFileSync(`/app/src/constants/chains/${dir}/_index.ts`, "utf8")
      .match(/confirmationBlocks:\s*(\d+)/)[1],
  );
const CONFIRMATION = { eth: conf("ethereum-mainnet") };
// The errors after which the sync stops (TRY_COUNT of the build).
const TRY_COUNT = readTryCount();
// When eth_getLogs returns logs, the sync does not stop by itself (#811). The
// script stops it after the first range refused for its width is fetched, or
// after SCRIPT_STOP_MS. In v1.7.0 that took 55 s, with a wait of 28 s for one
// answer.
const SCRIPT_STOP_MS = 100000;
// The app stops after the answer to the eth_getLogs in flight, so the wait
// after the click of the script is long enough for one slow answer.
const STOP_WAIT_MS = 60000;
// The wait for a sync that stops by itself.
const SELF_STOP_MS = 120000;
// One contract to sync. The versions are turned off first.
const TARGET = {
  eth: {
    versions: ["Augur version1", "Augur version2"],
    contractPage: "/eth/Augur-version1/contracts/Augur/",
    contract: "Augur",
    db: "Digu_EventLog_eth_Augur_version1",
  },
};
const ALL_RUNS = [
  ["eth-http", "eth", `https://${HOSTS.eth}`],
  ["eth-wss", "eth", `wss://${HOSTS.eth}`],
];
if (ONLY?.some((o) => !ALL_RUNS.some(([id]) => id === o))) {
  console.error(USAGE);
  process.exit(2);
}
const RUNS = ALL_RUNS.filter(([id]) => !ONLY || ONLY.includes(id));
fs.mkdirSync(outDir, { recursive: true });

// results.json is for a person; judge.py reads results-real-rpc.json.
const results = {};
const consoleLog = [];
const blocked = [];
let run = "";
// With --fake, a wss run ends in an error (see the top), so it is not judged.
let judged = true;
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
// note() writes INFO, check() OK or NG, and guard() turns an exception of a
// run into ERROR; INFO in a run that is not judged
// (scripts/check-lib/results.mjs).
const { note, check, guard } = createChecks({
  file: path.join(outDir, "results-real-rpc.json"),
  prefix: () => run,
  keep(key, value) {
    (results[run] ??= {})[key] = value;
    console.log(`[${run}] ${key}: ${JSON.stringify(value).slice(0, 500)}`);
    save();
  },
  judged: () => judged,
});

// ---- the build, served like GitHub Pages ----
const server = serveBuild(buildDir);

// ---- the RPC traffic of one run ----
// calls: every JSON-RPC call sent, {transport, method, id, seq}. answers: the
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
// Returns the calls, so that the http answers can find theirs.
function recordSent(transport, body) {
  const list = Array.isArray(body) ? body : body ? [body] : [];
  return list.map((p) => {
    const call = {
      transport,
      method: p.method,
      id: p.id,
      // The order in which the calls were sent.
      seq: traffic.calls.length,
      params: p.method === "eth_getLogs" ? p.params : undefined,
    };
    traffic.calls.push(call);
    if (transport === "ws") traffic.pendingWs.set(p.id, call);
    return call;
  });
}
// The calls of each http request, for its answer.
const httpCalls = new WeakMap();
// call: the call of the answer, if found.
function recordAnswer(call, a) {
  const method = call?.method ?? "?";
  traffic.answers.push({
    method,
    seq: call?.seq,
    // The range of eth_getLogs, to see what comes after a refusal (#694).
    range:
      method === "eth_getLogs" && call.params?.[0]
        ? [
            Number(BigInt(call.params[0].fromBlock)),
            Number(BigInt(call.params[0].toBlock)),
          ]
        : undefined,
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
// A refusal of a range over the limit of the RPC, as PublicNode answered over
// wss (#811). Other errors may not come again for the same range.
const isRangeRefusal = (e) =>
  e?.code === -32701 || /exceed maximum block range/i.test(e?.message ?? "");
// Each eth_getLogs refused for its range, and what was sent after it (#694).
// The next request is from the same block and not wider, and the successes up
// to the end of the refused range are narrower, or the same range: the app
// sends a refused range once more before halving it, and another node of the
// RPC may answer it. complete: that end was reached.
function refusalsOf(answers) {
  const logs = answers
    .filter((a) => a.method === "eth_getLogs" && a.range)
    .sort((a, b) => a.seq - b.seq);
  const width = (a) => a.range[1] - a.range[0] + 1;
  return logs.flatMap((r, i) => {
    if (!isRangeRefusal(r.error)) return [];
    const after = logs.slice(i + 1);
    const next = after[0];
    const end = after.findIndex((b) => !b.error && b.range[1] >= r.range[1]);
    const successes = (end < 0 ? after : after.slice(0, end + 1)).filter(
      (b) => !b.error,
    );
    const nextOk =
      !next || (next.range[0] === r.range[0] && width(next) <= width(r));
    const narrower = successes.every(
      (b) =>
        width(b) < width(r) ||
        (b.range[0] === r.range[0] && b.range[1] === r.range[1]),
    );
    return [
      {
        range: r.range,
        code: r.error.code,
        next: next?.range,
        nextOk,
        successWidths: successes.map(width),
        narrower,
        complete: end >= 0,
      },
    ];
  });
}
// --fake: answers like PublicNode did in October 2026.
// Keep each chain above the end of its warp sync snapshot
// (static/warp-sync/<chain>/), or the sync has no range to ask for after the
// import.
const FAKE_LATEST = { eth: 27_000_000 };
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
        httpCalls.set(req, recordSent("http", body));
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
    const calls = httpCalls.get(res.request()) ?? [];
    const body = await res.json().catch(() => null);
    const got = Array.isArray(body) ? body : body ? [body] : [];
    for (const a of got)
      recordAnswer(
        calls.find((c) => c.id === a.id),
        a,
      );
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
      recordAnswer(traffic.pendingWs.get(x.id), x);
      // An id may be used again after a reconnect.
      traffic.pendingWs.delete(x.id);
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
// The sidebar is first; the one in the page is last. Returns `checked` after
// the click.
async function clickLastCheckbox(page, label) {
  const { checked } = await clickCheckbox(page, label, {
    after: () => settle(page),
  });
  return checked;
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
    "--no-sandbox",
  ],
});

for (const [id, chain, rpc] of RUNS) {
  run = id;
  judged = !(FAKE && rpc.startsWith("wss:"));
  traffic = newTraffic();
  const t = TARGET[chain];
  const context = await browser.createBrowserContext();
  const page = await newPage(context);
  const scenario = async () => {
    note("rpc", {
      url: rpc,
      fake: FAKE,
      tryCount: TRY_COUNT,
      confirmationBlocks: CONFIRMATION[chain],
    });
    await gotoApp(page, `/${chain}/`);
    // One contract as the sync target.
    const targets = {};
    for (const v of t.versions)
      targets[v] = await clickLastCheckbox(page, `Sync target: ${v}`);
    await navIn(page, t.contractPage);
    targets[t.contract] = await clickLastCheckbox(
      page,
      `Sync target: ${t.contract}`,
    );
    // Only the one contract is a sync target.
    check(
      "syncTargets (checked after the click)",
      t.versions.every((v) => targets[v] === false) &&
        targets[t.contract] === true,
      targets,
    );

    // 1. Connected.
    const seen = [];
    await typeInto(page, RPC_INPUT, rpc);
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
    check("1 helper", connected, { seen, ms: Date.now() - t0 });
    await page.screenshot({ path: path.join(outDir, `${id}-1-connected.png`) });
    note("traffic after connect", summary());
    if (!connected) throw new Error("not connected; the sync is not started");

    // 2 and 3. Start the sync. Wait until it stops by itself, or, when
    // eth_getLogs returns logs, stop it from the script and wait for the stop
    // (#811).
    const before = await readDb(page, chain, t.db, t.contract);
    const n0 = traffic.calls.length;
    const a0 = traffic.answers.length;
    // An eth_getLogs answered with logs or an empty result.
    const logsReturned = () =>
      traffic.answers
        .slice(a0)
        .some((a) => a.method === "eth_getLogs" && !a.error);
    await clickToggle(page);
    const transitions = [];
    const t1 = Date.now();
    // stopped: by itself, or after the click of the script.
    let stopped = false;
    let stoppedByItself = false;
    let stopClickedMs = null;
    const deadline = () =>
      stopClickedMs === null
        ? SELF_STOP_MS
        : Math.max(SELF_STOP_MS, stopClickedMs + STOP_WAIT_MS);
    while (Date.now() - t1 < deadline()) {
      const ti = await findToggle(page);
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
        stoppedByItself = stopClickedMs === null;
        break;
      }
      if (
        stopClickedMs === null &&
        logsReturned() &&
        (Date.now() - t1 >= SCRIPT_STOP_MS ||
          refusalsOf(traffic.answers.slice(a0)).some((r) => r.complete))
      ) {
        const ms = Date.now() - t1;
        // Only while it is on: a sync that stopped by itself is not started
        // again.
        if (await clickToggleIf(page, { checked: true, disabled: false })) {
          stopClickedMs = ms;
          continue;
        }
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
    const callsAfterStop = traffic.calls
      .slice(n1)
      .map((c) => `${c.transport} ${c.method}`);
    note("calls in 3 s after the stop", callsAfterStop);
    // The sync itself: eth_getLogs. Other calls stay in the note above.
    const getLogsAfterStop = traffic.calls
      .slice(n1)
      .filter((c) => c.method === "eth_getLogs").length;
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
    check("2 goal", latestSeen.includes(goal + CONFIRMATION[chain]), {
      goal,
      goalBeforeSync: before.chainStatus?.latestBlockNumber,
      latestSeen: latestSeen.slice(-5),
      confirmationBlocks: CONFIRMATION[chain],
    });

    // 3. "refused": refused eth_getLogs, TRY_COUNT + 1 tries. "logs": the sync
    // moves on, the refused ranges are fetched in narrower ranges, and the
    // script stops it (#811). Both: toggle off, #483, #515.
    const shape = logsReturned() ? "logs" : "refused";
    const syncCalls = traffic.calls.slice(n0);
    const getLogs = syncCalls.filter((c) => c.method === "eth_getLogs");
    // Any error code: PublicNode refused with -32602 over http and -32701 over
    // wss.
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
    const refusals = refusalsOf(traffic.answers.slice(a0));
    const fetched = {
      before: before.row?.fetchedBlockNumber,
      after: after.row?.fetchedBlockNumber,
    };
    const synced =
      shape === "logs"
        ? stopped &&
          !stoppedByItself &&
          getLogsAfterStop === 0 &&
          fetched.after > fetched.before &&
          refusals.some((r) => r.complete) &&
          refusals.every((r) => r.nextOk && r.narrower)
        : stopped &&
          getLogs.length === TRY_COUNT + 1 &&
          refused.length === getLogs.length;
    check(
      "3 sync",
      synced &&
        urlInConsole.length === 0 &&
        after.leftFlags.length === 0 &&
        / stopped /.test(` ${nav} `) &&
        !!gridRow?.includes("stopped"),
      {
        shape,
        stopped,
        ...(shape === "logs"
          ? {
              stoppedByItself,
              stopClickedMs,
              getLogsAfterStop,
              fetchedBlockNumber: fetched,
              refusals: refusals.slice(0, 10),
            }
          : { expected: TRY_COUNT + 1 }),
        eth_getLogs: getLogs.length,
        refused: refused.length,
        refusedCodes,
        firstGetLogs: getLogs[0]?.params,
        rpcUrlInConsole: urlInConsole,
        leftFlags: after.leftFlags,
        row: after.row,
        nav,
        contractsGridRow: gridRow,
      },
    );
  };
  await guard(scenario, () =>
    page.screenshot({ path: path.join(outDir, `${id}-error.png`) }),
  );
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
