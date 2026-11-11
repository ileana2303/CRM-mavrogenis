import { notFound } from "next/navigation";
import { el } from "@/lib/i18n/el";
import { doctorFullName, getDoctor } from "@/server/services/customer-service";
import { KpiPage, type KpiSearch } from "../../../kpis/kpi-page";
import { SOON } from "@/lib/features";
import { ComingSoon } from "@/components/coming-soon";

export const metadata = { title: el.kpis.title };

export default async function HubKpisPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<KpiSearch> }) {
  const { id } = await params;
  if (SOON.kpis) return <ComingSoon title={metadata.title} backHref={`/customers/${id}`} />;
  const doctor = await getDoctor(id);
  if (!doctor) notFound();
  return (
    <KpiPage
      searchParams={await searchParams}
      backHref={`/customers/${id}`}
      subtitle={
        <>
          {" · "}
          {el.customer.doctorPrefix}: <span className="font-semibold text-[var(--text)]">{doctorFullName(doctor)}</span>
        </>
      }
    />
  );
}
