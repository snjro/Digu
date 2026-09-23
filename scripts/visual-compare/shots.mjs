// Takes screenshots of a built app (`npm run build`) with the Chrome of puppeteer.
// Usage (in the test service): node shots.mjs <buildDir> <outDir>
// See README.md in this folder.
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(path.join(process.cwd(), "package.json"));
const puppeteer = require("puppeteer");

const [buildDir, outDir] = process.argv.slice(2);
if (!buildDir || !outDir) {
  console.error("Usage: node shots.mjs <buildDir> <outDir>");
  process.exit(2);
}
fs.mkdirSync(outDir, { recursive: true });

const PORT = 4173;
const ORIGIN = `http://localhost:${PORT}`;
const VIEWPORT = { width: 1400, height: 900 };
const NARROW_VIEWPORT = { width: 760, height: 900 };

// Pages are served as `xxx/index.html` (trailingSlash "always"), and their
// assets are relative, so each URL ends with "/".
const EVENTS = "/eth/Augur-version1/contracts/Augur/events/";
const PAGES = [
  ["home", "/"],
  ["chain", "/eth/"],
  ["version", "/eth/Augur-version1/"],
  ["contracts", "/eth/Augur-version1/contracts/"],
  ["contract", "/eth/Augur-version1/contracts/Augur/"],
  ["events", EVENTS],
  ["event", `${EVENTS}MarketCreated/`],
  ["functions", "/eth/Augur-version1/contracts/Augur/functions/"],
  [
    "function",
    "/eth/Augur-version1/contracts/Augur/functions/createChildUniverse-0x8892bb73/",
  ],
];
// Screens after an action. Each starts from a fresh load of `url`.
const STATES = [
  ["settings", EVENTS, (page) => clickByTooltip(page, "Settings")],
  ["export-csv", EVENTS, (page) => clickByTooltip(page, "Export as CSV")],
  [
    "quick-search",
    EVENTS,
    async (page) => {
      await page.type('input[placeholder="Quick search..."]', "Market");
    },
  ],
  [
    "sidebar-version2",
    EVENTS,
    async (page) => {
      // The arrow next to the item opens the accordion. The item itself is a link.
      const clicked = await page.evaluate(() => {
        const item = [...document.querySelectorAll("button")].find(
          (e) => e.innerText.trim() === "Augur version2",
        );
        let arrow;
        for (let e = item; e && !arrow; e = e.parentElement) {
          arrow = e.querySelector(':scope > [role="button"]');
        }
        arrow?.click();
        return Boolean(arrow);
      });
      if (!clicked) throw new Error("No accordion for Augur version2");
    },
  ],
  // GitHub Pages has no page for an unknown URL, so +error.svelte is
  // shown only after a navigation inside the app.
  [
    "error",
    "/",
    async (page) => {
      await page.evaluate(() => {
        const link = document.createElement("a");
        link.href = "/no-such-chain/";
        document.body.append(link);
        link.click();
      });
      await page.waitForFunction(() => location.pathname === "/no-such-chain/");
    },
  ],
  [
    "narrow",
    EVENTS,
    async (page) => {
      await page.setViewport(NARROW_VIEWPORT);
    },
  ],
];

const TYPES = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".json": "application/json",
  ".woff2": "font/woff2",
};

// Serves the build like GitHub Pages.
const log = [];
const server = http.createServer((req, res) => {
  let file = path.join(buildDir, decodeURIComponent(req.url.split("?")[0]));
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) {
    file = path.join(file, "index.html");
  }
  if (!fs.existsSync(file)) {
    log.push(`[404] ${req.url}`);
    res.writeHead(404).end();
    return;
  }
  res.writeHead(200, {
    "content-type": TYPES[path.extname(file)] ?? "application/octet-stream",
  });
  fs.createReadStream(file).pipe(res);
});

const NO_MOTION_CSS = `*, *::before, *::after {
  animation: none !important;
  transition: none !important;
  caret-color: transparent !important;
}`;

