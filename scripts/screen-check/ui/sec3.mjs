// Section 3: RPC input and the settings dialog (fake RPC: eth_chainId / eth_blockNumber only).
import fs from "node:fs";
import * as L from "./lib.mjs";
await L.startServers();
await L.launch();
const { ctx, page } = await L.newContextPage();
const RPC = L.RPC_INPUT;
const helper = () =>
  page.evaluate(() => {
    const n = document.querySelector("nav") ?? document.body;
    const t = [...n.querySelectorAll("*")]
      .filter((e) => e.children.length === 0 && e.getClientRects().length)
      .map((e) => e.textContent.trim())
      .filter((t) => /^(Enter URL|Connecting|Connected|Error\.)/.test(t));
    return t.join(" / ");
  });
async function typeInto(sel, text) {
  await page.click(sel, { clickCount: 3 });
  await page.keyboard.down("Control");
  await page.keyboard.press("a");
  await page.keyboard.up("Control");
  await page.keyboard.press("Backspace");
  if (text) await page.keyboard.type(text);
  await page.keyboard.press("Tab");
}
const rpcDb = async (p = page) => {
  const d = await L.idb(p);
  return d.Digu_Settings?.RpcSettings?.filter((r) => r.chainName === "eth").map(
    ({ rpc, inputType, ...rest }) => ({
      rpc,
      inputType,
      keys: Object.keys(rest).join(","),
    }),
  )[0];
};
const EV = L.ROOT + "/eth/Augur-version1/contracts/Augur/";

await page.goto(EV, { waitUntil: "load" });
await L.settle(page, 800);

await L.step("3-1", page, async () => {
  const h = await helper();
  const v = await page.$eval(RPC, (i) => i.value);
  const s = await L.shot(page, "3-1-empty");
  L.rec(
    "3-1",
    h === "Enter URL of RPC." ? "OK" : "NG",
    `value="${v}" helper="${h}"`,
    [s],
  );
});

await L.step("3-2", page, async () => {
  const out = [];
  let ok = true;
  const shots = [];
  for (const [txt, exp] of [
    ["abc", "Error. Invalid URL."],
    ["ftp://x", "Error. Protocol is invalid."],
  ]) {
    await typeInto(RPC, txt);
    await L.settle(page);
    const h = await helper();
    if (h !== exp) ok = false;
    out.push({ txt, helper: h, db: (await rpcDb())?.rpc });
    shots.push(await L.shot(page, `3-2-${txt.replace(/[:/]/g, "_")}`));
  }
  L.rec("3-2", ok ? "OK" : "NG", JSON.stringify(out), shots);
});

await L.step("3-3", page, async () => {
  await typeInto(RPC, L.FAKE_RPC_WRONG);
  await L.settle(page, 800);
  const h = await helper();
  const s = await L.shot(page, "3-3-wrong-chain");
  L.rec(
    "3-3",
    h === "Error. Target chain is wrong." ? "OK" : "NG",
    `helper="${h}"`,
    [s],
  );
});

await L.step("3-4", page, async () => {
  // watch the helper text change
  const seen = [];
  const watcher = setInterval(async () => {
    try {
      const h = await helper();
      if (seen[seen.length - 1] !== h) seen.push(h);
    } catch {
      // the page is navigating
    }
  }, 30);
  await typeInto(RPC, L.FAKE_RPC);
  await L.settle(page, 800);
  clearInterval(watcher);
  const h = await helper();
  const s1 = await L.shot(page, "3-4-connected");
  const db = await rpcDb();
  await page.reload({ waitUntil: "load" });
  await L.settle(page, 1200);
  const h2 = await helper();
  const v2 = await page.$eval(RPC, (i) => i.value);
  const s2 = await L.shot(page, "3-4-after-reload");
  const ok =
    h === "Connected." &&
    db?.rpc === L.FAKE_RPC &&
    h2 === "Connected." &&
    v2 === L.FAKE_RPC;
  L.rec(
    "3-4",
    ok ? "OK" : "NG",
    `seen=${JSON.stringify(seen)} db.rpc=${db?.rpc}; after reload value=${v2} helper="${h2}"`,
    [s1, s2],
  );
});

await L.step("3-5", page, async () => {
  const t0 = await page.$eval(RPC, (i) => i.type);
  await L.click(page, "show", { scope: "nav" }).catch(() =>
    page.click('nav button[aria-label="show"]'),
  );
  await L.settle(page);
  const t1 = await page.$eval(RPC, (i) => i.type);
  const lab1 = await page.evaluate(() =>
    [...document.querySelectorAll("nav button")]
      .map((b) => b.getAttribute("aria-label"))
      .filter((x) => /show|hide/.test(x ?? "")),
  );
  const s = await L.shot(page, "3-5-toggled");
  const db1 = (await rpcDb())?.inputType;
  await page.reload({ waitUntil: "load" });
  await L.settle(page, 800);
  const t2 = await page.$eval(RPC, (i) => i.type);
  // back
  await page.click(
    'nav button[aria-label="hide"], nav button[aria-label="show"]',
  );
  await L.settle(page);
  const t3 = await page.$eval(RPC, (i) => i.type);
  const ok = t0 !== t1 && t2 === t1 && t3 === t0;
  L.rec(
    "3-5",
    ok ? "OK" : "NG",
    `type ${t0} → click → ${t1} (buttons ${lab1}, db inputType=${db1}) → reload → ${t2} → click → ${t3}`,
    [s],
  );
});

