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
const check = (label, cond, extra = "") => console.log(`${cond ? "PASS" : "FAIL"}  ${label}${extra ? "  " + extra : ""}`);

const stored = () => page.evaluate(() => {
  const d = JSON.parse(localStorage.getItem("counter.app.v1"));
  const k = new Date();
  const key = `${k.getFullYear()}-${String(k.getMonth() + 1).padStart(2, "0")}-${String(k.getDate()).padStart(2, "0")}`;
  const weights = Object.values(d.days ?? {}).filter((x) => typeof x.weight === "number").map((x) => ({ date: x.date, kg: x.weight }));
  return { water: d.days?.[key]?.water ?? 0, weights, nutrition: d.nutrition };
});

await page.goto(base); await page.waitForTimeout(800);
const go = page.getByRole("button", { name: "Let's go" });
if (await go.count()) {
  await go.click(); await page.waitForTimeout(400);
  await page.getByPlaceholder("Lana").fill("Lana");
  await page.getByRole("button", { name: /Start counting/ }).click();
  await page.waitForTimeout(900);
}

// ───────── Water, from Today
await page.screenshot({ path: `${out}/01-today.png`, fullPage: true });
const s0 = await stored();
check("Water starts at zero", s0.water === 0, String(s0.water));
check("Water target seeded", s0.nutrition.waterTarget === 2000, String(s0.nutrition.waterTarget));

const add250Today = page.locator("button", { hasText: /^\+250 ml$/ });
check("Today has quick water buttons", (await add250Today.count()) > 0);
await add250Today.first().click();
await page.waitForTimeout(400);
await page.locator("button", { hasText: /^\+500 ml$/ }).first().click();
await page.waitForTimeout(400);
const s1 = await stored();
check("Today's water buttons add up", s1.water === 750, String(s1.water));
const todayWater = await page.locator("text=/\\d\\.\\d\\d \\/ \\d\\.\\d L/").first().innerText();
check("Today shows the litres", todayWater.startsWith("0.75"), todayWater);

// ───────── Water, on the Food screen
await page.goto(base + "#/food"); await page.waitForTimeout(800);
await page.locator("button", { hasText: /^\+250 ml$/ }).first().click();
await page.waitForTimeout(400);
const s2 = await stored();
check("Food screen adds water to the same day", s2.water === 1000, String(s2.water));

// Custom amount
await page.locator("button", { hasText: /^Custom$/ }).first().click();
await page.waitForTimeout(500);
await page.getByPlaceholder("e.g. 750").fill("750");
await page.locator("button", { hasText: /^Add it$/ }).first().click();
await page.waitForTimeout(500);
const s3 = await stored();
check("Custom water amount lands", s3.water === 1750, String(s3.water));
await page.screenshot({ path: `${out}/02-water.png`, fullPage: true });

// Mis-tap correction and reset
await page.locator("button", { hasText: /One glass/ }).first().click();
await page.waitForTimeout(400);
const s4 = await stored();
check("Taking a glass back off works", s4.water === 1500, String(s4.water));

// Target met state
await page.locator("button", { hasText: /^\+500 ml$/ }).first().click();
await page.waitForTimeout(400);
const s5 = await stored();
check("Water reaches the target", s5.water === 2000, String(s5.water));
check("Says the target is met", (await page.locator("text=Target met").count()) > 0);
await page.screenshot({ path: `${out}/03-water-done.png`, fullPage: true });

// Water is per-day, not global
await page.locator('button[aria-label="Day before"]').first().click();
await page.waitForTimeout(600);
const yWater = await page.locator("text=/0\\.00/").count();
check("Yesterday's water is separate", yWater > 0);

// ───────── Weight
await page.goto(base + "#/progress/weight"); await page.waitForTimeout(900);
check("Progress opens on the weight tab", (await page.locator("text=No weigh-ins yet").count()) > 0);
await page.screenshot({ path: `${out}/04-weight-empty.png`, fullPage: true });
const startShown = await page.locator("text=/82.*start/").count();
check("Shows the seeded start and goal", startShown > 0);

// Add three weigh-ins across different days
const addWeigh = async (kg, dayChip) => {
  const btn = page.locator("button", { hasText: /Add a weigh-in/ });
  if (await btn.count()) await btn.first().click();
  else await page.locator("button", { hasText: /Add a weigh-in/ }).first().click();
  await page.waitForTimeout(500);
  await page.getByPlaceholder("e.g. 80.4").fill(String(kg));
  if (dayChip) { await page.locator("button", { hasText: new RegExp(`^${dayChip}$`) }).first().click(); await page.waitForTimeout(200); }
  await page.locator("button", { hasText: /weigh-in$/ }).last().click();
  await page.waitForTimeout(600);
};
await addWeigh(81.4, "Yesterday");
const w1 = await stored();
check("First weigh-in saved", w1.weights.length === 1, JSON.stringify(w1.weights));
await addWeigh(80.8, null);
const w2 = await stored();
check("Second weigh-in saved", w2.weights.length === 2, JSON.stringify(w2.weights));

