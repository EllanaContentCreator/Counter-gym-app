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

const totals = () => page.evaluate(() => {
  const d = JSON.parse(localStorage.getItem("counter.app.v1"));
  const k = new Date();
  const key = `${k.getFullYear()}-${String(k.getMonth() + 1).padStart(2, "0")}-${k.getDate()}`;
  const food = d.days?.[key]?.food ?? [];
  return {
    entries: food.length,
    calories: food.reduce((a, f) => a + (f.calories || 0), 0),
    protein: food.reduce((a, f) => a + (f.protein || 0), 0),
    names: food.map((f) => f.name),
  };
});

const check = (label, cond, extra = "") => console.log(`${cond ? "PASS" : "FAIL"}  ${label}${extra ? "  " + extra : ""}`);

await page.goto(base); await page.waitForTimeout(800);
const go = page.getByRole("button", { name: "Let's go" });
if (await go.count()) {
  await go.click(); await page.waitForTimeout(400);
  await page.getByPlaceholder("Lana").fill("Lana");
  await page.getByRole("button", { name: /Start counting/ }).click();
  await page.waitForTimeout(900);
}

// ── Today shows the food card, and it links through
await page.screenshot({ path: `${out}/01-today.png`, fullPage: true });
const foodCard = page.locator('a[href="#/food"]');
check("Today shows a Food card", (await foodCard.count()) > 0);
await foodCard.first().click();
await page.waitForTimeout(800);
check("Food screen opens", page.url().includes("/food"), page.url());
await page.screenshot({ path: `${out}/02-food-empty.png`, fullPage: true });

const dayType = await page.locator("header").first().innerText();
console.log("  day header:", dayType.replace(/\n/g, " | "));

// ── One-tap meal plan
const ate = page.locator("button", { hasText: /I ATE THIS/ });
const planCount = await ate.count();
check("Meal plan shows today's meals", planCount > 0, `${planCount} meals`);
const before = await totals();
await ate.first().click();
await page.waitForTimeout(600);
const afterMeal = await totals();
check("I ATE THIS logs the meal", afterMeal.entries === before.entries + 1, JSON.stringify(afterMeal));
check("Calories went up", afterMeal.calories > before.calories, `${before.calories} → ${afterMeal.calories}`);
check("Protein went up", afterMeal.protein > before.protein, `${before.protein} → ${afterMeal.protein}`);
check("Meal marked Eaten", (await page.locator("span.bg-lime-100").count()) > 0);
await page.screenshot({ path: `${out}/03-meal-logged.png`, fullPage: true });

// ── Undo via the toast
const undoToast = page.locator("div.bg-ink button", { hasText: /Undo/ });
check("Undo offered", (await undoToast.count()) > 0);
await undoToast.first().click();
await page.waitForTimeout(500);
const afterUndo = await totals();
check("Undo removes it again", afterUndo.entries === before.entries, JSON.stringify(afterUndo));

// Put it back for the rest of the run
await page.locator("button", { hasText: /I ATE THIS/ }).first().click();
await page.waitForTimeout(500);

// ── Favourites, one tap
const favCard = page.locator("button.card").filter({ hasText: /cal ·/ });
const favCount = await favCard.count();
check("Favourites are seeded", favCount >= 10, `${favCount} favourites`);
const beforeFav = await totals();
await favCard.first().click();
await page.waitForTimeout(600);
const afterFav = await totals();
check("Tapping a favourite logs it", afterFav.entries === beforeFav.entries + 1, afterFav.names.join(", "));
check("Favourite added its calories", afterFav.calories > beforeFav.calories, `${beforeFav.calories} → ${afterFav.calories}`);

