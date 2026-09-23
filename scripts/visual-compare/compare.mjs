// Compares two folders of screenshots from shots.mjs.
// Usage (in the test service): node compare.mjs <baseDir> <headDir> <outDir>
// Writes <outDir>/report.md and <outDir>/diff/<name>.png for each changed screen.
// Exits with 1 when a screen differs or is missing on one side.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(path.join(process.cwd(), "package.json"));
const puppeteer = require("puppeteer");

const [baseDir, headDir, outDir] = process.argv.slice(2);
if (!baseDir || !headDir || !outDir) {
  console.error("Usage: node compare.mjs <baseDir> <headDir> <outDir>");
  process.exit(2);
}
const diffDir = path.join(outDir, "diff");
fs.mkdirSync(diffDir, { recursive: true });

const pngs = (dir) => fs.readdirSync(dir).filter((f) => f.endsWith(".png"));
const names = [...new Set([...pngs(baseDir), ...pngs(headDir)])].sort();
const sha256 = (file) =>
  crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
const dataUrl = (file) =>
  `data:image/png;base64,${fs.readFileSync(file).toString("base64")}`;

// Counts the pixels that differ, in the browser, so that no image library is needed.
// The diff image is the head image in pale gray, with the changed pixels in red.
function diffInBrowser(baseUrl, headUrl) {
  const load = (src) =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = src;
    });
  return Promise.all([load(baseUrl), load(headUrl)]).then(([base, head]) => {
    const width = Math.max(base.width, head.width);
    const height = Math.max(base.height, head.height);
    const pixels = (image) => {
      const canvas = new OffscreenCanvas(width, height);
      const context = canvas.getContext("2d");
      context.drawImage(image, 0, 0);
      return context.getImageData(0, 0, width, height);
    };
    const a = pixels(base).data;
    const headData = pixels(head);
    const b = headData.data;
    const out = new ImageData(width, height);
    let count = 0;
    let [left, top, right, bottom] = [width, height, -1, -1];
    for (let i = 0; i < a.length; i += 4) {
      const changed =
        a[i] !== b[i] ||
        a[i + 1] !== b[i + 1] ||
        a[i + 2] !== b[i + 2] ||
        a[i + 3] !== b[i + 3];
      if (changed) {
        count++;
        const x = (i / 4) % width;
        const y = Math.floor(i / 4 / width);
        left = Math.min(left, x);
        right = Math.max(right, x);
        top = Math.min(top, y);
        bottom = Math.max(bottom, y);
        out.data.set([255, 0, 0, 255], i);
      } else {
        const gray = 255 - (255 - (b[i] + b[i + 1] + b[i + 2]) / 3) / 4;
        out.data.set([gray, gray, gray, 255], i);
      }
    }
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    canvas.getContext("2d").putImageData(out, 0, 0);
    return {
      count,
      total: width * height,
      size: `${base.width}x${base.height} / ${head.width}x${head.height}`,
      box: count ? { left, top, right, bottom } : null,
      png: canvas.toDataURL("image/png"),
    };
  });
}

const browser = await puppeteer.launch();
const page = await browser.newPage();
const rows = [];
let failed = false;
try {
  for (const name of names) {
    const base = path.join(baseDir, name);
    const head = path.join(headDir, name);
    if (!fs.existsSync(base) || !fs.existsSync(head)) {
      failed = true;
      rows.push([name, `missing in ${fs.existsSync(base) ? "head" : "base"}`]);
      continue;
    }
    if (sha256(base) === sha256(head)) {
      rows.push([name, "same"]);
      continue;
    }
    const result = await page.evaluate(
      diffInBrowser,
      dataUrl(base),
      dataUrl(head),
    );
    if (result.count === 0) {
      // Same pixels, different PNG bytes.
      rows.push([name, "same pixels"]);
      continue;
    }
    failed = true;
    fs.writeFileSync(
      path.join(diffDir, name),
      Buffer.from(result.png.split(",")[1], "base64"),
    );
    const { left, top, right, bottom } = result.box;
    const percent = ((result.count / result.total) * 100).toFixed(2);
    rows.push([
      name,
      `**changed**: ${result.count} px (${percent}%), ` +
        `x ${left}-${right}, y ${top}-${bottom}, size ${result.size}`,
    ]);
  }
} finally {
  await browser.close();
}

const report = [
  `# Visual compare`,
  ``,
  `- base: ${baseDir}`,
  `- head: ${headDir}`,
  `- diff images: diff/`,
  ``,
  `| Screen | Result |`,
  `|---|---|`,
  ...rows.map(([name, result]) => `| ${name} | ${result} |`),
  ``,
].join("\n");
fs.writeFileSync(path.join(outDir, "report.md"), report);
console.log(report);
process.exit(failed ? 1 : 0);