const shownNow = await page.locator("text=80.8").count();
check("Current weight shows the latest", shownNow > 0);
const lost = await page.evaluate(() => document.body.innerText.includes("1.2"));
check("Lost is start minus latest (82 - 80.8 = 1.2)", lost);
const toGo = await page.evaluate(() => document.body.innerText.includes("5.8"));
check("To go is latest minus goal (80.8 - 75 = 5.8)", toGo);
check("Trend chart drawn with two points", (await page.locator("svg .recharts-line").count()) > 0);
await page.screenshot({ path: `${out}/05-weight.png`, fullPage: true });

// Editing an existing weigh-in
await page.locator("button.card", { hasText: /80\.8/ }).first().click();
await page.waitForTimeout(500);
await page.getByPlaceholder("e.g. 80.4").fill("80.2");
await page.locator("button", { hasText: /weigh-in$/ }).last().click();
await page.waitForTimeout(600);
const w3 = await stored();
check("Editing a weigh-in changes it, not adds one", w3.weights.length === 2 && w3.weights.some((w) => w.kg === 80.2), JSON.stringify(w3.weights));

// Today reflects the weight
await page.goto(base + "#/"); await page.waitForTimeout(900);
const bodyCard = await page.locator('a[href="#/progress/weight"]').first().innerText();
console.log("  Today body card:", bodyCard.replace(/\n/g, " | "));
check("Today shows the current weight", bodyCard.includes("80.2"));
check("Today shows what's left", bodyCard.includes("5.2"));
await page.screenshot({ path: `${out}/06-today-full.png`, fullPage: true });

// ───────── Editable targets
await page.goto(base + "#/settings"); await page.waitForTimeout(900);
check("Settings has nutrition targets", (await page.locator("text=Nutrition targets").count()) > 0);
await page.locator("button", { hasText: /^2\.5L$/ }).first().click();
await page.waitForTimeout(400);
const t1 = await stored();
check("Water target is editable", t1.nutrition.waterTarget === 2500, String(t1.nutrition.waterTarget));
const goalInput = page.locator('input[inputmode="decimal"]').nth(1);
await goalInput.fill("74");
await goalInput.blur();
await page.waitForTimeout(400);
const t2 = await stored();
check("Goal weight is editable", t2.nutrition.goalWeight === 74, String(t2.nutrition.goalWeight));
await page.screenshot({ path: `${out}/07-settings.png`, fullPage: true });

// ───────── Nothing existing broke
await page.goto(base + "#/progress"); await page.waitForTimeout(800);
check("Progress history tab still default", (await page.locator("text=Workouts per week").count()) > 0);
await page.goto(base + "#/programs"); await page.waitForTimeout(800);
check("Sheets still load", (await page.locator("text=/Program #/").count()) > 0);
await page.goto(base + "#/library"); await page.waitForTimeout(800);
check("Exercise library still loads", (await page.locator("img").count()) > 5);
await page.goto(base + "#/food"); await page.waitForTimeout(800);
check("Food screen still loads", (await page.locator("text=I ATE THIS").count()) > 0);

// The sheet's "I've already done this" link used a query string, which this
// router routes to Page not found. It takes a path segment now.
await page.goto(base + "#/programs"); await page.waitForTimeout(700);
await page.locator("a", { hasText: /Program #/ }).first().click();
await page.waitForTimeout(800);
await page.locator("button", { hasText: /already done this/ }).first().click();
await page.waitForTimeout(900);
const lpBody = await page.locator("body").innerText();
check("'I've already done this' reaches the logger", !lpBody.includes("Page not found"), page.url());
check("The logger rendered its rows", /what you lifted/i.test(lpBody));
// The chosen sheet is the highlighted chip, and it should be the one we came from.
const picked = await page.locator("button.grad-teal", { hasText: /Program #/ }).first().innerText().catch(() => "");
check("It preselects the sheet we came from", picked.includes("#03"), picked.replace(/\n/g, " | "));

console.log(errs.length ? "\nERRORS:\n" + errs.join("\n") : "\nno page errors");
await browser.close();
