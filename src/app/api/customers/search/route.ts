import { NextResponse } from "next/server";
import { getSession } from "@/server/auth/session";
import { doctorFullName, searchDoctors } from "@/server/services/customer-service";

export const dynamic = "force-dynamic";

/** Live search for the customer screen: GET /api/customers/search?q=… → compact rows. */
export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const q = (new URL(req.url).searchParams.get("q") ?? "").trim();
  if (q.length < 2) return NextResponse.json({ results: [] });
  try {
    const rows = await searchDoctors({ q });
    return NextResponse.json({
      results: rows.map((d) => ({
        id: d.id,
        name: doctorFullName(d),
        mobile: d.mobile,
        address: [d.clinicAddress, d.city].filter(Boolean).join(", "),
        afm: d.afm,
      })),
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 502 });
  }
}
