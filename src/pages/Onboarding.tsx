import { useState } from "react";
import { actions } from "@/lib/store";
import { Button, inputCls } from "@/components/ui";
import { IconCamera, IconChart, IconCheck, IconSheet, IconTimer } from "@/components/Icons";

export default function Onboarding() {
  const [name, setName] = useState("");
  const [goal, setGoal] = useState(2);
  const [step, setStep] = useState(0);
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[520px] flex-col justify-between px-6 py-10">
      <div>
        <div className="flex items-center gap-3">
          <img src={(window as unknown as { __COUNTER_IMAGES?: Record<string, string> }).__COUNTER_IMAGES?.__icon ?? `${import.meta.env.BASE_URL}icons/icon-192.png`} alt="" className="h-14 w-14 rounded-2xl shadow-card" />
          <div>
            <div className="display text-[40px] leading-none grad-text">Counter</div>
            <div className="text-xs font-bold uppercase tracking-[0.2em] text-coral-500">Accountability training</div>
          </div>
        </div>
        {step === 0 ? (
          <div className="fade-up mt-10">
            <h1 className="display text-[44px] leading-[0.95]">Carolyn's programs.<br />Your numbers.<br />No excuses.</h1>
            <p className="mt-4 text-ink-soft">Four stations, three rounds, a tabata to finish. Log every weight and every rep, and watch the numbers climb.</p>
            <ul className="mt-6 space-y-3 text-sm">
              {[
                [<IconCamera size={16} />, "grad-coral", "Snap each of Carolyn's two weekly sheets — they're filed by week, next to your numbers"],
                [<IconSheet size={16} />, "grad-sky", "Her sheets #01–#04 are ready to go, in her exact format"],
                [<IconCheck size={16} />, "grad-teal", "Tap to log weight and reps; the rest timer starts itself"],
                [<IconTimer size={16} />, "grad-sun", "Guided 45-minute mode: warm up, rounds, tabata, cool down"],
                [<IconChart size={16} />, "grad-plum", "Personal bests, muscle maps and charts for every exercise"],
              ].map(([i, g, t], k) => (
                <li key={k} className="flex items-start gap-3"><span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-white shadow-sm ${g}`}>{i}</span><span>{t}</span></li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="fade-up mt-10 space-y-6">
            <h1 className="display text-[40px] leading-[0.95]">First, who's counting?</h1>
            <label className="block">
              <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-ink-soft">Your name</span>
              <input autoFocus className={inputCls + " text-lg"} value={name} onChange={(e) => setName(e.target.value)} placeholder="Lana" />
            </label>
            <div>
              <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-ink-soft">Workouts per week</span>
              <div className="flex gap-2">{[1, 2, 3, 4, 5].map((n) => <button key={n} onClick={() => setGoal(n)} className={"tap h-12 flex-1 rounded-xl text-lg font-extrabold " + (goal === n ? "grad-teal text-white shadow-[var(--shadow-pop)]" : "bg-white text-ink-soft shadow-card")}>{n}</button>)}</div>
              <p className="mt-2 text-xs text-ink-mute">Carolyn's group trains twice a week — Tuesday and Thursday.</p>
            </div>
          </div>
        )}
      </div>
      <div className="mt-8">
        {step === 0 ? (
          <Button full size="lg" variant="coral" onClick={() => setStep(1)}>Let's go</Button>
        ) : (
          <Button full size="lg" variant="coral" onClick={() => actions.updateProfile({ name: name.trim(), weeklyGoal: goal, onboarded: true })}>Start counting</Button>
        )}
      </div>
    </div>
  );
}
