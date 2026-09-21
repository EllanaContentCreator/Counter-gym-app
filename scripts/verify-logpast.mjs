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

await page.goto(base + "#/log-past"); await page.waitForTimeout(900);
await page.screenshot({ path: `${out}/01-logpast-top.png` });

// Pick "3 days ago" style chip, then fill the first two rows.
const chips = page.locator("button", { hasText: /^(Mon|Tues|Wed|Thur|Fri|Sat|Sun) \d\d/ });
console.log("date chips:", await chips.count());
if (await chips.count()) { await chips.first().click(); await page.waitForTimeout(200); }

const weights = page.locator('input[inputmode="decimal"]');
const reps = page.locator('input[inputmode="numeric"]');
console.log("weight inputs:", await weights.count(), "reps inputs:", await reps.count());
const n = Math.min(3, await weights.count());
for (let i = 0; i < n; i++) { await weights.nth(i).fill(String(10 + i * 2.5)); await reps.nth(i).fill("12"); }
await page.waitForTimeout(300);
await page.screenshot({ path: `${out}/02-logpast-filled.png`, fullPage: true });

const save = page.locator("button", { hasText: /^Save .* — \d+ set/ });
console.log("save button:", await save.count(), await save.first().textContent().catch(() => ""));
await save.first().click();
await page.waitForTimeout(1200);
console.log("after save url:", page.url());
await page.screenshot({ path: `${out}/03-session.png`, fullPage: true });

// Change the date from the session screen.
const changeDate = page.locator("button", { hasText: /· change$/ });
console.log("change-date link:", await changeDate.count());
await changeDate.first().click();
await page.waitForTimeout(500);
await page.screenshot({ path: `${out}/04-change-date.png` });
const today = page.locator("button", { hasText: /^Today$/ });
if (await today.count()) await today.first().click();
await page.locator("button", { hasText: /^Save the date$/ }).first().click();
await page.waitForTimeout(700);
await page.screenshot({ path: `${out}/05-redated.png` });
console.log("session sub:", await page.locator("header").first().innerText());

await page.goto(base + "#/progress"); await page.waitForTimeout(800);
await page.screenshot({ path: `${out}/06-progress.png`, fullPage: true });

console.log(errs.length ? "ERRORS:\n" + errs.join("\n") : "no page errors");
await browser.close();
