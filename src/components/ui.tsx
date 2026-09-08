import { type ReactNode, useEffect } from "react";
import { cn } from "@/lib/utils";

export function Button({
  children, onClick, variant = "primary", size = "md", className, disabled, type = "button", full,
}: {
  children: ReactNode; onClick?: () => void; variant?: "primary" | "secondary" | "ghost" | "danger" | "coral" | "mustard";
  size?: "sm" | "md" | "lg"; className?: string; disabled?: boolean; type?: "button" | "submit"; full?: boolean;
}) {
  const base = "tap inline-flex items-center justify-center gap-2 rounded-2xl font-bold transition disabled:opacity-40 disabled:pointer-events-none";
  const sizes = { sm: "px-3 py-2 text-sm", md: "px-4 py-3 text-[15px]", lg: "px-5 py-4 text-base" };
  const variants = {
    primary: "bg-teal-700 text-white shadow-[0_6px_18px_rgba(15,118,110,0.25)] active:bg-teal-900",
    secondary: "bg-white text-teal-700 border-2 border-teal-100 active:bg-teal-50",
    ghost: "bg-transparent text-teal-700 active:bg-teal-50",
    danger: "bg-coral-100 text-coral-600 active:bg-coral-500 active:text-white",
    coral: "bg-coral-500 text-white shadow-[0_6px_18px_rgba(249,115,96,0.3)] active:bg-coral-600",
    mustard: "bg-mustard-500 text-ink active:bg-mustard-100",
  };
  return (
    <button type={type} disabled={disabled} onClick={onClick} className={cn(base, sizes[size], variants[variant], full && "w-full", className)}>
      {children}
    </button>
  );
}

export function Card({ children, className, onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  return (
    <div onClick={onClick} className={cn("card p-4", onClick && "tap cursor-pointer", className)}>
      {children}
    </div>
  );
}

export function Pill({ children, tone = "teal", className }: { children: ReactNode; tone?: "teal" | "coral" | "mustard" | "grey" | "ink"; className?: string }) {
  const tones = {
    teal: "bg-teal-100 text-teal-900",
    coral: "bg-coral-100 text-coral-600",
    mustard: "bg-mustard-100 text-[#7a5a00]",
    grey: "bg-sand text-ink-soft",
    ink: "bg-ink text-white",
  };
  return <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide", tones[tone], className)}>{children}</span>;
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-end justify-between">
      <h2 className="display text-[22px] leading-none text-ink">{children}</h2>
      {action}
    </div>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-ink-soft">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-ink-mute">{hint}</span>}
    </label>
  );
}

export const inputCls =
  "w-full rounded-xl border-2 border-sand bg-white px-3 py-3 text-[15px] text-ink outline-none transition focus:border-teal-500 placeholder:text-ink-mute";

export function Sheet({ open, onClose, title, children, tall }: { open: boolean; onClose: () => void; title?: string; children: ReactNode; tall?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-ink/40" onClick={onClose} />
      <div className={cn("fade-up relative flex w-full max-w-[520px] flex-col rounded-t-3xl bg-cream shadow-2xl", tall ? "h-[92dvh]" : "max-h-[88dvh]")}>
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <div className="mx-auto h-1.5 w-10 rounded-full bg-sand absolute left-1/2 top-2 -translate-x-1/2" />
          <h3 className="display mt-2 text-[24px] leading-none">{title}</h3>
          <button onClick={onClose} aria-label="Close" className="tap mt-2 grid h-9 w-9 place-items-center rounded-full bg-sand text-ink-soft">
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 pb-8" style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 24px)" }}>
          {children}
        </div>
      </div>
    </div>
  );
}

export function Stat({ value, label, tone = "teal" }: { value: ReactNode; label: string; tone?: "teal" | "coral" | "mustard" | "ink" }) {
  const tones = { teal: "text-teal-700", coral: "text-coral-500", mustard: "text-[#b58200]", ink: "text-ink" };
  return (
    <div className="card flex flex-col items-center px-2 py-3 text-center">
      <span className={cn("display text-[30px] leading-none", tones[tone])}>{value}</span>
      <span className="mt-1 text-[11px] font-bold uppercase tracking-wide text-ink-mute">{label}</span>
    </div>
  );
}

export function Empty({ icon, title, body, action }: { icon: string; title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="card flex flex-col items-center px-6 py-10 text-center">
      <div className="text-4xl">{icon}</div>
      <h3 className="display mt-3 text-[22px]">{title}</h3>
      {body && <p className="mt-1 text-sm text-ink-soft">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export const cnHelper = cn;
