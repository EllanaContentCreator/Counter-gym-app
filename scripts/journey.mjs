import { chromium } from "playwright-core";
import fs from "node:fs";
const out = process.argv[2] || "journey";
fs.mkdirSync(out, { recursive: true });
const exe = fs.existsSync("/opt/pw-browsers/chromium") && fs.statSync("/opt/pw-browsers/chromium").isFile() ? "/opt/pw-browsers/chromium" : "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const browser = await chromium.launch({ executablePath: exe, args: ["--no-sandbox"] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
page.on("console", (m) => { if (m.type() === "error" && !m.text().includes("ERR_CONNECTION")) errors.push("console: " + m.text()); });
const base = "http://127.0.0.1:4174/";
const ok = (name, cond) => { console.log((cond ? "PASS " : "FAIL ") + name); if (!cond) errors.push("check failed: " + name); };
const shot = (n) => page.screenshot({ path: `${out}/${n}.png` });
const w = (ms = 400) => page.waitForTimeout(ms);

// 1. Onboarding
await page.goto(base); await w(800);
await page.getByRole("button", { name: "Let's go" }).click(); await w();
await page.getByPlaceholder("Lana").fill("Lana");
await page.getByRole("button", { name: "3", exact: true }).click();
await page.getByRole("button", { name: "Start counting" }).click(); await w(800);
ok("onboarding → Today greets Lana", await page.getByText(/Good (morning|afternoon|evening), Lana/).isVisible());
ok("weekly goal 3 shown", await page.getByText("0/3").isVisible());
await shot("01-today");

// 2. Edit a program sheet
await page.getByRole("link", { name: /Programs/ }).first().click(); await w();
await page.getByText("Program #02").first().click(); await w();
ok("program 02 shows deadlift", await page.getByText("Deadlift (20kg Bar)").isVisible());
await page.getByRole("button", { name: "Edit sheet" }).click(); await w();
await page.getByText("Plate Get Up").first().click(); await w();
const weightInput = page.getByPlaceholder("39+2");
await weightInput.fill("7.5");
await page.getByRole("button", { name: "Save row" }).click(); await w();
await page.getByRole("button", { name: "Add new exercise" }).click(); await w();
await page.getByPlaceholder("Search exercises…").fill("goblet");
await page.getByText("Goblet Squat", { exact: true }).first().click(); await w();
await page.getByRole("button", { name: "ALL", exact: true }).click();
await page.getByPlaceholder("39+2").fill("12");
await page.getByRole("button", { name: "Save row" }).click(); await w();
await page.getByRole("button", { name: "Save sheet" }).click(); await w(600);
ok("edited weight persisted", await page.getByText("7.5").first().isVisible());
ok("added Goblet Squat row", await page.getByText("Goblet Squat").first().isVisible());
await shot("02-edited-sheet");
await page.reload(); await w(800);
ok("hash route survives reload", await page.getByText("Goblet Squat").first().isVisible());

// 3. Library + custom exercise
await page.getByRole("link", { name: /Exercises/ }).first().click(); await w();
await page.getByPlaceholder("Search exercises…").fill("swing");
ok("search finds kettlebell swing", await page.getByText("Kettlebell Swing", { exact: true }).isVisible());
await page.getByText("Kettlebell Swing", { exact: true }).click(); await w();
ok("exercise detail cues visible", await page.getByText("Hinge at the hips, flat back").isVisible());
await page.getByLabel("Favourite").click(); await w();
await page.goBack(); await w();
await page.getByText("Custom exercise").click(); await w();
await page.getByPlaceholder("e.g. Landmine Press").fill("Landmine Press");
await page.getByRole("button", { name: "Save exercise" }).click(); await w();
await page.getByPlaceholder("Search exercises…").fill("landmine");
ok("custom exercise listed", await page.getByText("Landmine Press").first().isVisible());
await shot("03-library-custom");

