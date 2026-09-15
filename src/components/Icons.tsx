import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement> & { size?: number };
const base = (size = 22) => ({ width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const });

export const IconHome = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><path d="M3 11.5 12 4l9 7.5" /><path d="M5.5 10v9.5h13V10" /><path d="M10 19.5v-5h4v5" /></svg>
);
export const IconSheet = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><rect x="4" y="3" width="16" height="18" rx="2.5" /><path d="M8 8h8M8 12h8M8 16h5" /></svg>
);
export const IconDumbbell = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><path d="M2.5 10v4M21.5 10v4" /><rect x="4" y="7.5" width="3.5" height="9" rx="1" /><rect x="16.5" y="7.5" width="3.5" height="9" rx="1" /><path d="M7.5 12h9" /></svg>
);
export const IconChart = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><path d="M4 20h16" /><path d="M6 16l4-5 3.5 3L19 7" /><circle cx="19" cy="7" r="1.6" fill="currentColor" stroke="none" /></svg>
);
export const IconUser = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><circle cx="12" cy="8" r="4" /><path d="M4.5 20.5c1.2-3.6 4-5.5 7.5-5.5s6.3 1.9 7.5 5.5" /></svg>
);
export const IconTimer = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><circle cx="12" cy="13.5" r="7.5" /><path d="M12 9.5v4.5l3 1.5" /><path d="M9.5 2.5h5" /><path d="M12 2.5V5" /></svg>
);
export const IconCamera = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><path d="M4 8.5A2.5 2.5 0 0 1 6.5 6H8l1.5-2h5L16 6h1.5A2.5 2.5 0 0 1 20 8.5v8A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5z" /><circle cx="12" cy="12.5" r="3.5" /></svg>
);
export const IconImage = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><rect x="3.5" y="5" width="17" height="14" rx="2.5" /><circle cx="9" cy="10" r="1.6" /><path d="m6 18 4.5-5 3.5 3.5 2-2L20 18" /></svg>
);
export const IconPlus = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p} strokeWidth={2.5}><path d="M12 5v14M5 12h14" /></svg>
);
export const IconBack = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p} strokeWidth={2.5}><path d="M15 5l-7 7 7 7" /></svg>
);
export const IconNext = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p} strokeWidth={2.5}><path d="M9 5l7 7-7 7" /></svg>
);
export const IconClose = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p} strokeWidth={2.5}><path d="M6 6l12 12M18 6 6 18" /></svg>
);
export const IconCheck = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p} strokeWidth={3}><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>
);
export const IconStar = ({ size, filled, ...p }: P & { filled?: boolean }) => (
  <svg {...base(size)} {...p} fill={filled ? "currentColor" : "none"}><path d="m12 3.5 2.6 5.4 5.9.8-4.3 4.1 1.1 5.9L12 16.9l-5.3 2.8 1.1-5.9-4.3-4.1 5.9-.8z" /></svg>
);
export const IconFlame = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><path d="M12 3s1 3 3.5 5.5S19 13 19 15a7 7 0 0 1-14 0c0-2.2 1-4 2.5-5.5 0 2 1 3 2 3.5C9 10 10 6 12 3z" /><path d="M12 21a3 3 0 0 0 3-3c0-1.5-1-2.5-1.5-3.5-.5 1-1.5 1.3-1.5 1.3S10.5 14.5 10 13c-.7 1-1 2-1 3a3 3 0 0 0 3 3z" fill="currentColor" stroke="none" opacity=".35" /></svg>
);
export const IconTrophy = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><path d="M8 4h8v5a4 4 0 0 1-8 0z" /><path d="M8 6H5a3 3 0 0 0 3 3M16 6h3a3 3 0 0 1-3 3" /><path d="M12 13v3M9 20h6M10 16h4v4h-4z" /></svg>
);
export const IconPlay = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p} fill="currentColor" stroke="none"><path d="M7 5.5v13a1 1 0 0 0 1.5.9l10-6.5a1 1 0 0 0 0-1.7l-10-6.5A1 1 0 0 0 7 5.5z" /></svg>
);
export const IconEdit = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><path d="M4 20h4l11-11a2.1 2.1 0 0 0-3-3L5 17z" /><path d="m13.5 7.5 3 3" /></svg>
);
export const IconCopy = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" /></svg>
);
export const IconTrash = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13" /></svg>
);
export const IconZoom = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4.2-4.2M11 8.5v5M8.5 11h5" /></svg>
);
export const IconCalendar = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><rect x="3.5" y="5" width="17" height="15.5" rx="2.5" /><path d="M3.5 10h17M8 3v4M16 3v4" /></svg>
);
export const IconBody = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><circle cx="12" cy="4.5" r="2" /><path d="M8 9.5h8l-1 6h-6zM9 15.5 8 21M15 15.5 16 21M8 9.5 5.5 14M16 9.5l2.5 4.5" /></svg>
);
export const IconSpark = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8" /></svg>
);
