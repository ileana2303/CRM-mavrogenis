import { el } from "@/lib/i18n/el";
import { KpiPage, type KpiSearch } from "./kpi-page";
import { SOON } from "@/lib/features";
import { ComingSoon } from "@/components/coming-soon";

export const metadata = { title: el.kpis.title };

export default async function KpisRoute({ searchParams }: { searchParams: Promise<KpiSearch> }) {
  if (SOON.kpis) return <ComingSoon title={metadata.title} />;
  return <KpiPage searchParams={await searchParams} backHref="/dashboard" />;
}
