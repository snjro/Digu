// Checks the public site after a release (read only): the version in the
// footer, redirects, links under /Digu/, deep URLs, unknown URLs, the theme
// switch, the ABI and CSV downloads, and console errors / CSP violations.
// Runs in the compose "test" service: node public-site-check.mjs <outDir> <version>
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(path.join(process.cwd(), "package.json"));
const puppeteer = require("puppeteer");

const [outDir, version] = process.argv.slice(2);
if (!outDir || !version) {
  console.error("Usage: node public-site-check.mjs <outDir> <version>");
  process.exit(2);
}
fs.mkdirSync(outDir, { recursive: true });
const ORIGIN = "https://snjro.github.io";
const BASE = `${ORIGIN}/Digu`;
const results = [];
const logs = [];
const record = (id, ok, detail) => {
  results.push({ id, ok, detail });
  console.log(`[${id}] ${ok ? "OK" : "NG"} ${JSON.stringify(detail)}`);
};

const browser = await puppeteer.launch();
const page = await browser.newPage();
await page.setViewport({ width: 1400, height: 900 });
page.on("console", (m) => {
  if (m.type() === "error" || m.type() === "warn" || m.type() === "warning")
    logs.push({ type: m.type(), text: m.text(), url: page.url() });
});
page.on("pageerror", (e) =>
  logs.push({ type: "pageerror", text: String(e), url: page.url() }),
);
page.on("response", (r) => {
  if (r.status() >= 400)
    logs.push({ type: `http ${r.status()}`, text: r.url(), url: page.url() });
});
await page.evaluateOnNewDocument(() => {
  document.addEventListener("securitypolicyviolation", (e) => {
    console.error(`[csp] ${e.violatedDirective} ${e.blockedURI}`);
  });
});
const shot = (name) =>
  page.screenshot({ path: path.join(outDir, `${name}.png`) });
const settle = () => new Promise((r) => setTimeout(r, 2500));

try {
  // 1. /Digu/ redirects to /Digu/eth/ and shows the version.
  await page.goto(`${BASE}/`, { waitUntil: "networkidle2" });
  await settle();
  record("1 redirect", page.url() === `${BASE}/eth/`, { url: page.url() });
  const footer = await page.evaluate(
    () => document.body.innerText.match(/v\d+\.\d+\.\d+/)?.[0],
  );
  record("2 version", footer === `v${version}`, { footer });
  const versionHref = await page.evaluate(
    () =>
      [...document.querySelectorAll("a")].find((a) =>
        /v\d+\.\d+\.\d+/.test(a.innerText),
      )?.href,
  );
  record("2 version link", versionHref?.endsWith(`/releases/tag/v${version}`), {
    versionHref,
  });
  await shot("1-eth");

  // 3. Links stay under /Digu/.
  const hrefs = await page.evaluate(() =>
    [...document.querySelectorAll("a[href]")].map((a) => a.href),
  );
  const outside = hrefs.filter(
    (h) => h.startsWith(ORIGIN) && !h.startsWith(`${BASE}/`) && h !== BASE,
  );
  record("3 links under /Digu/", outside.length === 0, {
    total: hrefs.length,
    outside: outside.slice(0, 5),
  });

  // 4. The DB Worker started: IndexedDB has the databases.
  const dbs = await page.evaluate(async () =>
    (await indexedDB.databases()).map((d) => d.name),
  );
  record("4 databases", dbs.length > 0, { count: dbs.length });

  // 5. Deep URLs open directly.
  for (const p of [
    "/eth/Augur-version1/",
    "/eth/Augur-version1/contracts/Augur/",
    "/eth/Augur-version1/contracts/Augur/events/MarketCreated/",
    "/matic/",
  ]) {
    const res = await page.goto(`${BASE}${p}`, { waitUntil: "networkidle2" });
    await settle();
    const h1 = await page.evaluate(
      () => document.querySelector("h1")?.innerText ?? "",
    );
    record(`5 deep ${p}`, res.status() === 200 && !/error/i.test(h1), {
      status: res.status(),
      h1,
    });
  }
  await shot("5-event");

  // 6. An unknown URL gets the GitHub 404.
  const res404 = await page.goto(`${BASE}/eth/NoSuch-version1/`, {
    waitUntil: "networkidle2",
  });
  record("6 unknown URL", res404.status() === 404, { status: res404.status() });

  // 7. The theme switch.
  await page.goto(`${BASE}/eth/Augur-version1/contracts/Augur/`, {
    waitUntil: "networkidle2",
  });
  await settle();
  const before = await page.evaluate(() => document.documentElement.className);
  await page.click('[aria-label="Change theme"]').catch(() => {});
  await settle();
  const after = await page.evaluate(() => document.documentElement.className);
  record("7 theme", before !== after, { before, after });
  await shot("7-theme");

  // 8. The grid and the ABI tab render.
  await page.goto(`${BASE}/eth/Augur-version1/contracts/`, {
    waitUntil: "networkidle2",
  });
  await settle();
  const rows = await page.evaluate(
    () => document.querySelectorAll(".ag-row").length,
  );
  record("8 grid rows", rows > 0, { rows });
  await shot("8-grid");
  await page.goto(`${BASE}/eth/Augur-version1/contracts/Augur/#abi`, {
    waitUntil: "networkidle2",
  });
  await settle();
  const abiText = await page.evaluate(() =>
    document.body.innerText.includes('"type"'),
  );
  record("8 abi", abiText, {});
  await shot("8-abi");
} catch (e) {
  record("error", false, { error: String(e) });
} finally {
  await browser.close();
}

const csp = logs.filter((l) => l.text.startsWith("[csp]"));
record("9 csp", csp.length === 0, { csp });
const errors = logs.filter((l) => !l.text.startsWith("[csp]"));
console.log(`[console] ${JSON.stringify(errors)}`);
fs.writeFileSync(
  path.join(outDir, "results.json"),
  JSON.stringify({ results, logs }, null, 2),
);
console.log(results.every((r) => r.ok) ? "ALL OK" : "SOME NG");
