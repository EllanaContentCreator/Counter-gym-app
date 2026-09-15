import { useState } from "react";
import type { Exercise } from "@/lib/types";
import { EQUIPMENT_BY_ID } from "@/data/equipment";
import { cn } from "@/lib/utils";
import { MuscleMap } from "./MuscleMap";

export function ExerciseImage({ exercise, className, size = "md", muscles }: { exercise?: Exercise; className?: string; size?: "sm" | "md" | "lg" | "xl"; /** overlay a small muscle-map badge */ muscles?: boolean }) {
  const [failed, setFailed] = useState(false);
  const sizes = { sm: "h-14 w-14 rounded-xl", md: "h-20 w-20 rounded-2xl", lg: "h-36 w-36 rounded-3xl", xl: "aspect-square w-full rounded-3xl" };
  const emoji = exercise ? EQUIPMENT_BY_ID[exercise.equipment[0]]?.emoji ?? "🏋️‍♀️" : "🏋️‍♀️";
  const inline = exercise?.image ? (window as unknown as { __COUNTER_IMAGES?: Record<string, string> }).__COUNTER_IMAGES?.[exercise.image] : undefined;
  const src = exercise?.image && !failed ? inline ?? `${import.meta.env.BASE_URL}exercises/${exercise.image}.webp` : null;
  return (
    <div className={cn("relative shrink-0 overflow-hidden illo-bg", sizes[size], className)}>
      {src ? (
        <img src={src} alt={exercise?.name ?? ""} loading="lazy" onError={() => setFailed(true)} className="h-full w-full object-cover" />
      ) : exercise && (size === "lg" || size === "xl") ? (
        <div className="grid h-full w-full place-items-center">
          <MuscleMap muscles={exercise.muscles} labels={false} className={size === "xl" ? "scale-110" : "scale-75"} />
          <span className="absolute bottom-2 right-2 text-2xl drop-shadow">{emoji}</span>
        </div>
      ) : (
        <div className={cn("grid h-full w-full place-items-center", size === "sm" ? "text-2xl" : size === "md" ? "text-3xl" : "text-6xl")}>{emoji}</div>
      )}
      {muscles && exercise && src && (
        <span className="absolute bottom-1.5 right-1.5 rounded-xl bg-white/85 p-0.5 shadow-sm backdrop-blur">
          <MuscleMap muscles={exercise.muscles} compact className={size === "xl" ? "h-14" : "h-9"} />
        </span>
      )}
    </div>
  );
}
