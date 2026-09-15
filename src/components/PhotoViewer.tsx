import { useEffect, useRef, useState } from "react";
import { usePhotoUrl } from "@/lib/photos";
import { IconClose, IconNext, IconBack } from "./Icons";
import { cn } from "@/lib/utils";

/** Full-screen viewer for a sheet photo with pinch-zoom, drag-to-pan and double-tap. */
export function PhotoViewer({ ids, index, onClose, onIndex, caption }: { ids: string[]; index: number | null; onClose: () => void; onIndex: (i: number) => void; caption?: string }) {
  const open = index != null && ids[index] != null;
  const id = open ? ids[index!] : undefined;
  const url = usePhotoUrl(id);
  const [t, setT] = useState({ s: 1, x: 0, y: 0 });
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const start = useRef<{ s: number; x: number; y: number; dist: number; cx: number; cy: number } | null>(null);
  const lastTap = useRef(0);

  useEffect(() => {
    setT({ s: 1, x: 0, y: 0 });
  }, [id]);
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);
  if (!open) return null;

  const clamp = (n: { s: number; x: number; y: number }) => ({ s: Math.min(6, Math.max(1, n.s)), x: n.s <= 1 ? 0 : n.x, y: n.s <= 1 ? 0 : n.y });
  const onDown = (e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const pts = [...pointers.current.values()];
    if (pts.length === 1) {
      const now = Date.now();
      if (now - lastTap.current < 280) {
        setT((cur) => (cur.s > 1 ? { s: 1, x: 0, y: 0 } : { s: 2.5, x: 0, y: 0 }));
        lastTap.current = 0;
      } else lastTap.current = now;
      start.current = { ...t, dist: 0, cx: pts[0].x, cy: pts[0].y };
    } else if (pts.length === 2) {
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      start.current = { ...t, dist, cx: (pts[0].x + pts[1].x) / 2, cy: (pts[0].y + pts[1].y) / 2 };
    }
  };
  const onMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId) || !start.current) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const pts = [...pointers.current.values()];
    const st = start.current;
    if (pts.length >= 2 && st.dist > 0) {
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      const cx = (pts[0].x + pts[1].x) / 2, cy = (pts[0].y + pts[1].y) / 2;
      const s = st.s * (dist / st.dist);
      setT(clamp({ s, x: st.x + (cx - st.cx), y: st.y + (cy - st.cy) }));
    } else if (pts.length === 1 && st.s > 1) {
      setT(clamp({ s: st.s, x: st.x + (pts[0].x - st.cx), y: st.y + (pts[0].y - st.cy) }));
    }
  };
  const onUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    const pts = [...pointers.current.values()];
    start.current = pts.length ? { ...t, dist: 0, cx: pts[0].x, cy: pts[0].y } : null;
  };

  const many = ids.length > 1;
  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-black text-white" role="dialog" aria-modal="true">
      <div className="safe-top flex items-center justify-between px-4 pt-3 pb-2">
        <div className="min-w-0">
          <div className="text-[10px] font-extrabold uppercase tracking-widest text-white/60">Carolyn's sheet</div>
          {caption && <div className="truncate text-sm font-bold">{caption}</div>}
        </div>
        <div className="flex items-center gap-2">
          {many && <span className="text-xs font-bold text-white/70">{index! + 1} / {ids.length}</span>}
          <button onClick={onClose} aria-label="Close" className="tap grid h-10 w-10 place-items-center rounded-full bg-white/15"><IconClose size={20} /></button>
        </div>
      </div>
      <div className="relative flex-1 overflow-hidden touch-none" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
        {url ? (
          <img src={url} alt="Workout sheet" draggable={false} className="absolute inset-0 h-full w-full select-none object-contain transition-transform duration-75" style={{ transform: `translate(${t.x}px, ${t.y}px) scale(${t.s})`, transformOrigin: "center" }} />
        ) : (
          <div className="grid h-full place-items-center text-sm text-white/60">Loading photo…</div>
        )}
        {many && (
          <>
            <button onClick={() => onIndex((index! + ids.length - 1) % ids.length)} aria-label="Previous" className={cn("tap absolute left-2 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/15")}><IconBack size={22} /></button>
            <button onClick={() => onIndex((index! + 1) % ids.length)} aria-label="Next" className="tap absolute right-2 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/15"><IconNext size={22} /></button>
          </>
        )}
      </div>
      <div className="px-4 pb-3 pt-2 text-center text-[11px] font-semibold text-white/50" style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 12px)" }}>
        Pinch to zoom · drag to move · double-tap to reset
      </div>
    </div>
  );
}
