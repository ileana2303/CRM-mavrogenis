import { Card } from "@/components/ui";
import { el } from "@/lib/i18n/el";
import { fmtEur, fmtPct } from "@/lib/format";
import type { KpiPeriod, Kpis } from "@/server/domain/types";
import type { User } from "@/server/domain/types";

export function PeriodForm({
  period,
  salespeople,
  selectedUser,
  years,
}: {
  period: KpiPeriod;
  salespeople?: User[];
  selectedUser?: string;
  years: number[];
}) {
  return (
    <form method="get" className="card p-4 grid grid-cols-2 md:grid-cols-[auto_1fr_1fr_1fr_auto] gap-3 items-end">
      <p className="col-span-2 md:col-span-1 text-sm font-semibold text-[var(--muted)] md:self-center">{el.kpis.period}</p>
      <label className="block">
        <span className="label">{el.kpis.year}</span>
        <select name="year" defaultValue={period.year} className="input">
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="label">{el.kpis.month}</span>
        <select name="month" defaultValue={period.month} className="input">
          <option value={0}>{el.kpis.wholeYear}</option>
          {el.months.map((m, i) => (
            <option key={m} value={i + 1}>
              {m}
            </option>
          ))}
        </select>
      </label>
      {salespeople && salespeople.length > 0 ? (
        <label className="block col-span-2 md:col-span-1">
          <span className="label">{el.kpis.salesperson}</span>
          <select name="user" defaultValue={selectedUser} className="input">
            {salespeople.map((u) => (
              <option key={u.id} value={u.id}>
                {u.fullName}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <div className="hidden md:block" />
      )}
      <button className="btn-primary col-span-2 md:col-span-1">{el.daily.apply}</button>
    </form>
  );
}

export function KpiGrid({ kpis }: { kpis: Kpis }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card title={el.kpis.financial}>
        <div className="grid grid-cols-3 gap-3">
          <Kpi label={el.kpis.target} value={fmtEur(kpis.target)} />
          <Kpi label={el.kpis.turnover} value={fmtEur(kpis.turnover)} />
          <Kpi label={el.kpis.coverage} value={fmtPct(kpis.coveragePct)} sub={el.kpis.coverageSub} highlight={kpis.coveragePct >= 100 ? "ok" : kpis.coveragePct >= 70 ? "warn" : "bad"} />
        </div>
        <div className="mt-4 h-2 rounded-full bg-brand-100 overflow-hidden">
          <div className={`h-full ${kpis.coveragePct >= 100 ? "bg-ok-500" : kpis.coveragePct >= 70 ? "bg-warn-500" : "bg-danger-500"}`} style={{ width: `${Math.min(100, kpis.coveragePct)}%` }} />
        </div>
      </Card>
      <Card title={el.kpis.activity}>
        <div className="grid grid-cols-2 gap-3">
          <Kpi label={el.kpis.uniqueDoctors} value={String(kpis.uniqueDoctors)} sub={el.kpis.inPeriod} />
          <Kpi label={el.kpis.totalVisits} value={String(kpis.totalVisits)} sub={el.kpis.inPeriod} />
          <Kpi label={el.kpis.doctorsPerOpportunity} value={String(kpis.doctorsWithNewProject)} sub={el.kpis.withNewProject} />
          <Kpi label={el.kpis.winRate} value={fmtPct(kpis.winRatePct)} sub={`${el.kpis.wonClosed} (${kpis.wonProjects}/${kpis.closedProjects})`} />
        </div>
      </Card>
    </div>
  );
}

function Kpi({ label, value, sub, highlight }: { label: string; value: string; sub?: string; highlight?: "ok" | "warn" | "bad" }) {
  const color = highlight === "ok" ? "text-ok-500" : highlight === "warn" ? "text-warn-500" : highlight === "bad" ? "text-danger-600" : "text-brand-800";
  return (
    <div className="rounded-xl bg-brand-50/60 p-3">
      <div className="text-xs text-[var(--muted)]">{label}</div>
      <div className={`text-2xl md:text-3xl font-bold tabular-nums leading-tight ${color}`}>{value}</div>
      {sub && <div className="text-[11px] text-[var(--muted)]">{sub}</div>}
    </div>
  );
}
