import { athensDatePlus, athensToday } from "@/lib/athens";
import { db } from "../data";
import type { DateRange } from "../data/provider";
import type { DailyReport } from "../domain/types";

export function defaultRange(): DateRange {
  return { from: athensToday(), to: athensDatePlus(7) };
}

/** Αναφορά Ημέρας for one salesperson – one SoftOne call (api.crm/dashboard). */
export function dailyReport(userId: string, range: DateRange): Promise<DailyReport> {
  return db().stats.dailyReport(userId, range);
}
