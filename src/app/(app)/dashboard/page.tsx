import Link from "next/link";
import { Suspense } from "react";
import { Card, Empty, PageTitle } from "@/components/ui";
import { el } from "@/lib/i18n/el";
import { Select } from "@/components/select";
import { DateRangeFields, FilterDialog } from "@/components/filter-dialog";
import { fmtDate } from "@/lib/format";
import { requireUser } from "@/server/auth/current-user";
import type { DailyReportItem } from "@/server/domain/types";
import { listSalespeople } from "@/server/services/auth-service";
import { dailyReport, defaultRange } from "@/server/services/dashboard-service";
import { MyDayLists } from "@/components/my-day-lists";
import { TimelineSearch } from "@/components/timeline-search";
import { TimelineFilterHiddenParams } from "@/components/timeline-filter-hidden-params";

export const metadata = { title: el.daily.title };

type SP = { from?: string; to?: string; user?: string };

export default async function DashboardPage({ searchParams }: { searchParams: Promise<SP> }) {
  const session = await requireUser();
  const sp = await searchParams;
  const def = defaultRange();
  const range = { from: sp.from || def.from, to: sp.to || def.to };
  const salespeople = session.role === "MANAGER" ? await listSalespeople() : [];
  const userId = session.role === "MANAGER" ? sp.user || salespeople[0]?.id || session.userId : session.userId;
  const report = await dailyReport(userId, range);
  const salesperson = session.role === "MANAGER" ? salespeople.find((u) => u.id === userId)?.fullName : undefined;
  const ownDay = userId === session.userId;
  // row actions return to this same report (range / salesperson kept)
  const qs = (() => {
    const p = new URLSearchParams(Object.entries(sp).filter((e): e is [string, string] => typeof e[1] === "string" && !!e[1]));
    const s = p.toString();
    return s ? `?${s}` : "";
  })();

  return (
    <div className="flex flex-col gap-4">
      <PageTitle
        right={
          <FilterDialog summary={[`${fmtDate(range.from)} – ${fmtDate(range.to)}`, salesperson].filter(Boolean).join(" · ")}>
            <Suspense fallback={null}>
              <TimelineFilterHiddenParams />
            </Suspense>
            <DateRangeFields from={range.from} to={range.to} />
            {session.role === "MANAGER" && (
              <label className="block">
                <span className="label">{el.daily.salespersonFilter}</span>
                <Select name="user" defaultValue={userId} options={salespeople.map((u) => ({ value: u.id, label: u.fullName }))} />
              </label>
            )}
          </FilterDialog>
        }
      >
        {el.daily.title}
      </PageTitle>

      {/* actionable list = the logged-in salesperson's own items (getPendings uses the session prsn); a manager looking
          at someone else's report gets the read-only cards only */}
      {ownDay && <MyDayLists session={session} back={`/dashboard${qs}`} />}

      <Suspense fallback={null}>
        <TimelineSearch filterFrom={range.from} filterTo={range.to} />
      </Suspense>

      <div className="grid gap-4 md:grid-cols-2">
        <Section title={el.daily.appointments} items={report.appointments} tone="blue" />
        <Section title={el.daily.offerFollowUps} items={report.offerFollowUps} tone="teal" />
        {/* overdue Εκκρεμότητες of someone else – one's own are in «Εκπρόθεσμες» above (incl. calls/meetings) */}
        {!ownDay && <Section title={el.daily.overdue} items={report.overdue} tone="red" />}
        <Section title={el.daily.pendingOffers} items={report.pendingOffers} tone="amber" />
      </div>
    </div>
  );
}

const toneDot: Record<string, string> = { blue: "bg-brand-500", teal: "bg-accent-500", red: "bg-danger-500", amber: "bg-warn-500" };

function Section({ title, items, tone }: { title: string; items: DailyReportItem[]; tone: string }) {
  return (
    <Card
      title={
        <span className="flex items-center gap-2">
          <span className={`inline-block w-2.5 h-2.5 rounded-full ${toneDot[tone]}`} />
          {title}
          <span className="ml-auto badge bg-gray-100 text-gray-700">{items.length}</span>
        </span>
      }
    >
      {items.length === 0 ? (
        <Empty>{el.daily.empty}</Empty>
      ) : (
        <ul className="divide-y divide-[var(--line)] -mx-1">
          {items.map((it, i) => (
            <li key={i}>
              <Link href={it.href} className="flex items-start gap-3 px-1 py-2.5 hover:bg-brand-50 rounded-lg">
                <span className="text-xs font-semibold tabular-nums text-[var(--muted)] mt-0.5 w-20 shrink-0">{fmtDate(it.date)}</span>
                <span className="min-w-0">
                  <span className="block font-medium truncate">{it.doctorName}</span>
                  {it.title && <span className="block text-sm text-[var(--muted)] truncate">{it.title}</span>}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
