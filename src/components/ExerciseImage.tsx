import { useState } from "react";
import type { Exercise } from "@/lib/types";
import { EQUIPMENT_BY_ID } from "@/data/equipment";
import { cn } from "@/lib/utils";

export function ExerciseImage({ exercise, className, size = "md" }: { exercise?: Exercise; className?: string; size?: "sm" | "md" | "lg" | "xl" }) {
  const [failed, setFailed] = useState(false);
  const sizes = { sm: "h-14 w-14 rounded-xl", md: "h-20 w-20 rounded-2xl", lg: "h-36 w-36 rounded-3xl", xl: "aspect-square w-full rounded-3xl" };
  const emoji = exercise ? EQUIPMENT_BY_ID[exercise.equipment[0]]?.emoji ?? "🏋️‍♀️" : "🏋️‍♀️";
  const inline = exercise?.image ? (window as unknown as { __COUNTER_IMAGES?: Record<string, string> }).__COUNTER_IMAGES?.[exercise.image] : undefined;
  const src = exercise?.image && !failed ? inline ?? `${import.meta.env.BASE_URL}exercises/${exercise.image}.webp` : null;
  return (
    <div className={cn("shrink-0 overflow-hidden bg-[#F6EFE6]", sizes[size], className)}>
      {src ? (
        <img src={src} alt={exercise?.name ?? ""} loading="lazy" onError={() => setFailed(true)} className="h-full w-full object-cover" />
      ) : (
        <div className={cn("grid h-full w-full place-items-center", size === "sm" ? "text-2xl" : size === "md" ? "text-3xl" : "text-6xl")}>{emoji}</div>
      )}
    </div>
  );
}
