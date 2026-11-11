import { db } from "../data";
import type { DateRange } from "../data/provider";
import type { DailyReport } from "../domain/types";

const today = () => new Date().toISOString().slice(0, 10);

export function defaultRange(): DateRange {
  const t = today();
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return { from: t, to: d.toISOString().slice(0, 10) };
}

/** Αναφορά Ημέρας for one salesperson – one SoftOne call (api.crm/dashboard). */
export function dailyReport(userId: string, range: DateRange): Promise<DailyReport> {
  return db().stats.dailyReport(userId, range);
}
