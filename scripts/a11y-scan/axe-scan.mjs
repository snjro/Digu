// Serve a static build and run axe-core on the main pages with headless Chrome.
// Usage (in the test service): node axe-scan.mjs <buildDir> <axe.min.js> <outJson> [baseUrl]
// If baseUrl is given, no server is started (e.g. a vite dev server).
// See README.md in this folder.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(path.join(process.cwd(), "package.json"));
const puppeteer = require("puppeteer");

const [buildDir, axePath, outJson, baseUrlArg] = process.argv.slice(2);
if (!buildDir || !axePath || !outJson) {
  console.error(
    "Usage: node axe-scan.mjs <buildDir> <axe.min.js> <outJson> [baseUrl]",
  );
  process.exit(2);
}
const PORT = 4321;

const types = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".wasm": "application/wasm",
};
let server;
if (!baseUrlArg) {
  server = http.createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
    let file = path.join(buildDir, p);
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) {
      file = path.join(file, "index.html");
    }
    if (!fs.existsSync(file)) {
      res.writeHead(404);
      res.end();
      return;
    }
    res.writeHead(200, {
      "content-type": types[path.extname(file)] ?? "application/octet-stream",
    });
    fs.createReadStream(file).pipe(res);
  });
  await new Promise((r) => server.listen(PORT, "127.0.0.1", r));
}
const base = baseUrlArg ?? `http://127.0.0.1:${PORT}`;
const origin = new URL(base).origin;

const pages = [
  ["top", "/"],
  ["chain", "/eth/"],
  ["version", "/eth/Augur-version1/"],
  ["contracts", "/eth/Augur-version1/contracts/"],
  ["contract", "/eth/Augur-version1/contracts/Augur/"],
  ["events", "/eth/Augur-version1/contracts/Augur/events/"],
  ["event", "/eth/Augur-version1/contracts/Augur/events/MarketCreated/"],
  ["functions", "/eth/Augur-version1/contracts/Augur/functions/"],
];

const browser = await puppeteer.launch({ args: ["--no-sandbox"] });
const page = await browser.newPage();
await page.setViewport({ width: 1400, height: 900 });
// Block everything outside the local server (RPC, fonts, etc.).
// With a dev server, interception stalls the module worker, so only record.
const blocked = new Set();
const intercept = !baseUrlArg;
await page.setRequestInterception(intercept);
page.on("request", (req) => {
  const url = req.url();
  const local =
    url.startsWith(origin) ||
    url.startsWith("data:") ||
    url.startsWith("blob:");
  if (!local) blocked.add(new URL(url).origin);
  if (!intercept) return;
  if (local) {
    req.continue();
  } else {
    req.abort();
  }
});
const consoleErrors = [];
page.on("pageerror", (e) => consoleErrors.push(String(e).slice(0, 200)));

const axeSource = fs.readFileSync(axePath, "utf8");
async function runAxe(context) {
  await page.evaluate(axeSource);
  return page.evaluate(async (ctx) => {
    const result = await window.axe.run(ctx ?? document);
    return result.violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      help: v.help,
      tags: v.tags,
      nodes: v.nodes.map((n) => {
        const el = document.querySelector(n.target[0]);
        // __svelte_meta exists only in a dev build.
        let loc = null;
        for (let e = el; e && !loc; e = e.parentElement) {
          loc = e.__svelte_meta?.loc ?? null;
        }
        return {
          target: n.target.join(" "),
          html: n.html.slice(0, 300),
          contrast:
            v.id === "color-contrast" && n.any[0]?.data
              ? {
                  fg: n.any[0].data.fgColor,
                  bg: n.any[0].data.bgColor,
                  ratio: n.any[0].data.contrastRatio,
                  expected: n.any[0].data.expectedContrastRatio,
                }
              : undefined,
          loc: loc ? `${loc.file}:${loc.line}` : null,
        };
      }),
    }));
  }, context);
}

const results = {};
for (const [name, url] of pages) {
  await page.goto(base + url, { waitUntil: "networkidle0", timeout: 120000 });
  // Wait until the app has rendered its navigation (slow on the first dev load).
  await page.waitForFunction(
    () => document.querySelectorAll("button").length > 5,
    {
      timeout: 120000,
    },
  );
  await new Promise((r) => setTimeout(r, 3000));
  results[name] = {
    url,
    finalUrl: page.url().replace(origin, ""),
    title: await page.title(),
    violations: await runAxe(),
  };
  await page.screenshot({ path: `${path.dirname(outJson)}/shot-${name}.png` });
}

// Settings dialog: open it from the top page and scan only the dialog.
await page.goto(base + "/", { waitUntil: "networkidle0" });
await page.waitForFunction(
  () => document.querySelectorAll("button").length > 5,
  {
    timeout: 120000,
  },
);
await new Promise((r) => setTimeout(r, 2000));
// The settings button is the right-most button in the top bar.
const opened = await page.evaluate(() => {
  const buttons = [...document.querySelectorAll("button")].filter((b) => {
    const r = b.getBoundingClientRect();
    return r.top < 80 && r.width > 0;
  });
  buttons.sort(
    (a, b) => b.getBoundingClientRect().right - a.getBoundingClientRect().right,
  );
  buttons[0]?.click();
  return !!buttons[0];
});
await new Promise((r) => setTimeout(r, 1000));
const dialogOpen = await page.evaluate(
  () => !!document.querySelector("dialog[open]"),
);
results.settingsDialog = {
  opened,
  dialogOpen,
  violations: dialogOpen ? await runAxe("dialog[open]") : [],
};
await page.screenshot({
  path: `${path.dirname(outJson)}/shot-settingsDialog.png`,
});

fs.writeFileSync(
  outJson,
  JSON.stringify(
    {
      axeVersion: JSON.parse(
        fs.readFileSync(
          path.join(path.dirname(axePath), "package.json"),
          "utf8",
        ),
      ).version,
      chrome: await browser.version(),
      nonLocalOrigins: [...blocked],
      intercepted: intercept,
      pageErrors: consoleErrors,
      results,
    },
    null,
    2,
  ),
);
await browser.close();
server?.close();
console.log("done", outJson);
