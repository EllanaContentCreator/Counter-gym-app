import { chromium } from "playwright-core";
import fs from "node:fs";
const out = process.argv[2];
fs.mkdirSync(out, { recursive: true });
const exe = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const browser = await chromium.launch({ executablePath: exe, args: ["--no-sandbox"] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const page = await ctx.newPage();
const errs = [];
page.on("pageerror", e => errs.push("pageerror: " + e.message));
page.on("console", m => { if (m.type() === "error" && !/ERR_CONNECTION|favicon/.test(m.text())) errs.push("console: " + m.text()); });
const base = "http://127.0.0.1:4178/";

// Seed a scanned-style program exactly like Lana's Program #07:
// long Carolyn names that do NOT match the library, so they have no illustration.
await page.goto(base); await page.waitForTimeout(800);
// Complete onboarding so the app has persisted state to extend.
const go = page.getByRole("button", { name: "Let's go" });
if (await go.count()) {
  await go.click(); await page.waitForTimeout(400);
  await page.getByPlaceholder("Lana").fill("Lana");
  await page.getByRole("button", { name: /Start counting/ }).click();
  await page.waitForTimeout(900);
}
await page.evaluate(() => {
  const mk = (id, name, equipment, muscles, category = "strength") => ({
    id, name, equipment, muscles, category,
    cues: ["Added from Carolyn's sheet — tap Edit to add your own coaching cues."],
    custom: true,
  });
  const customExercises = [
    mk("custom-torsinator", "Torsinator : On One Knee : Above Shoulders To Opposite Knee : 15 Kg Bar", ["barbell"], ["obliques", "core"]),
    mk("custom-bb-curl-20s", "Barbell Bicep Curl 20's : 5 Full / 5 Bottom Half / 5 Top Half / 5 Full", ["barbell"], ["biceps"]),
    mk("custom-tabata-abs", "TABATA : Abs : Single Arm To Opposite Leg : L & R", ["bodyweight"], ["core", "obliques"], "tabata"),
  ];
  const rows = [
    { id: "r1", exerciseId: "hex-bar-squat", slot: "1", weight: "15", sets: "each side", reps: "10", rest: "" },
    { id: "r2", exerciseId: "custom-torsinator", slot: "4", weight: "5", sets: "", reps: "10", rest: "" },
    { id: "r3", exerciseId: "custom-bb-curl-20s", slot: "3", weight: "20", sets: "", reps: "", rest: "" },
    { id: "r4", exerciseId: "custom-tabata-abs", slot: "TABATA", weight: "5", sets: "plate", reps: "", rest: "" },
  ];
  const raw = localStorage.getItem("counter.app.v1");
  const d = raw ? JSON.parse(raw) : null;
  if (!d) return;
  d.profile.name = "Lana"; d.profile.onboarded = true;
  d.customExercises = customExercises;
  d.programs.push({ id: "scan07", number: 7, name: "Program #07", dayLabel: "Scanned sheet",
    rows, source: "custom", createdAt: Date.now(), updatedAt: Date.now() });
  localStorage.setItem("counter.app.v1", JSON.stringify(d));
});
// Reload so the in-memory store picks up the seeded state from localStorage.
await page.goto(base + "#/programs/scan07");
await page.reload(); await page.waitForTimeout(1100);
await page.screenshot({ path: `${out}/A-sheet.png` });
await page.getByRole("button", { name: /Start|Log/ }).first().click(); await page.waitForTimeout(1200);
await page.screenshot({ path: `${out}/B-workout.png`, fullPage: true });
await page.goto(base + "#/library"); await page.waitForTimeout(900);
await page.screenshot({ path: `${out}/C-library.png` });
// A library exercise with no illustration
await page.goto(base + "#/library/barbell-back-squat"); await page.waitForTimeout(900);
await page.screenshot({ path: `${out}/D-no-illo-detail.png` });
console.log("ERRORS:", errs.length ? errs.join("\n") : "none");
await browser.close();
