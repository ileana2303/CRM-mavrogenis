import { el } from "@/lib/i18n/el";
import { KpiPage, type KpiSearch } from "./kpi-page";

export const metadata = { title: el.kpis.title };

export default async function KpisRoute({ searchParams }: { searchParams: Promise<KpiSearch> }) {
  return <KpiPage searchParams={await searchParams} backHref="/dashboard" />;
}