async function openSettings() {
  await page.click('nav button[aria-label="Settings"]');
  await page.waitForSelector("dialog[open]");
  await L.settle(page, 200);
}

// The settings dialog has no RPC settings and no "RPC configuration" group:
// only "Synced data", with Warp sync and then Event logs.
await L.step("3-6", page, async () => {
  await openSettings();
  const shots = [await L.shot(page, "3-6-dialog")];
  const removed = [
    "Bulk Unit",
    "Bulk Unit slider",
    "Retry Count",
    "Retry Count slider",
    "Block Interval [ms]",
    "Block Interval [ms] slider",
    "Chain Explorer",
  ];
  const out = await page.evaluate((removed) => {
    const d = document.querySelector("dialog[open]");
    return {
      removedControls: removed.filter((l) =>
        d.querySelector(`[aria-label="${l}"]`),
      ),
      labels: [...d.querySelectorAll("*")]
        .filter((e) => e.children.length === 0 && e.getClientRects().length)
        .map((e) => e.textContent.trim())
        .filter((t) =>
          [
            "RPC configuration",
            "Chain Explorer",
            "Synced data",
            "Warp sync",
            "Event logs",
          ].includes(t),
        ),
    };
  }, removed);
  await page.keyboard.press("Escape");
  await L.settle(page);
  const ok =
    out.removedControls.length === 0 &&
    JSON.stringify(out.labels) ===
      JSON.stringify(["Synced data", "Warp sync", "Event logs"]);
  L.rec("3-6", ok ? "OK" : "NG", JSON.stringify(out), shots);
});

// One explorer per chain: the chainExplorer of eth in the build.
const ETH_EXPLORER_URL = fs
  .readFileSync("/app/src/constants/chains/ethereum-mainnet/_index.ts", "utf8")
  .match(/chainExplorer:\s*{[^}]*url:\s*"([^"]+)"/)[1];
await L.step("3-7", page, async () => {
  const hrefs = await page.$$eval("main a[target=_blank]", (as) =>
    as.map((a) => a.getAttribute("href")).filter((h) => !/github\.com/.test(h)),
  );
  const s = await L.shot(page, "3-7-contract-links");
  const ok =
    hrefs.length > 0 &&
    hrefs.every((h) => h.startsWith(`${ETH_EXPLORER_URL}/`));
  L.rec(
    "3-7",
    ok ? "OK" : "NG",
    `main explorer links: ${JSON.stringify(hrefs)}`,
    [s],
  );
});

await L.step("3-8", page, async () => {
  const out = [];
  let ok = true;
  const shots = [];
  for (const how of ["X", "Esc", "backdrop"]) {
    await openSettings();
    if (how === "X")
      await page
        .click('dialog[open] button[aria-label="Close"]')
        .catch(async () => L.click(page, "Close", { scope: "dialog[open]" }));
    if (how === "Esc") await page.keyboard.press("Escape");
    if (how === "backdrop") await page.mouse.click(5, 895);
    await L.settle(page);
    const closed = !(await page.$("dialog[open]"));
    await openSettings();
    shots.push(await L.shot(page, `3-8-reopen-after-${how}`));
    await page.keyboard.press("Escape");
    await L.settle(page);
    if (!closed) ok = false;
    out.push({ how, closed });
  }
  L.rec("3-8", ok ? "OK" : "NG", JSON.stringify(out), shots);
});

await L.step("3-9", page, async () => {
  const p2 = await ctx.newPage();
  await p2.setViewport({ width: 1400, height: 900 });
  await L.setupPage(p2, "tab2");
  await p2.goto(EV, { waitUntil: "load" });
  await L.settle(p2, 800);
  // change in tab 1
  await page.bringToFront();
  await typeInto(RPC, "http://fake-rpc.invalid/v2");
  await L.settle(page, 800);
  await L.sleep(1000);
  // tab 2
  await p2.bringToFront();
  const rpc2 = await p2.$eval(RPC, (i) => i.value);
  const s = await L.shot(p2, "3-9-tab2");
  const ok = rpc2 === "http://fake-rpc.invalid/v2";
  L.rec("3-9", ok ? "OK" : "NG", `tab2: rpc input="${rpc2}"`, [s]);
  await p2.close();
});

// #459: the placeholder, and Enter commits the URL.
await L.step("3-10", page, async () => {
  const out = {};
  await page.bringToFront();
  await page.evaluate(() => document.activeElement?.blur());
  out.placeholder = await page.$eval(RPC, (i) => i.placeholder);
  await page.click(RPC, { clickCount: 3 });
  await page.keyboard.down("Control");
  await page.keyboard.press("a");
  await page.keyboard.up("Control");
  await page.keyboard.press("Backspace");
  // A URL not saved before, so that the saved one shows that Enter committed it.
  const enterUrl = L.FAKE_RPC + "enter";
  await page.keyboard.type(enterUrl);
  await page.keyboard.press("Enter");
  await L.settle(page, 800);
  out.afterEnter = {
    helper: await helper(),
    stillFocused: await page.evaluate(
      (s) => document.activeElement === document.querySelector(s),
      RPC,
    ),
    db: (await rpcDb())?.rpc,
  };
  const s = await L.shot(page, "3-10-after-enter");
  const ok =
    out.placeholder === "http://localhost:8545" &&
    out.afterEnter.helper === "Connected." &&
    !out.afterEnter.stillFocused &&
    out.afterEnter.db === enterUrl;
  L.rec("3-10", ok ? "OK" : "NG", JSON.stringify(out), [s]);
});

await L.finish("sec3");
