import { chromium } from "playwright-core";
import fs from "node:fs";
const out = process.argv[2] || "shots";
fs.mkdirSync(out, { recursive: true });
const exe = fs.existsSync("/opt/pw-browsers/chromium") && fs.statSync("/opt/pw-browsers/chromium").isFile() ? "/opt/pw-browsers/chromium" : "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const browser = await chromium.launch({ executablePath: exe, args: ["--no-sandbox"] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });
const base = "http://127.0.0.1:4173";
await page.goto(base + "/");
await page.waitForTimeout(800);
await page.screenshot({ path: `${out}/00-onboarding.png` });
// Seed profile + a finished session to exercise the UI
await page.evaluate(() => {
  const raw = localStorage.getItem("counter.app.v1");
  const d = raw ? JSON.parse(raw) : { version: 1, profile: { name: "", trainerName: "Carolyn", unit: "kg", weeklyGoal: 2, restSeconds: 60, soundOn: true, onboarded: false }, programs: [], sessions: [], customExercises: [], lastWeights: {}, favourites: [] };
  {
    d.profile.name = "Lana"; d.profile.onboarded = true;
    const now = Date.now();
    d.sessions = [{ id: "s1", programId: "carolyn-01", programName: "Program #01", mode: "free", startedAt: now - 7 * 864e5, finishedAt: now - 7 * 864e5 + 45 * 60e3, durationSec: 2700, notes: "Felt strong.", feeling: 4,
      entries: [
        { id: "e1", rowId: "c01-1", exerciseId: "seated-row-machine", exerciseName: "Seated Row Machine", slot: "1", round: 1, setIndex: 1, weight: 12.5, weightText: "12.5", reps: 10, repsText: "10", completedAt: now - 7 * 864e5 + 60e3 },
        { id: "e2", rowId: "c01-1", exerciseId: "seated-row-machine", exerciseName: "Seated Row Machine", slot: "1", round: 2, setIndex: 2, weight: 15, weightText: "15", reps: 10, repsText: "10", completedAt: now - 7 * 864e5 + 600e3 },
        { id: "e3", rowId: "c01-t2", exerciseId: "kettlebell-swing", exerciseName: "Kettlebell Swing", slot: "TABATA", round: 1, setIndex: 1, weight: 16, weightText: "16", reps: null, repsText: "", completedAt: now - 7 * 864e5 + 2400e3 },
      ] }];
    d.lastWeights = { "seated-row-machine": "15", "kettlebell-swing": "16" };
    localStorage.setItem("counter.app.v1", JSON.stringify(d));
  }
});
const shots = [["/", "01-today"], ["/programs", "02-programs"], ["/programs/carolyn-04", "03-program-04"], ["/programs/carolyn-03", "04-program-03"], ["/library", "05-library"], ["/library/hex-bar-squat", "06-exercise"], ["/progress", "07-progress"], ["/timer", "08-timer"], ["/settings", "09-settings"]];
for (const [path, name] of shots) {
  await page.goto(base + path);
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${out}/${name}.png`, fullPage: false });
}
// Start a guided workout from program 4 and log a set
await page.goto(base + "/programs/carolyn-04");
await page.waitForTimeout(500);
await page.getByText("45-min guided").first().click();
await page.waitForTimeout(800);
await page.screenshot({ path: `${out}/10-workout-guided.png` });
const logBtn = page.getByRole("button", { name: /Log/ }).first();
await logBtn.click();
await page.waitForTimeout(500);
await page.screenshot({ path: `${out}/11-workout-logged.png` });
await page.getByText("▶ Start").first().click();
await page.waitForTimeout(1200);
await page.screenshot({ path: `${out}/12-tabata.png` });
await page.getByText("Finish early").click();
await page.waitForTimeout(400);
await page.getByRole("button", { name: "Finish" }).click();
await page.waitForTimeout(500);
await page.screenshot({ path: `${out}/13-finish.png` });
await page.getByText("Save workout").click();
await page.waitForTimeout(800);
await page.screenshot({ path: `${out}/14-session-detail.png` });
console.log("errors:", errors.length ? errors.join("\n") : "none");
await browser.close();
