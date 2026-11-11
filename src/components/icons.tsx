import type { SVGProps } from "react";

/** Minimal stroke icon set (24×24, 1.75 stroke) so the UI does not depend on emoji rendering. */
type P = SVGProps<SVGSVGElement> & { size?: number };

function I({ size = 22, children, ...rest }: P & { children: React.ReactNode }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden {...rest}>
      {children}
    </svg>
  );
}

export const Icon = {
  calendar: (p: P) => (
    <I {...p}>
      <rect x="3" y="4.5" width="18" height="16" rx="3" />
      <path d="M3 9.5h18M8 2.5v4M16 2.5v4" />
    </I>
  ),
  search: (p: P) => (
    <I {...p}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m20 20-4.2-4.2" />
    </I>
  ),
  folder: (p: P) => (
    <I {...p}>
      <path d="M3 7.5a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    </I>
  ),
  trending: (p: P) => (
    <I {...p}>
      <path d="M3 17l6-6 4 4 8-8" />
      <path d="M15 7h6v6" />
    </I>
  ),
  users: (p: P) => (
    <I {...p}>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M21.5 20a6.5 6.5 0 0 0-4.5-6.2" />
    </I>
  ),
  inbox: (p: P) => (
    <I {...p}>
      <path d="M3 13h5l1.5 2.5h5L16 13h5" />
      <path d="M5 5h14l2 8v6H3v-6z" />
    </I>
  ),
  stethoscope: (p: P) => (
    <I {...p}>
      <path d="M6 3v6a5 5 0 0 0 10 0V3" />
      <path d="M11 14v2.5a4.5 4.5 0 0 0 9 0V13" />
      <circle cx="20" cy="10.5" r="2" />
    </I>
  ),
  pen: (p: P) => (
    <I {...p}>
      <path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17z" />
      <path d="M13.5 8.5l3 3" />
    </I>
  ),
  briefcase: (p: P) => (
    <I {...p}>
      <rect x="3" y="7.5" width="18" height="12.5" rx="2.5" />
      <path d="M9 7.5V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2.5M3 13h18" />
    </I>
  ),
  file: (p: P) => (
    <I {...p}>
      <path d="M7 3h7l5 5v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
      <path d="M14 3v5h5M9 13h6M9 17h6" />
    </I>
  ),
  chart: (p: P) => (
    <I {...p}>
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
    </I>
  ),
  alarm: (p: P) => (
    <I {...p}>
      <circle cx="12" cy="13" r="7.5" />
      <path d="M12 9v4l2.5 2M5 4 3 6M19 4l2 2" />
    </I>
  ),
  wrench: (p: P) => (
    <I {...p}>
      <path d="M14.5 6.5a4 4 0 0 0 5.2 5.2L13 18.4a2.1 2.1 0 0 1-3-3l6.7-6.7A4 4 0 0 0 14.5 6.5z" />
    </I>
  ),
  logout: (p: P) => (
    <I {...p}>
      <path d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4M15 8l4 4-4 4M19 12H9" />
    </I>
  ),
  chevronsLeft: (p: P) => (
    <I {...p}>
      <path d="m11 17-5-5 5-5M18 17l-5-5 5-5" />
    </I>
  ),
  chevronsRight: (p: P) => (
    <I {...p}>
      <path d="m13 17 5-5-5-5M6 17l5-5-5-5" />
    </I>
  ),
  clipboard: (p: P) => (
    <I {...p}>
      <rect x="5" y="4.5" width="14" height="17" rx="2.5" />
      <path d="M9 4.5V3h6v1.5M9 10h6M9 14h6M9 18h3" />
    </I>
  ),
  chevronDown: (p: P) => (
    <I {...p}>
      <path d="m6 9 6 6 6-6" />
    </I>
  ),
  check: (p: P) => (
    <I {...p}>
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </I>
  ),
  plus: (p: P) => (
    <I {...p}>
      <path d="M12 5v14M5 12h14" />
    </I>
  ),
  mapPin: (p: P) => (
    <I {...p}>
      <path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </I>
  ),
  filter: (p: P) => (
    <I {...p}>
      <path d="M4 6h16M7 12h10M10 18h4" />
    </I>
  ),
  x: (p: P) => (
    <I {...p}>
      <path d="M6 6l12 12M18 6 6 18" />
    </I>
  ),
};

export type IconName = keyof typeof Icon;
