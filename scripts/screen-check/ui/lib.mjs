// Shared helpers for the UI check. Runs in the compose "test" service.
// Serves _build at / (port 4173) and at /Digu/ (port 4174, nothing at the root,
// like GitHub Pages). Only localhost and the fake RPC are answered.
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(path.join(process.cwd(), "package.json"));
export const puppeteer = require("puppeteer");

export const OUT = process.env.OUT ?? "/out";
export const BUILD = process.env.BUILD ?? "/app/_build";
export const ROOT = "http://localhost:4173";
export const DIGU = "http://localhost:4174/Digu";
export const FAKE_RPC = "http://fake-rpc.invalid/";
export const FAKE_RPC_WRONG = "http://wrong-chain.invalid/";
// The RPC input has no placeholder while it has the focus (BaseInput.svelte),
// and the placeholder became http://localhost:8545 in #459.
export const RPC_INPUT = 'input[aria-label="RPC URL"]';
export const QUICK_SEARCH = 'main input[aria-label="Quick search"]';
fs.mkdirSync(path.join(OUT, "shots"), { recursive: true });

const TYPES = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".json": "application/json",
  ".woff2": "font/woff2",
  ".ico": "image/x-icon",
  ".webmanifest": "application/manifest+json",
  ".txt": "text/plain",
};
function serve(prefix) {
  return http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split("?")[0]);
    if (prefix) {
      if (!p.startsWith(prefix + "/")) {
        res.writeHead(404).end("not found (outside prefix)");
        return;
      }
      p = p.slice(prefix.length);
    }
    let file = path.join(BUILD, p);
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) {
      file = path.join(file, "index.html");
    }
    if (!fs.existsSync(file)) {
      res.writeHead(404).end("not found");
      return;
    }
    res.writeHead(200, {
      "content-type": TYPES[path.extname(file)] ?? "application/octet-stream",
    });
    fs.createReadStream(file).pipe(res);
  });
}
const servers = [];
export async function startServers() {
  const a = serve("");
  const b = serve("/Digu");
  await new Promise((r) => a.listen(4173, "127.0.0.1", r));
  await new Promise((r) => b.listen(4174, "127.0.0.1", r));
  servers.push(a, b);
}

export const rpcLog = [];
// Since #498 the Goal is the latest block minus confirmationBlocks (eth 96),
// so "0x1" would give a Goal of 0. Above the creation of Augur v1 (5926229).
const FAKE_LATEST = "0x" + (6_000_000).toString(16);
function rpcResult(host, method) {
  switch (method) {
    case "eth_chainId":
      if (host === "wrong-chain.invalid") return "0x5";
      return process.env.FAKE_CHAIN ?? "0x1";
    case "net_version":
      return "1";
    case "eth_blockNumber":
      return FAKE_LATEST;
    case "eth_getLogs":
      return [];
    default:
      return null;
  }
}
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
  const host = new URL(req.url()).hostname;
  let body;
  try {
    body = JSON.parse(req.postData() ?? "null");
  } catch {
    body = null;
  }
  const one = (p) => ({
    jsonrpc: "2.0",
    id: p.id,
    result: rpcResult(host, p.method),
  });
  const payload = Array.isArray(body) ? body.map(one) : body ? one(body) : {};
  rpcLog.push(`${host} ${JSON.stringify(body)}`);
  req.respond({
    status: 200,
    contentType: "application/json",
    headers: { "access-control-allow-origin": "*" },
    body: JSON.stringify(payload),
  });
}

export let browser;
export async function launch() {
  browser = await puppeteer.launch({
    args: [
      "--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE localhost",
      "--no-sandbox",
    ],
  });
  return browser;
}

// Every page gets: console/pageerror logging into `log`, request blocking.
export const log = [];
export const blocked = new Set();
let currentStep = "init";
export function setStep(s) {
  currentStep = s;
}
export async function setupPage(page, tag = "") {
  page.on("console", (m) => {
    if (m.type() === "error" || m.type() === "warn" || m.type() === "warning") {
      log.push({
        step: currentStep,
        tag,
        type: m.type(),
        text: m.text().slice(0, 400),
        loc: m.location()?.url?.replace(/^https?:\/\/localhost:\d+/, ""),
      });
    }
  });
  page.on("pageerror", (e) =>
    log.push({
      step: currentStep,
      tag,
      type: "pageerror",
      text: String(e.message ?? e).slice(0, 400),
    }),
  );
  // CSP violations (#504), as in scripts/visual-compare/shots.mjs. On window,
  // because a blocked fetch or WebSocket has no element to fire at.
  await page.exposeFunction("__logCspViolation", (text) =>
    log.push({
      step: currentStep,
      tag,
      type: "csp",
      text: String(text).slice(0, 400),
    }),
  );
  await page.evaluateOnNewDocument(() => {
    window.addEventListener("securitypolicyviolation", (e) => {
      window.__logCspViolation(
        `${e.effectiveDirective} ${e.blockedURI} at ${e.sourceFile}:${e.lineNumber}`,
      );
    });
  });
  page.on("response", (res) => {
    if (res.status() === 404) {
      const u = new URL(res.url());
      log.push({
        step: currentStep,
        tag,
        type: "404",
        text: u.pathname + u.search,
      });
    }
  });
  await page.setRequestInterception(true);
  page.on("request", (req) => {
    if (req.isInterceptResolutionHandled()) return;
    const u = new URL(req.url());
    if (u.hostname.endsWith(".invalid")) {
      answerRpc(req);
    } else if (u.protocol.startsWith("http") && u.hostname !== "localhost") {
      blocked.add(req.url());
      req.abort();
    } else {
      req.continue();
    }
  });
  return page;
}
export async function newContextPage(w = 1400, h = 900, tag = "") {
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  await page.setViewport({ width: w, height: h });
  await setupPage(page, tag);
  return { ctx, page };
}

