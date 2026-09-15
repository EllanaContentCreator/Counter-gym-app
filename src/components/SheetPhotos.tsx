import { useRef, useState } from "react";
import type { Program } from "@/lib/types";
import { actions } from "@/lib/store";
import { savePhoto, usePhotoUrl } from "@/lib/photos";
import { cn } from "@/lib/utils";
import { PhotoViewer } from "./PhotoViewer";
import { IconCamera, IconImage, IconTrash, IconZoom } from "./Icons";

export function PhotoThumb({ id, className, onClick, badge }: { id: string; className?: string; onClick?: () => void; badge?: React.ReactNode }) {
  const url = usePhotoUrl(id);
  return (
    <button type="button" onClick={onClick} className={cn("tap relative shrink-0 overflow-hidden rounded-2xl bg-sand shadow-card", className)} aria-label="Open sheet photo">
      {url ? <img src={url} alt="" className="h-full w-full object-cover object-top" /> : <div className="grid h-full w-full place-items-center text-ink-mute"><IconImage size={20} /></div>}
      {badge}
    </button>
  );
}

/** Hidden file inputs + two buttons: take a photo, or pick a screenshot from the gallery. */
export function PhotoPickButtons({ onFiles, busy, compact }: { onFiles: (files: File[]) => void; busy?: boolean; compact?: boolean }) {
  const cam = useRef<HTMLInputElement>(null);
  const lib = useRef<HTMLInputElement>(null);
  const handle = (list: FileList | null) => {
    if (!list?.length) return;
    onFiles([...list]);
  };
  const cls = cn("tap flex items-center justify-center gap-2 rounded-2xl font-bold transition disabled:opacity-40", compact ? "px-3 py-2 text-sm" : "px-4 py-3.5 text-[15px]");
  return (
    <div className="grid grid-cols-2 gap-2">
      <button type="button" disabled={busy} onClick={() => cam.current?.click()} className={cn(cls, "grad-coral text-white shadow-[var(--shadow-coral)]")}>
        <IconCamera size={20} /> Take photo
      </button>
      <button type="button" disabled={busy} onClick={() => lib.current?.click()} className={cn(cls, "border-2 border-teal-100 bg-white text-teal-700")}>
        <IconImage size={20} /> Screenshot
      </button>
      <input ref={cam} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { handle(e.target.files); e.target.value = ""; }} />
      <input ref={lib} type="file" accept="image/*" multiple hidden onChange={(e) => { handle(e.target.files); e.target.value = ""; }} />
    </div>
  );
}

/** The photo strip shown on a program: thumbnails → full-screen viewer, plus add/remove while editing. */
export function SheetPhotos({ program, editing, className }: { program: Program; editing?: boolean; className?: string }) {
  const ids = program.photoIds ?? [];
  const [open, setOpen] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const add = async (files: File[]) => {
    setBusy(true);
    try {
      for (const f of files) {
        const ph = await savePhoto(f);
        actions.addProgramPhoto(program.id, ph.id);
      }
    } finally {
      setBusy(false);
    }
  };
  if (!ids.length && !editing) return null;
  return (
    <div className={className}>
      {ids.length > 0 && (
        <div className="scroll-x -mx-4 flex gap-2 px-4 pb-1">
          {ids.map((id, i) => (
            <div key={id} className="relative shrink-0">
              <PhotoThumb
                id={id}
                onClick={() => setOpen(i)}
                className={cn(ids.length === 1 ? "h-44 w-[300px]" : "h-40 w-[150px]")}
                badge={
                  <span className="absolute bottom-2 right-2 flex items-center gap-1 rounded-full bg-ink/70 px-2 py-1 text-[10px] font-extrabold uppercase tracking-wide text-white backdrop-blur">
                    <IconZoom size={12} /> Zoom
                  </span>
                }
              />
              {editing && (
                <button type="button" onClick={() => actions.removeProgramPhoto(program.id, id)} aria-label="Remove photo" className="tap absolute -right-1 -top-1 grid h-8 w-8 place-items-center rounded-full bg-coral-500 text-white shadow-md">
                  <IconTrash size={15} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      {editing && (
        <div className="mt-2">
          <PhotoPickButtons onFiles={add} busy={busy} compact />
          <p className="mt-1.5 text-[11px] text-ink-mute">{busy ? "Saving photo…" : "Snap Carolyn's sheet or add the screenshot she sends. It stays on this phone."}</p>
        </div>
      )}
      <PhotoViewer ids={ids} index={open} onClose={() => setOpen(null)} onIndex={setOpen} caption={`${program.name} · ${program.dayLabel}`} />
    </div>
  );
}
