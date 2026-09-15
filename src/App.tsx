import { Route, Router, Switch, useLocation, Link } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { useEffect, useState } from "react";
import { useAppData, loadActiveSession } from "@/lib/store";
import { cn, formatClock } from "@/lib/utils";
import { useStopwatch, primeAudio } from "@/lib/timer";
import Today from "@/pages/Today";
import Programs from "@/pages/Programs";
import ProgramDetail from "@/pages/ProgramDetail";
import Library from "@/pages/Library";
import ExerciseDetail from "@/pages/ExerciseDetail";
import Workout from "@/pages/Workout";
import Progress from "@/pages/Progress";
import SessionDetail from "@/pages/SessionDetail";
import Timer from "@/pages/Timer";
import Settings from "@/pages/Settings";
import Onboarding from "@/pages/Onboarding";
import { IconChart, IconDumbbell, IconHome, IconSheet, IconUser } from "@/components/Icons";

const NAV = [
  { href: "/", label: "Today", Icon: IconHome },
  { href: "/programs", label: "Sheets", Icon: IconSheet },
  { href: "/library", label: "Exercises", Icon: IconDumbbell },
  { href: "/progress", label: "Progress", Icon: IconChart },
  { href: "/settings", label: "Me", Icon: IconUser },
];

function BottomNav() {
  const [loc] = useLocation();
  const hidden = loc.startsWith("/workout");
  if (hidden) return null;
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex justify-center" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
      <div className="glass mx-3 mb-2 flex w-full max-w-[496px] items-stretch justify-around rounded-[26px] border border-white/80 px-1 py-1 shadow-[0_-2px_24px_rgba(15,118,110,0.12),0_10px_30px_-10px_rgba(31,42,46,0.25)]">
        {NAV.map((n) => {
          const active = n.href === "/" ? loc === "/" : loc.startsWith(n.href);
          return (
            <Link key={n.href} href={n.href} className={cn("tap flex flex-1 flex-col items-center gap-0.5 rounded-2xl py-1.5 text-[10px] font-extrabold uppercase tracking-wide transition", active ? "text-teal-800" : "text-ink-mute")}>
              <span className={cn("grid h-8 w-12 place-items-center rounded-full transition", active && "grad-teal text-white shadow-[var(--shadow-pop)]")}><n.Icon size={20} /></span>
              {n.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function ActiveWorkoutBar() {
  const [loc] = useLocation();
  const [active, setActive] = useState(loadActiveSession());
  useEffect(() => {
    setActive(loadActiveSession());
  }, [loc]);
  const elapsed = useStopwatch(active?.startedAt ?? null);
  if (!active || loc.startsWith("/workout")) return null;
  return (
    <Link href="/workout" className="tap fixed inset-x-0 z-40 flex justify-center" style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 76px)" }}>
      <div className="shimmer mx-4 flex w-full max-w-[488px] items-center justify-between rounded-2xl grad-coral px-4 py-3 text-white shadow-[var(--shadow-coral)]">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wide opacity-80">Workout in progress</div>
          <div className="font-bold">{active.programName}</div>
        </div>
        <div className="display text-2xl">{formatClock(elapsed)}</div>
      </div>
    </Link>
  );
}

export default function App() {
  const data = useAppData();
  useEffect(() => {
    const unlock = () => primeAudio();
    window.addEventListener("pointerdown", unlock, { once: true });
    return () => window.removeEventListener("pointerdown", unlock);
  }, []);
  if (!data.profile.onboarded) return <Onboarding />;
  return (
    <Router hook={useHashLocation}>
    <div className="mx-auto min-h-dvh w-full max-w-[520px]">
      <Switch>
        <Route path="/" component={Today} />
        <Route path="/programs" component={Programs} />
        <Route path="/programs/:id/:edit?" component={ProgramDetail} />
        <Route path="/library" component={Library} />
        <Route path="/library/:id" component={ExerciseDetail} />
        <Route path="/workout" component={Workout} />
        <Route path="/progress" component={Progress} />
        <Route path="/progress/:id" component={SessionDetail} />
        <Route path="/timer" component={Timer} />
        <Route path="/settings" component={Settings} />
        <Route>
          <div className="p-8 text-center">
            <h1 className="display text-3xl">Page not found</h1>
            <Link href="/" className="mt-4 inline-block font-bold text-teal-700">Back to Today</Link>
          </div>
        </Route>
      </Switch>
      <ActiveWorkoutBar />
      <BottomNav />
    </div>
    </Router>
  );
}
