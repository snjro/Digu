// Section 3: RPC input and the settings dialog (fake RPC: eth_chainId / eth_blockNumber only).
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
    ({
      rpc,
      bulkUnit,
      tryCount,
      blockIntervalMs,
      inputType,
      chainExplorerIndex,
      ...rest
    }) => ({
      rpc,
      bulkUnit,
      tryCount,
      blockIntervalMs,
      inputType,
      chainExplorerIndex,
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
const dialogTexts = () =>
  page.evaluate(() =>
    [...document.querySelectorAll("dialog[open] *")]
      .filter((e) => e.children.length === 0 && e.getClientRects().length)
      .map((e) => e.textContent.trim())
      .filter((t) => /Error\.|Updated\.|Checking/.test(t)),
  );

await L.step("3-6", page, async () => {
  await openSettings();
  const shots = [await L.shot(page, "3-6-dialog")];
  const out = [];
  let ok = true;
  for (const [label, good, bad, expErr] of [
    ["Bulk Unit", "500", "10001", "1-10000"],
    ["Retry Count", "3", "0", "1-10"],
    ["Block Interval [ms]", "1000", "20001", "1-20000"],
  ]) {
    const sel = `dialog[open] input[aria-label="${label}"]`;
    await typeInto(sel, good);
    await L.settle(page);
    const t1 = await dialogTexts();
    const db1 = await rpcDb();
    await typeInto(sel, bad);
    await L.settle(page);
    const t2 = await dialogTexts();
    const db2 = await rpcDb();
    const key = {
      "Bulk Unit": "bulkUnit",
      "Retry Count": "tryCount",
      "Block Interval [ms]": "blockIntervalMs",
    }[label];
    const g =
      t1.some((t) => /Updated/.test(t)) &&
      String(db1[key]) === good &&
      t2.some((t) => t.includes(expErr)) &&
      String(db2[key]) === good;
    if (!g) ok = false;
    out.push({
      label,
      good: { texts: t1, db: db1[key] },
      bad: {
        texts: t2,
        db: db2[key],
        input: await page.$eval(sel, (i) => i.value),
      },
    });
    shots.push(await L.shot(page, `3-6-${key}-bad`));
    // restore a valid value
    await typeInto(sel, good);
    await L.settle(page);
  }
  // slider: keyboard on Bulk Unit slider
  const sl = 'dialog[open] input[aria-label="Bulk Unit slider"]';
  const before = await page.$eval(sl, (i) => i.value);
  await page.focus(sl);
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await L.settle(page);
  const after = await page.$eval(sl, (i) => i.value);
  const numInput = await page.$eval(
    'dialog[open] input[aria-label="Bulk Unit"]',
    (i) => i.value,
  );
  const tS = await dialogTexts();
  const dbS = (await rpcDb()).bulkUnit;
  // mouse drag on the Retry Count slider
  const tc = await page.$(
    'dialog[open] input[aria-label="Retry Count slider"]',
  );
  const bb = await tc.boundingBox();
  await page.mouse.move(bb.x + 2, bb.y + bb.height / 2);
  await page.mouse.down();
  await page.mouse.move(bb.x + bb.width * 0.55, bb.y + bb.height / 2, {
    steps: 5,
  });
  await page.mouse.up();
  await L.settle(page);
  const tcv = await tc.evaluate((i) => i.value);
  const tcNum = await page.$eval(
    'dialog[open] input[aria-label="Retry Count"]',
    (i) => i.value,
  );
  const dbT = (await rpcDb()).tryCount;
  shots.push(await L.shot(page, "3-6-slider"));
  const sOk =
    after !== before &&
    numInput === after &&
    String(dbS) === after &&
    String(dbT) === tcv &&
    tcNum === tcv;
  if (!sOk) ok = false;
  out.push({
    sliderKeyboard: { before, after, numInput, texts: tS, db: dbS },
    sliderMouse: { value: tcv, numInput: tcNum, db: dbT },
  });
  L.rec("3-6", ok ? "OK" : "NG", JSON.stringify(out), shots);
});

await L.step("3-7", page, async () => {
  const opts = await page.$$eval(
    'dialog[open] select[aria-label="Chain Explorer"] option',
    (o) => o.map((x) => [x.value, x.textContent.trim()]),
  );
  const bc = opts.find((o) => o[1] === "Blockchair");
  await page.select('dialog[open] select[aria-label="Chain Explorer"]', bc[0]);
  await L.settle(page);
  const link = await page.$$eval("dialog[open] a", (as) =>
    as.map((a) => [a.getAttribute("href"), a.target]),
  );
  const s1 = await L.shot(page, "3-7-dialog-blockchair");
  await page.keyboard.press("Escape");
  await L.settle(page);
  const hrefs = await page.$$eval("main a[target=_blank]", (as) =>
    as.map((a) => a.getAttribute("href")).filter((h) => !/github\.com/.test(h)),
  );
  const s2 = await L.shot(page, "3-7-contract-links");
  const db = (await rpcDb())?.chainExplorerIndex;
  const ok =
    hrefs.length > 0 &&
    hrefs.every((h) => h.startsWith("https://blockchair.com"));
  L.rec(
    "3-7",
    ok ? "OK" : "NG",
    `options=${JSON.stringify(opts)} dialogLink=${JSON.stringify(link)} db=${db}; main explorer links: ${JSON.stringify(hrefs)}`,
    [s1, s2],
  );
  // back to Etherscan
  await openSettings();
  await page.select('dialog[open] select[aria-label="Chain Explorer"]', "0");
  await L.settle(page);
  await page.keyboard.press("Escape");
  await L.settle(page);
});

await L.step("3-8", page, async () => {
  const out = [];
  let ok = true;
  const shots = [];
  for (const how of ["X", "Esc", "backdrop"]) {
    await openSettings();
    // produce a helper text
    await typeInto('dialog[open] input[aria-label="Bulk Unit"]', "0");
    await L.settle(page);
    const t0 = await dialogTexts();
    if (how === "X")
      await page
        .click('dialog[open] button[aria-label="Close"]')
        .catch(async () => L.click(page, "Close", { scope: "dialog[open]" }));
    if (how === "Esc") await page.keyboard.press("Escape");
    if (how === "backdrop") await page.mouse.click(5, 895);
    await L.settle(page);
    const closed = !(await page.$("dialog[open]"));
    await openSettings();
    const t1 = await dialogTexts();
    const val = await page.$eval(
      'dialog[open] input[aria-label="Bulk Unit"]',
      (i) => i.value,
    );
    shots.push(await L.shot(page, `3-8-reopen-after-${how}`));
    await page.keyboard.press("Escape");
    await L.settle(page);
    if (!closed || t1.length) ok = false;
    out.push({ how, before: t0, closed, afterReopen: t1, bulkUnitInput: val });
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
  await openSettings();
  await typeInto('dialog[open] input[aria-label="Bulk Unit"]', "777");
  await L.settle(page);
  await page.keyboard.press("Escape");
  await typeInto(RPC, "http://fake-rpc.invalid/v2");
  await L.settle(page, 800);
  await L.sleep(1000);
  // tab 2
  await p2.bringToFront();
  const rpc2 = await p2.$eval(RPC, (i) => i.value);
  await p2.click('nav button[aria-label="Settings"]');
  await p2.waitForSelector("dialog[open]");
  await L.settle(p2);
  const bu2 = await p2.$eval(
    'dialog[open] input[aria-label="Bulk Unit"]',
    (i) => i.value,
  );
  const s = await L.shot(p2, "3-9-tab2");
  const ok = bu2 === "777" && rpc2 === "http://fake-rpc.invalid/v2";
  L.rec(
    "3-9",
    ok ? "OK" : "NG",
    `tab2: rpc input="${rpc2}", Bulk Unit="${bu2}"`,
    [s],
  );
  await p2.close();
});

// #459: the placeholder, and Enter commits the URL. #460: 1.5, 1e3 and an
// empty value in the settings (RpcConfigChangerInput.svelte, rpcConfigValidation.ts).
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
  await openSettings();
  const sel = 'dialog[open] input[aria-label="Bulk Unit"]';
  await typeInto(sel, "100");
  await L.settle(page);
  for (const v of ["1.5", "1e3", ""]) {
    await typeInto(sel, v);
    await L.settle(page);
    out[`bulkUnit "${v}"`] = {
      texts: await dialogTexts(),
      db: (await rpcDb()).bulkUnit,
      input: await page.$eval(sel, (i) => i.value),
    };
  }
  const s = await L.shot(page, "3-10-settings-empty");
  await page.keyboard.press("Escape");
  await L.settle(page);
  const err = (k) => out[k].texts.some((t) => /^Error/.test(t));
  const ok =
    out.placeholder === "http://localhost:8545" &&
    out.afterEnter.helper === "Connected." &&
    !out.afterEnter.stillFocused &&
    out.afterEnter.db === enterUrl &&
    err('bulkUnit "1.5"') &&
    out['bulkUnit "1e3"'].db === 1000 &&
    err('bulkUnit ""');
  L.rec("3-10", ok ? "OK" : "NG", JSON.stringify(out), [s]);
});

await L.finish("sec3");
