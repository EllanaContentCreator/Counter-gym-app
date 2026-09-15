import type { MuscleGroup } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Anatomical diagram: front and back silhouettes with the exercise's muscle groups lit up.
 * Primary muscle (first in the list) is full strength, the rest are secondary.
 */
type Region =
  | "delts" | "chest" | "biceps" | "abs" | "obliques" | "quads" | "shins"
  | "traps" | "lats" | "lowback" | "triceps" | "glutes" | "hams" | "calves";

const FRONT: Region[] = ["delts", "chest", "biceps", "abs", "obliques", "quads", "shins"];
const BACK: Region[] = ["delts", "traps", "lats", "lowback", "triceps", "glutes", "hams", "calves"];

const MAP: Record<MuscleGroup, Partial<Record<Region, number>>> = {
  legs: { quads: 1, hams: 1, glutes: 0.7, calves: 0.5 },
  glutes: { glutes: 1, hams: 0.35 },
  hamstrings: { hams: 1, glutes: 0.4 },
  quads: { quads: 1 },
  calves: { calves: 1, shins: 0.3 },
  back: { traps: 1, lats: 1, lowback: 0.8 },
  lats: { lats: 1, traps: 0.4 },
  chest: { chest: 1, delts: 0.3 },
  shoulders: { delts: 1, traps: 0.35 },
  biceps: { biceps: 1 },
  triceps: { triceps: 1 },
  core: { abs: 1, obliques: 0.7, lowback: 0.5 },
  obliques: { obliques: 1, abs: 0.5 },
  "full-body": { delts: 0.7, chest: 0.6, biceps: 0.6, abs: 0.7, obliques: 0.5, quads: 0.8, traps: 0.6, lats: 0.7, lowback: 0.6, triceps: 0.6, glutes: 0.8, hams: 0.8, calves: 0.5 },
  cardio: { quads: 0.5, hams: 0.5, calves: 0.6, glutes: 0.4, abs: 0.3, delts: 0.3 },
};

export function regionWeights(muscles: MuscleGroup[]) {
  const w: Partial<Record<Region, number>> = {};
  muscles.forEach((m, i) => {
    const scale = i === 0 ? 1 : 0.55;
    for (const [r, v] of Object.entries(MAP[m] ?? {}) as [Region, number][]) w[r] = Math.max(w[r] ?? 0, v * scale);
  });
  return w;
}

function Base({ back }: { back?: boolean }) {
  const fill = "#e6e0f7";
  const stroke = "#cdc3ec";
  const limb = { stroke: fill, strokeLinecap: "round" as const, fill: "none" };
  return (
    <g>
      <circle cx="50" cy="15" r="10.5" fill={fill} stroke={stroke} strokeWidth="1" />
      <rect x="45.5" y="24" width="9" height="8" rx="2" fill={fill} />
      <path d="M28 34 C36 29 64 29 72 34 L74 54 C74 66 70 72 67 80 L68 92 C66 100 60 103 50 103 C40 103 34 100 32 92 L33 80 C30 72 26 66 26 54 Z" fill={fill} stroke={stroke} strokeWidth="1" />
      {/* arms */}
      <line x1="27" y1="40" x2="18" y2="70" strokeWidth="11" {...limb} />
      <line x1="73" y1="40" x2="82" y2="70" strokeWidth="11" {...limb} />
      <line x1="18" y1="70" x2="13" y2="98" strokeWidth="9" {...limb} />
      <line x1="82" y1="70" x2="87" y2="98" strokeWidth="9" {...limb} />
      <circle cx="12" cy="103" r="4.5" fill={fill} />
      <circle cx="88" cy="103" r="4.5" fill={fill} />
      {/* legs */}
      <line x1="41" y1="102" x2="38" y2="140" strokeWidth="15" {...limb} />
      <line x1="59" y1="102" x2="62" y2="140" strokeWidth="15" {...limb} />
      <line x1="38" y1="140" x2="36" y2="178" strokeWidth="11" {...limb} />
      <line x1="62" y1="140" x2="64" y2="178" strokeWidth="11" {...limb} />
      <ellipse cx={back ? 36 : 34} cy="183" rx="6.5" ry="3.5" fill={fill} />
      <ellipse cx={back ? 64 : 66} cy="183" rx="6.5" ry="3.5" fill={fill} />
      {/* subtle midline */}
      {!back && <path d="M50 34 V100" stroke="#fff" strokeOpacity="0.5" strokeWidth="0.8" />}
      {back && <path d="M50 34 V100" stroke="#cdc3ec" strokeOpacity="0.7" strokeWidth="0.8" />}
    </g>
  );
}

