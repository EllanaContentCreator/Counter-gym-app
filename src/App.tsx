import { Route, Switch, useLocation, Link } from "wouter";
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

const NAV = [
  { href: "/", label: "Today", icon: "🏠" },
  { href: "/programs", label: "Programs", icon: "📋" },
  { href: "/library", label: "Exercises", icon: "🏋️‍♀️" },
  { href: "/progress", label: "Progress", icon: "📈" },
  { href: "/settings", label: "Me", icon: "👤" },
];

function BottomNav() {
  const [loc] = useLocation();
  const hidden = loc.startsWith("/workout");
  if (hidden) return null;
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex justify-center" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
      <div className="flex w-full max-w-[520px] items-stretch justify-around border-t border-sand bg-white/95 backdrop-blur">
        {NAV.map((n) => {
          const active = n.href === "/" ? loc === "/" : loc.startsWith(n.href);
          return (
            <Link key={n.href} href={n.href} className={cn("tap flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-bold uppercase tracking-wide", active ? "text-teal-700" : "text-ink-mute")}>
              <span className={cn("grid h-8 w-12 place-items-center rounded-full text-lg transition", active && "bg-teal-100")}>{n.icon}</span>
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
    <Link href="/workout" className="tap fixed inset-x-0 z-40 flex justify-center" style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 64px)" }}>
      <div className="mx-4 flex w-full max-w-[488px] items-center justify-between rounded-2xl bg-coral-500 px-4 py-3 text-white shadow-lg">
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
    <div className="mx-auto min-h-dvh w-full max-w-[520px]">
      <Switch>
        <Route path="/" component={Today} />
        <Route path="/programs" component={Programs} />
        <Route path="/programs/:id" component={ProgramDetail} />
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
  );
}