export async function settle(page, ms = 400) {
  await page
    .waitForNetworkIdle({ idleTime: 400, timeout: 15000 })
    .catch(() => {});
  // wait for the loading spinner to go away
  await page
    .waitForFunction(
      () => !document.querySelector("[data-testid=loadingSpinner-test]"),
      { timeout: 15000 },
    )
    .catch(() => {});
  await page.evaluate(
    (ms) =>
      new Promise((r) =>
        document.hidden
          ? setTimeout(r, ms)
          : requestAnimationFrame(() => setTimeout(r, ms)),
      ),
    ms,
  );
}

export async function shot(page, name) {
  await page.screenshot({ path: path.join(OUT, "shots", `${name}.png`) });
  return `${name}.png`;
}

export async function info(page) {
  return page.evaluate(() => ({
    url: location.pathname + location.hash,
    h1: [...document.querySelectorAll("h1,h2")]
      .filter((e) => e.getClientRects().length)
      .map((e) => e.textContent.trim())
      .slice(0, 6),
    bodyStart: document.body.innerText.replace(/\s+/g, " ").slice(0, 300),
  }));
}

// Click the visible element (a/button/[role=button]) whose accessible text,
// aria-label, title or nested tooltip text equals `text`.
export async function click(
  page,
  text,
  { scope = "body", exact = true, nth = 0 } = {},
) {
  const handle = await page.evaluateHandle(
    (text, scope, exact, nth) => {
      const root = document.querySelector(scope) ?? document.body;
      const vis = (e) => e.getClientRects().length > 0;
      const match = (t) =>
        (t ?? "").trim() !== "" &&
        (exact ? (t ?? "").trim() === text : (t ?? "").includes(text));
      const cands = [
        ...root.querySelectorAll("a,button,[role=button],label,select,summary"),
      ].filter(vis);
      const hits = cands.filter(
        (e) =>
          match(e.getAttribute("aria-label")) ||
          match(e.getAttribute("title")) ||
          match(e.innerText),
      );
      return hits[nth] ?? null;
    },
    text,
    scope,
    exact,
    nth,
  );
  const el = handle.asElement();
  if (!el) throw new Error(`click: not found "${text}" in ${scope}`);
  await el.click();
  return el;
}

// Dump the visible interactive elements (for exploration).
export async function dumpControls(page, scope = "body") {
  return page.evaluate((scope) => {
    const root = document.querySelector(scope) ?? document.body;
    return [...root.querySelectorAll("a,button,[role=button],input,select")]
      .filter((e) => e.getClientRects().length)
      .map((e) =>
        [
          e.tagName,
          e.getAttribute("aria-label"),
          e.getAttribute("href"),
          e.getAttribute("target"),
          (e.innerText ?? "").trim().slice(0, 40),
          e.getAttribute("aria-expanded"),
        ].join(" | "),
      );
  }, scope);
}

export async function idb(page) {
  return page.evaluate(async () => {
    const dbs = await indexedDB.databases();
    const out = {};
    for (const d of dbs) {
      if (!/Settings|ChainStatus/.test(d.name)) {
        out[d.name] = "(exists)";
        continue;
      }
      out[d.name] = await new Promise((resolve) => {
        const o = indexedDB.open(d.name);
        o.onsuccess = async () => {
          const db = o.result;
          const res = {};
          for (const s of db.objectStoreNames) {
            res[s] = await new Promise((r) => {
              const q = db.transaction(s).objectStore(s).getAll();
              q.onsuccess = () => r(q.result);
              q.onerror = () => r("err");
            });
          }
          db.close();
          resolve(res);
        };
        o.onerror = () => resolve("open error");
      });
    }
    return out;
  });
}

export const results = [];
export function rec(id, result, note, shots = [], extra = {}) {
  results.push({ id, result, note, shots, ...extra });
  console.log(`[${id}] ${result} ${note} ${shots.join(",")}`);
}

export function save(name) {
  fs.writeFileSync(
    path.join(OUT, `results-${name}.json`),
    JSON.stringify(
      { results, log, blocked: [...blocked], rpcLog: rpcLog.slice(-50) },
      null,
      2,
    ),
  );
}
export async function finish(name) {
  save(name);
  const count = {};
  for (const l of log) count[l.type] = (count[l.type] ?? 0) + 1;
  console.log(`[summary] ${JSON.stringify(count)} blocked=${blocked.size}`);
  for (const l of log.filter((l) => l.type === "csp"))
    console.log(`  [csp] ${l.step} ${l.text}`);
  await browser?.close();
  servers.forEach((s) => s.close());
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Run a step; record NG with the exception if it throws.
const ONLY = process.argv
  .find((a) => a.startsWith("--only="))
  ?.slice(7)
  .split(",");
export async function step(id, page, fn) {
  if (ONLY && !ONLY.some((o) => id.startsWith(o))) return;
  setStep(id);
  const before = log.length;
  try {
    await fn();
  } catch (e) {
    let s = [];
    try {
      s = [await shot(page, `${id}-exception`)];
    } catch {
      // no screenshot
    }
    rec(id, "ERROR", `script exception: ${String(e.message).slice(0, 300)}`, s);
  }
  const errs = log
    .slice(before)
    .filter(
      (l) => l.type === "error" || l.type === "pageerror" || l.type === "csp",
    );
  if (errs.length)
    console.log(
      `  [${id}] ${errs.length} console errors / pageerrors / CSP violations`,
    );
}