function Shapes({ region, back }: { region: Region; back: boolean }) {
  const s = { strokeLinecap: "round" as const, fill: "none" };
  switch (region) {
    case "delts":
      return <><circle cx="28" cy="40" r="7" /><circle cx="72" cy="40" r="7" /></>;
    case "chest":
      return <><path d="M33 38 C40 35 48 35 49 37 L49 56 C42 58 35 54 33 48 Z" /><path d="M67 38 C60 35 52 35 51 37 L51 56 C58 58 65 54 67 48 Z" /></>;
    case "biceps":
    case "triceps":
      return <><line x1="26.5" y1="44" x2="20" y2="65" strokeWidth="8" {...s} stroke="inherit" /><line x1="73.5" y1="44" x2="80" y2="65" strokeWidth="8" {...s} /></>;
    case "abs":
      return <rect x="43" y="59" width="14" height="30" rx="4" />;
    case "obliques":
      return <><path d="M34 58 L41 60 L41 88 L36 84 L33 72 Z" /><path d="M66 58 L59 60 L59 88 L64 84 L67 72 Z" /></>;
    case "quads":
    case "hams":
      return <><line x1="42" y1="106" x2="39" y2="136" strokeWidth="11" {...s} /><line x1="58" y1="106" x2="61" y2="136" strokeWidth="11" {...s} /></>;
    case "shins":
      return <><line x1="38" y1="144" x2="36.5" y2="172" strokeWidth="6" {...s} /><line x1="62" y1="144" x2="63.5" y2="172" strokeWidth="6" {...s} /></>;
    case "calves":
      return <><line x1="38" y1="144" x2="36.5" y2="170" strokeWidth="8" {...s} /><line x1="62" y1="144" x2="63.5" y2="170" strokeWidth="8" {...s} /></>;
    case "traps":
      return <path d="M35 36 L65 36 L60 52 L50 57 L40 52 Z" />;
    case "lats":
      return <><path d="M30 46 L40 52 L43 78 L36 84 L31 66 Z" /><path d="M70 46 L60 52 L57 78 L64 84 L69 66 Z" /></>;
    case "lowback":
      return <rect x="44" y="60" width="12" height="27" rx="4" />;
    case "glutes":
      return <><ellipse cx="42" cy="95" rx="9" ry="7.5" /><ellipse cx="58" cy="95" rx="9" ry="7.5" /></>;
    default:
      return null;
  }
  void back;
}

function Figure({ back, weights, uid }: { back: boolean; weights: Partial<Record<Region, number>>; uid: string }) {
  const regions = (back ? BACK : FRONT).filter((r) => (weights[r] ?? 0) > 0);
  return (
    <svg viewBox="0 0 100 200" className="h-full w-auto" aria-hidden>
      <defs>
        <linearGradient id={`mm-g-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fb7185" />
          <stop offset="1" stopColor="#c026d3" />
        </linearGradient>
        <filter id={`mm-glow-${uid}`} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="2.2" />
        </filter>
      </defs>
      <Base back={back} />
      {regions.map((r) => (
        <g key={r + "-glow"} opacity={(weights[r] ?? 0) * 0.55} fill="#ec4899" stroke="#ec4899" filter={`url(#mm-glow-${uid})`}>
          <Shapes region={r} back={back} />
        </g>
      ))}
      {regions.map((r) => (
        <g key={r} opacity={0.35 + (weights[r] ?? 0) * 0.65} fill={`url(#mm-g-${uid})`} stroke={`url(#mm-g-${uid})`}>
          <Shapes region={r} back={back} />
        </g>
      ))}
      {/* muscle detail lines */}
      {!back && (weights.abs ?? 0) > 0 && <path d="M43 69 H57 M43 79 H57" stroke="#fff" strokeOpacity="0.55" strokeWidth="0.9" />}
      {back && (weights.traps ?? 0) > 0 && <path d="M50 38 V55" stroke="#fff" strokeOpacity="0.5" strokeWidth="0.9" />}
    </svg>
  );
}

let counter = 0;

export function MuscleMap({ muscles, className, compact, labels = true }: { muscles: MuscleGroup[]; className?: string; compact?: boolean; labels?: boolean }) {
  const weights = regionWeights(muscles);
  const uid = String(++counter % 1000);
  const frontScore = FRONT.reduce((a, r) => a + (weights[r] ?? 0), 0);
  const backScore = BACK.reduce((a, r) => a + (weights[r] ?? 0), 0);
  if (compact) {
    return (
      <div className={cn("h-16", className)}>
        <Figure back={backScore > frontScore} weights={weights} uid={uid} />
      </div>
    );
  }
  return (
    <div className={cn("flex items-end justify-center gap-6", className)}>
      <div className="flex flex-col items-center">
        <div className="h-52"><Figure back={false} weights={weights} uid={uid + "f"} /></div>
        {labels && <span className="mt-1 text-[10px] font-extrabold uppercase tracking-widest text-ink-mute">Front</span>}
      </div>
      <div className="flex flex-col items-center">
        <div className="h-52"><Figure back weights={weights} uid={uid + "b"} /></div>
        {labels && <span className="mt-1 text-[10px] font-extrabold uppercase tracking-widest text-ink-mute">Back</span>}
      </div>
    </div>
  );
}
