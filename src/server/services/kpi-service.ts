import { db } from "../data";
import type { KpiPeriod, Kpis } from "../domain/types";
import type { DateRange } from "../data/provider";

export function periodRange(p: KpiPeriod): DateRange {
  if (p.month === 0) return { from: `${p.year}-01-01`, to: `${p.year}-12-31` };
  const last = new Date(p.year, p.month, 0).getDate();
  const mm = String(p.month).padStart(2, "0");
  return { from: `${p.year}-${mm}-01`, to: `${p.year}-${mm}-${String(last).padStart(2, "0")}` };
}

export async function kpisFor(userId: string, period: KpiPeriod): Promise<Kpis> {
  const range = periodRange(period);
  const [target, turnoverRows, visits, projects] = await Promise.all([
    db().stats.target(userId, period.year, period.month),
    db().stats.turnover(userId, period.year, period.month),
    db().visits.listByUser(userId, range),
    db().projects.listByUser(userId),
  ]);
  const turnover = turnoverRows.reduce((a, r) => a + r.amount, 0);
  const targetAmount = target?.amount ?? 0;
  const inRange = (d?: string) => !!d && d.slice(0, 10) >= range.from && d.slice(0, 10) <= range.to;
  const newProjects = projects.filter((p) => inRange(p.createdAt));
  const closed = projects.filter((p) => p.status === "CLOSED" && inRange(p.closedAt));
  const won = closed.filter((p) => p.stage === "WON" || p.stage === "PARTIAL");
  return {
    target: targetAmount,
    turnover,
    coveragePct: targetAmount > 0 ? Math.round((turnover / targetAmount) * 100) : 0,
    uniqueDoctors: new Set(visits.map((v) => v.doctorId)).size,
    totalVisits: visits.length,
    doctorsWithNewProject: new Set(newProjects.map((p) => p.doctorId)).size,
    winRatePct: closed.length ? Math.round((won.length / closed.length) * 100) : 0,
    wonProjects: won.length,
    closedProjects: closed.length,
  };
}

export function defaultPeriod(): KpiPeriod {
  const d = new Date();
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}
