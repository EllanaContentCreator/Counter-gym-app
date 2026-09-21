import { chromium } from "playwright-core";
import fs from "node:fs";
const out = process.argv[2];
const port = process.argv[3] ?? "4179";
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--no-sandbox"] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const page = await ctx.newPage();
const errs = [];
page.on("pageerror", (e) => errs.push("pageerror: " + e.message));
page.on("console", (m) => { if (m.type() === "error" && !/favicon/.test(m.text())) errs.push("console: " + m.text()); });
const base = `http://127.0.0.1:${port}/`;

await page.goto(base); await page.waitForTimeout(800);
const go = page.getByRole("button", { name: "Let's go" });
if (await go.count()) {
  await go.click(); await page.waitForTimeout(400);
  await page.getByPlaceholder("Lana").fill("Lana");
  await page.getByRole("button", { name: /Start counting/ }).click();
  await page.waitForTimeout(900);
}

// Attach a stand-in sheet photo so the block actually renders.
await page.evaluate(async () => {
  const c = document.createElement("canvas");
  c.width = 620; c.height = 880;
  const g = c.getContext("2d");
  g.fillStyle = "#fffdf5"; g.fillRect(0, 0, 620, 880);
  g.fillStyle = "#1f2a2e"; g.font = "bold 34px sans-serif";
  g.fillText("CAROLYN'S SHEET", 40, 80);
  g.font = "22px sans-serif";
  for (let i = 0; i < 14; i++) g.fillText(`${i + 1}.  Exercise ................ 10 reps`, 40, 150 + i * 46);
  const blob = await new Promise((r) => c.toBlob(r, "image/jpeg", 0.9));
  const db = await new Promise((res, rej) => { const q = indexedDB.open("counter-photos", 1); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); q.onupgradeneeded = () => { if (!q.result.objectStoreNames.contains("photos")) q.result.createObjectStore("photos", { keyPath: "id" }); }; });
  const id = "verifyphoto1";
  await new Promise((res, rej) => { const tx = db.transaction("photos", "readwrite"); tx.objectStore("photos").put({ id, blob, width: 620, height: 880, createdAt: Date.now() }); tx.oncomplete = res; tx.onerror = () => rej(tx.error); });
  const d = JSON.parse(localStorage.getItem("counter.app.v1"));
  d.programs[0].photoIds = [id];
  localStorage.setItem("counter.app.v1", JSON.stringify(d));
  return d.programs[0].id;
});
const pid = await page.evaluate(() => JSON.parse(localStorage.getItem("counter.app.v1")).programs[0].id);
await page.goto(base + "#/programs/" + pid);
await page.reload(); await page.waitForTimeout(1500);

// Where does the photo sit relative to the exercise rows?
const pos = await page.evaluate(() => {
  const img = document.querySelector('main img, img[alt*="sheet" i]') ?? [...document.querySelectorAll("img")].find((i) => i.naturalWidth > 400);
  const label = [...document.querySelectorAll("div")].find((d) => d.textContent?.trim() === "Carolyn's sheet" && d.children.length === 0);
  const table = document.querySelector(".card");
  return {
    photoTop: img ? Math.round(img.getBoundingClientRect().top + window.scrollY) : null,
    labelTop: label ? Math.round(label.getBoundingClientRect().top + window.scrollY) : null,
    firstCardTop: table ? Math.round(table.getBoundingClientRect().top + window.scrollY) : null,
    docHeight: document.body.scrollHeight,
  };
});
console.log("positions:", JSON.stringify(pos));
await page.screenshot({ path: `${out}/sheet-full.png`, fullPage: true });
await page.screenshot({ path: `${out}/sheet-firstview.png` });
console.log(errs.length ? "ERRORS:\n" + errs.join("\n") : "no page errors");
await browser.close();
