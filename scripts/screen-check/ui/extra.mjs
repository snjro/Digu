// Extra: back button after opening a tabbed page without a hash; pageerrors on hash-less in-app links;
// keyboard into a grid cell's Copy button.
import * as L from "./lib.mjs";
await L.startServers();
await L.launch();
const { page } = await L.newContextPage(1400, 900);
const path = () => page.evaluate(() => location.pathname + location.hash);

await L.step("1-6-back-trap", page, async () => {
  await page.goto(L.ROOT + "/eth/Augur-version1/", { waitUntil: "load" });
  await L.settle(page, 800);
  await page.goto(
    L.ROOT + "/eth/Augur-version1/contracts/Augur/events/MarketCreated/",
    { waitUntil: "load" },
  );
  await L.settle(page, 800);
  const p0 = await path();
  const hist0 = await page.evaluate(() => history.length);
  await page.goBack();
  await L.settle(page, 800);
  const p1 = await path();
  await page.goBack().catch(() => {});
  await L.settle(page, 800);
  const p2 = await path();
  const s = await L.shot(page, "1-6-back-after-direct-open");
  const ok = p1 === "/eth/Augur-version1/" || p2 === "/eth/Augur-version1/";
  L.rec(
    "1-6-back-trap",
    ok ? "OK" : "NG",
    JSON.stringify({ opened: p0, historyLength: hist0, back1: p1, back2: p2 }),
    [s],
  );
});

await L.step("8-1-hashless-link", page, async () => {
  const before = L.log.length;
  await page.goto(L.ROOT + "/eth/Augur-version1/contracts/", {
    waitUntil: "load",
  });
  await L.settle(page, 800);
  await page.evaluate(() => {
    const a = document.createElement("a");
    a.href = "/eth/Augur-version1/contracts/Augur/";
    document.querySelector("main").appendChild(a);
    a.click();
    a.remove();
  });
  await L.settle(page, 1500);
  const p = await path();
  const errs = L.log
    .slice(before)
    .filter((l) => l.type === "pageerror")
    .map((l) => l.text.slice(0, 80));
  await page.goBack();
  await L.settle(page, 800);
  const back = await path();
  L.rec(
    "8-1-hashless-link",
    errs.length ? "NG" : "OK",
    JSON.stringify({ url: p, pageerrors: errs, backTo: back }),
  );
});

await L.step("8-2-grid-copy-keyboard", page, async () => {
  await page.goto(L.ROOT + "/eth/Augur-version1/contracts/", {
    waitUntil: "load",
  });
  await L.settle(page, 800);
  // focus the Creation Blocknumber cell of row 0 by clicking its empty area, then try Tab / Enter
  const cell = await page.evaluateHandle(() =>
    document
      .querySelector(".ag-row[row-index='0'] button[aria-label=Copy]")
      .closest(".ag-cell"),
  );
  const bb = await cell.asElement().boundingBox();
  await page.mouse.click(bb.x + 3, bb.y + bb.height / 2);
  const ae = () =>
    page.evaluate(() => {
      const e = document.activeElement;
      return `${e.tagName}:${e.getAttribute("aria-label") ?? e.innerText?.slice(0, 20)}`;
    });
  const a0 = await ae();
  await page.keyboard.press("Tab");
  const a1 = await ae();
  await page.keyboard.down("Shift");
  await page.keyboard.press("Tab");
  await page.keyboard.up("Shift");
  await page.keyboard.press("Enter");
  const a2 = await ae();
  await page.keyboard.press("Tab");
  const a3 = await ae();
  L.rec(
    "8-2-grid-copy-keyboard",
    "CHECK",
    JSON.stringify({
      cellFocused: a0,
      afterTab: a1,
      afterShiftTabEnter: a2,
      thenTab: a3,
    }),
  );
});
await L.finish("extra");