// 4. Log a workout on Program #01
await page.goto(base + "#/programs/carolyn-01"); await w(600);
await page.getByRole("button", { name: "Start & log" }).click(); await w(600);
ok("workout header shows program", await page.getByText("Program #01").first().isVisible());
const logButtons = page.getByRole("button", { name: /Log/ });
await logButtons.nth(0).click(); await w();
ok("rest timer appeared", await page.getByText("Rest", { exact: true }).isVisible());
await page.getByRole("button", { name: "Skip" }).click(); await w();
await page.getByRole("button", { name: "2", exact: true }).first().click(); await w(200);
await logButtons.nth(0).click(); await w();
await page.getByRole("button", { name: "Skip" }).click(); await w();
ok("two sets logged on station 1", (await page.getByText(/R1 · 12\.5kg × 10/).count()) === 1 && (await page.getByText(/R2 · 12\.5kg × 10/).count()) === 1);
await page.getByText(/R1 · 12\.5kg × 10/).click(); await w();
ok("tapping a chip removes the set", (await page.getByText(/R1 · 12\.5kg × 10/).count()) === 0);
await page.getByRole("button", { name: "Add an exercise to this session" }).click(); await w();
await page.getByPlaceholder("Search exercises…").fill("landmine");
await page.getByText("Landmine Press").first().click(); await w();
ok("extra exercise added to session", await page.getByText("Landmine Press").first().isVisible());
await page.getByRole("button", { name: /Start/ }).first().click(); await w(1500);
ok("tabata overlay running", await page.getByText("Get ready").isVisible());
await shot("04-tabata");
await page.getByRole("button", { name: "Finish early" }).click(); await w();
ok("tabata logged", (await page.getByText(/done ×1/).count()) >= 1);
await shot("05-workout");
await page.getByRole("button", { name: "Finish" }).click(); await w();
await page.getByText("On fire").click();
await page.getByPlaceholder(/Felt strong/).fill("Great session, hex bar felt light.");
await page.getByRole("button", { name: "Save workout" }).click(); await w(800);
ok("session detail after save", await page.getByText("Great session, hex bar felt light.").isVisible());
await shot("06-session");

// 5. Second workout to get PB + chart
await page.goto(base + "#/programs/carolyn-01"); await w(600);
await page.getByRole("button", { name: "Start & log" }).click(); await w(600);
const wInput = page.locator("input[inputmode=decimal]").first();
await wInput.fill("15");
await page.getByRole("button", { name: /Log/ }).nth(0).click(); await w();
await page.getByRole("button", { name: "Skip" }).click(); await w();
await page.getByRole("button", { name: "Finish" }).click(); await w();
ok("PB banner in finish sheet", await page.getByText("New personal bests").isVisible());
await page.getByRole("button", { name: "Save workout" }).click(); await w(800);
await page.goto(base + "#/library/seated-row-machine"); await w(800);
ok("exercise chart rendered", (await page.locator(".recharts-line").count()) >= 1);
ok("best weight 15", await page.getByText("15", { exact: true }).first().isVisible());
await shot("07-exercise-chart");

// 6. Progress
await page.goto(base + "#/progress"); await w(800);
ok("two workouts in history", (await page.getByText("Program #01").count()) >= 2);
await page.getByText("Personal bests").click(); await w();
ok("PB list shows seated row", await page.getByText("Seated Row Machine").isVisible());
await shot("08-progress");

// 7. Timer
await page.goto(base + "#/timer"); await w();
await page.getByRole("button", { name: "rest" }).click(); await w();
await page.getByRole("button", { name: "30s" }).click(); await w(1200);
ok("rest countdown running", await page.getByText(/0:2[0-9]/).isVisible());
await page.getByRole("button", { name: "stopwatch" }).click(); await w();
await page.getByRole("button", { name: "Start" }).click(); await w(2200);
ok("stopwatch counting", await page.getByText(/0:0[1-9]/).isVisible());

// 8. Settings
await page.goto(base + "#/settings"); await w();
await page.getByRole("button", { name: "lb", exact: true }).click(); await w();
await page.goto(base + "#/library/seated-row-machine"); await w();
ok("unit switched to lb", await page.getByText("Best lb").isVisible());
await page.getByRole("link", { name: /Me/ }).first().click(); await w(600);
await page.getByRole("button", { name: "kg", exact: true }).click(); await w();

// 9. Active workout banner
await page.goto(base + "#/programs/carolyn-03"); await w();
await page.getByRole("button", { name: "Start & log" }).click(); await w();
await page.goto(base + "#/"); await w(600);
ok("active workout banner on Today", await page.getByText("Workout in progress").isVisible());
await shot("09-banner");
await page.getByText("Workout in progress").click(); await w();
await page.getByText("Discard workout").click(); await w();
await page.getByRole("button", { name: "Discard" }).click(); await w();
ok("discard returns home", await page.getByText(/Good (morning|afternoon|evening), Lana/).isVisible());

console.log("\nERRORS:", errors.length ? "\n" + errors.join("\n") : "none");
await browser.close();
