// Section 3: RPC input and the sync panel (fake RPC: eth_chainId / eth_blockNumber only).
import fs from "node:fs";
import { typeInto } from "../../check-lib/app.mjs";
import * as L from "./lib.mjs";
await L.startServers();
await L.launch();
const { ctx, page } = await L.newContextPage();
const RPC = L.RPC_INPUT;
const helper = () =>
  page.evaluate(() => {
    const n = document.querySelector("nav") ?? document.body;
    // The own text of an element; the link to the guide after it (#402) is left out.
    const t = [...n.querySelectorAll("*")]
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
      .filter((t) => /^(Enter URL|Connecting|Connected|Error\.)/.test(t));
    return t.join(" / ");
  });
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
    await typeInto(page, RPC, txt, { clear: true });
    await L.settle(page);
    const h = await helper();
    if (h !== exp) ok = false;
    out.push({ txt, helper: h, db: (await rpcDb())?.rpc });
    shots.push(await L.shot(page, `3-2-${txt.replace(/[:/]/g, "_")}`));
  }
  L.rec("3-2", ok ? "OK" : "NG", JSON.stringify(out), shots);
});

await L.step("3-3", page, async () => {
  await typeInto(page, RPC, L.FAKE_RPC_WRONG, { clear: true });
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
  await typeInto(page, RPC, L.FAKE_RPC, { clear: true });
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

// The type stays text while hidden, so Chrome does not offer to save the RPC (#640).
const rpcShown = () =>
  page.$eval(
    RPC,
    (i) =>
      `${i.type} ${getComputedStyle(i).getPropertyValue("-webkit-text-security")}`,
  );
await L.step("3-5", page, async () => {
  const t0 = await rpcShown();
  await L.click(page, "show", { scope: "nav" }).catch(() =>
    page.click('nav button[aria-label="show"]'),
  );
  await L.settle(page);
  const t1 = await rpcShown();
  const lab1 = await page.evaluate(() =>
    [...document.querySelectorAll("nav button")]
      .map((b) => b.getAttribute("aria-label"))
      .filter((x) => /show|hide/.test(x ?? "")),
  );
  const s = await L.shot(page, "3-5-toggled");
  const db1 = (await rpcDb())?.inputType;
  await page.reload({ waitUntil: "load" });
  await L.settle(page, 800);
  const t2 = await rpcShown();
  // back
  await page.click(
    'nav button[aria-label="hide"], nav button[aria-label="show"]',
  );
  await L.settle(page);
  const t3 = await rpcShown();
  const ok =
    t0 !== t1 &&
    t2 === t1 &&
    t3 === t0 &&
    [t0, t1].every((t) => t.startsWith("text "));
  L.rec(
    "3-5",
    ok ? "OK" : "NG",
    `type and text-security ${t0} → click → ${t1} (buttons ${lab1}, db inputType=${db1}) → reload → ${t2} → click → ${t3}`,
    [s],
  );
});

const isSyncPanelOpen = () =>
  page.$eval("#sync-panel", (e) => !e.classList.contains("hidden"));

// The sync panel of the chain has no RPC settings: its heading, then Warp sync
// and Event logs. The settings dialog is gone (#596).
await L.step("3-6", page, async () => {
  await L.openSyncPanel(page);
  const shots = [await L.shot(page, "3-6-sync-panel")];
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
    const d = document.getElementById("sync-panel");
    return {
      settingsButton: !!document.querySelector('[aria-label="Settings"]'),
      heading: d.querySelector("h2")?.innerText.trim(),
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
    !out.settingsButton &&
    out.heading === "Sync of Ethereum Mainnet" &&
    out.removedControls.length === 0 &&
    JSON.stringify(out.labels) === JSON.stringify(["Warp sync", "Event logs"]);
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
  // The progress again, Escape, or a click outside (the bottom right of the
  // page). The first two give the focus back to the progress.
  for (const how of ["progress", "Esc", "outside"]) {
    await L.openSyncPanel(page);
    if (how === "progress") await page.click(L.SYNC_PANEL_BUTTON);
    if (how === "Esc") await page.keyboard.press("Escape");
    if (how === "outside") await page.mouse.click(1395, 895);
    await L.settle(page);
    const closed = !(await isSyncPanelOpen());
    const expanded = await page.$eval(L.SYNC_PANEL_BUTTON, (b) =>
      b.getAttribute("aria-expanded"),
    );
    const focusOnProgress = await page.$eval(
      L.SYNC_PANEL_BUTTON,
      (b) => document.activeElement === b,
    );
    await L.openSyncPanel(page);
    shots.push(await L.shot(page, `3-8-reopen-after-${how}`));
    await page.keyboard.press("Escape");
    await L.settle(page);
    if (
      !closed ||
      expanded !== "false" ||
      focusOnProgress !== (how !== "outside")
    )
      ok = false;
    out.push({ how, closed, expanded, focusOnProgress });
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
  await typeInto(page, RPC, "http://fake-rpc.invalid/v2", { clear: true });
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