async function settle(page) {
  await page.waitForNetworkIdle({ idleTime: 500 });
  await page.waitForFunction(
    () => !document.querySelector('[data-testid="loadingSpinner-test"]'),
  );
  await page.evaluate(() => document.fonts.ready);
  await page.addStyleTag({ content: NO_MOTION_CSS });
  // Keep the mouse off the buttons, so that no tooltip is shown.
  await page.mouse.move(0, VIEWPORT.height - 1);
  await page.evaluate(
    () => new Promise((r) => requestAnimationFrame(() => setTimeout(r, 300))),
  );
}

async function open(page, url) {
  await page.setViewport(VIEWPORT);
  await page.goto(`${ORIGIN}${url}`, { waitUntil: "load" });
  await settle(page);
}

// Clicks the visible button that has the tooltip `text`.
// The same buttons are also in the "three dots" menu, which is hidden.
async function clickByTooltip(page, text) {
  const clicked = await page.evaluate((text) => {
    const isVisible = (e) => e.getClientRects().length > 0;
    const labels = [...document.querySelectorAll("*")].filter(
      (e) => e.children.length === 0 && e.textContent.trim() === text,
    );
    for (const label of labels) {
      for (let e = label; e; e = e.parentElement) {
        const button = e.querySelector("button");
        if (button) {
          if (!isVisible(button)) break;
          button.click();
          return true;
        }
      }
    }
    return false;
  }, text);
  if (!clicked) throw new Error(`No visible button with the tooltip "${text}"`);
}

async function setTheme(page, theme) {
  const isDark = () =>
    page.evaluate(() => document.documentElement.classList.contains("dark"));
  if ((await isDark()) !== (theme === "dark")) {
    await clickByTooltip(page, "Change theme");
    await page.waitForFunction(
      (dark) => document.documentElement.classList.contains("dark") === dark,
      {},
      theme === "dark",
    );
  }
}

await new Promise((resolve) => server.listen(PORT, resolve));
// Flags that make the drawing the same from run to run.
const browser = await puppeteer.launch({
  args: [
    "--disable-gpu",
    "--force-color-profile=srgb",
    "--disable-partial-raster",
    "--disable-skia-runtime-opts",
    "--disable-lcd-text",
    "--font-render-hinting=none",
    "--disable-threaded-animation",
    "--disable-threaded-scrolling",
    "--disable-checker-imaging",
  ],
});
const page = await browser.newPage();
page.on("console", (m) => {
  if (m.type() === "error" || m.type() === "warn") {
    log.push(`[${m.type()}] ${m.text()}`);
  }
});
page.on("pageerror", (e) => log.push(`[pageerror] ${e.message}`));
// No request leaves the container (for example, to an RPC).
await page.setRequestInterception(true);
page.on("request", (req) => {
  const url = new URL(req.url());
  if (url.protocol.startsWith("http") && url.origin !== ORIGIN) {
    log.push(`[blocked] ${req.url()}`);
    req.abort();
  } else {
    req.continue();
  }
});

try {
  // The theme is kept in IndexedDB, so it stays across the pages.
  for (const theme of ["light", "dark"]) {
    await open(page, "/");
    await setTheme(page, theme);
    for (const [name, url] of PAGES) {
      log.push(`${theme}-${name} ${url}`);
      await open(page, url);
      await page.screenshot({
        path: path.join(outDir, `${theme}-${name}.png`),
      });
    }
    for (const [name, url, action] of STATES) {
      log.push(`${theme}-${name} ${url}`);
      await open(page, url);
      await action(page);
      await settle(page);
      await page.screenshot({
        path: path.join(outDir, `${theme}-${name}.png`),
      });
    }
  }
} finally {
  fs.writeFileSync(path.join(outDir, "log.txt"), log.join("\n") + "\n");
  await browser.close();
  server.close();
}
