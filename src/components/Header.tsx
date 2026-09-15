import { Link } from "wouter";
import type { ReactNode } from "react";
import { IconBack, IconTimer } from "./Icons";

export function Header({ title, back, right, sub }: { title: ReactNode; back?: string; right?: ReactNode; sub?: ReactNode }) {
  return (
    <header className="safe-top sticky top-0 z-30 glass">
      <div className="flex items-center gap-3 px-4 pt-3 pb-2">
        {back && (
          <Link href={back} aria-label="Back" className="tap grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-teal-700 shadow-card">
            <IconBack size={20} />
          </Link>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="display truncate text-[28px] leading-none text-ink">{title}</h1>
          {sub && <div className="mt-0.5 text-xs font-semibold text-ink-soft">{sub}</div>}
        </div>
        {right}
      </div>
    </header>
  );
}

export function TimerButton() {
  return (
    <Link href="/timer" aria-label="Timer" className="tap grid h-10 w-10 place-items-center rounded-full bg-white text-teal-700 shadow-card">
      <IconTimer size={21} />
    </Link>
  );
}
