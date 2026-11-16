import { TZ, athensToday } from "./athens";

const eur = new Intl.NumberFormat("el-GR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const eur2 = new Intl.NumberFormat("el-GR", { style: "currency", currency: "EUR", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const num = new Intl.NumberFormat("el-GR", { maximumFractionDigits: 2 });

export function fmtEur(v: number | null | undefined, cents = false) {
  if (v === null || v === undefined || Number.isNaN(v)) return "—";
  return cents ? eur2.format(v) : eur.format(v);
}

export function fmtNum(v: number | null | undefined) {
  if (v === null || v === undefined || Number.isNaN(v)) return "—";
  return num.format(v);
}

export function fmtPct(v: number | null | undefined) {
  if (v === null || v === undefined || Number.isNaN(v)) return "—";
  return `${num.format(v)}%`;
}

/** ISO instant or plain "yyyy-mm-dd" → ΗΗ/ΜΜ/ΕΕΕΕ, always as in Athens (servers run in UTC). */
export function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  const plain = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (plain) return `${plain[3]}/${plain[2]}/${plain[1]}`; // a calendar date: no zone to convert
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("el-GR", { timeZone: TZ, day: "2-digit", month: "2-digit", year: "numeric" });
}

export function fmtTime(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleTimeString("el-GR", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
}

export function fmtDateTime(iso: string | null | undefined) {
  if (!iso) return "—";
  return `${fmtDate(iso)} ${fmtTime(iso)}`;
}

export function fmtDuration(fromIso: string, toIso?: string) {
  if (!toIso) return "—";
  const mins = Math.round((new Date(toIso).getTime() - new Date(fromIso).getTime()) / 60000);
  if (mins < 60) return `${mins} λ.`;
  return `${Math.floor(mins / 60)} ώ. ${mins % 60} λ.`;
}

/** Today in Athens, "yyyy-mm-dd" */
export const todayIso = () => athensToday();
