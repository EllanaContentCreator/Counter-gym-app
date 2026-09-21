import { useState } from "react";
import type { Exercise } from "@/lib/types";
import { EQUIPMENT_BY_ID } from "@/data/equipment";
import { cn } from "@/lib/utils";
import { MuscleMap } from "./MuscleMap";

type Size = "sm" | "md" | "lg" | "xl";

const TILE: Record<Size, string> = {
  sm: "h-14 w-14 rounded-xl",
  md: "h-20 w-20 rounded-2xl",
  lg: "h-36 w-36 rounded-3xl",
  xl: "aspect-square w-full rounded-3xl",
};

/**
 * The compact muscle figure is a fixed 64px tall, so it is scaled up or down to
 * suit each tile rather than given a competing height class.
 */
const FIGURE_SCALE: Record<Size, string> = {
  sm: "scale-[0.7]",
  md: "scale-105",
  lg: "scale-[2.1]",
  xl: "scale-[3.6]",
};

const CHIP: Record<Size, string> = {
  sm: "h-5 w-5 bottom-0.5 right-0.5 text-[11px]",
  md: "h-6 w-6 bottom-1 right-1 text-sm",
  lg: "h-9 w-9 bottom-2 right-2 text-xl",
  xl: "h-11 w-11 bottom-2.5 right-2.5 text-2xl",
};

/**
 * Exercise thumbnail.
 *
 * An exercise with a drawn illustration shows it. Anything without one — a move
 * scanned in from one of Carolyn's sheets, or a library entry not yet drawn —
 * falls back to its muscle diagram instead of a bare equipment emoji, so no card
 * ever reads as blank and every tile shows a real graphic.
 */
export function ExerciseImage({
  exercise,
  className,
  size = "md",
  muscles,
}: {
  exercise?: Exercise;
  className?: string;
  size?: Size;
  /** overlay a small muscle-map badge on top of a drawn illustration */
  muscles?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const emoji = exercise ? EQUIPMENT_BY_ID[exercise.equipment[0]]?.emoji ?? "🏋️" : "🏋️";
  const inline = exercise?.image
    ? (window as unknown as { __COUNTER_IMAGES?: Record<string, string> }).__COUNTER_IMAGES?.[exercise.image]
    : undefined;
  const src = exercise?.image && !failed ? inline ?? `${import.meta.env.BASE_URL}exercises/${exercise.image}.webp` : null;

  return (
    <div className={cn("relative shrink-0 overflow-hidden illo-bg", TILE[size], className)}>
      {src ? (
        <img
          src={src}
          alt={exercise?.name ?? ""}
          loading="lazy"
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
        />
      ) : exercise ? (
        <div className="grid h-full w-full place-items-center">
          <MuscleMap muscles={exercise.muscles} compact className={FIGURE_SCALE[size]} />
        </div>
      ) : (
        <div className="grid h-full w-full place-items-center text-2xl">{emoji}</div>
      )}

      {/* On the diagram fallback, a corner chip still says what you pick up. */}
      {exercise && !src && size !== "sm" && (
        <span
          aria-hidden="true"
          className={cn("absolute grid place-items-center rounded-full bg-white/90 shadow-sm backdrop-blur", CHIP[size])}
        >
          {emoji}
        </span>
      )}

      {muscles && exercise && src && (
        <span className="absolute bottom-1.5 right-1.5 rounded-xl bg-white/85 p-0.5 shadow-sm backdrop-blur">
          <MuscleMap muscles={exercise.muscles} compact className={size === "xl" ? "h-14" : "h-9"} />
        </span>
      )}
    </div>
  );
}
