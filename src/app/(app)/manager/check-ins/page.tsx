import Link from "next/link";
import { Badge, Card, Empty, PageTitle } from "@/components/ui";
import { el } from "@/lib/i18n/el";
import { Select } from "@/components/select";
import { fmtDate, fmtDuration, fmtTime, todayIso } from "@/lib/format";
import { requireUser } from "@/server/auth/current-user";
import { listSalespeople } from "@/server/services/auth-service";
import { listCheckIns } from "@/server/services/checkin-service";
import { doctorFullName } from "@/server/services/customer-service";
import { kpisFor, defaultPeriod } from "@/server/services/kpi-service";
import { fmtEur, fmtPct } from "@/lib/format";

export const metadata = { title: el.managerArea.checkIns };

type SP = { from?: string; to?: string; user?: string };

export default async function CheckInsPage({ searchParams }: { searchParams: Promise<SP> }) {
  await requireUser(["MANAGER"]);
  const sp = await searchParams;
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const range = { from: sp.from || weekAgo.toISOString().slice(0, 10), to: sp.to || todayIso() };
  const salespeople = await listSalespeople();
  const rows = await listCheckIns(range, sp.user || undefined);
  const period = defaultPeriod();
  const team = await Promise.all(salespeople.map(async (u) => ({ user: u, kpis: await kpisFor(u.id, period) })));

  return (
    <div className="flex flex-col gap-4">
      <PageTitle>{el.managerArea.title}</PageTitle>

      <Card title={`${el.managerArea.team} · ${el.months[period.month - 1]} ${period.year}`}>
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>{el.managerArea.salesperson}</th>
                <th className="text-right">{el.kpis.target}</th>
                <th className="text-right">{el.kpis.turnover}</th>
                <th className="text-right">{el.kpis.coverage}</th>
                <th className="text-right">{el.kpis.totalVisits}</th>
                <th className="text-right">{el.kpis.uniqueDoctors}</th>
                <th className="text-right">{el.kpis.winRate}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {team.map(({ user, kpis }) => (
                <tr key={user.id}>
                  <td className="font-medium">{user.fullName}</td>
                  <td className="text-right tabular-nums">{fmtEur(kpis.target)}</td>
                  <td className="text-right tabular-nums">{fmtEur(kpis.turnover)}</td>
                  <td className="text-right tabular-nums">{fmtPct(kpis.coveragePct)}</td>
                  <td className="text-right tabular-nums">{kpis.totalVisits}</td>
                  <td className="text-right tabular-nums">{kpis.uniqueDoctors}</td>
                  <td className="text-right tabular-nums">{fmtPct(kpis.winRatePct)}</td>
                  <td>
                    <Link href={`/kpis?user=${user.id}`} className="text-brand-700 font-semibold hover:underline">
                      KPIs
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <h2 className="text-lg font-bold text-brand-800">{el.managerArea.checkIns}</h2>
      <form method="get" className="card p-4 grid grid-cols-2 md:grid-cols-[1fr_1fr_1fr_auto] gap-3 items-end">
        <label className="block">
          <span className="label">{el.daily.from}</span>
          <input type="date" name="from" defaultValue={range.from} className="input" />
        </label>
        <label className="block">
          <span className="label">{el.daily.to}</span>
          <input type="date" name="to" defaultValue={range.to} className="input" />
        </label>
        <label className="block col-span-2 md:col-span-1">
          <span className="label">{el.managerArea.salesperson}</span>
          <Select name="user" defaultValue={sp.user ?? ""} options={[{ value: "", label: el.app.all }, ...salespeople.map((u) => ({ value: u.id, label: u.fullName }))]} />
        </label>
        <button className="btn-primary col-span-2 md:col-span-1">{el.daily.apply}</button>
      </form>

      <div className="card overflow-x-auto">
        {rows.length === 0 ? (
          <Empty>{el.managerArea.empty}</Empty>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>{el.app.date}</th>
                <th>{el.managerArea.salesperson}</th>
                <th>{el.managerArea.doctor}</th>
                <th>{el.managerArea.arrivedAt}</th>
                <th>{el.managerArea.departedAt}</th>
                <th>{el.managerArea.duration}</th>
                <th>{el.managerArea.location}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="whitespace-nowrap">{fmtDate(r.arrivedAt)}</td>
                  <td>{r.user?.fullName ?? "—"}</td>
                  <td>
                    {r.doctor ? (
                      <Link href={`/customers/${r.doctor.id}`} className="hover:underline">
                        {doctorFullName(r.doctor)}
                      </Link>
                    ) : (
                      "—"
                    )}
                    {r.doctor?.city && <span className="block text-xs text-[var(--muted)]">{r.doctor.city}</span>}
                  </td>
                  <td className="tabular-nums">{fmtTime(r.arrivedAt)}</td>
                  <td className="tabular-nums">{r.departedAt ? fmtTime(r.departedAt) : <Badge tone="amber">{el.managerArea.inProgress}</Badge>}</td>
                  <td className="tabular-nums">{fmtDuration(r.arrivedAt, r.departedAt)}</td>
                  <td>
                    {r.arriveLat && r.arriveLng ? (
                      <a
                        href={`https://www.google.com/maps?q=${r.arriveLat.toFixed(5)},${r.arriveLng.toFixed(5)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-brand-700 font-semibold hover:underline whitespace-nowrap"
                      >
                        {el.managerArea.map} ↗
                      </a>
                    ) : (
                      <span className="text-[var(--muted)]">{el.managerArea.noLocation}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
