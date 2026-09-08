import { useRef, useState } from "react";
import { useAppData, actions } from "@/lib/store";
import { Header } from "@/components/Header";
import { Button, Card, Field, Sheet, inputCls, cnHelper } from "@/components/ui";

export default function Settings() {
  const data = useAppData();
  const p = data.profile;
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);
  const isStandalone = typeof window !== "undefined" && (window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone);

  const exportBackup = async () => {
    const json = actions.exportData();
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
    const res = actions.importData(await f.text());
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

        <Card className="space-y-3">
          <div className="display text-[22px]">Backup</div>
          <p className="text-sm text-ink-soft">Everything lives on this phone. Export a backup now and then, or to move your history to a new phone.</p>
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={exportBackup}>Export backup</Button>
            <Button variant="secondary" onClick={() => fileRef.current?.click()}>Restore backup</Button>
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
          <p className="text-xs text-ink-mute">Version 1.0 · Your data never leaves your device.</p>
        </Card>

        <Button full variant="danger" onClick={() => setConfirmReset(true)}>Reset everything</Button>
      </div>
      <Sheet open={confirmReset} onClose={() => setConfirmReset(false)} title="Reset everything?">
        <p className="text-sm text-ink-soft">This deletes your history, custom exercises and edits to programs. Carolyn's original sheets stay. Export a backup first if you're not sure.</p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button variant="secondary" onClick={() => setConfirmReset(false)}>Cancel</Button>
          <Button variant="danger" onClick={() => { actions.resetAll(); setConfirmReset(false); }}>Reset</Button>
        </div>
      </Sheet>
    </div>
  );
}
