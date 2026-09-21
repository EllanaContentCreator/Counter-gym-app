import { useRef, useState } from "react";
import { useAppData, actions } from "@/lib/store";
import { Header } from "@/components/Header";
import { Button, Card, Field, Sheet, inputCls, cnHelper } from "@/components/ui";
import { IconImage, IconSpark } from "@/components/Icons";
import { readerEndpoint } from "@/lib/scan";
import { DAY_TYPE_LABEL } from "@/data/nutrition";
import type { DayType } from "@/lib/types";

export default function Settings() {
  const data = useAppData();
  const p = data.profile;
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);
  const isStandalone = typeof window !== "undefined" && (window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone);

  const n = data.nutrition;
  /** Numbers typed into a box: a blank or a scribble leaves the old value alone. */
  const numOr = (v: string, fallback: number) => {
    const parsed = parseFloat(v.replace(/[^\d.]/g, ""));
    return Number.isFinite(parsed) ? parsed : fallback;
  };
  const setBand = (type: DayType, which: "calories" | "protein", end: 0 | 1, v: string) => {
    const band = [...n.targets[type][which]] as [number, number];
    band[end] = numOr(v, band[end]);
    actions.updateNutrition({ targets: { ...n.targets, [type]: { ...n.targets[type], [which]: band } } });
  };

  const [busy, setBusy] = useState(false);
  const [testing, setTesting] = useState(false);
  const [readerMsg, setReaderMsg] = useState("");
  const [readerOk, setReaderOk] = useState(false);
  const testReader = async () => {
    setTesting(true);
    setReaderMsg("");
    try {
      const res = await fetch(readerEndpoint(p.readerUrl), {
        method: "POST",
        headers: { "content-type": "application/json", ...(p.readerPasscode ? { "x-counter-passcode": p.readerPasscode } : {}) },
        body: JSON.stringify({}),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      // "No image supplied" means the reader is alive and let us past the passcode.
      if (res.status === 400 && /image/i.test(body.error ?? "")) {
        setReaderOk(true);
        setReaderMsg("Reader is connected and ready.");
      } else if (res.status === 401) {
        setReaderOk(false);
        setReaderMsg("The reader is there, but that passcode is wrong.");
      } else {
        setReaderOk(false);
        setReaderMsg(body.error || `The reader answered with an error (${res.status}).`);
      }
    } catch {
      setReaderOk(false);
      setReaderMsg("Couldn't reach that address. Check it's typed correctly and you're online.");
    } finally {
      setTesting(false);
    }
  };
  const photoCount = data.programs.reduce((a, p) => a + (p.photoIds?.length ?? 0), 0);
  const exportBackup = async () => {
    setBusy(true);
    const json = await actions.exportData().finally(() => setBusy(false));
    const name = `counter-backup-${new Date().toISOString().slice(0, 10)}.json`;
    const file = new File([json], name, { type: "application/json" });
    try {
      if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], title: "Counter backup" }); return; }
    } catch { /* fall through */ }
    const url = URL.createObjectURL(file);
    const a = document.createElement("a"); a.href = url; a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };
  const importBackup = async (f: File | undefined) => {
    if (!f) return;
    setBusy(true);
    const res = await actions.importData(await f.text()).finally(() => setBusy(false));
    setMsg(res.message);
  };

  return (
    <div className="safe-bottom">
      <Header title="Me" sub="Profile, backups and the app" />
      <div className="space-y-4 px-4 pt-1">
        <Card className="space-y-4">
          <div className="display text-[22px]">Profile</div>
          <Field label="Your name"><input className={inputCls} value={p.name} onChange={(e) => actions.updateProfile({ name: e.target.value })} placeholder="Lana" /></Field>
          <Field label="Weekly workout goal">
            <div className="flex gap-2">{[1, 2, 3, 4, 5].map((n) => <button key={n} onClick={() => actions.updateProfile({ weeklyGoal: n })} className={cnHelper("tap h-11 flex-1 rounded-xl font-extrabold", p.weeklyGoal === n ? "bg-teal-700 text-white" : "bg-sand text-ink-soft")}>{n}</button>)}</div>
          </Field>
          <Field label="Weight unit">
            <div className="flex gap-2">{(["kg", "lb"] as const).map((u) => <button key={u} onClick={() => actions.updateProfile({ unit: u })} className={cnHelper("tap h-11 flex-1 rounded-xl font-extrabold", p.unit === u ? "bg-teal-700 text-white" : "bg-sand text-ink-soft")}>{u}</button>)}</div>
          </Field>
          <Field label="Rest timer after each set" hint="Starts automatically when you log a set">
            <div className="flex gap-2">{[45, 60, 75, 90, 120].map((n) => <button key={n} onClick={() => actions.updateProfile({ restSeconds: n })} className={cnHelper("tap h-11 flex-1 rounded-xl text-sm font-extrabold", p.restSeconds === n ? "bg-teal-700 text-white" : "bg-sand text-ink-soft")}>{n}s</button>)}</div>
          </Field>
          <label className="flex items-center justify-between rounded-xl bg-sand px-3 py-3">
            <span className="font-bold">Beeps & chimes</span>
            <input type="checkbox" checked={p.soundOn} onChange={(e) => actions.updateProfile({ soundOn: e.target.checked })} className="h-6 w-6 accent-teal-700" />
          </label>
        </Card>

        <Card className="space-y-4">
          <div className="display text-[22px]">Nutrition targets</div>
          <p className="text-sm text-ink-soft">Every number here is yours to change. Targets are a band to land inside rather than one figure to hit exactly.</p>

          <div className="grid grid-cols-2 gap-3">
            <Field label={`Starting weight (${p.unit})`}>
              <input className={inputCls} inputMode="decimal" defaultValue={n.startWeight} onBlur={(e) => actions.updateNutrition({ startWeight: numOr(e.target.value, n.startWeight) })} />
            </Field>
            <Field label={`Goal weight (${p.unit})`}>
              <input className={inputCls} inputMode="decimal" defaultValue={n.goalWeight} onBlur={(e) => actions.updateNutrition({ goalWeight: numOr(e.target.value, n.goalWeight) })} />
            </Field>
          </div>

          <Field label="Water target" hint="Millilitres a day">
            <div className="flex gap-2">
              {[1500, 2000, 2500, 3000].map((ml) => (
                <button key={ml} onClick={() => actions.updateNutrition({ waterTarget: ml })} className={cnHelper("tap h-11 flex-1 rounded-xl text-sm font-extrabold", n.waterTarget === ml ? "bg-teal-700 text-white" : "bg-sand text-ink-soft")}>
                  {(ml / 1000).toFixed(1)}L
                </button>
              ))}
            </div>
          </Field>

          {(Object.keys(n.targets) as DayType[]).map((type) => (
            <div key={type} className="rounded-2xl bg-sand/60 p-3">
              <div className="text-[11px] font-extrabold uppercase tracking-widest text-ink-mute">{DAY_TYPE_LABEL[type]} days</div>
              <div className="mt-2 grid grid-cols-2 gap-3">
                <Field label="Calories">
                  <div className="flex items-center gap-1.5">
                    <input className={inputCls} inputMode="numeric" defaultValue={n.targets[type].calories[0]} onBlur={(e) => setBand(type, "calories", 0, e.target.value)} />
                    <span className="text-sm font-bold text-ink-mute">–</span>
                    <input className={inputCls} inputMode="numeric" defaultValue={n.targets[type].calories[1]} onBlur={(e) => setBand(type, "calories", 1, e.target.value)} />
                  </div>
                </Field>
                <Field label="Protein (g)">
                  <div className="flex items-center gap-1.5">
                    <input className={inputCls} inputMode="numeric" defaultValue={n.targets[type].protein[0]} onBlur={(e) => setBand(type, "protein", 0, e.target.value)} />
                    <span className="text-sm font-bold text-ink-mute">–</span>
                    <input className={inputCls} inputMode="numeric" defaultValue={n.targets[type].protein[1]} onBlur={(e) => setBand(type, "protein", 1, e.target.value)} />
                  </div>
                </Field>
              </div>
            </div>
          ))}
          <p className="text-[11px] text-ink-mute">Exercise calories are never added back onto these — food and training are meant to work together, not cancel each other out.</p>
        </Card>

        <Card className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-xl grad-sun text-ink"><IconSpark size={18} /></span>
            <div className="display text-[22px]">Sheet reader</div>
          </div>
          <p className="text-sm text-ink-soft">Reads Carolyn's sheet off a photo so nobody has to type the rows in. Leave the address blank if Counter and the reader are on the same site.</p>
          <Field label="Reader address" hint={`Blank means ${readerEndpoint()}`}>
            <input className={inputCls} value={p.readerUrl ?? ""} onChange={(e) => actions.updateProfile({ readerUrl: e.target.value })} placeholder="https://your-site.netlify.app/.netlify/functions/scan-sheet" autoCapitalize="none" autoCorrect="off" spellCheck={false} />
          </Field>
          <Field label="Group passcode" hint="The word your group agreed on. Leave blank if the reader has none.">
            <input className={inputCls} value={p.readerPasscode ?? ""} onChange={(e) => actions.updateProfile({ readerPasscode: e.target.value })} placeholder="e.g. counter2026" autoCapitalize="none" autoCorrect="off" spellCheck={false} />
          </Field>
          <Button variant="secondary" onClick={testReader} disabled={testing}>{testing ? "Checking…" : "Check the reader"}</Button>
          {readerMsg && <p className={cnHelper("text-sm font-bold", readerOk ? "text-teal-700" : "text-coral-600")}>{readerMsg}</p>}
        </Card>

        <Card className="space-y-3">
          <div className="display text-[22px]">Backup</div>
          <p className="text-sm text-ink-soft">Everything lives on this phone. Export a backup now and then, or to move your history to a new phone.</p>
          <div className="flex items-center gap-2 rounded-xl bg-sand px-3 py-2 text-xs font-semibold text-ink-soft"><IconImage size={16} /> {photoCount} sheet photo{photoCount === 1 ? "" : "s"} will be included in the backup.</div>
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={exportBackup} disabled={busy}>{busy ? "Working…" : "Export backup"}</Button>
            <Button variant="secondary" onClick={() => fileRef.current?.click()} disabled={busy}>Restore backup</Button>
          </div>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => importBackup(e.target.files?.[0])} />
          {msg && <p className="text-sm font-bold text-teal-700">{msg}</p>}
        </Card>

        {!isStandalone && (
          <Card className="space-y-2">
            <div className="display text-[22px]">Add to your home screen</div>
            <p className="text-sm text-ink-soft"><b>iPhone:</b> tap the Share button in Safari, then "Add to Home Screen".<br /><b>Android:</b> open the browser menu (⋮) and choose "Add to Home screen" or "Install app".</p>
            <p className="text-xs text-ink-mute">Once installed it opens full-screen, works offline, and keeps the screen on during workouts.</p>
          </Card>
        )}

        <Card className="space-y-2">
          <div className="display text-[22px]">About Counter</div>
          <p className="text-sm text-ink-soft">Counter is built on the training sheets of <b>Carolyn Counter</b>: four stations, three rounds, a tabata to finish, and every weight written down. She's retired; the accountability isn't. Count it. Own it.</p>
          <p className="text-xs text-ink-mute">Version 1.1 · Your data never leaves your device.</p>
        </Card>

        <Button full variant="danger" onClick={() => setConfirmReset(true)}>Reset everything</Button>
      </div>
      <Sheet open={confirmReset} onClose={() => setConfirmReset(false)} title="Reset everything?">
        <p className="text-sm text-ink-soft">This deletes your history, custom exercises, sheet photos and edits to programs. Carolyn's original sheets stay. Export a backup first if you're not sure.</p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button variant="secondary" onClick={() => setConfirmReset(false)}>Cancel</Button>
          <Button variant="danger" onClick={() => { actions.resetAll(); setConfirmReset(false); }}>Reset</Button>
        </div>
      </Sheet>
    </div>
  );
}