// ── Add a food by hand
await page.locator("button", { hasText: /Add food/ }).first().click();
await page.waitForTimeout(500);
await page.getByPlaceholder("e.g. Chicken salad bowl").fill("Test omelette");
await page.getByPlaceholder("e.g. 150 g").fill("3 eggs");
await page.getByPlaceholder("e.g. 560").fill("320");
await page.getByPlaceholder("e.g. 50").fill("27");
await page.screenshot({ path: `${out}/04-add-food.png` });
await page.locator("button", { hasText: /Add to today/ }).first().click();
await page.waitForTimeout(600);
const afterAdd = await totals();
check("Manual food logged", afterAdd.names.includes("Test omelette"), afterAdd.names.join(", "));
check("Its calories counted", afterAdd.calories === afterFav.calories + 320, `${afterFav.calories} → ${afterAdd.calories}`);
check("Its protein counted", afterAdd.protein === afterFav.protein + 27, `${afterFav.protein} → ${afterAdd.protein}`);

// ── Duplicate
const dupRow = page.locator("div", { hasText: /^Test omelette$/ }).last();
const dupBtn = page.locator('button[aria-label="Add Test omelette again"]');
check("Duplicate button present", (await dupBtn.count()) > 0);
await dupBtn.first().click();
await page.waitForTimeout(500);
const afterDup = await totals();
check("Duplicate adds a second copy", afterDup.names.filter((n) => n === "Test omelette").length === 2, afterDup.names.join(", "));

// ── Edit an entry
await page.locator("button", { hasText: /Test omelette/ }).first().click();
await page.waitForTimeout(500);
const calField = page.getByPlaceholder("e.g. 560");
await calField.fill("400");
await page.locator("button", { hasText: /Save changes/ }).first().click();
await page.waitForTimeout(600);
const afterEdit = await totals();
check("Edit changes the total", afterEdit.calories === afterDup.calories + 80, `${afterDup.calories} → ${afterEdit.calories}`);

// ── Delete
await page.locator('button[aria-label="Remove Test omelette"]').first().click();
await page.waitForTimeout(600);
const afterDel = await totals();
check("Delete removes it", afterDel.names.filter((n) => n === "Test omelette").length === 1, afterDel.names.join(", "));
await page.screenshot({ path: `${out}/05-food-full.png`, fullPage: true });

// ── The totals on screen match the data
const shown = await page.evaluate(() => {
  const els = [...document.querySelectorAll(".display")].map((e) => e.textContent.trim());
  return els.slice(0, 4);
});
console.log("  on-screen numbers:", JSON.stringify(shown), "stored:", afterDel.calories, afterDel.protein);
check("Screen shows the stored calorie total", shown.includes(String(Math.round(afterDel.calories))));

// ── Today reflects it
await page.goto(base + "#/"); await page.waitForTimeout(900);
await page.screenshot({ path: `${out}/06-today-after.png`, fullPage: true });
const todayText = await page.locator('a[href="#/food"]').first().innerText();
console.log("  Today food card:", todayText.replace(/\n/g, " | "));
check("Today card shows the calories", todayText.includes(String(Math.round(afterDel.calories))));

// ── Yesterday is a separate day
await page.goto(base + "#/food"); await page.waitForTimeout(700);
await page.locator('button[aria-label="Day before"]').first().click();
await page.waitForTimeout(600);
const yesterdayEmpty = await page.locator("text=Nothing logged yet").count();
check("Yesterday starts empty", yesterdayEmpty > 0);
await page.screenshot({ path: `${out}/07-yesterday.png`, fullPage: true });

// ── Existing workout features still work
await page.goto(base + "#/programs"); await page.waitForTimeout(800);
check("Sheets still load", (await page.locator("text=/Program #/").count()) > 0);
await page.goto(base + "#/progress"); await page.waitForTimeout(800);
check("Progress still loads", (await page.locator("text=Workouts per week").count()) > 0);
await page.goto(base + "#/library"); await page.waitForTimeout(800);
check("Exercise library still loads", (await page.locator("img").count()) > 5);

console.log(errs.length ? "\nERRORS:\n" + errs.join("\n") : "\nno page errors");
await browser.close();
