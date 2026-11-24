import { NextResponse } from "next/server";
import { getSession } from "@/server/auth/session";
import { searchTimeline, timelineSearchDocument } from "@/server/services/timeline-search-service";

export const dynamic = "force-dynamic";

/**
 * Dashboard timeline search.
 * List: GET ?q1=&q2=&page=1
 * Detail (documents): GET ?unit=emporiko&findoc=36294
 */
export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const sp = new URL(req.url).searchParams;
  const unit = sp.get("unit");
  const findoc = sp.get("findoc");

  if (unit === "emporiko" && findoc && /^\d+$/.test(findoc)) {
    try {
      const row = await timelineSearchDocument(findoc);
      if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });
      return NextResponse.json({ row });
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 502 });
    }
  }

  const q1 = (sp.get("q1") ?? "").trim();
  const q2 = (sp.get("q2") ?? "").trim();
  if (q1.length < 2 && q2.length < 2) {
    return NextResponse.json({ rows: [], page: 1, pageSize: 30, totalCount: 0 });
  }

  const page = Math.max(1, Number(sp.get("page") ?? 1) || 1);
  const dateFrom = (sp.get("dateFrom") ?? "").trim() || undefined;
  const dateTo = (sp.get("dateTo") ?? "").trim() || undefined;
  try {
    const result = await searchTimeline({ q1: q1 || undefined, q2: q2 || undefined, dateFrom, dateTo, page });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 502 });
  }
}