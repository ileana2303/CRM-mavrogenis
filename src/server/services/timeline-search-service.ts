import { db } from "../data";
import type { TimelineSearchHit, TimelineSearchPage } from "../domain/types";
import type { TimelineSearchQuery } from "../data/provider";

/** List rows from CRM_TIMELINE search (fast: no line items). */
export function searchTimeline(params: {
  q1?: string;
  q2?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}): Promise<TimelineSearchPage> {
  return db().projects.search({
    q1: params.q1,
    q2: params.q2,
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
    page: params.page ?? 1,
    pageSize: params.pageSize ?? 30,
    withItems: false,
  });
}

/** One sales document with line items (FINDOC). */
export async function timelineSearchDocument(findoc: string): Promise<TimelineSearchHit | null> {
  const page = await db().projects.search({
    findoc: Number(findoc),
    withItems: true,
    page: 1,
    pageSize: 1,
    unit: "emporiko",
  });
  return page.rows[0] ?? null;
}