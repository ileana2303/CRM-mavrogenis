import { BackLink, PageTitle } from "@/components/ui";
import { KpiGrid, PeriodForm } from "@/components/kpi-view";
import { el } from "@/lib/i18n/el";
import { requireUser } from "@/server/auth/current-user";
import { listSalespeople } from "@/server/services/auth-service";
import { defaultPeriod, kpisFor } from "@/server/services/kpi-service";

export type KpiSearch = { year?: string; month?: string; user?: string };

/** Shared by /kpis and /customers/[id]/kpis (slide 22). */
export async function KpiPage({ searchParams, backHref, subtitle }: { searchParams: KpiSearch; backHref: string; subtitle?: React.ReactNode }) {
  const session = await requireUser();
  const def = defaultPeriod();
  const period = {
    year: Number(searchParams.year) || def.year,
    month: searchParams.month === undefined || searchParams.month === "" ? def.month : Number(searchParams.month) || 0,
  };
  const salespeople = session.role === "MANAGER" ? await listSalespeople() : undefined;
  const userId = salespeople ? searchParams.user || salespeople[0]?.id || session.userId : session.userId;
  const kpis = await kpisFor(userId, period);
  const years = [def.year - 2, def.year - 1, def.year];
  const who = salespeople?.find((u) => u.id === userId)?.fullName ?? session.fullName;

  return (
    <div className="flex flex-col gap-4">
      <BackLink href={backHref} />
      <PageTitle>{el.kpis.title}</PageTitle>
      <p className="text-sm text-[var(--muted)] -mt-2">
        {el.kpis.salesperson}: <span className="font-semibold text-[var(--text)]">{who}</span>
        {subtitle}
      </p>
      <PeriodForm period={period} salespeople={salespeople} selectedUser={userId} years={years} />
      <KpiGrid kpis={kpis} />
    </div>
  );
}
