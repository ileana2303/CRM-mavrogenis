/**
 * Greek local time. SoftOne stores and returns Europe/Athens wall-clock times with no zone ("2026-11-16 23:10:05"),
 * and the app runs on servers in UTC (Vercel) – so every conversion goes through here, DST included.
 * Pure (Intl only): safe on the server and in the browser.
 */

export const TZ = "Europe/Athens";

const partsFmt = new Intl.DateTimeFormat("en-GB", {
  timeZone: TZ,
  hour12: false,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

function athensParts(t: number) {
  const p = partsFmt.formatToParts(new Date(t));
  const g = (k: string) => +(p.find((x) => x.type === k)?.value ?? 0);
  return { y: g("year"), mo: g("month"), d: g("day"), h: g("hour") % 24, mi: g("minute"), s: g("second") };
}

/** Athens wall-clock → the real instant as an ISO string (UTC). */
export function athensToIso(y: number, mo: number, d: number, h = 0, mi = 0, s = 0): string {
  const wall = Date.UTC(y, mo - 1, d, h, mi, s);
  const offset = (t: number) => {
    const a = athensParts(t);
    return Date.UTC(a.y, a.mo - 1, a.d, a.h, a.mi, a.s) - t;
  };
  // two passes settle the offset across a DST switch
  let t = wall - offset(wall);
  t = wall - offset(t);
  return new Date(t).toISOString();
}

/** "yyyy-mm-dd" of an instant in Athens. */
export function athensDate(at: Date | number = Date.now()): string {
  const a = athensParts(typeof at === "number" ? at : at.getTime());
  return `${a.y}-${String(a.mo).padStart(2, "0")}-${String(a.d).padStart(2, "0")}`;
}

/** Today in Athens, "yyyy-mm-dd" (not the UTC date: 00:00–03:00 Athens is still yesterday in UTC). */
export const athensToday = () => athensDate();

/** Athens date `days` from today, "yyyy-mm-dd". */
export function athensDatePlus(days: number): string {
  const [y, m, d] = athensToday().split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}
